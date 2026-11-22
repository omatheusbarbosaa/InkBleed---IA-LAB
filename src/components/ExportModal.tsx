import React, {useMemo, useRef, useState} from 'react';
import {Download, Film, Image as ImageIcon, Loader2, X} from 'lucide-react';
import {StudioRenderer} from '../engine/StudioRenderer';
import {ASPECT_RATIOS, StudioParams, UploadedMedia} from '../types/studio';

interface ExportModalProps {
  isOpen: boolean;
  params: StudioParams;
  media: UploadedMedia | null;
  onClose: () => void;
}

type ExportTab = 'image' | 'video';

function detectBestVideoMime(): {mime: string; ext: 'mp4' | 'webm'; label: string}[] {
  const candidates: Array<{mime: string; ext: 'mp4' | 'webm'; label: string}> = [
    {mime: 'video/mp4;codecs=avc1.42E01E', ext: 'mp4', label: 'MP4 (H.264)'},
    {mime: 'video/mp4', ext: 'mp4', label: 'MP4'},
    {mime: 'video/webm;codecs=vp9', ext: 'webm', label: 'WebM (VP9 Alta Qualidade)'},
    {mime: 'video/webm;codecs=vp8', ext: 'webm', label: 'WebM (VP8)'},
    {mime: 'video/webm', ext: 'webm', label: 'WebM'},
  ];
  if (typeof MediaRecorder === 'undefined') return [];
  return candidates.filter((c) => MediaRecorder.isTypeSupported(c.mime));
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  params,
  media,
  onClose,
}) => {
  const [tab, setTab] = useState<ExportTab>('image');

  // Static image options
  const [imageFormat, setImageFormat] = useState<'png' | 'jpeg'>('png');
  const [imageScale, setImageScale] = useState<1 | 1.5 | 2>(1.5);
  const [exportingImage, setExportingImage] = useState(false);

  // Video options
  const supportedVideoFormats = useMemo(() => detectBestVideoMime(), []);
  const [selectedMime, setSelectedMime] = useState<string>(
    () => supportedVideoFormats[0]?.mime ?? 'video/webm'
  );
  const [videoDuration, setVideoDuration] = useState<number>(5);
  const [videoFps, setVideoFps] = useState<30 | 60>(30);
  const [videoResScale, setVideoResScale] = useState<0.6 | 0.85 | 1>(0.85);
  const [recording, setRecording] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cancelRef = useRef(false);

  if (!isOpen) return null;

  const baseSpec = ASPECT_RATIOS[params.aspectRatio];
  const outImgW = Math.round(baseSpec.width * imageScale);
  const outImgH = Math.round(baseSpec.height * imageScale);

  const outVidW = Math.round((baseSpec.width * videoResScale) / 2) * 2;
  const outVidH = Math.round((baseSpec.height * videoResScale) / 2) * 2;

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  const handleExportImage = async () => {
    setErrorMsg(null);
    setExportingImage(true);
    try {
      const offscreen = document.createElement('canvas');
      offscreen.width = outImgW;
      offscreen.height = outImgH;
      const renderer = new StudioRenderer(offscreen);
      await renderer.waitForAssets();
      renderer.render(params, media, 0, outImgW, outImgH);

      const mime = imageFormat === 'png' ? 'image/png' : 'image/jpeg';
      const quality = imageFormat === 'png' ? 1 : 0.96;

      const blob = await new Promise<Blob | null>((resolve) =>
        offscreen.toBlob((b) => resolve(b), mime, quality)
      );
      renderer.dispose();

      if (!blob) {
        throw new Error('Não foi possível gerar o arquivo de imagem.');
      }
      triggerDownload(
        blob,
        `prelo-studio-${outImgW}x${outImgH}.${imageFormat === 'png' ? 'png' : 'jpg'}`
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Erro ao exportar imagem.'
      );
    } finally {
      setExportingImage(false);
    }
  };

  const handleExportVideo = async () => {
    setErrorMsg(null);
    if (typeof MediaRecorder === 'undefined') {
      setErrorMsg('Gravação de vídeo não suportada neste navegador.');
      return;
    }

    cancelRef.current = false;
    setRecording(true);
    setProgress(0);

    const offscreen = document.createElement('canvas');
    offscreen.width = outVidW;
    offscreen.height = outVidH;

    let renderer: StudioRenderer | null = null;
    let recorder: MediaRecorder | null = null;

    try {
      renderer = new StudioRenderer(offscreen);
      await renderer.waitForAssets();

      // Ensure video media is playing from start during export if present
      if (media?.kind === 'video') {
        const vid = media.element as HTMLVideoElement;
        vid.currentTime = 0;
        await vid.play().catch(() => undefined);
      }

      const stream = offscreen.captureStream(videoFps);
      const formatMeta =
        supportedVideoFormats.find((f) => f.mime === selectedMime) ??
        supportedVideoFormats[0];
      const mimeToUse = formatMeta?.mime ?? 'video/webm';
      const ext = formatMeta?.ext ?? 'webm';

      recorder = new MediaRecorder(stream, {
        mimeType: mimeToUse,
        videoBitsPerSecond: 18_000_000,
      });

      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          chunks.push(ev.data);
        }
      };

      const stoppedPromise = new Promise<Blob>((resolve) => {
        if (!recorder) return;
        recorder.onstop = () => {
          resolve(new Blob(chunks, {type: mimeToUse}));
        };
      });

      // Render initial frame before starting
      renderer.render(params, media, 0, outVidW, outVidH);
      recorder.start(250);

      const startTime = performance.now();
      const totalMs = videoDuration * 1000;

      await new Promise<void>((resolve) => {
        const step = (now: number) => {
          if (cancelRef.current) {
            resolve();
            return;
          }
          const elapsed = now - startTime;
          const pct = Math.min(100, (elapsed / totalMs) * 100);
          setProgress(pct);

          renderer?.render(params, media, elapsed / 1000, outVidW, outVidH);

          if (elapsed >= totalMs) {
            resolve();
          } else {
            requestAnimationFrame(step);
          }
        };
        requestAnimationFrame(step);
      });

      if (recorder.state !== 'inactive') {
        recorder.stop();
      }
      const videoBlob = await stoppedPromise;

      if (!cancelRef.current) {
        triggerDownload(
          videoBlob,
          `prelo-studio-${outVidW}x${outVidH}-${videoDuration}s.${ext}`
        );
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Erro ao gravar vídeo.'
      );
    } finally {
      if (recorder && recorder.state !== 'inactive') {
        recorder.stop();
      }
      renderer?.dispose();
      setRecording(false);
      setProgress(0);
    }
  };

  const handleCancelRecording = () => {
    cancelRef.current = true;
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
    >
      <div className="w-full max-w-md bg-[#16161A] border border-[#2A2A32] rounded-xl shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#24242B] flex items-center justify-between">
          <h2
            id="export-modal-title"
            className="text-sm font-semibold text-[#F4F4F5]"
          >
            Exportar Composição
          </h2>
          <button
            type="button"
            onClick={() => {
              if (!recording) onClose();
            }}
            disabled={recording}
            aria-label="Fechar janela de exportação"
            className="p-1 text-[#A1A1AA] hover:text-[#F4F4F5] disabled:opacity-40 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Export Mode Tabs */}
        <div className="px-5 pt-4">
          <div className="grid grid-cols-2 gap-1 p-1 bg-[#0E0E10] rounded-lg border border-[#242429]">
            <button
              type="button"
              disabled={recording}
              onClick={() => setTab('image')}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                tab === 'image'
                  ? 'bg-[#24242B] text-[#F4F4F5]'
                  : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Imagem Alta Res</span>
            </button>
            <button
              type="button"
              disabled={recording}
              onClick={() => setTab('video')}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                tab === 'video'
                  ? 'bg-[#24242B] text-[#F4F4F5]'
                  : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Vídeo Animado</span>
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {tab === 'image' ? (
            <>
              <div className="space-y-2">
                <span className="block text-xs text-[#A1A1AA]">Formato</span>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      {id: 'png', label: 'PNG (Sem Perdas)'},
                      {id: 'jpeg', label: 'JPEG (Alta Qualidade)'},
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setImageFormat(f.id)}
                      className={`px-3 py-2 text-xs font-medium rounded-md border text-left cursor-pointer ${
                        imageFormat === f.id
                          ? 'bg-[#25252C] border-[#E85D2A] text-[#F4F4F5]'
                          : 'bg-[#111114] border-[#26262A] text-[#A1A1AA]'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="block text-xs text-[#A1A1AA]">
                  Escala de Resolução
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {([1, 1.5, 2] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setImageScale(s)}
                      className={`px-3 py-2 rounded-md border text-left cursor-pointer ${
                        imageScale === s
                          ? 'bg-[#25252C] border-[#E85D2A] text-[#F4F4F5]'
                          : 'bg-[#111114] border-[#26262A] text-[#A1A1AA]'
                      }`}
                    >
                      <div className="text-xs font-semibold font-mono tabular-nums">
                        {s}×
                      </div>
                      <div className="text-[10px] font-mono tabular-nums text-[#71717A]">
                        {Math.round(baseSpec.width * s)}×
                        {Math.round(baseSpec.height * s)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs text-[#A1A1AA] border-t border-[#24242B]">
                <span>Dimensão Final</span>
                <span className="font-mono tabular-nums text-[#F4F4F5]">
                  {outImgW} × {outImgH} px
                </span>
              </div>

              {errorMsg && (
                <p className="text-xs text-[#EF4444]">{errorMsg}</p>
              )}

              <button
                type="button"
                disabled={exportingImage}
                onClick={handleExportImage}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-white bg-[#E85D2A] hover:bg-[#D44E1E] disabled:opacity-50 rounded-md transition-colors cursor-pointer"
              >
                {exportingImage ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Renderizando Alta Resolução...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Baixar {imageFormat.toUpperCase()}</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <span className="block text-xs text-[#A1A1AA]">
                  Formato de Vídeo
                </span>
                <select
                  value={selectedMime}
                  disabled={recording}
                  onChange={(e) => setSelectedMime(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#0E0E10] border border-[#27272C] rounded-md text-[#F4F4F5]"
                >
                  {supportedVideoFormats.map((f) => (
                    <option key={f.mime} value={f.mime}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <span className="block text-xs text-[#A1A1AA]">Duração</span>
                  <div className="grid grid-cols-4 gap-1">
                    {[3, 5, 8, 12].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        disabled={recording}
                        onClick={() => setVideoDuration(sec)}
                        className={`py-1.5 text-xs font-mono tabular-nums rounded border cursor-pointer ${
                          videoDuration === sec
                            ? 'bg-[#25252C] border-[#E85D2A] text-[#F4F4F5]'
                            : 'bg-[#111114] border-[#26262A] text-[#A1A1AA]'
                        }`}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="block text-xs text-[#A1A1AA]">FPS</span>
                  <div className="grid grid-cols-2 gap-1">
                    {([30, 60] as const).map((fps) => (
                      <button
                        key={fps}
                        type="button"
                        disabled={recording}
                        onClick={() => setVideoFps(fps)}
                        className={`py-1.5 text-xs font-mono tabular-nums rounded border cursor-pointer ${
                          videoFps === fps
                            ? 'bg-[#25252C] border-[#E85D2A] text-[#F4F4F5]'
                            : 'bg-[#111114] border-[#26262A] text-[#A1A1AA]'
                        }`}
                      >
                        {fps} FPS
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <span className="block text-xs text-[#A1A1AA]">Resolução</span>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      {scale: 0.6, label: 'Média'},
                      {scale: 0.85, label: 'Alta'},
                      {scale: 1, label: 'Nativa'},
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.scale}
                      type="button"
                      disabled={recording}
                      onClick={() => setVideoResScale(opt.scale)}
                      className={`px-3 py-2 rounded-md border text-left cursor-pointer ${
                        videoResScale === opt.scale
                          ? 'bg-[#25252C] border-[#E85D2A] text-[#F4F4F5]'
                          : 'bg-[#111114] border-[#26262A] text-[#A1A1AA]'
                      }`}
                    >
                      <div className="text-xs font-medium">{opt.label}</div>
                      <div className="text-[10px] font-mono tabular-nums text-[#71717A]">
                        {Math.round((baseSpec.width * opt.scale) / 2) * 2}×
                        {Math.round((baseSpec.height * opt.scale) / 2) * 2}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {recording && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#A1A1AA]">
                      Gravando quadro a quadro...
                    </span>
                    <span className="font-mono tabular-nums text-[#F4F4F5]">
                      {Math.round(progress)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#0E0E10] rounded-full overflow-hidden border border-[#27272C]">
                    <div
                      className="h-full bg-[#E85D2A] transition-[width] duration-100"
                      style={{width: `${progress}%`}}
                    />
                  </div>
                </div>
              )}

              {errorMsg && (
                <p className="text-xs text-[#EF4444]">{errorMsg}</p>
              )}

              {recording ? (
                <button
                  type="button"
                  onClick={handleCancelRecording}
                  className="w-full py-2.5 px-4 text-xs font-semibold text-[#F4F4F5] bg-[#27272E] hover:bg-[#32323B] rounded-md transition-colors cursor-pointer"
                >
                  Cancelar Gravação
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleExportVideo}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-white bg-[#E85D2A] hover:bg-[#D44E1E] rounded-md transition-colors cursor-pointer"
                >
                  <Film className="w-4 h-4" />
                  <span>
                    Renderizar & Baixar Vídeo ({outVidW}×{outVidH})
                  </span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
