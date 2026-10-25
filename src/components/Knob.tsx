/**
 * Authentic Nord Stage 4 Rotary Potentiometer Knob
 * Features:
 * - Drag vertically or angularly (mouse / touch)
 * - Shift-key modifier for ultra-fine adjustment
 * - Double-click to reset to default value
 * - LED position ring arc with glow
 * - Dynamic tooltip with formatted value & engineering units
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';

interface KnobProps {
  label: string;
  subLabel?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  defaultValue?: number;
  unit?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  ledRing?: boolean;
  ledColor?: 'red' | 'amber' | 'green';
  onChange: (val: number) => void;
  formatValue?: (val: number) => string;
}

export const Knob: React.FC<KnobProps> = ({
  label,
  subLabel,
  value,
  min,
  max,
  step = 0.1,
  defaultValue,
  unit = '',
  size = 'md',
  ledRing = true,
  ledColor = 'red',
  onChange,
  formatValue,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const knobRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const dragStartValue = useRef(value);

  // Normalize 0 to 1
  const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));

  // Angles: -135deg (min) to +135deg (max) => 270deg total travel
  const startAngle = -135;
  const endAngle = 135;
  const currentAngle = startAngle + normalized * (endAngle - startAngle);

  // Sizes
  const sizeMap = {
    xs: { diameter: 26, stroke: 2, radius: 10.5 },
    sm: { diameter: 34, stroke: 3, radius: 14 },
    md: { diameter: 44, stroke: 3.5, radius: 18 },
    lg: { diameter: 54, stroke: 4, radius: 23 },
  };
  const { diameter, stroke, radius } = sizeMap[size];
  const center = diameter / 2;

  // Circular arc calculation for SVG LED ring
  const polarToCartesian = (centerX: number, centerY: number, r: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + r * Math.cos(angleInRadians),
      y: centerY + r * Math.sin(angleInRadians),
    };
  };

  const describeArc = (x: number, y: number, r: number, startA: number, endA: number) => {
    const start = polarToCartesian(x, y, r, endA);
    const end = polarToCartesian(x, y, r, startA);
    const largeArcFlag = endA - startA <= 180 ? '0' : '1';
    return ['M', start.x, start.y, 'A', r, r, 0, largeArcFlag, 0, end.x, end.y].join(' ');
  };

  const backgroundArc = describeArc(center, center, radius, startAngle, endAngle);
  const activeArc = describeArc(center, center, radius, startAngle, currentAngle);

  const ledColors = {
    red: '#e53e3e',
    amber: '#ed8936',
    green: '#38a169',
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setShowTooltip(true);
    dragStartY.current = e.clientY;
    dragStartValue.current = value;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaY = dragStartY.current - e.clientY;
    const sensitivity = e.shiftKey ? 0.001 : 0.005; // Shift for fine adjustment
    const deltaValue = deltaY * (max - min) * sensitivity;

    let newValue = dragStartValue.current + deltaValue;
    newValue = Math.max(min, Math.min(max, newValue));

    // Snap to step
    const stepped = Math.round(newValue / step) * step;
    onChange(Number(stepped.toFixed(3)));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    setShowTooltip(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleDoubleClick = () => {
    if (defaultValue !== undefined) {
      onChange(defaultValue);
    }
  };

  const formattedDisplay = formatValue
    ? formatValue(value)
    : `${Number(value.toFixed(2))}${unit ? ' ' + unit : ''}`;

  return (
    <div className="flex flex-col items-center select-none group relative">
      {/* Sublabel / Top label if any */}
      {subLabel && (
        <span className="text-[9px] uppercase tracking-wider text-neutral-400 font-semibold mb-0.5 leading-none">
          {subLabel}
        </span>
      )}

      {/* Tooltip on drag/hover */}
      {showTooltip && (
        <div className="absolute -top-7 z-30 px-1.5 py-0.5 rounded bg-black/90 border border-neutral-600 text-[10px] font-mono text-cyan-300 shadow-lg pointer-events-none whitespace-nowrap">
          {formattedDisplay}
        </div>
      )}

      {/* Knob assembly */}
      <div
        ref={knobRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => !isDragging && setShowTooltip(false)}
        className="relative cursor-ns-resize touch-none flex items-center justify-center p-0.5"
        style={{ width: diameter + 4, height: diameter + 4 }}
      >
        {/* SVG Ring */}
        {ledRing && (
          <svg
            className="absolute inset-0 pointer-events-none"
            width={diameter + 4}
            height={diameter + 4}
            viewBox={`0 0 ${diameter + 4} ${diameter + 4}`}
          >
            {/* Background Track */}
            <path
              d={backgroundArc}
              fill="none"
              stroke="#262a33"
              strokeWidth={stroke}
              strokeLinecap="round"
            />
            {/* Active Arc */}
            {normalized > 0.01 && (
              <path
                d={activeArc}
                fill="none"
                stroke={ledColors[ledColor]}
                strokeWidth={stroke}
                strokeLinecap="round"
                style={{
                  filter: `drop-shadow(0 0 3px ${ledColors[ledColor]}aa)`,
                }}
              />
            )}
          </svg>
        )}

        {/* Physical Knob Disc */}
        <div
          className="rounded-full shadow-[0_4px_8px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.25)] border border-[#111317] flex items-center justify-center transition-transform"
          style={{
            width: diameter - 6,
            height: diameter - 6,
            background: 'radial-gradient(circle at 40% 35%, #3c424f 0%, #1a1c22 65%, #0f1013 100%)',
            transform: `rotate(${currentAngle}deg)`,
          }}
        >
          {/* Inner ring grip texture */}
          <div className="w-full h-full rounded-full border border-neutral-700/40 relative flex items-center justify-center">
            {/* Position indicator notch */}
            <div
              className="absolute top-1 w-0.5 rounded-full shadow-[0_0_2px_white]"
              style={{
                height: Math.max(6, (diameter - 6) * 0.35),
                backgroundColor: ledColors[ledColor],
                boxShadow: `0 0 4px ${ledColors[ledColor]}`,
              }}
            />
            {/* Center metallic dot */}
            <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-neutral-800 to-neutral-600 shadow-inner" />
          </div>
        </div>
      </div>

      {/* Primary Knob Label */}
      <span className="text-[10px] uppercase font-bold tracking-tight text-neutral-300 mt-0.5 text-center leading-none">
        {label}
      </span>
    </div>
  );
};
