import {useCallback, useEffect, useRef, useState} from 'react';
import {ExportModal} from './components/ExportModal';
import {LeftPanel} from './components/LeftPanel';
import {RightPanel} from './components/RightPanel';
import {TopBar} from './components/TopBar';
import {ViewportCanvas} from './components/ViewportCanvas';
import {
  DEFAULT_PARAMS,
  REFERENCE_PRESETS,
  randomizeStudioParams,
} from './data/presets';
import {StudioRenderer} from './engine/StudioRenderer';
import {ASPECT_RATIOS, StudioParams, UploadedMedia} from './types/studio';
import {loadGoogleFont} from './utils/googleFonts';

function getPreviewDimensions(params: StudioParams): [number, number] {
  const spec = ASPECT_RATIOS[params.aspectRatio];
  const maxSide = 1080;
  const scale = Math.min(1, maxSide / Math.max(spec.width, spec.height));
  return [Math.round(spec.width * scale), Math.round(spec.height * scale)];
}

export default function App() {
  const [params, setParams] = useState<StudioParams>(DEFAULT_PARAMS);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [media, setMedia] = useState<UploadedMedia | null>(null);
  const [fontLoading, setFontLoading] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [webglError, setWebglError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<StudioRenderer | null>(null);
  const paramsRef = useRef<StudioParams>(params);
  const mediaRef = useRef<UploadedMedia | null>(media);
  const timeRef = useRef<number>(0);
  const lastTickRef = useRef<number>(performance.now());

  paramsRef.current = params;
  mediaRef.current = media;

  const drawSingleFrame = useCallback(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    const cur = paramsRef.current;
    const [w, h] = getPreviewDimensions(cur);
    renderer.render(cur, mediaRef.current, timeRef.current, w, h);
  }, []);

  // Initialize WebGL2 Renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const renderer = new StudioRenderer(canvas, () => {
        drawSingleFrame();
      });
      rendererRef.current = renderer;
      setWebglError(null);
      drawSingleFrame();
      return () => {
        renderer.dispose();
        rendererRef.current = null;
      };
    } catch (err) {
      setWebglError(
        err instanceof Error
          ? err.message
          : 'Não foi possível inicializar o motor gráfico WebGL2.'
      );
    }
  }, [drawSingleFrame]);

  // Preload starter Google Fonts on mount
  useEffect(() => {
    const starterFonts = [
      DEFAULT_PARAMS.fontFamily,
      'Big Shoulders Display',
      'Six Caps',
      'Oswald',
      'Syne',
      'Unbounded',
      'Space Mono',
    ];
    Promise.all(starterFonts.map((f) => loadGoogleFont(f))).then(() => {
      rendererRef.current?.invalidateTextCache();
      drawSingleFrame();
    });
  }, [drawSingleFrame]);

  // Animation & live video render loop
  useEffect(() => {
    let rafId = 0;
    lastTickRef.current = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - lastTickRef.current) / 1000);
      lastTickRef.current = now;

      const cur = paramsRef.current;
      const curMedia = mediaRef.current;
      const hasPlayingVideo =
        curMedia?.kind === 'video' &&
        !(curMedia.element as HTMLVideoElement).paused;

      if (cur.animPlaying) {
        timeRef.current += dt;
      }

      if (cur.animPlaying || hasPlayingVideo) {
        const [w, h] = getPreviewDimensions(cur);
        rendererRef.current?.render(cur, curMedia, timeRef.current, w, h);
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Re-render immediately whenever params or media change (especially when paused)
  useEffect(() => {
    drawSingleFrame();
  }, [params, media, drawSingleFrame]);

  const handleUpdate = useCallback((patch: Partial<StudioParams>) => {
    setParams((prev) => ({...prev, ...patch}));
  }, []);

  const handleSelectFont = useCallback(
    async (family: string) => {
      setFontLoading(true);
      setParams((prev) => ({...prev, fontFamily: family}));
      await loadGoogleFont(family);
      setFontLoading(false);
      rendererRef.current?.invalidateTextCache();
      drawSingleFrame();
    },
    [drawSingleFrame]
  );

  const handleSelectPreset = useCallback(
    async (presetId: string) => {
      const preset = REFERENCE_PRESETS.find((p) => p.id === presetId);
      if (!preset) return;
      setActivePresetId(presetId);

      const nextFont = preset.params.fontFamily;
      if (nextFont) {
        setFontLoading(true);
        await loadGoogleFont(nextFont);
        setFontLoading(false);
      }

      setParams((prev) => ({
        ...prev,
        ...preset.params,
      }));
      rendererRef.current?.invalidateTextCache();
    },
    []
  );

  const handleRandomizeLight = useCallback(() => {
    setActivePresetId(null);
    setParams((prev) => randomizeStudioParams(prev, 'light'));
  }, []);

  const handleRandomizeAggressive = useCallback(async () => {
    setActivePresetId(null);
    const next = randomizeStudioParams(paramsRef.current, 'aggressive');
    setParams(next);
    if (next.fontFamily) {
      setFontLoading(true);
      await loadGoogleFont(next.fontFamily);
      setFontLoading(false);
      rendererRef.current?.invalidateTextCache();
      drawSingleFrame();
    }
  }, [drawSingleFrame]);

  const handleResetAll = useCallback(async () => {
    setActivePresetId('inkbleed-editorial');
    await loadGoogleFont(DEFAULT_PARAMS.fontFamily);
    setParams(DEFAULT_PARAMS);
    rendererRef.current?.invalidateTextCache();
  }, []);

  const releaseMedia = useCallback((oldMedia: UploadedMedia | null) => {
    if (!oldMedia) return;
    if (oldMedia.kind === 'video') {
      const vid = oldMedia.element as HTMLVideoElement;
      vid.pause();
      vid.src = '';
    }
    if (oldMedia.url.startsWith('blob:')) {
      URL.revokeObjectURL(oldMedia.url);
    }
  }, []);

  const handleUploadFile = useCallback(
    (file: File) => {
      const objectUrl = URL.createObjectURL(file);
      const id = `${file.name}-${Date.now()}`;

      if (file.type.startsWith('video/')) {
        const video = document.createElement('video');
        video.src = objectUrl;
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.crossOrigin = 'anonymous';
        video.onloadeddata = () => {
          video.play().catch(() => undefined);
          setMedia((prev) => {
            releaseMedia(prev);
            return {
              id,
              name: file.name,
              kind: 'video',
              url: objectUrl,
              width: video.videoWidth || 1280,
              height: video.videoHeight || 720,
              element: video,
            };
          });
        };
      } else {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          setMedia((prev) => {
            releaseMedia(prev);
            return {
              id,
              name: file.name,
              kind: 'image',
              url: objectUrl,
              width: img.naturalWidth,
              height: img.naturalHeight,
              element: img,
            };
          });
        };
        img.src = objectUrl;
      }
    },
    [releaseMedia]
  );

  const handleLoadBuiltInMedia = useCallback(
    (url: string, label: string) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        setMedia((prev) => {
          releaseMedia(prev);
          return {
            id: `builtin-${url}-${Date.now()}`,
            name: label,
            kind: 'image',
            url,
            width: img.naturalWidth,
            height: img.naturalHeight,
            element: img,
          };
        });
      };
      img.src = url;
    },
    [releaseMedia]
  );

  const handleClearMedia = useCallback(() => {
    setMedia((prev) => {
      releaseMedia(prev);
      return null;
    });
  }, [releaseMedia]);

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden flex flex-col bg-[#0E0E10] text-[#F4F4F5]">
      <TopBar
        activePresetId={activePresetId}
        onSelectPreset={handleSelectPreset}
        onOpenExport={() => setExportOpen(true)}
      />

      {webglError ? (
        <div className="flex-1 flex items-center justify-center p-8 text-center">
          <div className="max-w-md space-y-2 p-6 rounded-xl bg-[#16161A] border border-[#2A2A32]">
            <h1 className="text-base font-semibold text-[#F4F4F5]">
              WebGL2 Indisponível
            </h1>
            <p className="text-xs text-[#A1A1AA]">{webglError}</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col lg:flex-row min-h-0">
          <LeftPanel
            params={params}
            media={media}
            activePresetId={activePresetId}
            fontLoading={fontLoading}
            onUpdate={handleUpdate}
            onSelectFont={handleSelectFont}
            onSelectPreset={handleSelectPreset}
            onUploadFile={handleUploadFile}
            onLoadBuiltInMedia={handleLoadBuiltInMedia}
            onClearMedia={handleClearMedia}
          />

          <ViewportCanvas
            canvasRef={canvasRef}
            params={params}
            onTogglePlay={() =>
              handleUpdate({animPlaying: !params.animPlaying})
            }
            onRandomizeLight={handleRandomizeLight}
            onRandomizeAggressive={handleRandomizeAggressive}
            onResetAll={handleResetAll}
            onUploadFile={handleUploadFile}
            onChangeBlendMode={(mediaBlend) => handleUpdate({mediaBlend})}
            onUpdateText={(patch) => handleUpdate(patch)}
          />

          <RightPanel params={params} onUpdate={handleUpdate} />
        </div>
      )}

      <ExportModal
        isOpen={exportOpen}
        params={params}
        media={media}
        onClose={() => setExportOpen(false)}
      />
    </div>
  );
}
