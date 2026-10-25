/**
 * Nord Stage 4 Layer Drawbar / Fader
 * Includes smooth vertical slider track, LED ladder meter (green/yellow/red),
 * ON/OFF tactile button, and AUX KB indicator.
 */

import React, { useRef, useState } from 'react';

interface FaderProps {
  label: string;
  subLabel?: string;
  value: number; // 0.0 to 1.0
  isOn: boolean;
  onToggleOn: () => void;
  onChange: (val: number) => void;
}

export const Fader: React.FC<FaderProps> = ({
  label,
  subLabel,
  value,
  isOn,
  onToggleOn,
  onChange,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const trackHeight = 110;
  const numLeds = 8;

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    updateFromPointer(e);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    updateFromPointer(e);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const updateFromPointer = (e: React.PointerEvent) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const relativeY = rect.bottom - e.clientY;
    const clamped = Math.max(0, Math.min(trackHeight, relativeY));
    const normalized = clamped / trackHeight;
    onChange(Number(normalized.toFixed(2)));
  };

  // Determine LED states
  const activeLedsCount = isOn ? Math.round(value * numLeds) : 0;

  return (
    <div className="flex flex-col items-center select-none bg-neutral-900/60 p-1.5 rounded border border-neutral-800 shadow-inner">
      {/* Top Header & On/Off Button */}
      <div className="flex items-center justify-between w-full mb-1">
        <span className="text-[10px] font-bold text-neutral-300 tracking-wider">
          {label}
        </span>
        {subLabel && (
          <span className="text-[8px] text-neutral-500 uppercase tracking-tighter">
            {subLabel}
          </span>
        )}
      </div>

      <button
        onClick={onToggleOn}
        className={`px-1.5 py-0.5 mb-1.5 text-[8px] font-bold rounded tracking-wider uppercase transition-all flex items-center gap-1 border ${
          isOn
            ? 'bg-red-950/80 border-red-500/80 text-white shadow-[0_0_8px_rgba(239,68,68,0.4)]'
            : 'bg-neutral-800 border-neutral-700 text-neutral-400'
        }`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            isOn ? 'bg-red-500 shadow-[0_0_4px_#ef4444]' : 'bg-neutral-600'
          }`}
        />
        ON/OFF
      </button>

      {/* Fader Assembly: Track + LED Ladder */}
      <div className="flex items-center gap-2">
        {/* Vertical LED Ladder */}
        <div
          className="flex flex-col-reverse justify-between py-1 bg-black/80 px-1 rounded border border-neutral-800"
          style={{ height: trackHeight }}
        >
          {Array.from({ length: numLeds }).map((_, i) => {
            const isLit = i < activeLedsCount;
            // Top LED is red, 2nd from top is yellow/amber, others are green
            let ledColor = 'bg-emerald-500 shadow-[0_0_3px_#10b981]';
            if (i === numLeds - 1) ledColor = 'bg-red-500 shadow-[0_0_4px_#ef4444]';
            else if (i >= numLeds - 3) ledColor = 'bg-amber-400 shadow-[0_0_3px_#f59e0b]';

            return (
              <div
                key={i}
                className={`w-2 h-1.5 rounded-[1px] transition-all ${
                  isLit ? ledColor : 'bg-neutral-800 opacity-40'
                }`}
              />
            );
          })}
        </div>

        {/* Physical Fader Track */}
        <div
          ref={trackRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="relative w-6 bg-neutral-950 rounded border border-neutral-800 cursor-ns-resize touch-none flex justify-center shadow-inner"
          style={{ height: trackHeight }}
        >
          {/* Center groove */}
          <div className="w-1.5 h-full bg-black/90 border-x border-neutral-800" />

          {/* Fader Handle Cap */}
          <div
            className="absolute left-0 right-0 h-6 -translate-y-1/2 rounded-sm shadow-[0_3px_6px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.3)] border border-neutral-700 bg-gradient-to-b from-neutral-200 via-neutral-400 to-neutral-500 cursor-grab active:cursor-grabbing flex items-center justify-center"
            style={{
              bottom: `${Math.max(0, Math.min(1, value)) * (trackHeight - 24)}px`,
            }}
          >
            {/* Center white indicator notch */}
            <div className="w-full h-0.5 bg-neutral-900 shadow-sm" />
          </div>
        </div>
      </div>

      {/* Numeric readout */}
      <span className="text-[9px] font-mono text-neutral-400 mt-1 tabular-nums">
        {Math.round(value * 100)}%
      </span>
    </div>
  );
};
