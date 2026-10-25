/**
 * Realistic Physical Grey Rocker Switch
 * Features 3D beveled housing, concave surface, realistic shadows, and adjacent red LED.
 */

import React from 'react';
import { LedDot } from './LedDot';

interface RockerSwitchProps {
  isOn: boolean;
  onToggle: () => void;
  orientation?: 'vertical' | 'horizontal';
  label?: string;
  className?: string;
}

export const RockerSwitch: React.FC<RockerSwitchProps> = ({
  isOn,
  onToggle,
  orientation = 'vertical',
  label = 'ON',
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      {/* Label and LED Indicator */}
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-[10px] font-black tracking-wider text-neutral-200">
          {label}
        </span>
        <LedDot isOn={isOn} color="red" size="sm" />
      </div>

      {/* Rocker Switch Bezel */}
      <button
        type="button"
        onClick={onToggle}
        className={`relative rounded-sm border border-[#1b2029] bg-[#11141a] p-1 shadow-[0_2px_5px_rgba(0,0,0,0.8),inset_0_1px_2px_rgba(0,0,0,0.9)] cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400 active:scale-[0.98] transition-transform ${
          orientation === 'vertical' ? 'w-6 h-12' : 'w-12 h-6'
        }`}
        aria-label={`${label} switch`}
      >
        {/* Rocker Paddle */}
        <div
          className={`w-full h-full rounded-[2px] transition-all duration-150 relative border ${
            isOn
              ? 'bg-gradient-to-b from-[#7e8594] via-[#9da5b5] to-[#c2cbdb] border-[#8a92a2] shadow-[inset_0_3px_5px_rgba(0,0,0,0.6),0_1px_1px_rgba(255,255,255,0.4)] translate-y-0.5'
              : 'bg-gradient-to-b from-[#a4acbd] via-[#8c94a4] to-[#6c7482] border-[#727a87] shadow-[0_3px_5px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.5)]'
          }`}
        >
          {/* Subtle center tactile ridge */}
          <div
            className={`absolute bg-[#404654]/40 ${
              orientation === 'vertical'
                ? 'top-1/2 left-1 right-1 h-[1px] -translate-y-1/2'
                : 'left-1/2 top-1 bottom-1 w-[1px] -translate-x-1/2'
            }`}
          />
        </div>
      </button>
    </div>
  );
};
