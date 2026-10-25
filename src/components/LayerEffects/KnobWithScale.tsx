/**
 * Photorealistic Hardware Knob with Silk-Screened Faceplate Scale
 * Accurately replicates the Nord Stage 4 rotary potentiometers:
 * - Radial silk-screened markings (0-10, -15 to +15, or frequency scale 200-8k)
 * - Matte black ribbed skirt with bright white indicator notch
 * - Mouse drag (vertical) + Mouse Wheel support + Touch support
 * - Arrow keys for fine-tuning
 * - Double click to reset
 * - Right click for MIDI Learn
 * - Dynamic tooltip with formatted engineering values
 */

import React, { useRef, useState } from 'react';

export type ScaleType = '0_to_10' | 'minus15_to_15' | 'freq_scale';

interface KnobWithScaleProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  defaultValue?: number;
  unit?: string;
  scaleType?: ScaleType;
  subLabelComponent?: React.ReactNode;
  midiLearnId?: string;
  isMidiMapped?: boolean;
  midiCc?: number;
  onMidiLearn?: (id: string, label: string) => void;
  onChange: (val: number) => void;
  formatValue?: (val: number) => string;
}

export const KnobWithScale: React.FC<KnobWithScaleProps> = ({
  label,
  value,
  min,
  max,
  step = 0.1,
  defaultValue = 5,
  unit = '',
  scaleType = '0_to_10',
  subLabelComponent,
  midiLearnId,
  isMidiMapped = false,
  midiCc,
  onMidiLearn,
  onChange,
  formatValue,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const knobRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const dragStartVal = useRef(value);

  // Normalize to 0..1
  const norm = Math.max(0, Math.min(1, (value - min) / (max - min)));

  // Angles: -135deg (min) to +135deg (max)
  const minAngle = -135;
  const maxAngle = 135;
  const angle = minAngle + norm * (maxAngle - minAngle);

  // Scales configurations
  const scales: Record<ScaleType, { label: string; angle: number }[]> = {
    '0_to_10': [
      { label: '0', angle: -135 },
      { label: '1', angle: -108 },
      { label: '2', angle: -81 },
      { label: '3', angle: -54 },
      { label: '4', angle: -27 },
      { label: '5', angle: 0 },
      { label: '6', angle: 27 },
      { label: '7', angle: 54 },
      { label: '8', angle: 81 },
      { label: '9', angle: 108 },
      { label: '10', angle: 135 },
    ],
    'minus15_to_15': [
      { label: '-15', angle: -135 },
      { label: '-10', angle: -90 },
      { label: '-5', angle: -45 },
      { label: '0', angle: 0 },
      { label: '5', angle: 45 },
      { label: '10', angle: 90 },
      { label: '15', angle: 135 },
    ],
    'freq_scale': [
      { label: '200', angle: -135 },
      { label: '250', angle: -101 },
      { label: '400', angle: -67 },
      { label: '600', angle: -34 },
      { label: '1K', angle: 0 },
      { label: '2K', angle: 34 },
      { label: '4K', angle: 67 },
      { label: '6K', angle: 101 },
      { label: '8K', angle: 135 },
    ],
  };

  const currentScale = scales[scaleType];

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only drag on primary left button click
    if (e.button !== 0) return;
    e.preventDefault();
    setIsDragging(true);
    setShowTooltip(true);
    dragStartY.current = e.clientY;
    dragStartVal.current = value;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaY = dragStartY.current - e.clientY;
    const sensitivity = e.shiftKey ? 0.001 : 0.005;
    const deltaValue = deltaY * (max - min) * sensitivity;

    let newVal = dragStartVal.current + deltaValue;
    newVal = Math.max(min, Math.min(max, newVal));
    const stepped = Math.round(newVal / step) * step;
    onChange(Number(stepped.toFixed(2)));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    setShowTooltip(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Mouse Wheel Adjustment
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const dir = -Math.sign(e.deltaY);
    const multiplier = e.shiftKey ? 1 : 2;
    const delta = dir * step * multiplier;
    let newVal = Math.max(min, Math.min(max, value + delta));
    const stepped = Math.round(newVal / step) * step;
    onChange(Number(stepped.toFixed(2)));
  };

  // Right Click MIDI Learn
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onMidiLearn) {
      onMidiLearn(midiLearnId || label, label);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    let nextVal = value;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      nextVal = Math.min(max, value + (e.shiftKey ? step : step * 5));
      e.preventDefault();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      nextVal = Math.max(min, value - (e.shiftKey ? step : step * 5));
      e.preventDefault();
    }
    onChange(Number(nextVal.toFixed(2)));
  };

  const formattedDisplay = formatValue
    ? formatValue(value)
    : `${Number(value.toFixed(1))}${unit ? ' ' + unit : ''}`;

  return (
    <div
      className="flex flex-col items-center select-none relative group"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onWheel={handleWheel}
      onContextMenu={handleContextMenu}
      role="slider"
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      {/* Tooltip on hover / drag */}
      {showTooltip && (
        <div className="absolute -top-6 z-30 px-1.5 py-0.5 rounded bg-black/95 border border-neutral-600 text-[9px] font-mono text-cyan-300 shadow-xl pointer-events-none whitespace-nowrap">
          {formattedDisplay}
          {isMidiMapped && (
            <span className="ml-1 text-[8px] text-amber-400 font-bold">CC{midiCc}</span>
          )}
        </div>
      )}

      {/* Dial Assembly: Printed silk-screen numbers around the knob */}
      <div
        ref={knobRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={() => onChange(defaultValue)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => !isDragging && setShowTooltip(false)}
        className="relative w-[52px] h-[52px] flex items-center justify-center cursor-ns-resize touch-none focus:outline-none"
      >
        {/* Silk-screened markings around knob */}
        {currentScale.map((m) => {
          // Circular position
          const rad = ((m.angle - 90) * Math.PI) / 180.0;
          const r = 21; // Radius from center
          const cx = 26 + r * Math.cos(rad);
          const cy = 26 + r * Math.sin(rad);

          return (
            <span
              key={m.label}
              className="absolute text-[7px] font-mono font-bold text-neutral-300 pointer-events-none -translate-x-1/2 -translate-y-1/2 leading-none"
              style={{ left: `${cx}px`, top: `${cy}px` }}
            >
              {m.label}
            </span>
          );
        })}

        {/* Physical Cylindrical Knob */}
        <div
          className="w-[30px] h-[30px] rounded-full border border-[#101216] shadow-[0_4px_7px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.2)] flex items-center justify-center transition-transform"
          style={{
            background: 'radial-gradient(circle at 40% 35%, #3d434f 0%, #1f232b 55%, #0f1115 100%)',
            transform: `rotate(${angle}deg)`,
          }}
        >
          {/* Inner fluted face */}
          <div className="w-full h-full rounded-full border border-neutral-700/30 relative flex items-center justify-center">
            {/* White pointer indicator line */}
            <div className="absolute top-0.5 w-[2px] h-[9px] bg-white rounded-full shadow-[0_0_2px_rgba(255,255,255,0.9)]" />
            {/* Center metal cap */}
            <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-[#1b1d24] to-[#343a47] shadow-inner border border-black/50" />
          </div>
        </div>

        {/* Optional MIDI Learn Badge Dot */}
        {isMidiMapped && (
          <span
            title={`Mapeado para MIDI CC ${midiCc}`}
            className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 border border-black shadow-[0_0_4px_#fbbf24]"
          />
        )}
      </div>

      {/* Label under knob */}
      <div className="flex flex-col items-center mt-0.5">
        <span className="text-[9px] font-black uppercase tracking-tight text-neutral-200 leading-none">
          {label}
        </span>
        {subLabelComponent}
      </div>
    </div>
  );
};
