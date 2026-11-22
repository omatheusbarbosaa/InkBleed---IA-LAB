import React, {useState} from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Film,
  Grid,
  Image as ImageIcon,
  Palette,
  Pause,
  Play,
  Trash2,
  Type,
  Upload,
} from 'lucide-react';
import {REFERENCE_PRESETS} from '../data/presets';
import {
  ASPECT_RATIOS,
  AspectRatioId,
  BLEND_MODE_OPTIONS,
  GridFontMode,
  GridLayoutMode,
  MediaBlendMode,
  StudioParams,
  UploadedMedia,
} from '../types/studio';
import {CURATED_GOOGLE_FONTS, GoogleFontOption} from '../utils/googleFonts';
import {StudioSlider} from './StudioSlider';

interface LeftPanelProps {
  params: StudioParams;
  media: UploadedMedia | null;
  activePresetId: string | null;
  fontLoading: boolean;
  onUpdate: (patch: Partial<StudioParams>) => void;
  onSelectFont: (family: string) => void;
  onSelectPreset: (presetId: string) => void;
  onUploadFile: (file: File) => void;
  onLoadBuiltInMedia: (url: string, label: string) => void;
  onClearMedia: () => void;
}

type LeftTab = 'type' | 'media' | 'format';

const FONT_CATEGORIES: Array<'Todas' | GoogleFontOption['category']> = [
  'Todas',
  'Condensada',
  'Display',
  'Editorial Serif',
  'Geométrica',
  'Mono',
  'Experimental',
];

const BUILTIN_SAMPLE_MEDIA = [
  {
    label: 'Xerox Claro',
    url: '/assets/aistudio/image_07b4b5b8.png',
  },
  {
    label: 'Xerox Escuro',
    url: '/assets/aistudio/image_19619080.png',
  },
  {
    label: 'Retícula 45°',
    url: '/assets/aistudio/image_ed3630bb.png',
  },
];

const PAPER_SWATCHES = ['#EDEBE5', '#F7F7F5', '#E6DFD3', '#DCE2DD', '#141416'];
const INK_SWATCHES = ['#131416', '#17232B', '#7C1D13', '#0D2159', '#F2F1EC'];
const TEXT_COLOR_SWATCHES = [
  '#131416',
  '#ECEAE4',
  '#E85D2A',
  '#1D4ED8',
  '#8C1D13',
  '#F2B705',
];

