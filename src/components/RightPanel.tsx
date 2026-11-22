import React, {useState} from 'react';
import {ChevronDown, ChevronRight, RotateCcw} from 'lucide-react';
import {ScanOverlayId, StudioParams} from '../types/studio';
import {StudioSlider} from './StudioSlider';

interface RightPanelProps {
  params: StudioParams;
  onUpdate: (patch: Partial<StudioParams>) => void;
}

interface SectionProps {
  title: string;
  defaultOpen?: boolean;
  onReset?: () => void;
  children: React.ReactNode;
}

const EffectSection: React.FC<SectionProps> = ({
  title,
  defaultOpen = true,
  onReset,
  children,
}) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-[#242429]">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 text-xs font-semibold tracking-wide text-[#F4F4F5] hover:text-[#E85D2A] transition-colors cursor-pointer"
        >
          {open ? (
            <ChevronDown className="w-3.5 h-3.5 text-[#A1A1AA]" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-[#A1A1AA]" />
          )}
          <span>{title}</span>
        </button>
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            title={`Zerar ${title}`}
            className="inline-flex items-center gap-1 text-[11px] text-[#71717A] hover:text-[#F4F4F5] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Zerar</span>
          </button>
        )}
      </div>
      {open && <div className="px-4 pb-4 space-y-3.5">{children}</div>}
    </div>
  );
};

const SCAN_OPTIONS: Array<{id: ScanOverlayId; label: string}> = [
  {id: 'none', label: 'Nenhum'},
  {id: 'xerox-light', label: 'Xerox Claro'},
  {id: 'xerox-dark', label: 'Xerox Escuro'},
  {id: 'halftone-ref', label: 'Retícula Scan'},
];

