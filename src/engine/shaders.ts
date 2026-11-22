export const QUAD_VERT = `#version 300 es
precision highp float;

layout(location = 0) in vec2 a_pos;
out vec2 v_uv;

void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

export const PASS0_COMPOSITE_FRAG = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_textTex;
uniform sampler2D u_mediaTex;

uniform vec2 u_resolution;
uniform vec2 u_mediaSize;
uniform float u_hasMedia;
uniform float u_mediaScale;
uniform vec2 u_mediaOffset;
uniform float u_mediaOpacity;
uniform float u_mediaContrast;
uniform float u_mediaThreshold;
uniform int u_mediaBlend;
uniform float u_textOpacity;
uniform vec3 u_textColor;
uniform vec3 u_inkColor;
uniform float u_preserveColor;

float blendOverlayCh(float base, float blend) {
  return base < 0.5 ? (2.0 * base * blend) : (1.0 - 2.0 * (1.0 - base) * (1.0 - blend));
}

float blendSoftLightCh(float base, float blend) {
  return (1.0 - 2.0 * blend) * base * base + 2.0 * blend * base;
}

vec3 blendOverlayRGB(vec3 base, vec3 blend) {
  return vec3(
    blendOverlayCh(base.r, blend.r),
    blendOverlayCh(base.g, blend.g),
    blendOverlayCh(base.b, blend.b)
  );
}

vec3 blendSoftLightRGB(vec3 base, vec3 blend) {
  return vec3(
    blendSoftLightCh(base.r, blend.r),
    blendSoftLightCh(base.g, blend.g),
    blendSoftLightCh(base.b, blend.b)
  );
}

void main() {
  // Flip Y for Canvas/Image textures uploaded with UNPACK_FLIP_Y_WEBGL = true
  vec4 textSample = texture(u_textTex, v_uv);
  float textInk = clamp(textSample.a * u_textOpacity, 0.0, 1.0);
  vec3 textRGB = u_textColor;

  float mediaInk = 0.0;
  float mediaLum = 1.0;
  vec3 mediaRGB = vec3(1.0);

  if (u_hasMedia > 0.5 && u_mediaSize.x > 0.0 && u_mediaSize.y > 0.0) {
    float canvasAspect = u_resolution.x / max(u_resolution.y, 1.0);
    float mediaAspect = u_mediaSize.x / max(u_mediaSize.y, 1.0);

    // Cover-fit scaling
    vec2 fitScale = vec2(1.0);
    if (mediaAspect > canvasAspect) {
      fitScale.x = canvasAspect / mediaAspect;
    } else {
      fitScale.y = mediaAspect / canvasAspect;
    }

    vec2 centered = v_uv - 0.5 - vec2(u_mediaOffset.x, -u_mediaOffset.y);
    vec2 mediaUV = centered * fitScale / max(u_mediaScale, 0.05) + 0.5;

    if (mediaUV.x >= 0.0 && mediaUV.x <= 1.0 && mediaUV.y >= 0.0 && mediaUV.y <= 1.0) {
      vec4 m = texture(u_mediaTex, mediaUV);
      vec3 c = clamp((m.rgb - 0.5) * u_mediaContrast + 0.5, 0.0, 1.0);
      float lum = dot(c, vec3(0.299, 0.587, 0.114));

      if (u_mediaThreshold > 0.01) {
        float t = 1.0 - u_mediaThreshold;
        lum = smoothstep(t - 0.045, t + 0.045, lum);
        c = mix(vec3(0.04), vec3(0.96), lum);
      }

      mediaInk = clamp((1.0 - lum) * m.a * u_mediaOpacity, 0.0, 1.0);
      mediaLum = 1.0 - mediaInk;
      mediaRGB = mix(vec3(1.0), c, m.a * u_mediaOpacity);
    }
  }

  float finalInk = 0.0;
  vec3 finalRGB = vec3(0.0);

  if (u_hasMedia < 0.5) {
    finalInk = textInk;
    finalRGB = textRGB;
  } else {
    vec3 basePigment = u_preserveColor > 0.5 ? mediaRGB : u_inkColor;

    if (u_mediaBlend == 0) {
      // Normal: solid text over media
      finalInk = mix(mediaInk, 1.0, textInk);
      finalRGB = mix(basePigment, textRGB, textInk);
    } else if (u_mediaBlend == 1) {
      // Multiply: ink accumulation on paper
      float mulLum = mediaLum * 0.08;
      float outLum = mix(mediaLum, mulLum, textInk);
      finalInk = clamp(1.0 - outLum, 0.0, 1.0);
      vec3 mulRGB = mix(textRGB, basePigment * textRGB, mediaInk);
      finalRGB = mix(basePigment, mulRGB, textInk);
    } else if (u_mediaBlend == 2) {
      // Screen: luminous knockout over media
      float scrLum = 1.0 - (1.0 - mediaLum) * (1.0 - 0.94);
      float outLum = mix(mediaLum, scrLum, textInk);
      finalInk = clamp(1.0 - outLum, 0.0, 1.0);
      vec3 scrRGB = vec3(1.0) - (vec3(1.0) - basePigment) * (vec3(1.0) - textRGB);
      finalRGB = mix(basePigment, scrRGB, textInk);
    } else if (u_mediaBlend == 3) {
      // Overlay: darkens shadows & lets media highlights bleed through type
      float ovLum = blendOverlayCh(mediaLum, 0.2);
      float outLum = mix(mediaLum, ovLum, textInk);
      finalInk = clamp(1.0 - outLum, 0.0, 1.0);
      finalRGB = mix(basePigment, blendOverlayRGB(basePigment, textRGB), textInk);
    } else if (u_mediaBlend == 4) {
      // Hard Light: crisp high-contrast graphic bite using media texture
      float hlLum = blendOverlayCh(0.24, mediaLum);
      float outLum = mix(mediaLum, hlLum, textInk);
      finalInk = clamp(1.0 - outLum, 0.0, 1.0);
      finalRGB = mix(basePigment, blendOverlayRGB(textRGB, basePigment), textInk);
    } else if (u_mediaBlend == 5) {
      // Soft Light: subtle tonal impression into media surface
      float slLum = blendSoftLightCh(mediaLum, 0.18);
      float outLum = mix(mediaLum, slLum, textInk);
      finalInk = clamp(1.0 - outLum, 0.0, 1.0);
      finalRGB = mix(basePigment, blendSoftLightRGB(basePigment, textRGB), textInk);
    } else if (u_mediaBlend == 6) {
      // Difference: stark graphic inversion where text overlaps media
      finalInk = abs(mediaInk - textInk);
      finalRGB = mix(basePigment, abs(basePigment - textRGB), textInk);
    } else {
      // Exclusion: softer experimental inversion
      float exLum = mediaLum + 0.88 - 2.0 * mediaLum * 0.88;
      float outLum = mix(mediaLum, exLum, textInk);
      finalInk = clamp(1.0 - outLum, 0.0, 1.0);
      vec3 exRGB = basePigment + textRGB - 2.0 * basePigment * textRGB;
      finalRGB = mix(basePigment, exRGB, textInk);
    }
  }

  fragColor = vec4(clamp(finalRGB, 0.0, 1.0), clamp(finalInk, 0.0, 1.0));
}
`;

