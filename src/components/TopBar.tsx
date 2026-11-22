import React from 'react';
import {Download} from 'lucide-react';
import {REFERENCE_PRESETS} from '../data/presets';

interface TopBarProps {
  activePresetId: string | null;
  onSelectPreset: (presetId: string) => void;
  onOpenExport: () => void;
}

const QUICK_NAV_IDS = [
  'inkbleed-editorial',
  'moon-beats-grid',
  'nothing-smear',
  'xerox-darkroom',
];

export const TopBar: React.FC<TopBarProps> = ({
  activePresetId,
  onSelectPreset,
  onOpenExport,
}) => {
  const quickPresets = QUICK_NAV_IDS.map((id) =>
    REFERENCE_PRESETS.find((p) => p.id === id)
  ).filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <header className="h-14 px-6 border-b border-[#26262A] bg-[#121215] flex items-center justify-between gap-8 shrink-0">
      {/* Zone 1: Single-element brand wordmark */}
      <span className="font-display text-lg font-bold tracking-tight text-[#F4F4F5] whitespace-nowrap shrink-0">
        Prelo Studio
      </span>

      {/* Zone 2: 4 concise single-line preset links */}
      <nav
        aria-label="Estilos rápidos"
        className="hidden md:flex items-center gap-6 text-sm font-medium"
      >
        {quickPresets.map((preset) => {
          const isActive = activePresetId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectPreset(preset.id)}
              className={`whitespace-nowrap shrink-0 py-1 transition-colors border-b ${
                isActive
                  ? 'text-[#F4F4F5] border-[#E85D2A]'
                  : 'text-[#A1A1AA] border-transparent hover:text-[#F4F4F5] hover:border-[#3F3F46]'
              }`}
            >
              {preset.name}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="shrink-0">
        <button
          type="button"
          onClick={onOpenExport}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#E85D2A] hover:bg-[#D44E1E] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E85D2A]"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exportar Mídia</span>
        </button>
      </div>
    </header>
  );
};
