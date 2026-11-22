import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ChevronDown, Pipette} from 'lucide-react';

interface ColorPickerControlProps {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  swatches?: string[];
  defaultOpen?: boolean;
  compact?: boolean;
}

interface HSV {
  h: number; // 0..360
  s: number; // 0..100
  v: number; // 0..100
}

function normalizeHex(raw: string): string | null {
  const cleaned = raw.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(cleaned)) {
    const expanded = cleaned
      .split('')
      .map((c) => c + c)
      .join('');
    return `#${expanded.toUpperCase()}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return `#${cleaned.toUpperCase()}`;
  }
  return null;
}

function hexToRgb(hex: string): [number, number, number] {
  const norm = normalizeHex(hex) ?? '#131416';
  const r = parseInt(norm.slice(1, 3), 16);
  const g = parseInt(norm.slice(3, 5), 16);
  const b = parseInt(norm.slice(5, 7), 16);
  return [r, g, b];
}

function hexToHsv(hex: string): HSV {
  const [rRaw, gRaw, bRaw] = hexToRgb(hex);
  const r = rRaw / 255;
  const g = gRaw / 255;
  const b = bRaw / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    if (max === r) {
      h = ((g - b) / d) % 6;
    } else if (max === g) {
      h = (b - r) / d + 2;
    } else {
      h = (r - g) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : (d / max) * 100;
  const v = max * 100;
  return {h, s, v};
}

function hsvToHex(h: number, s: number, v: number): string {
  const sNorm = Math.max(0, Math.min(100, s)) / 100;
  const vNorm = Math.max(0, Math.min(100, v)) / 100;
  const hWrapped = ((h % 360) + 360) % 360;

  const c = vNorm * sNorm;
  const x = c * (1 - Math.abs(((hWrapped / 60) % 2) - 1));
  const m = vNorm - c;

  let r = 0;
  let g = 0;
  let b = 0;

  if (hWrapped < 60) {
    r = c;
    g = x;
  } else if (hWrapped < 120) {
    r = x;
    g = c;
  } else if (hWrapped < 180) {
    g = c;
    b = x;
  } else if (hWrapped < 240) {
    g = x;
    b = c;
  } else if (hWrapped < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  const toHex = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, '0')
      .toUpperCase();

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export const ColorPickerControl: React.FC<ColorPickerControlProps> = ({
  label,
  value,
  onChange,
  swatches,
  defaultOpen = false,
  compact = false,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const [hexDraft, setHexDraft] = useState(value.toUpperCase());
  const [hsv, setHsv] = useState<HSV>(() => hexToHsv(value));
  const svBoxRef = useRef<HTMLDivElement | null>(null);
  const hueBarRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const normalized = normalizeHex(value) ?? value.toUpperCase();
    setHexDraft(normalized);
    const parsed = hexToHsv(normalized);
    setHsv((prev) => ({
      h: parsed.s > 1 && parsed.v > 1 ? parsed.h : prev.h,
      s: parsed.s,
      v: parsed.v,
    }));
  }, [value]);

  const commitHsv = useCallback(
    (next: HSV) => {
      setHsv(next);
      const nextHex = hsvToHex(next.h, next.s, next.v);
      setHexDraft(nextHex);
      onChange(nextHex);
    },
    [onChange]
  );

  const handleSvPointer = useCallback(
    (clientX: number, clientY: number) => {
      const box = svBoxRef.current;
      if (!box) return;
      const rect = box.getBoundingClientRect();
      const s = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * 100;
      const v =
        (1 - Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))) * 100;
      commitHsv({h: hsv.h, s, v});
    },
    [commitHsv, hsv.h]
  );

  const handleHuePointer = useCallback(
    (clientX: number) => {
      const bar = hueBarRef.current;
      if (!bar) return;
      const rect = bar.getBoundingClientRect();
      const h =
        Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * 360;
      commitHsv({h, s: hsv.s, v: hsv.v});
    },
    [commitHsv, hsv.s, hsv.v]
  );

  const startDrag = (
    e: React.PointerEvent,
    moveFn: (clientX: number, clientY: number) => void
  ) => {
    e.preventDefault();
    moveFn(e.clientX, e.clientY);

    const onMove = (ev: PointerEvent) => moveFn(ev.clientX, ev.clientY);
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setHexDraft(next);
    const valid = normalizeHex(next);
    if (valid) {
      onChange(valid);
    }
  };

  const handleHexBlur = () => {
    const valid = normalizeHex(hexDraft);
    if (valid) {
      setHexDraft(valid);
      onChange(valid);
    } else {
      setHexDraft((normalizeHex(value) ?? value).toUpperCase());
    }
  };

  const pureHueHex = hsvToHex(hsv.h, 100, 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-[#A1A1AA] truncate">{label}</span>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Interactive toggle swatch */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={`Abrir seletor livre para ${label}`}
            aria-expanded={open}
            className={`inline-flex items-center gap-1.5 px-1.5 py-1 rounded border transition-colors cursor-pointer ${
              open
                ? 'bg-[#222228] border-[#E85D2A]'
                : 'bg-[#0E0E10] border-[#2C2C34] hover:border-[#4A4A56]'
            }`}
          >
            <span
              className="w-4 h-4 rounded-sm border border-white/20 shrink-0"
              style={{backgroundColor: value}}
            />
            <ChevronDown
              className={`w-3 h-3 text-[#A1A1AA] transition-transform ${
                open ? 'rotate-180 text-[#F4F4F5]' : ''
              }`}
            />
          </button>

          {/* Editable HEX input */}
          <input
            type="text"
            value={hexDraft}
            onChange={handleHexInputChange}
            onBlur={handleHexBlur}
            maxLength={7}
            spellCheck={false}
            aria-label={`Código hexadecimal de ${label}`}
            className="w-[74px] px-2 py-1 text-[11px] font-mono tabular-nums uppercase bg-[#0E0E10] border border-[#27272C] rounded text-[#F4F4F5] focus:outline-none focus:border-[#E85D2A]"
          />

          {/* Native OS picker shortcut */}
          <label
            title="Seletor do sistema"
            className="relative w-7 h-7 flex items-center justify-center rounded border border-[#2C2C34] bg-[#0E0E10] hover:border-[#E85D2A] text-[#A1A1AA] hover:text-[#F4F4F5] cursor-pointer transition-colors"
          >
            <Pipette className="w-3.5 h-3.5" />
            <input
              type="color"
              value={normalizeHex(value) ?? '#131416'}
              onChange={(e) => onChange(e.target.value.toUpperCase())}
              aria-label={`Seletor nativo de ${label}`}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            />
          </label>
        </div>
      </div>

      {open && (
        <div className="p-2.5 rounded-lg bg-[#0E0E10] border border-[#27272E] space-y-2.5">
          {/* 2D Saturation / Brightness Field */}
          <div
            ref={svBoxRef}
            onPointerDown={(e) => startDrag(e, handleSvPointer)}
            className={`relative w-full ${
              compact ? 'h-28' : 'h-36'
            } rounded-md overflow-hidden cursor-crosshair select-none touch-none border border-[#26262C]`}
            style={{backgroundColor: pureHueHex}}
          >
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(to right, #ffffff, rgba(255,255,255,0))',
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(to top, #000000, rgba(0,0,0,0))',
              }}
            />
            <div
              className="absolute w-3.5 h-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.7)] pointer-events-none"
              style={{
                left: `${hsv.s}%`,
                top: `${100 - hsv.v}%`,
                backgroundColor: value,
              }}
            />
          </div>

          {/* 1D Hue Spectrum Slider */}
          <div
            ref={hueBarRef}
            onPointerDown={(e) => startDrag(e, (cx) => handleHuePointer(cx))}
            className="relative w-full h-3 rounded-full cursor-ew-resize select-none touch-none border border-[#26262C]"
            style={{
              background:
                'linear-gradient(to right, #FF0000 0%, #FFFF00 17%, #00FF00 33%, #00FFFF 50%, #0000FF 67%, #FF00FF 83%, #FF0000 100%)',
            }}
          >
            <div
              className="absolute top-1/2 w-3.5 h-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.75)] pointer-events-none"
              style={{
                left: `${(hsv.h / 360) * 100}%`,
                backgroundColor: pureHueHex,
              }}
            />
          </div>

          {swatches && swatches.length > 0 && (
            <div className="flex items-center gap-1.5 pt-0.5">
              {swatches.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onChange(c.toUpperCase())}
                  aria-label={`Amostra ${c}`}
                  style={{backgroundColor: c}}
                  className={`w-5 h-5 rounded border cursor-pointer transition-transform ${
                    value.toLowerCase() === c.toLowerCase()
                      ? 'border-[#E85D2A] scale-110'
                      : 'border-[#3A3A42]'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