export const PASS1_MOTION_FRAG = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_sourceTex;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_seed;

uniform float u_motionAmount;
uniform float u_motionAngle;
uniform float u_motionSpatialGrad;
uniform float u_shearBand;
uniform float u_shearPos;
uniform float u_motionEcho;
uniform float u_distressJitter;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise1D(float x) {
  float i = floor(x);
  float f = fract(x);
  float u = f * f * (3.0 - 2.0 * f);
  return mix(hash12(vec2(i, u_seed)), hash12(vec2(i + 1.0, u_seed)), u);
}

vec4 sampleClamped(vec2 uv) {
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    return vec4(0.0);
  }
  return texture(u_sourceTex, uv);
}

void main() {
  vec2 aspect = vec2(u_resolution.y / max(u_resolution.x, 1.0), 1.0);

  // Subtle horizontal scanline jitter for distressed edge wobble
  vec2 workUV = v_uv;
  if (u_distressJitter > 0.001) {
    float j1 = noise1D(v_uv.y * 190.0 + u_time * 3.2) - 0.5;
    float j2 = noise1D(v_uv.y * 42.0 - u_time * 1.1) - 0.5;
    workUV.x += (j1 * 0.65 + j2 * 0.35) * u_distressJitter * 0.014 * aspect.x;
  }

  // Horizontal scan-drag shear band (Moon Beats style)
  float bandMask = 0.0;
  if (u_shearBand > 0.001) {
    float bandCenter = 1.0 - u_shearPos;
    float distY = abs(workUV.y - bandCenter);
    bandMask = smoothstep(0.16, 0.01, distY);
    float bandRipple = (noise1D(workUV.y * 140.0 + u_seed * 2.0) - 0.5) * 0.025;
    workUV.x += bandMask * u_shearBand * (0.018 + bandRipple);
  }

  float rad = radians(u_motionAngle);
  vec2 dir = vec2(cos(rad), sin(rad)) * aspect;

  // Spatial gradient: crisp top/start, smeared bottom/end (Nothing Really Matters style)
  float gradFactor = 1.0;
  if (u_motionSpatialGrad > 0.001) {
    float proj = dot(workUV - 0.5, normalize(vec2(0.55, -0.82))) + 0.5;
    float ramp = smoothstep(0.12, 0.92, proj);
    gradFactor = mix(1.0, 0.08 + ramp * 1.45, u_motionSpatialGrad);
  }

  float blurDist = u_motionAmount * 0.095 * gradFactor;

  vec3 sumColor = vec3(0.0);
  float sumInk = 0.0;
  float sumWeight = 0.0;

  if (blurDist > 0.0005 || bandMask * u_shearBand > 0.001) {
    const int SAMPLES = 24;
    vec2 shearDir = vec2(aspect.x, 0.0) * (bandMask * u_shearBand * 0.14);

    for (int i = 0; i < SAMPLES; i++) {
      float t = (float(i) / float(SAMPLES - 1)) - 0.5;
      float jitter = (hash12(workUV * 400.0 + float(i) + u_time) - 0.5) / float(SAMPLES);
      float offsetT = t + jitter * 0.6;

      // Echo quantization when motionEcho > 0
      float echoSnap = floor(offsetT * 6.0) / 6.0;
      float sampleT = mix(offsetT, echoSnap, u_motionEcho * 0.72);

      vec2 sampleUV = workUV + dir * (sampleT * blurDist) + shearDir * (sampleT + 0.25);
      vec4 s = sampleClamped(sampleUV);

      float w = exp(-abs(sampleT) * mix(2.2, 0.7, u_motionEcho));
      sumColor += s.rgb * s.a * w;
      sumInk += s.a * w;
      sumWeight += w;
    }
  } else {
    vec4 s = sampleClamped(workUV);
    sumColor = s.rgb * s.a;
    sumInk = s.a;
    sumWeight = 1.0;
  }

  float outInk = sumInk / max(sumWeight, 0.0001);
  vec3 outRGB = sumInk > 0.0001 ? sumColor / sumInk : vec3(0.0);

  // Add subtle secondary ghost trail if echo is high
  if (u_motionEcho > 0.05 && blurDist > 0.002) {
    vec4 ghost = sampleClamped(workUV - dir * blurDist * 0.65);
    float gInk = ghost.a * u_motionEcho * 0.42;
    outRGB = mix(outRGB, ghost.rgb, clamp(gInk, 0.0, 1.0));
    outInk = max(outInk, gInk);
  }

  fragColor = vec4(outRGB, clamp(outInk, 0.0, 1.0));
}
`;

export const PASS2_INKBLEED_FRAG = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_motionTex;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_seed;

uniform float u_inkbleedAmount;
uniform float u_capillarity;
uniform float u_wash;
uniform float u_stipple;
uniform float u_pooling;
uniform float u_noiseThreshold;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 4; i++) {
    v += amp * vnoise(p);
    p = rot * p * 2.05;
    amp *= 0.5;
  }
  return v;
}

void main() {
  vec2 aspect = vec2(u_resolution.y / max(u_resolution.x, 1.0), 1.0);
  vec2 pCoord = v_uv / aspect;

  vec4 center = texture(u_motionTex, v_uv);

  if (u_inkbleedAmount < 0.002 && u_wash < 0.002) {
    fragColor = center;
    return;
  }

  float fiberMacro = fbm(pCoord * 16.0 + u_seed);
  float fiberMicro = fbm(pCoord * 88.0 + u_seed * 1.37);
  float washCloud = fbm(pCoord * 4.8 + vec2(u_seed * 0.41, -u_seed * 0.29));

  // Displacement along paper fibers
  vec2 fiberOffset = vec2(
    fbm(pCoord * 36.0 + vec2(1.7, 9.2) + u_seed) - 0.5,
    fbm(pCoord * 36.0 + vec2(8.3, 2.8) + u_seed) - 0.5
  ) * u_capillarity * 0.018 * aspect;

  float spreadRadius = u_inkbleedAmount * 0.022;
  float washRadius = (u_inkbleedAmount * 0.015 + u_wash * 0.048);

  float maxInk = center.a;
  float avgInk = center.a;
  float washAccum = 0.0;
  vec3 colorAccum = center.rgb * center.a;
  float colorWeight = center.a;

  const int TAPS = 20;
  const float GOLDEN_ANGLE = 2.39996323;

  for (int i = 1; i <= TAPS; i++) {
    float fi = float(i);
    float rNorm = sqrt(fi / float(TAPS));
    float angle = fi * GOLDEN_ANGLE + (fiberMicro - 0.5) * 1.4;
    vec2 dir = vec2(cos(angle), sin(angle)) * aspect;

    // Capillary spread sample
    vec2 uvSpread = clamp(v_uv + fiberOffset + dir * (rNorm * spreadRadius * (0.55 + fiberMacro * 0.9)), 0.0, 1.0);
    vec4 sSpread = texture(u_motionTex, uvSpread);

    float falloff = smoothstep(1.05, 0.0, rNorm - (fiberMicro - 0.5) * u_capillarity * 0.65);
    float bled = sSpread.a * falloff;
    maxInk = max(maxInk, bled * mix(0.65, 1.0, u_inkbleedAmount));
    avgInk += sSpread.a * (1.0 - rNorm * 0.5);

    colorAccum += sSpread.rgb * sSpread.a * falloff;
    colorWeight += sSpread.a * falloff;

    // Broad watercolor wash sample
    if (u_wash > 0.005) {
      vec2 uvWash = clamp(v_uv + dir * (rNorm * washRadius * (0.65 + washCloud * 0.8)), 0.0, 1.0);
      float sWash = texture(u_motionTex, uvWash).a;
      washAccum += sWash * (1.0 - rNorm * 0.6);
    }
  }

  avgInk /= float(TAPS + 1);
  washAccum /= float(TAPS);

  // Combine crisp core + capillary edge + watercolor wash stain
  float coreAndBleed = mix(center.a, max(center.a, maxInk * 0.92 + avgInk * 0.18), clamp(u_inkbleedAmount * 1.25, 0.0, 1.0));

  // Wet ink stipple breakup on soft bleed halo (Moon Beats / Nothing Really Matters look)
  if (u_stipple > 0.005) {
    float stippleGrain = hash12(floor(pCoord * 360.0) + u_seed * 13.0);
    float softEdge = smoothstep(0.02, 0.85, coreAndBleed) * (1.0 - smoothstep(0.65, 0.98, center.a));
    float stippleMask = smoothstep(0.5 - u_stipple * 0.42, 0.5 + u_stipple * 0.42, coreAndBleed + (stippleGrain - 0.5) * u_stipple * 0.85);
    coreAndBleed = mix(coreAndBleed, stippleMask, u_stipple * (0.35 + softEdge * 0.65));
  }

  // Dirty noise thresholding on bleed edges
  if (u_noiseThreshold > 0.005) {
    float dirtyFine = hash12(floor(pCoord * 460.0) + u_seed * 7.7);
    float dirtyMed = fbm(pCoord * 125.0 + u_seed * 2.3);
    float dirtyGrain = dirtyMed * 0.62 + dirtyFine * 0.38;

    float edgeRegion = 1.0 - smoothstep(0.72, 0.98, center.a);
    float threshLevel = mix(0.15, 0.68, u_noiseThreshold);
    float gritCut = smoothstep(
      threshLevel - 0.14,
      threshLevel + 0.14,
      coreAndBleed + (dirtyGrain - 0.48) * u_noiseThreshold * 1.15
    );
    coreAndBleed = mix(coreAndBleed, gritCut, edgeRegion * clamp(u_noiseThreshold * 1.2, 0.0, 1.0));
  }

  // Watercolor wash halo stains around ink
  float washStain = washAccum * u_wash * smoothstep(0.22, 0.82, washCloud + 0.15) * 0.55;
  float outInk = clamp(max(coreAndBleed, washStain) + washStain * 0.25, 0.0, 1.0);

  // Dark pooling rim & wet blotches inside strokes
  if (u_pooling > 0.005 && outInk > 0.05) {
    float rim = clamp(abs(coreAndBleed - center.a) * 2.2, 0.0, 1.0);
    float blotch = fbm(pCoord * 24.0 + u_seed * 3.1);
    outInk = clamp(outInk * (1.0 + u_pooling * (rim * 0.35 + (blotch - 0.45) * 0.42)), 0.0, 1.0);
  }

  vec3 outRGB = colorWeight > 0.0001 ? colorAccum / colorWeight : center.rgb;
  fragColor = vec4(outRGB, outInk);
}
`;

