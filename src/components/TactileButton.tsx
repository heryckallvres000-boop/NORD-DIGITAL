/**
 * Authentic Nord Stage 4 Tactile Push Button
 * Features:
 * - Rectangular matte black chassis with chamfered edges
 * - Glowing LED indicator (red, green, amber)
 * - Tactile press spring animation
 * - Primary text label and optional sub/shift label
 */

import React from 'react';

interface TactileButtonProps {
  label: string;
  subLabel?: string;
  isActive?: boolean;
  ledColor?: 'red' | 'green' | 'amber';
  hasLed?: boolean;
  isSpecialShift?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  onClick: () => void;
}

export const TactileButton: React.FC<TactileButtonProps> = ({
  label,
  subLabel,
  isActive = false,
  ledColor = 'red',
  hasLed = true,
  isSpecialShift = false,
  size = 'md',
  onClick,
}) => {
  const ledStyles = {
    red: {
      lit: 'bg-red-500 shadow-[0_0_6px_#ef4444]',
      unlit: 'bg-red-950/70 border border-red-900/50',
    },
    green: {
      lit: 'bg-emerald-400 shadow-[0_0_6px_#34d399]',
      unlit: 'bg-emerald-950/70 border border-emerald-900/50',
    },
    amber: {
      lit: 'bg-amber-400 shadow-[0_0_6px_#fbbf24]',
      unlit: 'bg-amber-950/70 border border-amber-900/50',
    },
  };

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[8px] min-w-[24px]',
    sm: 'px-2 py-1 text-[9px] min-w-[32px]',
    md: 'px-2.5 py-1.5 text-[10px] min-w-[42px]',
    lg: 'px-3 py-2 text-[11px] min-w-[50px]',
  };

  return (
    <div className="flex flex-col items-center select-none group">
      {/* LED Indicator */}
      {hasLed && (
        <div
          className={`w-2 h-2 rounded-full mb-1 transition-all ${
            isActive ? ledStyles[ledColor].lit : ledStyles[ledColor].unlit
          }`}
        />
      )}

      {/* Button Chassis */}
      <button
        onClick={onClick}
        type="button"
        className={`relative uppercase font-bold tracking-tight rounded-sm transition-all active:scale-[0.96] active:translate-y-0.5 shadow-[0_3px_5px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.15)] flex flex-col items-center justify-center border ${
          sizeClasses[size]
        } ${
          isSpecialShift
            ? 'bg-neutral-400 hover:bg-neutral-300 text-neutral-900 border-neutral-300 shadow-md font-black'
            : isActive
            ? 'bg-neutral-800 text-neutral-100 border-neutral-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]'
            : 'bg-gradient-to-b from-[#2a2d35] to-[#1a1c22] hover:from-[#353942] hover:to-[#22242a] text-neutral-300 border-neutral-800'
        }`}
      >
        <span className="leading-tight">{label}</span>
      </button>

      {/* Sublabel / Shift Label */}
      {subLabel && (
        <span className="text-[8px] text-neutral-400 uppercase font-semibold mt-0.5 tracking-tighter text-center leading-tight">
          {subLabel}
        </span>
      )}
    </div>
  );
};
