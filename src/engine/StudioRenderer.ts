import {
  MediaBlendMode,
  ScanOverlayId,
  StudioParams,
  UploadedMedia,
} from '../types/studio';
import {
  PASS0_COMPOSITE_FRAG,
  PASS1_MOTION_FRAG,
  PASS2_INKBLEED_FRAG,
  PASS3_XEROX_FRAG,
  QUAD_VERT,
} from './shaders';

const SCAN_TEXTURE_URLS: Record<Exclude<ScanOverlayId, 'none'>, string> = {
  'xerox-dark': '/assets/aistudio/image_19619080.png',
  'xerox-light': '/assets/aistudio/image_07b4b5b8.png',
  'halftone-ref': '/assets/aistudio/image_ed3630bb.png',
};

function hexToRgbNorm(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16) / 255;
    const g = parseInt(clean[1] + clean[1], 16) / 255;
    const b = parseInt(clean[2] + clean[2], 16) / 255;
    return [isNaN(r) ? 0 : r, isNaN(g) ? 0 : g, isNaN(b) ? 0 : b];
  }
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16) / 255;
    const g = parseInt(clean.slice(2, 4), 16) / 255;
    const b = parseInt(clean.slice(4, 6), 16) / 255;
    return [isNaN(r) ? 0 : r, isNaN(g) ? 0 : g, isNaN(b) ? 0 : b];
  }
  return [0.92, 0.91, 0.89];
}

function blendModeToInt(mode: MediaBlendMode): number {
  switch (mode) {
    case 'normal':
      return 0;
    case 'multiply':
      return 1;
    case 'screen':
      return 2;
    case 'overlay':
      return 3;
    case 'hard-light':
      return 4;
    case 'soft-light':
      return 5;
    case 'difference':
      return 6;
    case 'exclusion':
      return 7;
    default:
      return 1;
  }
}

interface FboTarget {
  fbo: WebGLFramebuffer;
  tex: WebGLTexture;
  width: number;
  height: number;
}