export const PASS3_XEROX_FRAG = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_bleedTex;
uniform sampler2D u_scanTex;
uniform sampler2D u_overlayTex;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_seed;

uniform vec3 u_paperColor;
uniform vec3 u_inkColor;
uniform float u_preserveColor;
uniform float u_invertOutput;
uniform float u_hasCrispOverlay;

// Distressed text & Halftone
uniform float u_distressErosion;
uniform float u_distressDryBrush;
uniform float u_halftoneAmount;
uniform float u_halftoneScale;
uniform float u_halftoneAngle;

// Xerox & Paper
uniform float u_xeroxGrain;
uniform float u_xeroxStreaks;
uniform float u_xeroxDust;
uniform float u_xeroxContrast;
uniform float u_paperTooth;
uniform float u_hasScanOverlay;
uniform float u_scanOverlayOpacity;
uniform float u_scanOverlayDarkMode;

// Gradient Map
uniform float u_gradientMapEnabled;
uniform vec3 u_gradientMapShadow;
uniform float u_gradientMapMidEnabled;
uniform vec3 u_gradientMapMid;
uniform float u_gradientMapMidPos;
uniform vec3 u_gradientMapHighlight;
uniform float u_gradientMapOpacity;
uniform float u_gradientMapReverse;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 4; i++) {
    v += amp * vnoise(p);
    p = rot * p * 2.03;
    amp *= 0.5;
  }
  return v;
}

