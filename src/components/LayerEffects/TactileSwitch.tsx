/**
 * Authentic Nord Tactile Black Button Switch
 * Features beveled black body, optional LED, red highlight backgrounds, and active depression.
 */

import React from 'react';
import { LedDot } from './LedDot';

interface TactileSwitchProps {
  label: string;
  subLabel?: string;
  hasLed?: boolean;
  isLedOn?: boolean;
  ledColor?: 'red' | 'amber' | 'green';
  hasRedBadge?: boolean;
  hasWhiteBox?: boolean;
  isActive?: boolean;
  onClick: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const TactileSwitch: React.FC<TactileSwitchProps> = ({
  label,
  subLabel,
  hasLed = false,
  isLedOn = false,
  ledColor = 'red',
  hasRedBadge = false,
  hasWhiteBox = false,
  isActive = false,
  onClick,
  className = '',
  size = 'md',
}) => {
  const sizeMap = {
    sm: 'w-7 h-4 text-[7px]',
    md: 'w-9 h-5 text-[8px]',
    lg: 'w-12 h-6 text-[9px]',
  };

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      {/* Optional Top LED */}
      {hasLed && (
        <div className="mb-0.5">
          <LedDot isOn={isLedOn} color={ledColor} size="sm" />
        </div>
      )}

      {/* Button Body */}
      <button
        type="button"
        onClick={onClick}
        className={`relative rounded-[3px] border border-[#111317] bg-gradient-to-b from-[#2e333d] via-[#1a1d24] to-[#121418] shadow-[0_2px_4px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.2)] active:translate-y-0.5 active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.9)] cursor-pointer focus:outline-none transition-all flex items-center justify-center p-0.5 ${
          sizeMap[size]
        } ${isActive ? 'brightness-125' : ''}`}
        aria-label={label}
      >
        {/* Inner convex face */}
        <div className="w-full h-full rounded-[2px] bg-gradient-to-b from-[#3a3f4c] to-[#181a20] flex items-center justify-center border border-[#444a59]/30">
          <div className="w-1.5 h-1.5 rounded-full bg-black/40" />
        </div>
      </button>

      {/* Label under button */}
      <div className="mt-0.5 flex flex-col items-center">
        <span
          className={`font-black uppercase tracking-tight text-center leading-tight whitespace-nowrap ${
            hasRedBadge
              ? 'bg-[#7a0f16] text-white px-1 py-0.5 rounded-[2px] text-[8px] font-bold shadow-sm'
              : hasWhiteBox
              ? 'border border-neutral-400 text-neutral-200 px-1 py-0.2 rounded-[2px] text-[8px] font-bold'
              : 'text-neutral-300 text-[8px] font-bold'
          }`}
        >
          {label}
        </span>
        {subLabel && (
          <span className="text-[7px] text-neutral-400 font-semibold uppercase tracking-tighter">
            {subLabel}
          </span>
        )}
      </div>
    </div>
  );
};
