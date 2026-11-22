export type AspectRatioId = '4:5' | '3:4' | '1:1' | '16:9' | '9:16';

export type ScanOverlayId = 'none' | 'xerox-dark' | 'xerox-light' | 'halftone-ref';

export type MediaBlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion';

export const BLEND_MODE_OPTIONS: Array<{id: MediaBlendMode; label: string}> = [
  {id: 'normal', label: 'Normal'},
  {id: 'multiply', label: 'Multiply'},
  {id: 'screen', label: 'Screen'},
  {id: 'overlay', label: 'Overlay'},
  {id: 'hard-light', label: 'Hard Light'},
  {id: 'soft-light', label: 'Soft Light'},
  {id: 'difference', label: 'Difference'},
  {id: 'exclusion', label: 'Exclusion'},
];

export interface AspectRatioSpec {
  id: AspectRatioId;
  label: string;
  width: number;
  height: number;
}

export const ASPECT_RATIOS: Record<AspectRatioId, AspectRatioSpec> = {
  '4:5': {id: '4:5', label: 'Poster 4:5', width: 1600, height: 2000},
  '3:4': {id: '3:4', label: 'Editorial 3:4', width: 1500, height: 2000},
  '1:1': {id: '1:1', label: 'Quadrado 1:1', width: 1800, height: 1800},
  '16:9': {id: '16:9', label: 'Widescreen 16:9', width: 1920, height: 1080},
  '9:16': {id: '9:16', label: 'Vertical 9:16', width: 1080, height: 1920},
};

export type GridLayoutMode =
  | 'corners'
  | 'corners-center'
  | 'full-grid'
  | 'editorial-strip';

export type GridFontMode = 'mono' | 'space-mono' | 'sans' | 'inherit';

export interface StudioParams {
  // Canvas & Palette
  aspectRatio: AspectRatioId;
  paperColor: string;
  inkColor: string;
  preserveMediaColor: boolean;
  invertOutput: boolean;

  // Typography
  textEnabled: boolean;
  text: string;
  subText: string;
  textColor: string;
  subTextOffsetX: number;
  subTextOffsetY: number;
  subTextSize: number;
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  textAlign: 'left' | 'center' | 'right';
  textOffsetX: number;
  textOffsetY: number;
  textRotation: number;
  textOpacity: number;
  textUppercase: boolean;

  // Registration & Editorial Grid Marks
  gridMarksEnabled: boolean;
  gridMarksCrisp: boolean;
  gridLayout: GridLayoutMode;
  gridSymbol: string;
  gridFontMode: GridFontMode;
  gridFontSize: number;
  gridOpacity: number;
  gridPadding: number;
  gridShowLines: boolean;
  gridUppercase: boolean;
  gridTopLeft: string;
  gridTopRight: string;
  gridMidLeft: string;
  gridMidRight: string;
  gridCenterLabel: string;
  gridBottomLeft: string;
  gridBottomRight: string;

  // Media Layer
  mediaScale: number;
  mediaOffsetX: number;
  mediaOffsetY: number;
  mediaOpacity: number;
  mediaContrast: number;
  mediaThreshold: number;
  mediaBlend: MediaBlendMode;

  // Inkbleed
  inkbleedAmount: number;
  inkbleedCapillarity: number;
  inkbleedWash: number;
  inkbleedStipple: number;
  inkbleedPooling: number;
  inkbleedNoiseThreshold: number;

  // Xerox Texture & Paper
  xeroxGrain: number;
  xeroxStreaks: number;
  xeroxDust: number;
  xeroxContrast: number;
  paperTooth: number;
  scanOverlay: ScanOverlayId;
  scanOverlayOpacity: number;

  // Distressed Text & Halftone
  distressErosion: number;
  distressDryBrush: number;
  distressJitter: number;
  halftoneAmount: number;
  halftoneScale: number;
  halftoneAngle: number;

  // Motion Blur & Scan-Drag
  motionBlurAmount: number;
  motionBlurAngle: number;
  motionSpatialGradient: number;
  motionShearBand: number;
  motionShearPos: number;
  motionEcho: number;

  // Animation & Video
  animPlaying: boolean;
  animSpeed: number;
  animMotionSweep: number;
  animInkPulse: number;
  animXeroxFlicker: number;
  seed: number;
}

export interface UploadedMedia {
  id: string;
  name: string;
  kind: 'image' | 'video';
  url: string;
  width: number;
  height: number;
  element: HTMLImageElement | HTMLVideoElement;
}

export interface StudioPreset {
  id: string;
  name: string;
  subtitle: string;
  referenceThumb?: string;
  params: Partial<StudioParams>;
}
