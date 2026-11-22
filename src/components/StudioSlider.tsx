import React from 'react';

interface StudioSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}

export const StudioSlider: React.FC<StudioSliderProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
}) => {
  const formatted = Number.isInteger(step) ? value.toFixed(0) : value.toFixed(2);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-[#A1A1AA] truncate">{label}</span>
        <span className="font-mono tabular-nums text-[#F4F4F5] shrink-0">
          {formatted}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="studio-slider"
        aria-label={label}
      />
    </div>
  );
};