export const RightPanel: React.FC<RightPanelProps> = ({params, onUpdate}) => {
  return (
    <aside className="w-full lg:w-[320px] xl:w-[340px] shrink-0 border-t lg:border-t-0 lg:border-l border-[#26262A] bg-[#141417] flex flex-col min-h-0">
      <div className="px-4 py-3 border-b border-[#242429] flex items-center justify-between shrink-0">
        <h2 className="text-xs font-semibold text-[#F4F4F5]">
          Parâmetros de Efeito
        </h2>
        <span className="text-[11px] font-mono tabular-nums text-[#71717A]">
          Seed {params.seed.toFixed(1)}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto studio-scroll">
        {/* 1. INKBLEED */}
        <EffectSection
          title="Inkbleed"
          defaultOpen={true}
          onReset={() =>
            onUpdate({
              inkbleedAmount: 0,
              inkbleedCapillarity: 0,
              inkbleedWash: 0,
              inkbleedStipple: 0,
              inkbleedPooling: 0,
              inkbleedNoiseThreshold: 0,
            })
          }
        >
          <StudioSlider
            label="Sangramento (Spread)"
            value={params.inkbleedAmount}
            min={0}
            max={100}
            unit="%"
            onChange={(v) => onUpdate({inkbleedAmount: v})}
          />
          <StudioSlider
            label="Capilaridade do Papel"
            value={params.inkbleedCapillarity}
            min={0}
            max={100}
            unit="%"
            onChange={(v) => onUpdate({inkbleedCapillarity: v})}
          />
          <StudioSlider
            label="Manchas & Wash"
            value={params.inkbleedWash}
            min={0}
            max={100}
            unit="%"
            onChange={(v) => onUpdate({inkbleedWash: v})}
          />
          <StudioSlider
            label="Stipple de Borda"
            value={params.inkbleedStipple}
            min={0}
            max={100}
            unit="%"
            onChange={(v) => onUpdate({inkbleedStipple: v})}
          />
          <StudioSlider
            label="Noise Threshold (Granulação)"
            value={params.inkbleedNoiseThreshold}
            min={0}
            max={100}
            unit="%"
            onChange={(v) => onUpdate({inkbleedNoiseThreshold: v})}
          />
          <StudioSlider
            label="Acúmulo de Tinta"
            value={params.inkbleedPooling}
            min={0}
            max={100}
            unit="%"
            onChange={(v) => onUpdate({inkbleedPooling: v})}
          />
        </EffectSection>

        {/* 2. TEXTURA DE XEROX */}
        <EffectSection
          title="Textura de Xerox"
          defaultOpen={true}
          onReset={() =>
            onUpdate({
              xeroxGrain: 0,
              xeroxStreaks: 0,
              xeroxDust: 0,
              xeroxContrast: 0,
              paperTooth: 0,
              scanOverlay: 'none',
            })
          }
        >
          <StudioSlider
            label="Grão de Toner"
            value={params.xeroxGrain}
            min={0}
            max={100}
            unit="%"
            onChange={(v) => onUpdate({xeroxGrain: v})}
          />
          <StudioSlider
            label="Listras de Rolo & Scanner"
            value={params.xeroxStreaks}
            min={0}
            max={100}
            unit="%"
            onChange={(v) => onUpdate({xeroxStreaks: v})}
          />
          <StudioSlider
            label="Poeira & Riscos"
            value={params.xeroxDust}
            min={0}
            max={100}
            unit="%"
            onChange={(v) => onUpdate({xeroxDust: v})}
          />
          <StudioSlider
            label="Contraste Fotocópia"
            value={params.xeroxContrast}
            min={0}
            max={100}
            unit="%"
            onChange={(v) => onUpdate({xeroxContrast: v})}
          />
          <StudioSlider
            label="Fibra do Papel"
            value={params.paperTooth}
            min={0}
            max={100}
            unit="%"
            onChange={(v) => onUpdate({paperTooth: v})}
          />

          <div className="pt-1 space-y-2">
            <span className="block text-xs text-[#A1A1AA]">
              Textura Escaneada Real
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {SCAN_OPTIONS.map((opt) => {
                const active = params.scanOverlay === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onUpdate({scanOverlay: opt.id})}
                    className={`px-2.5 py-1.5 text-[11px] font-medium rounded border transition-colors text-left truncate cursor-pointer ${
                      active
                        ? 'bg-[#27272D] border-[#E85D2A] text-[#F4F4F5]'
                        : 'bg-[#1A1A1E] border-[#26262A] text-[#A1A1AA] hover:text-[#F4F4F5]'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {params.scanOverlay !== 'none' && (
              <StudioSlider
                label="Opacidade do Scan"
                value={params.scanOverlayOpacity}
                min={0}
                max={100}
                unit="%"
                onChange={(v) => onUpdate({scanOverlayOpacity: v})}
              />
            )}
          </div>
        </EffectSection>

        {/* 3. DISTRESSED TEXT & HALFTONE */}
        <EffectSection
          title="Distressed Text & Retícula"
          defaultOpen={true}
          onReset={() =>
            onUpdate({
              distressErosion: 0,
              distressDryBrush: 0,
              distressJitter: 0,
              halftoneAmount: 0,
            })
          }
        >
          <StudioSlider
            label="Erosão de Borda"
            value={params.distressErosion}
            min={0}
            max={100}
            unit="%"
            onChange={(v) => onUpdate({distressErosion: v})}
          />
          <StudioSlider
            label="Falhas Dry-Brush"
            value={params.distressDryBrush}
            min={0}
            max={100}
            unit="%"
            onChange={(v) => onUpdate({distressDryBrush: v})}
          />
          <StudioSlider
            label="Distorção / Jitter"
            value={params.distressJitter}
            min={0}
            max={100}
            unit="%"
            onChange={(v) => onUpdate({distressJitter: v})}
          />
          <StudioSlider
            label="Retícula Halftone"
            value={params.halftoneAmount}
            min={0}
            max={100}
            unit="%"
            onChange={(v) => onUpdate({halftoneAmount: v})}
          />
          {params.halftoneAmount > 0 && (
            <>
              <StudioSlider
                label="Tamanho dos Pontos"
                value={params.halftoneScale}
                min={4}
                max={70}
                unit=" pt"
                onChange={(v) => onUpdate({halftoneScale: v})}
              />
              <StudioSlider
                label="Ângulo da Retícula"
                value={params.halftoneAngle}
                min={0}
                max={90}
                unit="°"
                onChange={(v) => onUpdate({halftoneAngle: v})}
              />
            </>
          )}
        </EffectSection>

        {/* 4. MOTION BLUR */}
        <EffectSection
          title="Motion Blur & Arraste"
          defaultOpen={true}
          onReset={() =>
            onUpdate({
              motionBlurAmount: 0,
              motionSpatialGradient: 0,
              motionShearBand: 0,
              motionEcho: 0,
            })
          }
        >
          <StudioSlider
            label="Intensidade do Blur"
            value={params.motionBlurAmount}
            min={0}
            max={100}
            unit="%"
            onChange={(v) => onUpdate({motionBlurAmount: v})}
          />
          <StudioSlider
            label="Ângulo Direcional"
            value={params.motionBlurAngle}
            min={0}
            max={360}
            unit="°"
            onChange={(v) => onUpdate({motionBlurAngle: v})}
          />
          <StudioSlider
            label="Gradiente de Smear"
            value={params.motionSpatialGradient}
            min={0}
            max={100}
            unit="%"
            onChange={(v) => onUpdate({motionSpatialGradient: v})}
          />
          <StudioSlider
            label="Faixa de Cisalhamento"
            value={params.motionShearBand}
            min={0}
            max={100}
            unit="%"
            onChange={(v) => onUpdate({motionShearBand: v})}
          />
          {params.motionShearBand > 0 && (
            <StudioSlider
              label="Posição da Faixa"
              value={params.motionShearPos}
              min={5}
              max={95}
              unit="%"
              onChange={(v) => onUpdate({motionShearPos: v})}
            />
          )}
          <StudioSlider
            label="Eco / Rastro Fantasma"
            value={params.motionEcho}
            min={0}
            max={100}
            unit="%"
            onChange={(v) => onUpdate({motionEcho: v})}
          />
        </EffectSection>

        {/* 5. ANIMAÇÃO PARA VÍDEO */}
        <EffectSection
          title="Movimento Generativo"
          defaultOpen={false}
          onReset={() =>
            onUpdate({
              animMotionSweep: 0,
              animInkPulse: 0,
              animXeroxFlicker: 0,
            })
          }
        >
          <StudioSlider
            label="Velocidade"
            value={params.animSpeed}
            min={10}
            max={200}
            unit="%"
            onChange={(v) => onUpdate({animSpeed: v})}
          />
          <StudioSlider
            label="Oscilação Motion Blur"
            value={params.animMotionSweep}
            min={0}
            max={100}
            unit="%"
            onChange={(v) => onUpdate({animMotionSweep: v})}
          />
          <StudioSlider
            label="Pulso de Inkbleed"
            value={params.animInkPulse}
            min={0}
            max={100}
            unit="%"
            onChange={(v) => onUpdate({animInkPulse: v})}
          />
          <StudioSlider
            label="Tremor Xerox"
            value={params.animXeroxFlicker}
            min={0}
            max={100}
            unit="%"
            onChange={(v) => onUpdate({animXeroxFlicker: v})}
          />
        </EffectSection>
      </div>
    </aside>
  );
};