export class StudioRenderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private vao: WebGLVertexArrayObject;
  private vbo: WebGLBuffer;

  private prog0: WebGLProgram;
  private prog1: WebGLProgram;
  private prog2: WebGLProgram;
  private prog3: WebGLProgram;

  private fboA: FboTarget | null = null;
  private fboB: FboTarget | null = null;

  private textCanvas: HTMLCanvasElement;
  private textCtx: CanvasRenderingContext2D;
  private overlayCanvas: HTMLCanvasElement;
  private overlayCtx: CanvasRenderingContext2D;

  private textTex: WebGLTexture;
  private overlayTex: WebGLTexture;
  private mediaTex: WebGLTexture;
  private emptyTex: WebGLTexture;
  private scanTextures: Map<string, WebGLTexture> = new Map();

  private lastTextKey = '';
  private lastOverlayKey = '';
  private lastMediaId = '';
  private onTextureReady?: () => void;
  private scanReadyPromise: Promise<void> = Promise.resolve();

  constructor(canvas: HTMLCanvasElement, onTextureReady?: () => void) {
    this.canvas = canvas;
    this.onTextureReady = onTextureReady;
    const gl = canvas.getContext('webgl2', {
      preserveDrawingBuffer: true,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    });

    if (!gl) {
      throw new Error('WebGL2 não suportado neste navegador.');
    }
    this.gl = gl;

    // Fullscreen quad
    const vao = gl.createVertexArray();
    const vbo = gl.createBuffer();
    if (!vao || !vbo) throw new Error('Falha ao inicializar buffers WebGL2.');
    this.vao = vao;
    this.vbo = vbo;

    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    this.prog0 = this.createProgram(QUAD_VERT, PASS0_COMPOSITE_FRAG);
    this.prog1 = this.createProgram(QUAD_VERT, PASS1_MOTION_FRAG);
    this.prog2 = this.createProgram(QUAD_VERT, PASS2_INKBLEED_FRAG);
    this.prog3 = this.createProgram(QUAD_VERT, PASS3_XEROX_FRAG);

    this.textCanvas = document.createElement('canvas');
    const tCtx = this.textCanvas.getContext('2d');
    if (!tCtx) throw new Error('Falha ao criar contexto 2D de tipografia.');
    this.textCtx = tCtx;

    this.overlayCanvas = document.createElement('canvas');
    const oCtx = this.overlayCanvas.getContext('2d');
    if (!oCtx) throw new Error('Falha ao criar contexto 2D de grade.');
    this.overlayCtx = oCtx;

    this.textTex = this.createTexture();
    this.overlayTex = this.createTexture();
    this.mediaTex = this.createTexture();
    this.emptyTex = this.createEmptyTexture();

    this.preloadScanTextures();
  }

  private compileShader(type: number, source: string): WebGLShader {
    const gl = this.gl;
    const shader = gl.createShader(type);
    if (!shader) throw new Error('Falha ao criar shader.');
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader) || 'Erro de compilação GLSL';
      gl.deleteShader(shader);
      throw new Error(log);
    }
    return shader;
  }

  private createProgram(vertSrc: string, fragSrc: string): WebGLProgram {
    const gl = this.gl;
    const vs = this.compileShader(gl.VERTEX_SHADER, vertSrc);
    const fs = this.compileShader(gl.FRAGMENT_SHADER, fragSrc);
    const prog = gl.createProgram();
    if (!prog) throw new Error('Falha ao criar programa WebGL.');
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(prog) || 'Erro de linkagem GLSL';
      gl.deleteProgram(prog);
      throw new Error(log);
    }
    return prog;
  }

  private createTexture(wrapClamp = true): WebGLTexture {
    const gl = this.gl;
    const tex = gl.createTexture();
    if (!tex) throw new Error('Falha ao criar textura.');
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const wrap = wrapClamp ? gl.CLAMP_TO_EDGE : gl.REPEAT;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    return tex;
  }

  private createEmptyTexture(): WebGLTexture {
    const gl = this.gl;
    const tex = this.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 0])
    );
    return tex;
  }

  private ensureFbo(existing: FboTarget | null, width: number, height: number): FboTarget {
    const gl = this.gl;
    if (existing && existing.width === width && existing.height === height) {
      return existing;
    }
    if (existing) {
      gl.deleteFramebuffer(existing.fbo);
      gl.deleteTexture(existing.tex);
    }
    const tex = this.createTexture(true);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA8,
      width,
      height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null
    );

    const fbo = gl.createFramebuffer();
    if (!fbo) throw new Error('Falha ao criar FBO.');
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    return {fbo, tex, width, height};
  }

  private preloadScanTextures(): void {
    const gl = this.gl;
    const loaders = (
      Object.keys(SCAN_TEXTURE_URLS) as Array<keyof typeof SCAN_TEXTURE_URLS>
    ).map(
      (key) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            if (!gl.isContextLost()) {
              const tex = this.createTexture(false);
              gl.bindTexture(gl.TEXTURE_2D, tex);
              gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
              gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
              this.scanTextures.set(key, tex);
              this.onTextureReady?.();
            }
            resolve();
          };
          img.onerror = () => resolve();
          img.src = SCAN_TEXTURE_URLS[key];
        })
    );
    this.scanReadyPromise = Promise.all(loaders).then(() => undefined);
  }

  public waitForAssets(): Promise<void> {
    return this.scanReadyPromise;
  }

  public invalidateTextCache(): void {
    this.lastTextKey = '';
    this.lastOverlayKey = '';
  }

  private drawSpacedLine(
    ctx: CanvasRenderingContext2D,
    line: string,
    x: number,
    y: number,
    align: 'left' | 'center' | 'right',
    letterSpacingPx: number
  ): void {
    if (Math.abs(letterSpacingPx) < 0.25) {
      ctx.textAlign = align;
      ctx.fillText(line, x, y);
      return;
    }

    const chars = Array.from(line);
    const widths = chars.map((ch) => ctx.measureText(ch).width);
    const totalWidth =
      widths.reduce((acc, w) => acc + w, 0) +
      Math.max(0, chars.length - 1) * letterSpacingPx;

    let cursorX = x;
    if (align === 'center') {
      cursorX = x - totalWidth / 2;
    } else if (align === 'right') {
      cursorX = x - totalWidth;
    }

    ctx.textAlign = 'left';
    for (let i = 0; i < chars.length; i++) {
      ctx.fillText(chars[i], cursorX, y);
      cursorX += widths[i] + letterSpacingPx;
    }
  }

  private formatGridText(raw: string, uppercase: boolean): string {
    return uppercase ? raw.toUpperCase() : raw;
  }

  private resolveGridFont(params: StudioParams): string {
    switch (params.gridFontMode) {
      case 'space-mono':
        return '"Space Mono", monospace';
      case 'sans':
        return '"Plus Jakarta Sans", sans-serif';
      case 'inherit':
        return `"${params.fontFamily}", sans-serif`;
      case 'mono':
      default:
        return '"JetBrains Mono", monospace';
    }
  }

  private drawRegistrationMarks(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    params: StudioParams
  ): void {
    const padX = width * (params.gridPadding / 100);
    const padY = height * (Math.max(2.5, params.gridPadding * 0.85) / 100);
    const midY = height * 0.5;
    const q1Y = height * 0.28;
    const q3Y = height * 0.72;
    const labelSize = Math.max(9, Math.round(width * (params.gridFontSize / 100)));
    const sym = params.gridSymbol.trim() || '[X]';
    const up = params.gridUppercase;

    const topLeft = this.formatGridText(params.gridTopLeft, up);
    const topRight = this.formatGridText(params.gridTopRight, up);
    const midLeft = this.formatGridText(params.gridMidLeft, up);
    const midRight = this.formatGridText(params.gridMidRight, up);
    const centerLabel = this.formatGridText(params.gridCenterLabel, up);
    const botLeft = this.formatGridText(params.gridBottomLeft, up);
    const botRight = this.formatGridText(params.gridBottomRight, up);

    ctx.save();
    ctx.globalAlpha = Math.max(0.05, Math.min(1, params.gridOpacity / 100));
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)';
    ctx.lineWidth = Math.max(1, width * 0.0011);
    ctx.font = `600 ${labelSize}px ${this.resolveGridFont(params)}`;
    ctx.textBaseline = 'middle';

    // Optional subtle architectural grid hairlines
    if (params.gridShowLines) {
      const topRuleY = padY + labelSize * 1.15;
      const botRuleY = height - padY - labelSize * 1.15;
      ctx.beginPath();
      ctx.moveTo(padX, topRuleY);
      ctx.lineTo(width - padX, topRuleY);
      ctx.moveTo(padX, botRuleY);
      ctx.lineTo(width - padX, botRuleY);

      if (params.gridLayout === 'full-grid') {
        ctx.moveTo(width * 0.5, padY + labelSize * 1.4);
        ctx.lineTo(width * 0.5, height - padY - labelSize * 1.4);
      }
      ctx.stroke();
    }

    // Top corners (all layouts)
    ctx.textAlign = 'left';
    if (topLeft) ctx.fillText(topLeft, padX, padY);
    ctx.textAlign = 'right';
    if (topRight) ctx.fillText(topRight, width - padX, padY);

    // Bottom corners (all layouts)
    ctx.textAlign = 'left';
    if (botLeft) ctx.fillText(botLeft, padX, height - padY);
    ctx.textAlign = 'right';
    if (botRight) ctx.fillText(botRight, width - padX, height - padY);

    if (params.gridLayout === 'corners-center') {
      ctx.textAlign = 'center';
      ctx.fillText(sym, width * 0.5, padY);
      ctx.fillText(centerLabel || sym, width * 0.5, height - padY);
    } else if (params.gridLayout === 'editorial-strip') {
      ctx.textAlign = 'center';
      if (centerLabel) ctx.fillText(centerLabel, width * 0.5, padY);
      ctx.fillText(sym, width * 0.5, height - padY);
    } else if (params.gridLayout === 'full-grid') {
      ctx.textAlign = 'center';
      ctx.fillText(sym, width * 0.5, padY);

      ctx.textAlign = 'left';
      ctx.fillText(sym, padX, q1Y);
      if (midLeft) ctx.fillText(midLeft, padX, midY);
      ctx.fillText(sym, padX, q3Y);

      ctx.textAlign = 'right';
      ctx.fillText(sym, width - padX, q1Y);
      if (midRight) ctx.fillText(midRight, width - padX, midY);
      ctx.fillText(sym, width - padX, q3Y);

      ctx.textAlign = 'center';
      ctx.fillText(sym, width * 0.5, q1Y);
      if (centerLabel) ctx.fillText(centerLabel, width * 0.5, q3Y);
      ctx.fillText(sym, width * 0.5, height - padY);
    }

    ctx.restore();
  }

  private updateTypographyTextures(
    width: number,
    height: number,
    params: StudioParams
  ): void {
    const gl = this.gl;

    const gridKeyPart = [
      params.gridMarksEnabled,
      params.gridMarksCrisp,
      params.gridLayout,
      params.gridSymbol,
      params.gridFontMode,
      params.gridFontSize,
      params.gridOpacity,
      params.gridPadding,
      params.gridShowLines,
      params.gridUppercase,
      params.gridTopLeft,
      params.gridTopRight,
      params.gridMidLeft,
      params.gridMidRight,
      params.gridCenterLabel,
      params.gridBottomLeft,
      params.gridBottomRight,
    ].join('|');

    const textKey = [
      width,
      height,
      params.textEnabled,
      params.text,
      params.subText,
      params.subTextOffsetX,
      params.subTextOffsetY,
      params.subTextSize,
      params.fontFamily,
      params.fontWeight,
      params.fontSize,
      params.lineHeight,
      params.letterSpacing,
      params.textAlign,
      params.textOffsetX,
      params.textOffsetY,
      params.textRotation,
      params.textUppercase,
      gridKeyPart,
    ].join('|');

    if (textKey !== this.lastTextKey) {
      this.lastTextKey = textKey;
      this.textCanvas.width = width;
      this.textCanvas.height = height;
      const ctx = this.textCtx;
      ctx.clearRect(0, 0, width, height);

      if (params.textEnabled && params.text.trim().length > 0) {
        const displayRaw = params.textUppercase
          ? params.text.toUpperCase()
          : params.text;
        const lines = displayRaw.split('\n');

        const fontPx = Math.max(16, (params.fontSize / 100) * width);
        const linePx = fontPx * params.lineHeight;
        const letterPx = fontPx * params.letterSpacing;

        ctx.save();
        const cx = width * 0.5 + (params.textOffsetX / 100) * width;
        const cy = height * 0.5 + (params.textOffsetY / 100) * height;
        ctx.translate(cx, cy);
        ctx.rotate((params.textRotation * Math.PI) / 180);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = `${params.fontWeight} ${fontPx}px "${params.fontFamily}", sans-serif`;
        ctx.textBaseline = 'middle';

        const totalBlockHeight = (lines.length - 1) * linePx;
        let baseAnchorX = 0;
        if (params.textAlign === 'left') baseAnchorX = -width * 0.42;
        if (params.textAlign === 'right') baseAnchorX = width * 0.42;

        const hasSub = params.subText.trim().length > 0;
        const subOffset = hasSub ? fontPx * 0.42 : 0;

        lines.forEach((line, idx) => {
          const y = -totalBlockHeight * 0.5 + idx * linePx - subOffset;
          this.drawSpacedLine(ctx, line, baseAnchorX, y, params.textAlign, letterPx);
        });

        // Subtext / editorial specimen caption (like INKBLEED reference)
        if (hasSub) {
          const subPx = Math.max(10, Math.round(width * (params.subTextSize / 100)));
          ctx.font = `600 ${subPx}px "Plus Jakarta Sans", sans-serif`;
          const subLines = params.subText.toUpperCase().split('\n');
          const subDx = (params.subTextOffsetX / 100) * width;
          const subDy = (params.subTextOffsetY / 100) * height;
          const subStartY = totalBlockHeight * 0.5 + fontPx * 0.72 - subOffset + subDy;
          subLines.forEach((sLine, sIdx) => {
            this.drawSpacedLine(
              ctx,
              sLine,
              baseAnchorX + subDx,
              subStartY + sIdx * subPx * 1.45,
              params.textAlign,
              subPx * 0.06
            );
          });
        }

        ctx.restore();
      }

      if (params.gridMarksEnabled && !params.gridMarksCrisp) {
        this.drawRegistrationMarks(ctx, width, height, params);
      }

      gl.bindTexture(gl.TEXTURE_2D, this.textTex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        this.textCanvas
      );
    }

    const overlayKey = [
      width,
      height,
      params.fontFamily,
      gridKeyPart,
    ].join('|');

    if (overlayKey !== this.lastOverlayKey) {
      this.lastOverlayKey = overlayKey;
      this.overlayCanvas.width = width;
      this.overlayCanvas.height = height;
      const octx = this.overlayCtx;
      octx.clearRect(0, 0, width, height);

      if (params.gridMarksEnabled && params.gridMarksCrisp) {
        this.drawRegistrationMarks(octx, width, height, params);
      }

      gl.bindTexture(gl.TEXTURE_2D, this.overlayTex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        this.overlayCanvas
      );
    }
  }

  private updateMediaTexture(media: UploadedMedia | null): void {
    if (!media) {
      this.lastMediaId = '';
      return;
    }
    const gl = this.gl;

    if (media.kind === 'video') {
      const vid = media.element as HTMLVideoElement;
      if (vid.readyState >= 2) {
        gl.bindTexture(gl.TEXTURE_2D, this.mediaTex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, vid);
      }
      this.lastMediaId = media.id;
    } else if (this.lastMediaId !== media.id) {
      const img = media.element as HTMLImageElement;
      if (img.complete && img.naturalWidth > 0) {
        gl.bindTexture(gl.TEXTURE_2D, this.mediaTex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        this.lastMediaId = media.id;
      }
    }
  }

  public render(
    params: StudioParams,
    media: UploadedMedia | null,
    timeSec: number,
    targetWidth: number,
    targetHeight: number
  ): void {
    const gl = this.gl;
    if (gl.isContextLost()) return;

    const w = Math.max(64, Math.round(targetWidth));
    const h = Math.max(64, Math.round(targetHeight));

    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }

    this.fboA = this.ensureFbo(this.fboA, w, h);
    this.fboB = this.ensureFbo(this.fboB, w, h);

    this.updateTypographyTextures(w, h, params);
    this.updateMediaTexture(media);

    // Animated parameter modulations
    const t = timeSec * (params.animSpeed / 100);
    const motionSweepWave = Math.sin(t * 1.45);
    const inkPulseWave = Math.sin(t * 1.1) * 0.5 + 0.5;
    const flickTime =
      params.animXeroxFlicker > 0 ? t * (params.animXeroxFlicker / 50) : 0;

    const effMotionAmount =
      params.motionBlurAmount / 100 +
      (params.animMotionSweep / 100) * 0.28 * (0.5 + 0.5 * motionSweepWave);
    const effShearPos =
      params.motionShearPos / 100 +
      (params.animMotionSweep / 100) * 0.14 * Math.sin(t * 0.9);
    const effInkbleed =
      params.inkbleedAmount / 100 +
      (params.animInkPulse / 100) * 0.22 * inkPulseWave;
    const effWash =
      params.inkbleedWash / 100 +
      (params.animInkPulse / 100) * 0.16 * (1.0 - inkPulseWave);

    gl.bindVertexArray(this.vao);
    gl.viewport(0, 0, w, h);

    // PASS 0: Composite Media + Text -> fboA
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboA.fbo);
    gl.useProgram(this.prog0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.textTex);
    gl.uniform1i(gl.getUniformLocation(this.prog0, 'u_textTex'), 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, media ? this.mediaTex : this.emptyTex);
    gl.uniform1i(gl.getUniformLocation(this.prog0, 'u_mediaTex'), 1);

    gl.uniform2f(gl.getUniformLocation(this.prog0, 'u_resolution'), w, h);
    gl.uniform2f(
      gl.getUniformLocation(this.prog0, 'u_mediaSize'),
      media ? media.width : 0,
      media ? media.height : 0
    );
    gl.uniform1f(gl.getUniformLocation(this.prog0, 'u_hasMedia'), media ? 1 : 0);
    gl.uniform1f(
      gl.getUniformLocation(this.prog0, 'u_mediaScale'),
      params.mediaScale / 100
    );
    gl.uniform2f(
      gl.getUniformLocation(this.prog0, 'u_mediaOffset'),
      params.mediaOffsetX / 100,
      params.mediaOffsetY / 100
    );
    gl.uniform1f(
      gl.getUniformLocation(this.prog0, 'u_mediaOpacity'),
      params.mediaOpacity / 100
    );
    gl.uniform1f(
      gl.getUniformLocation(this.prog0, 'u_mediaContrast'),
      params.mediaContrast / 100
    );
    gl.uniform1f(
      gl.getUniformLocation(this.prog0, 'u_mediaThreshold'),
      params.mediaThreshold / 100
    );
    gl.uniform1i(
      gl.getUniformLocation(this.prog0, 'u_mediaBlend'),
      blendModeToInt(params.mediaBlend)
    );
    const [pr, pg, pb] = hexToRgbNorm(params.paperColor);
    const [ir, ig, ib] = hexToRgbNorm(params.inkColor);
    const [tr, tg, tb] = hexToRgbNorm(params.textColor);
    const effInk = params.invertOutput ? [pr, pg, pb] : [ir, ig, ib];

    gl.uniform1f(
      gl.getUniformLocation(this.prog0, 'u_textOpacity'),
      params.textOpacity / 100
    );
    gl.uniform3f(gl.getUniformLocation(this.prog0, 'u_textColor'), tr, tg, tb);
    gl.uniform3f(
      gl.getUniformLocation(this.prog0, 'u_inkColor'),
      effInk[0],
      effInk[1],
      effInk[2]
    );
    gl.uniform1f(
      gl.getUniformLocation(this.prog0, 'u_preserveColor'),
      params.preserveMediaColor && media ? 1 : 0
    );
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // PASS 1: Motion Blur & Scan-Shear -> fboB
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboB.fbo);
    gl.useProgram(this.prog1);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.fboA.tex);
    gl.uniform1i(gl.getUniformLocation(this.prog1, 'u_sourceTex'), 0);

    gl.uniform2f(gl.getUniformLocation(this.prog1, 'u_resolution'), w, h);
    gl.uniform1f(gl.getUniformLocation(this.prog1, 'u_time'), flickTime);
    gl.uniform1f(gl.getUniformLocation(this.prog1, 'u_seed'), params.seed);
    gl.uniform1f(
      gl.getUniformLocation(this.prog1, 'u_motionAmount'),
      Math.max(0, Math.min(1.3, effMotionAmount))
    );
    gl.uniform1f(
      gl.getUniformLocation(this.prog1, 'u_motionAngle'),
      params.motionBlurAngle
    );
    gl.uniform1f(
      gl.getUniformLocation(this.prog1, 'u_motionSpatialGrad'),
      params.motionSpatialGradient / 100
    );
    gl.uniform1f(
      gl.getUniformLocation(this.prog1, 'u_shearBand'),
      params.motionShearBand / 100
    );
    gl.uniform1f(
      gl.getUniformLocation(this.prog1, 'u_shearPos'),
      Math.max(0.05, Math.min(0.95, effShearPos))
    );
    gl.uniform1f(
      gl.getUniformLocation(this.prog1, 'u_motionEcho'),
      params.motionEcho / 100
    );
    gl.uniform1f(
      gl.getUniformLocation(this.prog1, 'u_distressJitter'),
      params.distressJitter / 100
    );
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // PASS 2: Inkbleed, Capillarity, Wash & Stipple -> fboA
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboA.fbo);
    gl.useProgram(this.prog2);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.fboB.tex);
    gl.uniform1i(gl.getUniformLocation(this.prog2, 'u_motionTex'), 0);

    gl.uniform2f(gl.getUniformLocation(this.prog2, 'u_resolution'), w, h);
    gl.uniform1f(gl.getUniformLocation(this.prog2, 'u_time'), t);
    gl.uniform1f(gl.getUniformLocation(this.prog2, 'u_seed'), params.seed);
    gl.uniform1f(
      gl.getUniformLocation(this.prog2, 'u_inkbleedAmount'),
      Math.max(0, Math.min(1.35, effInkbleed))
    );
    gl.uniform1f(
      gl.getUniformLocation(this.prog2, 'u_capillarity'),
      params.inkbleedCapillarity / 100
    );
    gl.uniform1f(
      gl.getUniformLocation(this.prog2, 'u_wash'),
      Math.max(0, Math.min(1.25, effWash))
    );
    gl.uniform1f(
      gl.getUniformLocation(this.prog2, 'u_stipple'),
      params.inkbleedStipple / 100
    );
    gl.uniform1f(
      gl.getUniformLocation(this.prog2, 'u_pooling'),
      params.inkbleedPooling / 100
    );
    gl.uniform1f(
      gl.getUniformLocation(this.prog2, 'u_noiseThreshold'),
      params.inkbleedNoiseThreshold / 100
    );
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // PASS 3: Distress, Halftone, Xerox & Final Output -> Screen
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.useProgram(this.prog3);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.fboA.tex);
    gl.uniform1i(gl.getUniformLocation(this.prog3, 'u_bleedTex'), 0);

    const scanTex =
      params.scanOverlay !== 'none'
        ? this.scanTextures.get(params.scanOverlay)
        : undefined;
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, scanTex ?? this.emptyTex);
    gl.uniform1i(gl.getUniformLocation(this.prog3, 'u_scanTex'), 1);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.overlayTex);
    gl.uniform1i(gl.getUniformLocation(this.prog3, 'u_overlayTex'), 2);

    gl.uniform2f(gl.getUniformLocation(this.prog3, 'u_resolution'), w, h);
    gl.uniform1f(gl.getUniformLocation(this.prog3, 'u_time'), flickTime);
    gl.uniform1f(gl.getUniformLocation(this.prog3, 'u_seed'), params.seed);

    gl.uniform3f(gl.getUniformLocation(this.prog3, 'u_paperColor'), pr, pg, pb);
    gl.uniform3f(gl.getUniformLocation(this.prog3, 'u_inkColor'), ir, ig, ib);
    gl.uniform1f(
      gl.getUniformLocation(this.prog3, 'u_preserveColor'),
      params.preserveMediaColor && media ? 1 : 0
    );
    gl.uniform1f(
      gl.getUniformLocation(this.prog3, 'u_invertOutput'),
      params.invertOutput ? 1 : 0
    );
    gl.uniform1f(
      gl.getUniformLocation(this.prog3, 'u_hasCrispOverlay'),
      params.gridMarksEnabled && params.gridMarksCrisp ? 1 : 0
    );

    gl.uniform1f(
      gl.getUniformLocation(this.prog3, 'u_distressErosion'),
      params.distressErosion / 100
    );
    gl.uniform1f(
      gl.getUniformLocation(this.prog3, 'u_distressDryBrush'),
      params.distressDryBrush / 100
    );
    gl.uniform1f(
      gl.getUniformLocation(this.prog3, 'u_halftoneAmount'),
      params.halftoneAmount / 100
    );
    gl.uniform1f(
      gl.getUniformLocation(this.prog3, 'u_halftoneScale'),
      (params.halftoneScale - 4) / 66
    );
    gl.uniform1f(
      gl.getUniformLocation(this.prog3, 'u_halftoneAngle'),
      params.halftoneAngle
    );

    gl.uniform1f(
      gl.getUniformLocation(this.prog3, 'u_xeroxGrain'),
      params.xeroxGrain / 100
    );
    gl.uniform1f(
      gl.getUniformLocation(this.prog3, 'u_xeroxStreaks'),
      params.xeroxStreaks / 100
    );
    gl.uniform1f(
      gl.getUniformLocation(this.prog3, 'u_xeroxDust'),
      params.xeroxDust / 100
    );
    gl.uniform1f(
      gl.getUniformLocation(this.prog3, 'u_xeroxContrast'),
      params.xeroxContrast / 100
    );
    gl.uniform1f(
      gl.getUniformLocation(this.prog3, 'u_paperTooth'),
      params.paperTooth / 100
    );
    gl.uniform1f(
      gl.getUniformLocation(this.prog3, 'u_hasScanOverlay'),
      scanTex ? 1 : 0
    );
    gl.uniform1f(
      gl.getUniformLocation(this.prog3, 'u_scanOverlayOpacity'),
      params.scanOverlayOpacity / 100
    );
    gl.uniform1f(
      gl.getUniformLocation(this.prog3, 'u_scanOverlayDarkMode'),
      params.scanOverlay === 'xerox-dark' ? 1 : 0
    );

    const [gmsR, gmsG, gmsB] = hexToRgbNorm(params.gradientMapShadow);
    const [gmmR, gmmG, gmmB] = hexToRgbNorm(params.gradientMapMid);
    const [gmhR, gmhG, gmhB] = hexToRgbNorm(params.gradientMapHighlight);

    gl.uniform1f(
      gl.getUniformLocation(this.prog3, 'u_gradientMapEnabled'),
      params.gradientMapEnabled ? 1 : 0
    );
    gl.uniform3f(
      gl.getUniformLocation(this.prog3, 'u_gradientMapShadow'),
      gmsR,
      gmsG,
      gmsB
    );
    gl.uniform1f(
      gl.getUniformLocation(this.prog3, 'u_gradientMapMidEnabled'),
      params.gradientMapMidEnabled ? 1 : 0
    );
    gl.uniform3f(
      gl.getUniformLocation(this.prog3, 'u_gradientMapMid'),
      gmmR,
      gmmG,
      gmmB
    );
    gl.uniform1f(
      gl.getUniformLocation(this.prog3, 'u_gradientMapMidPos'),
      params.gradientMapMidPos / 100
    );
    gl.uniform3f(
      gl.getUniformLocation(this.prog3, 'u_gradientMapHighlight'),
      gmhR,
      gmhG,
      gmhB
    );
    gl.uniform1f(
      gl.getUniformLocation(this.prog3, 'u_gradientMapOpacity'),
      params.gradientMapOpacity / 100
    );
    gl.uniform1f(
      gl.getUniformLocation(this.prog3, 'u_gradientMapReverse'),
      params.gradientMapReverse ? 1 : 0
    );

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(null);
  }

  public dispose(): void {
    const gl = this.gl;
    if (this.fboA) {
      gl.deleteFramebuffer(this.fboA.fbo);
      gl.deleteTexture(this.fboA.tex);
    }
    if (this.fboB) {
      gl.deleteFramebuffer(this.fboB.fbo);
      gl.deleteTexture(this.fboB.tex);
    }
    gl.deleteTexture(this.textTex);
    gl.deleteTexture(this.overlayTex);
    gl.deleteTexture(this.mediaTex);
    gl.deleteTexture(this.emptyTex);
    this.scanTextures.forEach((t) => gl.deleteTexture(t));
    gl.deleteProgram(this.prog0);
    gl.deleteProgram(this.prog1);
    gl.deleteProgram(this.prog2);
    gl.deleteProgram(this.prog3);
    gl.deleteBuffer(this.vbo);
    gl.deleteVertexArray(this.vao);
  }
}
