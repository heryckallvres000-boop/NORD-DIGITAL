/**
 * Nord Stage 4 Complete Hardware Panel
 * Recreates the exact chassis aesthetics, silkscreens, and horizontal modular layout.
 * Supports Hardware Mode (auto-adapted to notebook screen width) and Responsive Mode.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Preset, SynthParams } from '../types/synth';
import { ProgramSection } from './ProgramSection';
import { SynthSection } from './SynthSection';
import { EffectsSection } from './EffectsSection';
import { Knob } from './Knob';
import { Oscilloscope } from './Oscilloscope';

interface HardwarePanelProps {
  viewMode: 'hardware' | 'responsive';
  zoomLevel: number;
  params: SynthParams;
  currentPreset: Preset;
  presets: Preset[];
  analyzerNode: AnalyserNode | null;
  onUpdateParams: (newParams: Partial<SynthParams>) => void;
  onSelectPreset: (preset: Preset) => void;
  onOpenPresetManager: () => void;
  onOpenFileManager: () => void;
  onPanic: () => void;
}

export const HardwarePanel: React.FC<HardwarePanelProps> = ({
  viewMode,
  zoomLevel,
  params,
  currentPreset,
  presets,
  analyzerNode,
  onUpdateParams,
  onSelectPreset,
  onOpenPresetManager,
  onOpenFileManager,
  onPanic,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chassisRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [chassisHeight, setChassisHeight] = useState<number>(0);

  // Reference width for the 3 horizontal modules side-by-side inside the red chassis
  const nominalWidth = 1980;

  // Track container width and chassis height for seamless notebook adaptation
  useEffect(() => {
    if (!containerRef.current) return;

    const measure = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
      if (chassisRef.current) {
        setChassisHeight(chassisRef.current.offsetHeight);
      }
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(containerRef.current);
    if (chassisRef.current) ro.observe(chassisRef.current);
    window.addEventListener('resize', measure);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [viewMode]);

  // Compute responsive auto-scale so the entire console fits 100% of notebook screen width
  const fitScale = containerWidth > 0 ? Math.min(1.0, (containerWidth - 8) / nominalWidth) : 1.0;
  const effectiveScale = Math.max(0.35, fitScale * zoomLevel);

  if (viewMode === 'hardware') {
    return (
      <div
        ref={containerRef}
        className="w-full flex justify-center items-start overflow-hidden px-1 md:px-2 select-none"
      >
        <div
          style={{
            width: `${Math.round(nominalWidth * effectiveScale)}px`,
            height: chassisHeight > 0 ? `${Math.round(chassisHeight * effectiveScale)}px` : undefined,
            position: 'relative',
            overflow: 'hidden',
            transition: 'width 0.12s ease-out, height 0.12s ease-out',
          }}
        >
          {/* Scaled Native Hardware Console */}
          <div
            ref={chassisRef}
            className="relative rounded-md shadow-2xl border-4 border-[#5c0b11] select-none"
            style={{
              width: `${nominalWidth}px`,
              transform: `scale(${effectiveScale})`,
              transformOrigin: 'top left',
              background: 'linear-gradient(180deg, #b31a24 0%, #871018 35%, #720c13 85%, #4a070c 100%)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8), inset 0 2px 3px rgba(255,255,255,0.25)',
            }}
          >
            {/* Top Silk-Screened Jack & Power Lip */}
            <div className="flex items-center justify-between px-6 py-1.5 border-b border-[#5f0c12] text-[9px] font-sans font-bold uppercase tracking-wider text-neutral-300/80">
              {/* Left Silkscreen Ports */}
              <div className="flex items-center gap-6">
                <span>ROTOR PEDAL</span>
                <span>USB</span>
                <span>FOOT SWITCH</span>
                <span>MIDI IN/OUT</span>
              </div>

              {/* Center Title Marker */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black tracking-widest text-white/90 drop-shadow">
                  NORD STAGE 4
                </span>
                <span className="text-[8px] bg-black/40 px-1.5 py-0.5 rounded text-neutral-300">
                  POLYPHONIC WORKSTATION
                </span>
              </div>

              {/* Right Silkscreen Ports & Master Volume */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <Oscilloscope analyzerNode={analyzerNode} width={130} height={28} />
                  <Knob
                    label="MASTER"
                    size="sm"
                    value={params.masterVolume}
                    min={0}
                    max={1}
                    step={0.02}
                    defaultValue={0.85}
                    onChange={(val) => onUpdateParams({ masterVolume: val })}
                    formatValue={(v) => `${Math.round(v * 100)}%`}
                  />
                </div>
                <span>AC IN</span>
                <span className="text-emerald-400">POWER ON</span>
              </div>
            </div>

            {/* Main Modular Control Panels */}
            <div className="p-3 relative flex items-stretch gap-3">
              {/* Section 1: Program & Preset Library */}
              <div className="shrink-0">
                <ProgramSection
                  currentPreset={currentPreset}
                  presets={presets}
                  params={params}
                  onSelectPreset={onSelectPreset}
                  onUpdateParams={onUpdateParams}
                  onOpenPresetManager={onOpenPresetManager}
                  onOpenFileManager={onOpenFileManager}
                  onPanic={onPanic}
                />
              </div>

              {/* Section 2: Synth Section */}
              <div className="shrink-0">
                <SynthSection
                  params={params}
                  onUpdateParams={onUpdateParams}
                />
              </div>

              {/* Section 3: Layer Effects */}
              <div className="shrink-0">
                <EffectsSection
                  params={params}
                  onUpdateParams={onUpdateParams}
                />
              </div>

              {/* Far Right Authentic Vertical Silk-Screen Label */}
              <div className="flex items-center justify-center px-1 text-[8px] font-mono tracking-widest text-red-200/50 uppercase select-none [writing-mode:vertical-rl] rotate-180">
                HANDMADE IN SWEDEN BY CLAVIA DMI AB v2.0 Rev.B
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Responsive Mode: Stacks sections cleanly
  return (
    <div className="w-full flex justify-center p-2 md:p-4 select-none">
      <div
        className="w-full max-w-7xl rounded-md shadow-2xl border-2 border-[#5c0b11]"
        style={{
          background: 'linear-gradient(180deg, #b31a24 0%, #871018 35%, #720c13 85%, #4a070c 100%)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.8), inset 0 2px 3px rgba(255,255,255,0.25)',
        }}
      >
        {/* Top Silk-Screened Jack & Power Lip */}
        <div className="flex items-center justify-between px-6 py-1.5 border-b border-[#5f0c12] text-[9px] font-sans font-bold uppercase tracking-wider text-neutral-300/80">
          <div className="flex items-center gap-6">
            <span>ROTOR PEDAL</span>
            <span>USB</span>
            <span>FOOT SWITCH</span>
            <span>MIDI IN/OUT</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black tracking-widest text-white/90 drop-shadow">
              NORD STAGE 4
            </span>
            <span className="text-[8px] bg-black/40 px-1.5 py-0.5 rounded text-neutral-300">
              POLYPHONIC WORKSTATION
            </span>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <Oscilloscope analyzerNode={analyzerNode} width={130} height={28} />
              <Knob
                label="MASTER"
                size="sm"
                value={params.masterVolume}
                min={0}
                max={1}
                step={0.02}
                defaultValue={0.85}
                onChange={(val) => onUpdateParams({ masterVolume: val })}
                formatValue={(v) => `${Math.round(v * 100)}%`}
              />
            </div>
            <span>AC IN</span>
            <span className="text-emerald-400">POWER ON</span>
          </div>
        </div>

        {/* Modular Control Panels */}
        <div className="p-3 relative grid grid-cols-1 xl:grid-cols-3 gap-3">
          <div>
            <ProgramSection
              currentPreset={currentPreset}
              presets={presets}
              params={params}
              onSelectPreset={onSelectPreset}
              onUpdateParams={onUpdateParams}
              onOpenPresetManager={onOpenPresetManager}
              onOpenFileManager={onOpenFileManager}
              onPanic={onPanic}
            />
          </div>

          <div>
            <SynthSection
              params={params}
              onUpdateParams={onUpdateParams}
            />
          </div>

          <div>
            <EffectsSection
              params={params}
              onUpdateParams={onUpdateParams}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
