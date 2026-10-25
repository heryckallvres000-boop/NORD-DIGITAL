/**
 * Nord Stage 4 Program & Preset Library Panel (Left Section)
 * Houses:
 * - Morph Assign (Wheel, Aftertouch, CtrlPed, Clear)
 * - Master Clock / Tap Tempo, Transpose, Split, Panic
 * - Main OLED Display
 * - Preset Library Selectors (Organ, Piano, Synth)
 * - Rotary Program dial
 * - Bank / Page / Program 1-4 buttons & Shift button
 */

import React, { useState } from 'react';
import { Preset, SynthParams } from '../types/synth';
import { Knob } from './Knob';
import { OledDisplay } from './OledDisplay';
import { TactileButton } from './TactileButton';

interface ProgramSectionProps {
  currentPreset: Preset;
  presets: Preset[];
  params: SynthParams;
  onSelectPreset: (preset: Preset) => void;
  onUpdateParams: (newParams: Partial<SynthParams>) => void;
  onOpenPresetManager: () => void;
  onOpenFileManager: () => void;
  onPanic: () => void;
}

export const ProgramSection: React.FC<ProgramSectionProps> = ({
  currentPreset,
  presets,
  params,
  onSelectPreset,
  onUpdateParams,
  onOpenPresetManager,
  onOpenFileManager,
  onPanic,
}) => {
  const [selectedMorph, setSelectedMorph] = useState<'wheel' | 'at' | 'pedal' | null>('wheel');
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'ORGAN' | 'PIANO' | 'SYNTH'>('ALL');
  const [lastTapTime, setLastTapTime] = useState<number>(0);
  const [isTransposed, setIsTransposed] = useState<boolean>(false);

  // Handle Tap Tempo
  const handleTapTempo = () => {
    const now = Date.now();
    if (lastTapTime > 0) {
      const diffMs = now - lastTapTime;
      if (diffMs > 200 && diffMs < 2000) {
        const calculatedBpm = Math.round(60000 / diffMs);
        onUpdateParams({ tempoBpm: Math.max(40, Math.min(240, calculatedBpm)) });
      }
    }
    setLastTapTime(now);
  };

  // Transpose toggle
  const handleToggleTranspose = () => {
    const nextState = !isTransposed;
    setIsTransposed(nextState);
    onUpdateParams({ masterTune: nextState ? 2 : 0 });
  };

  // Program 1-4 selection
  const handleProgramNumClick = (idx: number) => {
    if (presets[idx]) {
      onSelectPreset(presets[idx]);
    }
  };

  const currentPresetIndex = presets.findIndex(p => p.id === currentPreset.id);

  const handleNextPreset = () => {
    const nextIdx = (currentPresetIndex + 1) % presets.length;
    onSelectPreset(presets[nextIdx]);
  };

  const handlePrevPreset = () => {
    const prevIdx = (currentPresetIndex - 1 + presets.length) % presets.length;
    onSelectPreset(presets[prevIdx]);
  };

  return (
    <div className="relative flex flex-col h-full select-none font-sans rounded-md border-2 border-[#161a22] shadow-[0_20px_50px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.2)] bg-gradient-to-b from-[#2d3542] via-[#242b36] to-[#1c222c] p-2.5 text-neutral-200 min-w-[340px]">
      {/* Metallic Texture Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:12px_12px] pointer-events-none rounded-md" />

      <div className="relative z-10 flex flex-col h-full">
        {/* Top Section Header Strip */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#485366]/80">
          {/* Morph Assign Group */}
          <div className="relative rounded border border-[#485366] bg-[#222934]/90 px-2 py-1 shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]">
            <div className="text-[8px] uppercase font-black tracking-widest text-neutral-300 mb-1">
              MORPH ASSIGN
            </div>
            <div className="flex items-center gap-1.5">
              <TactileButton
                label="WHEEL"
                size="sm"
                isActive={selectedMorph === 'wheel'}
                ledColor="green"
                onClick={() => setSelectedMorph(selectedMorph === 'wheel' ? null : 'wheel')}
              />
              <TactileButton
                label="A.T."
                size="sm"
                isActive={selectedMorph === 'at'}
                ledColor="green"
                onClick={() => setSelectedMorph(selectedMorph === 'at' ? null : 'at')}
              />
              <TactileButton
                label="CTRLPED"
                size="sm"
                isActive={selectedMorph === 'pedal'}
                ledColor="green"
                onClick={() => setSelectedMorph(selectedMorph === 'pedal' ? null : 'pedal')}
              />
              <TactileButton
                label="CLR"
                subLabel="CLEAR"
                size="sm"
                hasLed={false}
                onClick={() => setSelectedMorph(null)}
              />
            </div>
          </div>

          {/* System Buttons: Split, Mst Clk, Transp, Panic */}
          <div className="flex items-center gap-1.5 bg-[#181d26] p-1 rounded border border-[#3b4554] shadow-inner">
            <TactileButton
              label="SPLIT"
              subLabel="ON/SET"
              size="sm"
              ledColor="red"
              isActive={false}
              onClick={() => {}}
            />
            <TactileButton
              label="MST CLK"
              subLabel="TAP/SET"
              size="sm"
              ledColor="red"
              isActive={true}
              onClick={handleTapTempo}
            />
            <TactileButton
              label="TRANSP"
              subLabel="ON/SET"
              size="sm"
              ledColor="red"
              isActive={isTransposed}
              onClick={handleToggleTranspose}
            />
            <TactileButton
              label="PANIC"
              size="sm"
              hasLed={false}
              isSpecialShift={false}
              onClick={onPanic}
            />
          </div>
        </div>

        {/* Preset Library Buttons */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1 bg-[#181d26] p-1 rounded border border-[#485366] shadow-inner">
            <span className="text-[8px] uppercase font-black text-neutral-300 mr-1 tracking-wider">PRESET:</span>
            <TactileButton
              label="ORGAN"
              size="sm"
              isActive={activeCategory === 'ORGAN'}
              ledColor="amber"
              onClick={() => {
                setActiveCategory('ORGAN');
                const found = presets.find(p => p.category === 'ORGAN');
                if (found) onSelectPreset(found);
              }}
            />
            <TactileButton
              label="PIANO"
              size="sm"
              isActive={activeCategory === 'PIANO'}
              ledColor="amber"
              onClick={() => {
                setActiveCategory('PIANO');
                const found = presets.find(p => p.category === 'PIANO' || p.category === 'ALL');
                if (found) onSelectPreset(found);
              }}
            />
            <TactileButton
              label="SYNTH"
              size="sm"
              isActive={activeCategory === 'SYNTH'}
              ledColor="amber"
              onClick={() => {
                setActiveCategory('SYNTH');
                const found = presets.find(p => p.category === 'SYNTH' || p.category === 'LEAD');
                if (found) onSelectPreset(found);
              }}
            />
          </div>

          <div className="flex items-center gap-1.5">
            <TactileButton
              label="STORE"
              subLabel="PAGE NAME"
              size="sm"
              hasLed={true}
              ledColor="red"
              isActive={false}
              onClick={onOpenPresetManager}
            />
            <TactileButton
              label="FILES"
              subLabel="SF2 / NORD"
              size="sm"
              hasLed={true}
              ledColor="green"
              isActive={false}
              onClick={onOpenFileManager}
            />
          </div>
        </div>

        {/* Main Center Console: Program Dial + OLED Display + Side Buttons */}
        <div className="relative rounded border border-[#485366] bg-[#222934]/90 p-2.5 my-1 shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)] flex items-center gap-3">
          {/* Program Rotary Dial */}
          <div className="flex flex-col items-center">
            <Knob
              label="PROGRAM"
              subLabel="LIST"
              size="lg"
              value={currentPresetIndex}
              min={0}
              max={Math.max(1, presets.length - 1)}
              step={1}
              ledColor="red"
              onChange={(val) => {
                const idx = Math.round(val);
                if (presets[idx]) onSelectPreset(presets[idx]);
              }}
              formatValue={() => currentPreset.bank}
            />
          </div>

          {/* OLED Main Graphic Display */}
          <div className="flex-1">
            <OledDisplay
              type="program"
              bank={currentPreset.bank}
              name={currentPreset.name}
              category={currentPreset.category}
              layerA={currentPreset.layerA_desc}
              layerB={currentPreset.layerB_desc}
              layerC={currentPreset.layerC_desc}
              tempoBpm={params.tempoBpm}
            />
          </div>

          {/* Quick Side Action Buttons */}
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={handlePrevPreset}
              className="px-2 py-1 bg-[#181d26] hover:bg-[#252c38] active:scale-95 text-[9px] font-bold rounded border border-[#485366] text-neutral-300 shadow-sm transition-colors"
              title="Previous Preset"
            >
              ◄ BANK
            </button>
            <button
              type="button"
              onClick={handleNextPreset}
              className="px-2 py-1 bg-[#181d26] hover:bg-[#252c38] active:scale-95 text-[9px] font-bold rounded border border-[#485366] text-neutral-300 shadow-sm transition-colors"
              title="Next Preset"
            >
              BANK ►
            </button>
            <TactileButton
              label="SOLO"
              size="sm"
              hasLed={true}
              ledColor="red"
              isActive={false}
              onClick={() => {}}
            />
          </div>
        </div>

        {/* Bottom Row: Program 1, 2, 3, 4 Selectors & Shift Key */}
        <div className="mt-auto pt-2 border-t border-[#485366]/80 flex items-center justify-between">
          <div className="flex items-center gap-1.5 bg-[#181d26] px-2 py-1 rounded border border-[#3b4554] shadow-inner">
            {[1, 2, 3, 4].map((num, i) => (
              <TactileButton
                key={num}
                label={`${num}`}
                subLabel={i === 0 ? 'SYSTEM' : i === 1 ? 'SOUND' : i === 2 ? 'ORGANIZE' : 'AUX KB'}
                size="md"
                ledColor="red"
                isActive={currentPresetIndex % 4 === i}
                onClick={() => handleProgramNumClick(i)}
              />
            ))}
          </div>

          {/* Distinct Grey Shift Button */}
          <div className="flex items-center gap-1.5">
            <TactileButton
              label="SHIFT"
              subLabel="EXIT"
              size="md"
              hasLed={false}
              isSpecialShift={true}
              onClick={() => {}}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