export const LeftPanel: React.FC<LeftPanelProps> = ({
  params,
  media,
  activePresetId,
  fontLoading,
  onUpdate,
  onSelectFont,
  onSelectPreset,
  onUploadFile,
  onLoadBuiltInMedia,
  onClearMedia,
}) => {
  const [tab, setTab] = useState<LeftTab>('type');
  const [fontCategory, setFontCategory] =
    useState<'Todas' | GoogleFontOption['category']>('Todas');
  const [customFontInput, setCustomFontInput] = useState('');
  const [videoPlaying, setVideoPlaying] = useState(true);

  const filteredFonts =
    fontCategory === 'Todas'
      ? CURATED_GOOGLE_FONTS
      : CURATED_GOOGLE_FONTS.filter((f) => f.category === fontCategory);

  const activeFontMeta = CURATED_GOOGLE_FONTS.find(
    (f) => f.family.toLowerCase() === params.fontFamily.toLowerCase()
  );
  const availableWeights = activeFontMeta?.weights ?? [400, 600, 700, 800, 900];

  const handleToggleVideo = () => {
    if (!media || media.kind !== 'video') return;
    const vid = media.element as HTMLVideoElement;
    if (vid.paused) {
      vid.play().catch(() => undefined);
      setVideoPlaying(true);
    } else {
      vid.pause();
      setVideoPlaying(false);
    }
  };

  const handleCustomFontSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = customFontInput.trim();
    if (!cleaned) return;
    onSelectFont(cleaned);
  };

  return (
    <aside className="w-full lg:w-[330px] xl:w-[350px] shrink-0 border-b lg:border-b-0 lg:border-r border-[#26262A] bg-[#141417] flex flex-col min-h-0">
      {/* Segmented Tab Switch */}
      <div className="p-3 border-b border-[#242429] shrink-0">
        <div className="grid grid-cols-3 gap-1 p-1 bg-[#0E0E10] rounded-lg border border-[#242429]">
          <button
            type="button"
            onClick={() => setTab('type')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              tab === 'type'
                ? 'bg-[#222228] text-[#F4F4F5]'
                : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Tipografia</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('media')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              tab === 'media'
                ? 'bg-[#222228] text-[#F4F4F5]'
                : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Mídia</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('format')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              tab === 'format'
                ? 'bg-[#222228] text-[#F4F4F5]'
                : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Estilos</span>
          </button>
        </div>
      </div>

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto studio-scroll p-4 space-y-5">
        {tab === 'type' && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#F4F4F5]">
                Camada Tipográfica
              </span>
              <label className="inline-flex items-center gap-2 text-xs text-[#A1A1AA] cursor-pointer">
                <input
                  type="checkbox"
                  checked={params.textEnabled}
                  onChange={(e) => onUpdate({textEnabled: e.target.checked})}
                  className="accent-[#E85D2A] rounded"
                />
                <span>Ativa</span>
              </label>
            </div>

            <div className="space-y-2">
              <label className="block text-xs text-[#A1A1AA]">
                Texto Principal
              </label>
              <textarea
                rows={3}
                value={params.text}
                onChange={(e) => onUpdate({text: e.target.value})}
                placeholder="Digite seu texto..."
                className="w-full px-3 py-2 text-sm bg-[#0E0E10] border border-[#27272C] rounded-md text-[#F4F4F5] placeholder-[#52525B] focus:outline-none focus:border-[#E85D2A] resize-y"
              />
              <div className="flex items-center justify-between pt-1">
                <label className="text-xs text-[#A1A1AA]">
                  Subtítulo / Ficha Técnica
                </label>
                {(params.subTextOffsetX !== 0 ||
                  params.subTextOffsetY !== 0 ||
                  params.subTextSize !== 1.9) && (
                  <button
                    type="button"
                    onClick={() =>
                      onUpdate({
                        subTextOffsetX: 0,
                        subTextOffsetY: 0,
                        subTextSize: 1.9,
                      })
                    }
                    className="text-[11px] text-[#71717A] hover:text-[#F4F4F5] cursor-pointer"
                  >
                    Centralizar
                  </button>
                )}
              </div>
              <input
                type="text"
                value={params.subText}
                onChange={(e) => onUpdate({subText: e.target.value})}
                placeholder="Ex: EFEITO INKBLEED · 300 DPI"
                className="w-full px-3 py-1.5 text-xs bg-[#0E0E10] border border-[#27272C] rounded-md text-[#F4F4F5] placeholder-[#52525B] focus:outline-none focus:border-[#E85D2A]"
              />

              {params.subText.trim().length > 0 && (
                <div className="pt-2 space-y-2.5">
                  <StudioSlider
                    label="Posição X do Subtítulo"
                    value={params.subTextOffsetX}
                    min={-45}
                    max={45}
                    unit="%"
                    onChange={(v) => onUpdate({subTextOffsetX: v})}
                  />
                  <StudioSlider
                    label="Posição Y do Subtítulo"
                    value={params.subTextOffsetY}
                    min={-45}
                    max={45}
                    unit="%"
                    onChange={(v) => onUpdate({subTextOffsetY: v})}
                  />
                  <StudioSlider
                    label="Tamanho do Subtítulo"
                    value={params.subTextSize}
                    min={0.9}
                    max={5.5}
                    step={0.1}
                    unit="%"
                    onChange={(v) => onUpdate({subTextSize: v})}
                  />
                </div>
              )}

              {/* Cor do Texto */}
              <div className="pt-2 space-y-2">
                <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
                  <span>Cor do Texto</span>
                  <span className="font-mono tabular-nums text-[11px] text-[#F4F4F5]">
                    {params.textColor.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={params.textColor}
                    onChange={(e) => onUpdate({textColor: e.target.value})}
                    aria-label="Cor do texto"
                    className="w-7 h-7 rounded border border-[#2E2E35] bg-transparent cursor-pointer"
                  />
                  {TEXT_COLOR_SWATCHES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => onUpdate({textColor: c})}
                      aria-label={`Cor do texto ${c}`}
                      style={{backgroundColor: c}}
                      className={`w-6 h-6 rounded border cursor-pointer transition-transform ${
                        params.textColor.toLowerCase() === c.toLowerCase()
                          ? 'border-[#E85D2A] scale-110'
                          : 'border-[#3A3A42]'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Google Fonts Selector */}
            <div className="space-y-2.5 pt-2 border-t border-[#242429]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#F4F4F5]">
                  Google Fonts
                </span>
                {fontLoading && (
                  <span className="text-[11px] text-[#E85D2A]">
                    Carregando fonte...
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-1">
                {FONT_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFontCategory(cat)}
                    className={`px-2 py-1 text-[11px] rounded border transition-colors cursor-pointer ${
                      fontCategory === cat
                        ? 'bg-[#27272D] border-[#E85D2A] text-[#F4F4F5]'
                        : 'bg-[#18181C] border-[#26262A] text-[#A1A1AA] hover:text-[#F4F4F5]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <select
                value={params.fontFamily}
                onChange={(e) => onSelectFont(e.target.value)}
                aria-label="Selecionar fonte do Google Fonts"
                className="w-full px-3 py-2 text-xs bg-[#0E0E10] border border-[#27272C] rounded-md text-[#F4F4F5] focus:outline-none focus:border-[#E85D2A]"
              >
                {!CURATED_GOOGLE_FONTS.some(
                  (f) => f.family.toLowerCase() === params.fontFamily.toLowerCase()
                ) && (
                  <option value={params.fontFamily}>
                    {params.fontFamily} (Personalizada)
                  </option>
                )}
                {filteredFonts.map((font) => (
                  <option key={font.family} value={font.family}>
                    {font.family} · {font.category}
                  </option>
                ))}
              </select>

              <form onSubmit={handleCustomFontSubmit} className="flex gap-1.5">
                <input
                  type="text"
                  value={customFontInput}
                  onChange={(e) => setCustomFontInput(e.target.value)}
                  placeholder="Qualquer fonte do Google Fonts..."
                  className="flex-1 min-w-0 px-2.5 py-1.5 text-xs bg-[#0E0E10] border border-[#27272C] rounded-md text-[#F4F4F5] placeholder-[#52525B] focus:outline-none focus:border-[#E85D2A]"
                />
                <button
                  type="submit"
                  className="px-2.5 py-1.5 text-xs font-medium bg-[#222228] hover:bg-[#2C2C34] text-[#F4F4F5] border border-[#2E2E35] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Carregar
                </button>
              </form>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="block text-[11px] text-[#A1A1AA] mb-1">
                    Peso
                  </label>
                  <select
                    value={params.fontWeight}
                    onChange={(e) =>
                      onUpdate({fontWeight: parseInt(e.target.value, 10)})
                    }
                    className="w-full px-2.5 py-1.5 text-xs bg-[#0E0E10] border border-[#27272C] rounded-md text-[#F4F4F5] focus:outline-none focus:border-[#E85D2A]"
                  >
                    {availableWeights.map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-[#A1A1AA] mb-1">
                    Alinhamento
                  </label>
                  <div className="grid grid-cols-3 gap-1 bg-[#0E0E10] p-0.5 rounded-md border border-[#27272C]">
                    {(
                      [
                        {id: 'left', icon: AlignLeft, label: 'Esquerda'},
                        {id: 'center', icon: AlignCenter, label: 'Centro'},
                        {id: 'right', icon: AlignRight, label: 'Direita'},
                      ] as const
                    ).map(({id, icon: Icon, label}) => (
                      <button
                        key={id}
                        type="button"
                        aria-label={label}
                        onClick={() => onUpdate({textAlign: id})}
                        className={`flex items-center justify-center py-1 rounded transition-colors cursor-pointer ${
                          params.textAlign === id
                            ? 'bg-[#27272D] text-[#F4F4F5]'
                            : 'text-[#71717A] hover:text-[#F4F4F5]'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <label className="inline-flex items-center gap-2 text-xs text-[#A1A1AA] pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={params.textUppercase}
                  onChange={(e) => onUpdate({textUppercase: e.target.checked})}
                  className="accent-[#E85D2A] rounded"
                />
                <span>Forçar Caixa Alta</span>
              </label>
            </div>

            {/* Geometry Sliders */}
            <div className="space-y-3 pt-2 border-t border-[#242429]">
              <StudioSlider
                label="Tamanho da Fonte"
                value={params.fontSize}
                min={4}
                max={42}
                step={0.5}
                unit="%"
                onChange={(v) => onUpdate({fontSize: v})}
              />
              <StudioSlider
                label="Entrelinha"
                value={params.lineHeight}
                min={0.7}
                max={1.6}
                step={0.02}
                onChange={(v) => onUpdate({lineHeight: v})}
              />
              <StudioSlider
                label="Espaçamento (Tracking)"
                value={params.letterSpacing}
                min={-0.12}
                max={0.35}
                step={0.01}
                unit=" em"
                onChange={(v) => onUpdate({letterSpacing: v})}
              />
              <StudioSlider
                label="Posição X"
                value={params.textOffsetX}
                min={-45}
                max={45}
                unit="%"
                onChange={(v) => onUpdate({textOffsetX: v})}
              />
              <StudioSlider
                label="Posição Y"
                value={params.textOffsetY}
                min={-45}
                max={45}
                unit="%"
                onChange={(v) => onUpdate({textOffsetY: v})}
              />
              <StudioSlider
                label="Rotação"
                value={params.textRotation}
                min={-45}
                max={45}
                unit="°"
                onChange={(v) => onUpdate({textRotation: v})}
              />
              <StudioSlider
                label="Opacidade do Texto"
                value={params.textOpacity}
                min={0}
                max={100}
                unit="%"
                onChange={(v) => onUpdate({textOpacity: v})}
              />

              <div className="pt-1 space-y-1.5">
                <label
                  htmlFor="type-blend-mode"
                  className="block text-xs text-[#A1A1AA]"
                >
                  Blend Mode (Texto × Mídia)
                </label>
                <select
                  id="type-blend-mode"
                  value={params.mediaBlend}
                  onChange={(e) =>
                    onUpdate({mediaBlend: e.target.value as MediaBlendMode})
                  }
                  className="w-full px-3 py-2 text-xs bg-[#0E0E10] border border-[#27272C] rounded-md text-[#F4F4F5] focus:outline-none focus:border-[#E85D2A]"
                >
                  {BLEND_MODE_OPTIONS.map((mode) => (
                    <option key={mode.id} value={mode.id}>
                      {mode.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Registration Grid Marks */}
            <div className="space-y-3 pt-3 border-t border-[#242429]">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#F4F4F5]">
                  <Grid className="w-3.5 h-3.5 text-[#A1A1AA]" />
                  <span>Textos & Marcadores de Grade</span>
                </span>
                <input
                  type="checkbox"
                  checked={params.gridMarksEnabled}
                  onChange={(e) => onUpdate({gridMarksEnabled: e.target.checked})}
                  aria-label="Ativar marcadores de grade"
                  className="accent-[#E85D2A] rounded cursor-pointer"
                />
              </div>

              {params.gridMarksEnabled && (
                <div className="space-y-3">
                  {/* Layout Mode */}
                  <div className="space-y-1.5">
                    <span className="block text-[11px] text-[#A1A1AA]">
                      Distribuição da Grade
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(
                        [
                          {id: 'full-grid', label: 'Poster 3×4'},
                          {id: 'corners-center', label: 'Cantos + Centro'},
                          {id: 'corners', label: '4 Cantos'},
                          {id: 'editorial-strip', label: 'Faixa Técnica'},
                        ] as Array<{id: GridLayoutMode; label: string}>
                      ).map((layout) => (
                        <button
                          key={layout.id}
                          type="button"
                          onClick={() => onUpdate({gridLayout: layout.id})}
                          className={`px-2.5 py-1.5 text-[11px] rounded border text-left transition-colors cursor-pointer whitespace-nowrap truncate ${
                            params.gridLayout === layout.id
                              ? 'bg-[#27272D] border-[#E85D2A] text-[#F4F4F5]'
                              : 'bg-[#1A1A1E] border-[#26262A] text-[#A1A1AA] hover:text-[#F4F4F5]'
                          }`}
                        >
                          {layout.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Symbol Picker */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-[#A1A1AA]">
                        Símbolo Marcador
                      </span>
                      <input
                        type="text"
                        value={params.gridSymbol}
                        onChange={(e) => onUpdate({gridSymbol: e.target.value})}
                        placeholder="[X]"
                        aria-label="Símbolo personalizado da grade"
                        className="w-16 px-2 py-0.5 text-[11px] font-mono text-center bg-[#0E0E10] border border-[#27272C] rounded text-[#F4F4F5]"
                      />
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {['[X]', '+', '⊕', '※', '*', '//', '▪'].map((sym) => (
                        <button
                          key={sym}
                          type="button"
                          onClick={() => onUpdate({gridSymbol: sym})}
                          className={`py-1 text-[11px] font-mono rounded border transition-colors cursor-pointer ${
                            params.gridSymbol === sym
                              ? 'bg-[#27272D] border-[#E85D2A] text-[#F4F4F5]'
                              : 'bg-[#18181C] border-[#26262A] text-[#A1A1AA] hover:text-[#F4F4F5]'
                          }`}
                        >
                          {sym}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Grid Font & Sliders */}
                  <div className="space-y-2.5">
                    <div>
                      <label
                        htmlFor="grid-font-mode"
                        className="block text-[11px] text-[#A1A1AA] mb-1"
                      >
                        Tipografia da Grade
                      </label>
                      <select
                        id="grid-font-mode"
                        value={params.gridFontMode}
                        onChange={(e) =>
                          onUpdate({
                            gridFontMode: e.target.value as GridFontMode,
                          })
                        }
                        className="w-full px-2.5 py-1.5 text-xs bg-[#0E0E10] border border-[#27272C] rounded-md text-[#F4F4F5] focus:outline-none focus:border-[#E85D2A]"
                      >
                        <option value="mono">JetBrains Mono (Técnica)</option>
                        <option value="space-mono">Space Mono (Editorial)</option>
                        <option value="sans">Plus Jakarta Sans (Limpa)</option>
                        <option value="inherit">Mesma do Texto Principal</option>
                      </select>
                    </div>

                    <StudioSlider
                      label="Tamanho dos Textos"
                      value={params.gridFontSize}
                      min={0.9}
                      max={3.6}
                      step={0.05}
                      unit="%"
                      onChange={(v) => onUpdate({gridFontSize: v})}
                    />
                    <StudioSlider
                      label="Opacidade da Grade"
                      value={params.gridOpacity}
                      min={10}
                      max={100}
                      unit="%"
                      onChange={(v) => onUpdate({gridOpacity: v})}
                    />
                    <StudioSlider
                      label="Margem das Bordas"
                      value={params.gridPadding}
                      min={2}
                      max={10}
                      step={0.2}
                      unit="%"
                      onChange={(v) => onUpdate({gridPadding: v})}
                    />
                  </div>

                  {/* Behavior Checkboxes */}
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-xs text-[#A1A1AA] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={params.gridMarksCrisp}
                        onChange={(e) =>
                          onUpdate({gridMarksCrisp: e.target.checked})
                        }
                        className="accent-[#E85D2A] rounded"
                      />
                      <span>Manter nítidos (fora do Inkbleed/Xerox)</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-[#A1A1AA] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={params.gridShowLines}
                        onChange={(e) =>
                          onUpdate({gridShowLines: e.target.checked})
                        }
                        className="accent-[#E85D2A] rounded"
                      />
                      <span>Linhas divisórias sutis</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-[#A1A1AA] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={params.gridUppercase}
                        onChange={(e) =>
                          onUpdate({gridUppercase: e.target.checked})
                        }
                        className="accent-[#E85D2A] rounded"
                      />
                      <span>Caixa alta nos textos da grade</span>
                    </label>
                  </div>

                  {/* Quick Text Presets */}
                  <div className="space-y-1.5">
                    <span className="block text-[11px] text-[#A1A1AA]">
                      Rótulos Prontos
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdate({
                            gridTopLeft: 'MOON BEATS',
                            gridTopRight: 'MOTION TEST',
                            gridMidLeft: 'MOON BEATS',
                            gridMidRight: 'MOTION TEST',
                            gridCenterLabel: "AO'25",
                            gridBottomLeft: 'VI. (01)',
                            gridBottomRight: "AO'26",
                          })
                        }
                        className="px-2 py-1 text-[11px] bg-[#18181C] hover:bg-[#222228] border border-[#26262A] rounded text-[#A1A1AA] hover:text-[#F4F4F5] truncate cursor-pointer"
                      >
                        Moon Beats
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdate({
                            gridTopLeft: '300 DPI',
                            gridTopRight: 'PRINT / DIGITAL',
                            gridMidLeft: 'INKBLEED',
                            gridMidRight: 'SMART PAPER',
                            gridCenterLabel: 'SPECIMEN',
                            gridBottomLeft: '© 2026',
                            gridBottomRight: 'SERIE 01',
                          })
                        }
                        className="px-2 py-1 text-[11px] bg-[#18181C] hover:bg-[#222228] border border-[#26262A] rounded text-[#A1A1AA] hover:text-[#F4F4F5] truncate cursor-pointer"
                      >
                        Specimen
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdate({
                            gridTopLeft: '',
                            gridTopRight: '',
                            gridMidLeft: '',
                            gridMidRight: '',
                            gridCenterLabel: '',
                            gridBottomLeft: '',
                            gridBottomRight: '',
                          })
                        }
                        className="px-2 py-1 text-[11px] bg-[#18181C] hover:bg-[#222228] border border-[#26262A] rounded text-[#A1A1AA] hover:text-[#F4F4F5] truncate cursor-pointer"
                      >
                        Limpar
                      </button>
                    </div>
                  </div>

                  {/* Individual Editable Text Slots */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <input
                      type="text"
                      value={params.gridTopLeft}
                      onChange={(e) => onUpdate({gridTopLeft: e.target.value})}
                      placeholder="Topo Esq."
                      aria-label="Grade Topo Esquerdo"
                      className="px-2 py-1 text-[11px] font-mono bg-[#0E0E10] border border-[#27272C] rounded text-[#F4F4F5]"
                    />
                    <input
                      type="text"
                      value={params.gridTopRight}
                      onChange={(e) => onUpdate({gridTopRight: e.target.value})}
                      placeholder="Topo Dir."
                      aria-label="Grade Topo Direito"
                      className="px-2 py-1 text-[11px] font-mono bg-[#0E0E10] border border-[#27272C] rounded text-[#F4F4F5]"
                    />
                    {params.gridLayout === 'full-grid' && (
                      <>
                        <input
                          type="text"
                          value={params.gridMidLeft}
                          onChange={(e) =>
                            onUpdate({gridMidLeft: e.target.value})
                          }
                          placeholder="Centro Esq."
                          aria-label="Grade Centro Esquerdo"
                          className="px-2 py-1 text-[11px] font-mono bg-[#0E0E10] border border-[#27272C] rounded text-[#F4F4F5]"
                        />
                        <input
                          type="text"
                          value={params.gridMidRight}
                          onChange={(e) =>
                            onUpdate({gridMidRight: e.target.value})
                          }
                          placeholder="Centro Dir."
                          aria-label="Grade Centro Direito"
                          className="px-2 py-1 text-[11px] font-mono bg-[#0E0E10] border border-[#27272C] rounded text-[#F4F4F5]"
                        />
                      </>
                    )}
                    {params.gridLayout !== 'corners' && (
                      <input
                        type="text"
                        value={params.gridCenterLabel}
                        onChange={(e) =>
                          onUpdate({gridCenterLabel: e.target.value})
                        }
                        placeholder="Miolo / Ano"
                        aria-label="Grade Rótulo Central"
                        className="col-span-2 px-2 py-1 text-[11px] font-mono bg-[#0E0E10] border border-[#27272C] rounded text-[#F4F4F5]"
                      />
                    )}
                    <input
                      type="text"
                      value={params.gridBottomLeft}
                      onChange={(e) =>
                        onUpdate({gridBottomLeft: e.target.value})
                      }
                      placeholder="Base Esq."
                      aria-label="Grade Base Esquerdo"
                      className="px-2 py-1 text-[11px] font-mono bg-[#0E0E10] border border-[#27272C] rounded text-[#F4F4F5]"
                    />
                    <input
                      type="text"
                      value={params.gridBottomRight}
                      onChange={(e) =>
                        onUpdate({gridBottomRight: e.target.value})
                      }
                      placeholder="Base Dir."
                      aria-label="Grade Base Direito"
                      className="px-2 py-1 text-[11px] font-mono bg-[#0E0E10] border border-[#27272C] rounded text-[#F4F4F5]"
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {tab === 'media' && (
          <>
            <div className="space-y-3">
              <span className="block text-xs font-semibold text-[#F4F4F5]">
                Upload de Imagem ou Vídeo
              </span>

              <label className="flex flex-col items-center justify-center gap-2 p-5 border border-dashed border-[#34343C] hover:border-[#E85D2A] rounded-lg bg-[#0E0E10] transition-colors cursor-pointer text-center">
                <Upload className="w-5 h-5 text-[#A1A1AA]" />
                <span className="text-xs font-medium text-[#F4F4F5]">
                  Clique ou arraste arquivo aqui
                </span>
                <span className="text-[11px] text-[#71717A]">
                  PNG, JPG, WebP, MP4, WebM, MOV
                </span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onUploadFile(file);
                    e.target.value = '';
                  }}
                />
              </label>

              {media ? (
                <div className="p-3 bg-[#1A1A1F] border border-[#282830] rounded-lg space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {media.kind === 'video' ? (
                        <Film className="w-4 h-4 text-[#E85D2A] shrink-0" />
                      ) : (
                        <ImageIcon className="w-4 h-4 text-[#E85D2A] shrink-0" />
                      )}
                      <span className="text-xs font-medium text-[#F4F4F5] truncate">
                        {media.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={onClearMedia}
                      title="Remover mídia"
                      className="p-1 text-[#A1A1AA] hover:text-[#EF4444] transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-[11px] font-mono tabular-nums text-[#71717A]">
                    {media.width} × {media.height} px ·{' '}
                    {media.kind === 'video' ? 'Vídeo' : 'Imagem'}
                  </div>
                  {media.kind === 'video' && (
                    <button
                      type="button"
                      onClick={handleToggleVideo}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-medium bg-[#25252C] hover:bg-[#2F2F38] text-[#F4F4F5] rounded border border-[#32323A] cursor-pointer"
                    >
                      {videoPlaying ? (
                        <>
                          <Pause className="w-3.5 h-3.5" />
                          <span>Pausar Vídeo Base</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          <span>Reproduzir Vídeo Base</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2 pt-1">
                  <span className="block text-[11px] text-[#71717A]">
                    Ou carregue uma textura de referência como base:
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {BUILTIN_SAMPLE_MEDIA.map((sample) => (
                      <button
                        key={sample.url}
                        type="button"
                        onClick={() =>
                          onLoadBuiltInMedia(sample.url, sample.label)
                        }
                        className="group relative overflow-hidden rounded border border-[#26262A] hover:border-[#E85D2A] bg-[#0E0E10] text-left cursor-pointer"
                      >
                        <img
                          src={sample.url}
                          alt={sample.label}
                          referrerPolicy="no-referrer"
                          className="w-full h-14 object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                        />
                        <span className="block px-1.5 py-1 text-[10px] text-[#A1A1AA] truncate">
                          {sample.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3 pt-3 border-t border-[#242429]">
              <span className="block text-xs font-semibold text-[#F4F4F5]">
                Ajuste & Mesclagem da Mídia
              </span>

              <label className="inline-flex items-center gap-2 text-xs text-[#A1A1AA] cursor-pointer">
                <input
                  type="checkbox"
                  checked={params.preserveMediaColor}
                  onChange={(e) =>
                    onUpdate({preserveMediaColor: e.target.checked})
                  }
                  className="accent-[#E85D2A] rounded"
                />
                <span>Preservar cores originais da mídia</span>
              </label>

              <div>
                <label className="block text-[11px] text-[#A1A1AA] mb-1.5">
                  Blend Mode (Mídia × Tipografia)
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {BLEND_MODE_OPTIONS.map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => onUpdate({mediaBlend: mode.id})}
                      className={`px-2.5 py-1.5 text-[11px] rounded border text-left transition-colors cursor-pointer whitespace-nowrap truncate ${
                        params.mediaBlend === mode.id
                          ? 'bg-[#27272D] border-[#E85D2A] text-[#F4F4F5]'
                          : 'bg-[#1A1A1E] border-[#26262A] text-[#A1A1AA] hover:text-[#F4F4F5]'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              <StudioSlider
                label="Escala da Mídia"
                value={params.mediaScale}
                min={20}
                max={250}
                unit="%"
                onChange={(v) => onUpdate({mediaScale: v})}
              />
              <StudioSlider
                label="Posição X"
                value={params.mediaOffsetX}
                min={-50}
                max={50}
                unit="%"
                onChange={(v) => onUpdate({mediaOffsetX: v})}
              />
              <StudioSlider
                label="Posição Y"
                value={params.mediaOffsetY}
                min={-50}
                max={50}
                unit="%"
                onChange={(v) => onUpdate({mediaOffsetY: v})}
              />
              <StudioSlider
                label="Opacidade"
                value={params.mediaOpacity}
                min={0}
                max={100}
                unit="%"
                onChange={(v) => onUpdate({mediaOpacity: v})}
              />
              <StudioSlider
                label="Contraste Base"
                value={params.mediaContrast}
                min={50}
                max={250}
                unit="%"
                onChange={(v) => onUpdate({mediaContrast: v})}
              />
              <StudioSlider
                label="Limiar Fotocópia (Threshold)"
                value={params.mediaThreshold}
                min={0}
                max={100}
                unit="%"
                onChange={(v) => onUpdate({mediaThreshold: v})}
              />
            </div>
          </>
        )}

        {tab === 'format' && (
          <>
            <div className="space-y-2.5">
              <span className="block text-xs font-semibold text-[#F4F4F5]">
                Proporção & Resolução Base
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.keys(ASPECT_RATIOS) as AspectRatioId[]).map((id) => {
                  const spec = ASPECT_RATIOS[id];
                  const active = params.aspectRatio === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onUpdate({aspectRatio: id})}
                      className={`px-2.5 py-2 rounded border text-left transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#27272D] border-[#E85D2A] text-[#F4F4F5]'
                          : 'bg-[#1A1A1E] border-[#26262A] text-[#A1A1AA] hover:text-[#F4F4F5]'
                      }`}
                    >
                      <div className="text-xs font-medium">{spec.label}</div>
                      <div className="text-[10px] font-mono tabular-nums text-[#71717A]">
                        {spec.width} × {spec.height}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t border-[#242429]">
              <span className="block text-xs font-semibold text-[#F4F4F5]">
                Papel & Tinta
              </span>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
                  <span>Cor do Papel</span>
                  <span className="font-mono text-[11px]">
                    {params.paperColor.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={params.paperColor}
                    onChange={(e) => onUpdate({paperColor: e.target.value})}
                    aria-label="Cor do papel"
                    className="w-7 h-7 rounded border border-[#2E2E35] bg-transparent cursor-pointer"
                  />
                  {PAPER_SWATCHES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => onUpdate({paperColor: c})}
                      aria-label={`Papel ${c}`}
                      style={{backgroundColor: c}}
                      className={`w-6 h-6 rounded border cursor-pointer ${
                        params.paperColor.toLowerCase() === c.toLowerCase()
                          ? 'border-[#E85D2A] scale-110'
                          : 'border-[#3A3A42]'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
                  <span>Cor da Tinta</span>
                  <span className="font-mono text-[11px]">
                    {params.inkColor.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={params.inkColor}
                    onChange={(e) => onUpdate({inkColor: e.target.value})}
                    aria-label="Cor da tinta"
                    className="w-7 h-7 rounded border border-[#2E2E35] bg-transparent cursor-pointer"
                  />
                  {INK_SWATCHES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => onUpdate({inkColor: c})}
                      aria-label={`Tinta ${c}`}
                      style={{backgroundColor: c}}
                      className={`w-6 h-6 rounded border cursor-pointer ${
                        params.inkColor.toLowerCase() === c.toLowerCase()
                          ? 'border-[#E85D2A] scale-110'
                          : 'border-[#3A3A42]'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <label className="inline-flex items-center gap-2 text-xs text-[#A1A1AA] pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={params.invertOutput}
                  onChange={(e) => {
                    const nextInvert = e.target.checked;
                    const patch: Partial<StudioParams> = {
                      invertOutput: nextInvert,
                    };
                    if (
                      nextInvert &&
                      params.textColor.toLowerCase() ===
                        params.inkColor.toLowerCase()
                    ) {
                      patch.textColor = params.paperColor;
                    } else if (
                      !nextInvert &&
                      params.textColor.toLowerCase() ===
                        params.paperColor.toLowerCase()
                    ) {
                      patch.textColor = params.inkColor;
                    }
                    onUpdate(patch);
                  }}
                  className="accent-[#E85D2A] rounded"
                />
                <span>Inverter Impressão (Xerox Negativo)</span>
              </label>
            </div>

            <div className="space-y-2.5 pt-3 border-t border-[#242429]">
              <span className="block text-xs font-semibold text-[#F4F4F5]">
                Estilos das Imagens de Referência
              </span>
              <div className="space-y-2">
                {REFERENCE_PRESETS.map((preset) => {
                  const active = activePresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => onSelectPreset(preset.id)}
                      className={`w-full flex items-center gap-3 p-2 rounded-lg border text-left transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#222228] border-[#E85D2A]'
                          : 'bg-[#18181D] border-[#26262A] hover:border-[#3F3F46]'
                      }`}
                    >
                      {preset.referenceThumb && (
                        <img
                          src={preset.referenceThumb}
                          alt={preset.name}
                          referrerPolicy="no-referrer"
                          className="w-12 h-14 object-cover rounded border border-[#2E2E35] shrink-0"
                        />
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[#F4F4F5] truncate">
                          {preset.name}
                        </div>
                        <div className="text-[11px] text-[#A1A1AA] line-clamp-2 leading-snug mt-0.5">
                          {preset.subtitle}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
};
