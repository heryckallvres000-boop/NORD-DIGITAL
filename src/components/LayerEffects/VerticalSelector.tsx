/**
 * Vertical Multi-Option Selector Block with Illuminated Red Arrows
 * Accurately replicates the dual vertical columns with red indicator arrows from the Nord Stage 4.
 */

import React from 'react';

export interface SelectorItem {
  id: string;
  label: string;
  isBoxed?: boolean;
  isRedBadge?: boolean;
}

interface VerticalSelectorProps {
  leftItems: SelectorItem[];
  rightItems: SelectorItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  className?: string;
}

export const VerticalSelector: React.FC<VerticalSelectorProps> = ({
  leftItems,
  rightItems,
  selectedId,
  onSelect,
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-1.5 select-none font-sans ${className}`}>
      {/* Left Column */}
      <div className="flex flex-col gap-1 items-end">
        {leftItems.map((item) => {
          const isSelected = selectedId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className="flex items-center gap-1 text-[8.5px] font-black uppercase tracking-tight group focus:outline-none"
            >
              <span
                className={`transition-colors ${
                  item.isBoxed
                    ? 'border border-neutral-400 px-0.5 rounded-[1px] text-white'
                    : isSelected
                    ? 'text-white'
                    : 'text-neutral-400 group-hover:text-neutral-200'
                }`}
              >
                {item.label}
              </span>

              {/* Red arrow indicator pointing right */}
              <span
                className={`text-[8px] transition-all ${
                  isSelected
                    ? 'text-[#ff2a38] drop-shadow-[0_0_4px_#ff2233]'
                    : 'text-transparent'
                }`}
              >
                ▶
              </span>
            </button>
          );
        })}
      </div>

      {/* Center divider bar */}
      <div className="w-[1px] h-12 bg-neutral-700/60" />

      {/* Right Column */}
      <div className="flex flex-col gap-1 items-start">
        {rightItems.map((item) => {
          const isSelected = selectedId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className="flex items-center gap-1 text-[8.5px] font-black uppercase tracking-tight group focus:outline-none"
            >
              {/* Red arrow indicator pointing left */}
              <span
                className={`text-[8px] transition-all ${
                  isSelected
                    ? 'text-[#ff2a38] drop-shadow-[0_0_4px_#ff2233]'
                    : 'text-transparent'
                }`}
              >
                ◀
              </span>

              <span
                className={`transition-colors ${
                  item.isRedBadge
                    ? 'bg-[#7a0f16] text-white px-1 py-0.5 rounded-[2px] shadow-sm'
                    : item.isBoxed
                    ? 'border border-neutral-400 px-0.5 rounded-[1px] text-white'
                    : isSelected
                    ? 'text-white'
                    : 'text-neutral-400 group-hover:text-neutral-200'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