void main() {
  vec2 aspect = vec2(u_resolution.x / max(u_resolution.y, 1.0), 1.0);
  vec2 pCoord = v_uv * aspect;

  vec4 art = texture(u_bleedTex, v_uv);
  float ink = art.a;

  // 1. Distressed Text: edge erosion & dry-brush gaps
  if (u_distressErosion > 0.002) {
    float erodeA = fbm(pCoord * 62.0 + u_seed * 1.9);
    float erodeB = vnoise(pCoord * 210.0 + u_seed * 3.7);
    float erodeMask = erodeA * 0.68 + erodeB * 0.32;
    float bite = u_distressErosion * 0.72;
    ink = smoothstep(bite * 0.45, bite * 0.45 + 0.22, ink - erodeMask * bite);
  }

  if (u_distressDryBrush > 0.002 && ink > 0.02) {
    float brush = fbm(vec2(pCoord.x * 16.0 + u_seed, pCoord.y * 145.0));
    float streaks = vnoise(vec2(pCoord.x * 95.0, pCoord.y * 18.0 + u_seed));
    float gap = smoothstep(0.32, 0.75, brush * 0.7 + streaks * 0.3);
    ink *= mix(1.0, 1.0 - gap * 0.85, u_distressDryBrush);
  }

  // 2. Rotated Halftone Dot Screen
  if (u_halftoneAmount > 0.002) {
    float ang = radians(u_halftoneAngle);
    mat2 rot = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
    float freq = mix(220.0, 28.0, clamp(u_halftoneScale, 0.0, 1.0));
    vec2 gridUV = (rot * pCoord) * freq;
    vec2 cell = fract(gridUV) - 0.5;
    float dist = length(cell);

    float dotRadius = sqrt(clamp(ink, 0.0, 1.0)) * 0.68;
    float ht = 1.0 - smoothstep(dotRadius - 0.09, dotRadius + 0.09, dist);
    ink = mix(ink, ht, u_halftoneAmount);
  }

  // 3. Xerox Texture: toner grain, vertical roller bands, horizontal scan lines, dust
  float flicker = floor(u_time * 18.0) * 0.137;

  if (u_xeroxStreaks > 0.002) {
    // Broad uneven exposure bands + vertical drum shading
    float drumBroad = fbm(vec2(pCoord.x * 5.5 + u_seed * 0.7, pCoord.y * 0.45));
    float drumFine = fbm(vec2(pCoord.x * 68.0 + u_seed, pCoord.y * 1.4));
    float vertBand = smoothstep(0.28, 0.82, drumBroad * 0.7 + drumFine * 0.3);

    // Horizontal hairline scanner passes
    float scanRow = floor(v_uv.y * 520.0 + flicker * 0.4);
    float hLine = pow(hash12(vec2(scanRow, u_seed)), 26.0);
    float hBand = smoothstep(0.75, 0.99, vnoise(vec2(v_uv.y * 18.0 + flicker * 0.2, u_seed)));

    ink = clamp(ink + vertBand * u_xeroxStreaks * 0.34, 0.0, 1.0);
    ink = clamp(ink - hLine * u_xeroxStreaks * 0.48 + hBand * u_xeroxStreaks * 0.12, 0.0, 1.0);
  }

  if (u_xeroxGrain > 0.002) {
    float gFine = hash12(floor(pCoord * 620.0) + flicker);
    float gCoarse = vnoise(pCoord * 185.0 + flicker * 0.5);
    float toner = (gFine * 0.65 + gCoarse * 0.35) - 0.46;
    ink = clamp(ink + toner * u_xeroxGrain * 0.55, 0.0, 1.0);
  }

  if (u_xeroxDust > 0.002) {
    float speckDark = step(1.0 - u_xeroxDust * 0.016, hash12(floor(pCoord * 420.0) + u_seed));
    float speckWhite = step(1.0 - u_xeroxDust * 0.022, hash12(floor(pCoord * 340.0) + u_seed + 19.3));
    ink = clamp(ink + speckDark * 0.85 - speckWhite * 0.85, 0.0, 1.0);
  }

  // 4. Optional real scanned reference texture blend
  if (u_hasScanOverlay > 0.5 && u_scanOverlayOpacity > 0.002) {
    float scanLum = dot(texture(u_scanTex, v_uv).rgb, vec3(0.299, 0.587, 0.114));
    float scanInk = u_scanOverlayDarkMode > 0.5 ? (1.0 - scanLum) * 0.65 : (1.0 - scanLum);
    ink = clamp(mix(ink, clamp(ink * 0.72 + scanInk * 0.78, 0.0, 1.0), u_scanOverlayOpacity), 0.0, 1.0);
  }

  // 5. Xerox Photocopy S-Curve Contrast
  if (u_xeroxContrast > 0.002) {
    float cAmt = u_xeroxContrast;
    float edgeLo = mix(0.0, 0.28, cAmt);
    float edgeHi = mix(1.0, 0.72, cAmt);
    ink = smoothstep(edgeLo, edgeHi, ink);
  }

  // 6. Paper fiber tooth
  float paperGrain = 0.0;
  if (u_paperTooth > 0.002) {
    float toothA = vnoise(pCoord * 240.0 + u_seed);
    float toothB = fbm(pCoord * 42.0 + u_seed);
    paperGrain = ((toothA * 0.6 + toothB * 0.4) - 0.5) * u_paperTooth * 0.095;
  }

  // 7. Map to final Paper / Ink / Color / Invert palette
  vec3 paperCol = clamp(u_paperColor + paperGrain, 0.0, 1.0);
  vec3 inkCol = u_inkColor;

  if (u_invertOutput > 0.5) {
    vec3 tmp = paperCol;
    paperCol = clamp(inkCol + paperGrain * 0.6, 0.0, 1.0);
    inkCol = tmp;
  }

  vec3 finalRGB;
  if (u_preserveColor > 0.5) {
    vec3 tintedArt = mix(paperCol, clamp(art.rgb, 0.0, 1.0), clamp(ink * 1.15, 0.0, 1.0));
    if (u_invertOutput > 0.5) {
      tintedArt = vec3(1.0) - tintedArt;
    }
    finalRGB = tintedArt;
  } else {
    vec3 pigmentCol = art.a > 0.002
      ? mix(inkCol, clamp(art.rgb, 0.0, 1.0), smoothstep(0.001, 0.035, art.a))
      : inkCol;
    finalRGB = mix(paperCol, pigmentCol, clamp(ink, 0.0, 1.0));
  }

  // 8. Crisp registration overlay ([X] grid markers & metadata)
  if (u_hasCrispOverlay > 0.5) {
    vec4 ov = texture(u_overlayTex, v_uv);
    vec3 markCol = u_invertOutput > 0.5 ? u_paperColor : u_inkColor;
    finalRGB = mix(finalRGB, markCol, ov.a);
  }

  // 9. Gradient Map (2-stop or 3-stop tonal color mapping)
  if (u_gradientMapEnabled > 0.5 && u_gradientMapOpacity > 0.002) {
    float gmT = clamp(dot(finalRGB, vec3(0.299, 0.587, 0.114)), 0.0, 1.0);
    if (u_gradientMapReverse > 0.5) {
      gmT = 1.0 - gmT;
    }
    vec3 mappedRGB;
    if (u_gradientMapMidEnabled > 0.5) {
      float midP = clamp(u_gradientMapMidPos, 0.05, 0.95);
      if (gmT < midP) {
        mappedRGB = mix(u_gradientMapShadow, u_gradientMapMid, gmT / midP);
      } else {
        mappedRGB = mix(u_gradientMapMid, u_gradientMapHighlight, (gmT - midP) / (1.0 - midP));
      }
    } else {
      mappedRGB = mix(u_gradientMapShadow, u_gradientMapHighlight, gmT);
    }
    finalRGB = mix(finalRGB, mappedRGB, clamp(u_gradientMapOpacity, 0.0, 1.0));
  }

  fragColor = vec4(clamp(finalRGB, 0.0, 1.0), 1.0);
}
`;
