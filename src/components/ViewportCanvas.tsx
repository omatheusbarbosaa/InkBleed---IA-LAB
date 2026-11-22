import React, {useEffect, useRef, useState} from 'react';
import {
  Check,
  Dices,
  Flame,
  Layers,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import {
  ASPECT_RATIOS,
  BLEND_MODE_OPTIONS,
  MediaBlendMode,
  StudioParams,
} from '../types/studio';

interface ViewportCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  params: StudioParams;
  onTogglePlay: () => void;
  onRandomizeLight: () => void;
  onRandomizeAggressive: () => void;
  onResetAll: () => void;
  onUploadFile: (file: File) => void;
  onChangeBlendMode: (mode: MediaBlendMode) => void;
  onUpdateText: (patch: Pick<Partial<StudioParams>, 'text' | 'subText' | 'textEnabled'>) => void;
}

export const ViewportCanvas: React.FC<ViewportCanvasProps> = ({
  canvasRef,
  params,
  onTogglePlay,
  onRandomizeLight,
  onRandomizeAggressive,
  onResetAll,
  onUploadFile,
  onChangeBlendMode,
  onUpdateText,
}) => {
  const [dragging, setDragging] = useState(false);
  const [zoomMode, setZoomMode] = useState<'fit' | '75' | '100'>('fit');
  const [editingText, setEditingText] = useState(false);

  const snapshotRef = useRef<{text: string; subText: string}>({
    text: params.text,
    subText: params.subText,
  });
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const spec = ASPECT_RATIOS[params.aspectRatio];

  useEffect(() => {
    if (editingText && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [editingText]);

  const handleOpenInlineEdit = () => {
    snapshotRef.current = {
      text: params.text,
      subText: params.subText,
    };
    if (!params.textEnabled) {
      onUpdateText({textEnabled: true});
    }
    setEditingText(true);
  };

  const handleCommitInlineEdit = () => {
    setEditingText(false);
  };

  const handleCancelInlineEdit = () => {
    onUpdateText({
      text: snapshotRef.current.text,
      subText: snapshotRef.current.subText,
    });
    setEditingText(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
      onUploadFile(file);
    }
  };

  return (
    <main
      className="flex-1 min-w-0 min-h-0 flex flex-col bg-[#0B0B0D] relative"
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      {/* Studio Action Toolbar */}
      <div className="px-4 py-2.5 border-b border-[#222227] bg-[#111114] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRandomizeLight}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#F4F4F5] bg-[#1E1E24] hover:bg-[#282830] border border-[#2E2E36] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Dices className="w-3.5 h-3.5 text-[#A1A1AA]" />
            <span>Randomizar Leve</span>
          </button>

          <button
            type="button"
            onClick={onRandomizeAggressive}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#261915] hover:bg-[#352019] border border-[#E85D2A]/60 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Flame className="w-3.5 h-3.5 text-[#E85D2A]" />
            <span>Randomizar Agressivo</span>
          </button>

          <button
            type="button"
            onClick={onResetAll}
            title="Restaurar padrão inicial"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-[#1C1C22] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Restaurar</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#18181C] border border-[#26262A] rounded-md shrink-0">
            <Layers className="w-3.5 h-3.5 text-[#A1A1AA] shrink-0" />
            <label
              htmlFor="toolbar-blend-mode"
              className="text-[11px] text-[#A1A1AA] whitespace-nowrap hidden xl:inline"
            >
              Blend
            </label>
            <select
              id="toolbar-blend-mode"
              aria-label="Blend Mode"
              value={params.mediaBlend}
              onChange={(e) =>
                onChangeBlendMode(e.target.value as MediaBlendMode)
              }
              className="bg-transparent text-xs font-medium text-[#F4F4F5] focus:outline-none cursor-pointer"
            >
              {BLEND_MODE_OPTIONS.map((mode) => (
                <option
                  key={mode.id}
                  value={mode.id}
                  className="bg-[#16161A] text-[#F4F4F5]"
                >
                  {mode.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={onTogglePlay}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#1B1B20] hover:bg-[#24242B] border border-[#2B2B33] text-[#F4F4F5] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {params.animPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 text-[#E85D2A]" />
                <span>Pausar Movimento</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-[#A1A1AA]" />
                <span>Animar</span>
              </>
            )}
          </button>

          <div className="hidden sm:flex items-center bg-[#18181C] border border-[#26262A] rounded-md p-0.5 text-[11px]">
            {(
              [
                {id: 'fit', label: 'Ajustar'},
                {id: '75', label: '75%'},
                {id: '100', label: '100%'},
              ] as const
            ).map((z) => (
              <button
                key={z.id}
                type="button"
                onClick={() => setZoomMode(z.id)}
                className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                  zoomMode === z.id
                    ? 'bg-[#27272D] text-[#F4F4F5]'
                    : 'text-[#71717A] hover:text-[#F4F4F5]'
                }`}
              >
                {z.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Canvas Stage */}
      <div className="flex-1 min-h-0 overflow-auto studio-scroll flex items-center justify-center p-6 sm:p-8 relative">
        <div
          onDoubleClick={handleOpenInlineEdit}
          title="Duplo clique para editar texto diretamente"
          className="relative shadow-[0_24px_64px_rgba(0,0,0,0.75)] border border-[#26262A] bg-[#161619] cursor-text"
          style={{
            aspectRatio: `${spec.width} / ${spec.height}`,
            height:
              zoomMode === 'fit'
                ? 'min(100%, 76vh)'
                : zoomMode === '75'
                ? '75%'
                : '96%',
            maxWidth: zoomMode === 'fit' ? '100%' : 'none',
          }}
        >
          <canvas
            ref={canvasRef}
            className="w-full h-full block"
            aria-label="Área de composição visual — duplo clique para editar texto"
          />

          {/* Quick Inline Text Editor Overlay */}
          {editingText && (
            <div
              className="absolute inset-0 z-30 bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-4"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  handleCommitInlineEdit();
                }
              }}
              onDoubleClick={(e) => e.stopPropagation()}
            >
              <div className="w-full max-w-sm bg-[#16161A]/95 border border-[#32323A] rounded-xl shadow-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#F4F4F5]">
                    Edição Rápida de Texto
                  </span>
                  <button
                    type="button"
                    onClick={handleCancelInlineEdit}
                    aria-label="Cancelar edição"
                    className="p-1 text-[#A1A1AA] hover:text-[#F4F4F5] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2">
                  <textarea
                    ref={textareaRef}
                    rows={3}
                    value={params.text}
                    onChange={(e) => onUpdateText({text: e.target.value})}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        handleCancelInlineEdit();
                      } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                        e.preventDefault();
                        handleCommitInlineEdit();
                      }
                    }}
                    placeholder="Texto principal..."
                    className="w-full px-3 py-2 text-sm bg-[#0E0E10] border border-[#E85D2A]/70 rounded-md text-[#F4F4F5] placeholder-[#52525B] focus:outline-none focus:border-[#E85D2A] resize-y"
                  />
                  <input
                    type="text"
                    value={params.subText}
                    onChange={(e) => onUpdateText({subText: e.target.value})}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        handleCancelInlineEdit();
                      } else if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCommitInlineEdit();
                      }
                    }}
                    placeholder="Subtítulo / Ficha técnica (opcional)"
                    className="w-full px-3 py-1.5 text-xs bg-[#0E0E10] border border-[#27272C] rounded-md text-[#F4F4F5] placeholder-[#52525B] focus:outline-none focus:border-[#E85D2A]"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-[11px] text-[#71717A]">
                    Ctrl+Enter confirma · Esc cancela
                  </span>
                  <button
                    type="button"
                    onClick={handleCommitInlineEdit}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#E85D2A] hover:bg-[#D44E1E] rounded-md transition-colors cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Concluir</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {dragging && (
          <div className="absolute inset-4 rounded-xl border-2 border-dashed border-[#E85D2A] bg-[#0E0E10]/90 flex flex-col items-center justify-center gap-3 pointer-events-none z-20">
            <Upload className="w-8 h-8 text-[#E85D2A]" />
            <p className="text-sm font-semibold text-[#F4F4F5]">
              Solte a imagem ou vídeo para aplicar os efeitos
            </p>
          </div>
        )}
      </div>

      {/* Clean Unboxed Metadata Footer */}
      <div className="px-5 py-2 border-t border-[#202025] bg-[#101013] flex items-center justify-between text-[11px] text-[#71717A] shrink-0">
        <div className="flex items-center gap-2 font-mono tabular-nums truncate">
          <span>
            {spec.width} × {spec.height} px
          </span>
          <span aria-hidden="true">·</span>
          <span>{spec.label}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate">Fonte: {params.fontFamily}</span>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-[#71717A] shrink-0">
          <span>Duplo clique na arte para editar texto</span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-[#A1A1AA]" />
            <span>WebGL2</span>
          </span>
        </div>
      </div>
    </main>
  );
};
