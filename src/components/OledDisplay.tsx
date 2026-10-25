/**
 * Nord Stage 4 High-Contrast Graphic OLED Display
 * Renders authentic cyan/white OLED pixel display with:
 * - Program info, Bank, Layer status
 * - Synth waveform vector graphics (SuperSaw, Saw, Pulse, Square, Tri, Sine, Sample)
 * - Beveled dark glass bezel with subtle reflection
 */

import React from 'react';
import { WaveformType } from '../types/synth';

interface ProgramDisplayProps {
  type: 'program';
  bank: string;
  name: string;
  category: string;
  layerA: string;
  layerB: string;
  layerC: string;
  tempoBpm: number;
}

interface SynthDisplayProps {
  type: 'synth';
  waveform: WaveformType;
  category: string;
  detune: number;
  ctrl: number;
  mode: string;
}

type OledDisplayProps = ProgramDisplayProps | SynthDisplayProps;

export const OledDisplay: React.FC<OledDisplayProps> = (props) => {
  return (
    <div className="relative rounded bg-[#090b0e] p-1.5 shadow-[inset_0_2px_6px_rgba(0,0,0,0.9),0_1px_1px_rgba(255,255,255,0.1)] border border-[#1e232d] overflow-hidden select-none">
      {/* Subtle glass reflection gradient */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-cyan-900/5 to-white/5 pointer-events-none" />

      {props.type === 'program' ? (
        <div className="flex flex-col justify-between h-[82px] w-[180px] font-mono text-[#7fe7ff] tracking-tight text-[11px] leading-tight">
          {/* Top Row: Bank & Category */}
          <div className="flex items-center justify-between border-b border-cyan-900/50 pb-1">
            <span className="font-bold text-[13px] text-white tracking-widest">{props.bank}</span>
            <span className="text-[10px] uppercase bg-cyan-950/80 px-1 rounded text-cyan-300 font-sans font-semibold">
              {props.category}
            </span>
          </div>

          {/* Center: Program Title */}
          <div className="py-0.5">
            <div className="text-[14px] font-bold text-white tracking-normal font-sans truncate">
              {props.name}
            </div>
          </div>

          {/* Bottom Layers Strip */}
          <div className="text-[9px] text-cyan-200/90 space-y-0.5 pt-0.5 border-t border-cyan-900/40">
            <div className="truncate flex items-center justify-between">
              <span>A: {props.layerA || 'Off'}</span>
              <span className="text-[8px] text-cyan-400 font-bold">XL</span>
            </div>
            <div className="truncate flex items-center justify-between text-cyan-400/80">
              <span>B: {props.layerB || 'Off'}</span>
              <span className="text-[8px]">{props.tempoBpm} BPM</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col justify-between h-[82px] w-[170px] font-mono text-[#7fe7ff] tracking-tight text-[10px] leading-tight">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-cyan-900/60 pb-0.5">
            <span className="text-[9px] uppercase tracking-wider text-cyan-400 font-sans font-bold">
              OSC WAVEFORM
            </span>
            <span className="text-[8px] text-cyan-300">{props.mode}</span>
          </div>

          {/* Middle: Waveform Name & Wave Graphic */}
          <div className="flex items-center justify-between px-1 py-1">
            <div className="flex flex-col">
              <span className="text-[12px] font-bold text-white uppercase font-sans">
                {props.waveform === 'supersaw' ? 'Super Saw' : props.waveform}
              </span>
              <span className="text-[9px] text-cyan-300">
                {props.waveform === 'supersaw' ? `DETUNE: ${props.detune}` : `CTRL: ${props.ctrl}`}
              </span>
            </div>

            {/* SVG Waveform Graphic */}
            <div className="w-12 h-8 bg-black/60 rounded border border-cyan-950 flex items-center justify-center p-0.5">
              <WaveformIcon waveform={props.waveform} />
            </div>
          </div>

          {/* Bottom Status Labels */}
          <div className="flex items-center justify-between text-[8px] uppercase tracking-tighter text-cyan-400/90 pt-0.5 border-t border-cyan-900/40">
            <span className="bg-cyan-950/60 px-1 rounded">{props.category}</span>
            <span className="bg-cyan-950/60 px-1 rounded">1 (5) WAVE</span>
          </div>
        </div>
      )}
    </div>
  );
};

const WaveformIcon: React.FC<{ waveform: WaveformType }> = ({ waveform }) => {
  switch (waveform) {
    case 'saw':
      return (
        <svg viewBox="0 0 40 24" className="w-full h-full stroke-cyan-300 fill-none stroke-2">
          <path d="M 4 20 L 20 4 L 20 20 L 36 4 L 36 20" strokeLinejoin="miter" />
        </svg>
      );
    case 'supersaw':
      return (
        <svg viewBox="0 0 40 24" className="w-full h-full stroke-cyan-300 fill-none stroke-1">
          <path d="M 2 20 L 14 6 L 14 20 L 26 6 L 26 20" opacity="0.5" />
          <path d="M 5 21 L 18 5 L 18 21 L 31 5 L 31 21" strokeWidth="1.5" />
          <path d="M 8 22 L 22 4 L 22 22 L 36 4 L 36 22" opacity="0.7" />
        </svg>
      );
    case 'square':
    case 'pulse':
      return (
        <svg viewBox="0 0 40 24" className="w-full h-full stroke-cyan-300 fill-none stroke-2">
          <path d="M 4 20 L 4 6 L 18 6 L 18 20 L 32 20 L 32 6 L 36 6" />
        </svg>
      );
    case 'triangle':
      return (
        <svg viewBox="0 0 40 24" className="w-full h-full stroke-cyan-300 fill-none stroke-2">
          <path d="M 4 14 L 12 4 L 20 20 L 28 4 L 36 20" />
        </svg>
      );
    case 'sine':
      return (
        <svg viewBox="0 0 40 24" className="w-full h-full stroke-cyan-300 fill-none stroke-2">
          <path d="M 4 12 Q 12 0 20 12 T 36 12" />
        </svg>
      );
    case 'noise':
      return (
        <svg viewBox="0 0 40 24" className="w-full h-full stroke-cyan-300 fill-none stroke-1">
          <path d="M 2 12 L 6 4 L 9 20 L 14 6 L 19 18 L 24 8 L 28 22 L 33 5 L 38 12" />
        </svg>
      );
    case 'sample':
      return (
        <svg viewBox="0 0 40 24" className="w-full h-full stroke-cyan-300 fill-none stroke-1.5">
          <path d="M 4 12 Q 8 2 12 12 T 20 12 Q 24 6 28 12 T 36 12" />
          <circle cx="20" cy="12" r="2" fill="#7fe7ff" />
        </svg>
      );
    default:
      return null;
  }
};
