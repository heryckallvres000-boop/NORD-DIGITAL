/**
 * Photorealistic LED Indicator Dot
 * Emits vibrant red glow when lit, realistic dark acrylic lens when unlit.
 */

import React from 'react';

interface LedDotProps {
  isOn: boolean;
  color?: 'red' | 'amber' | 'green';
  size?: 'sm' | 'md';
}

export const LedDot: React.FC<LedDotProps> = ({
  isOn,
  color = 'red',
  size = 'md',
}) => {
  const sizeMap = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
  };

  const colorStyles = {
    red: {
      lit: 'bg-[#ff2a38] border-[#ff8890] shadow-[0_0_8px_#ff2233,0_0_14px_rgba(255,30,50,0.8),inset_0_1px_1px_#ffffff]',
      unlit: 'bg-[#3d0a0e] border-[#551015] shadow-[inset_0_1px_2px_rgba(0,0,0,0.9)]',
    },
    amber: {
      lit: 'bg-[#ff9900] border-[#ffcc66] shadow-[0_0_8px_#ff9900,0_0_14px_rgba(255,153,0,0.8),inset_0_1px_1px_#ffffff]',
      unlit: 'bg-[#3d2400] border-[#553300] shadow-[inset_0_1px_2px_rgba(0,0,0,0.9)]',
    },
    green: {
      lit: 'bg-[#22cc55] border-[#88ffaa] shadow-[0_0_8px_#22cc55,0_0_14px_rgba(34,204,85,0.8),inset_0_1px_1px_#ffffff]',
      unlit: 'bg-[#0a2810] border-[#103d18] shadow-[inset_0_1px_2px_rgba(0,0,0,0.9)]',
    },
  };

  return (
    <div
      className={`rounded-full border transition-all duration-100 shrink-0 ${sizeMap[size]} ${
        isOn ? colorStyles[color].lit : colorStyles[color].unlit
      }`}
    />
  );
};
