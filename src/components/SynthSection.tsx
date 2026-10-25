/**
 * Nord Stage 4 Synth Section Panel (Center Section)
 * Contains:
 * - 3 Layer Faders (A, B, C) with LED ladder meters & On/Off toggles
 * - Synth Graphic OLED Display with live waveform drawings
 * - Mode selectors (SAMPLES, ANALOG, EXTERN)
 * - Arpeggiator & Gate controls
 * - Voice & Vibrato controls
 * - LFO controls & destination routing
 * - Oscillators controls (Waveform, Detune, Sub, Pitch Env)
 * - Filter controls (LP, BP, HP, Cutoff, Resonance, Env)
 * - Amp Envelope & Unison (1, 2, 3)
 */

import React from 'react';
import { FilterType, SynthMode, SynthParams, WaveformType } from '../types/synth';
import { Fader } from './Fader';
import { Knob } from './Knob';
import { OledDisplay } from './OledDisplay';
import { TactileButton } from './TactileButton';

interface SynthSectionProps {
  params: SynthParams;
  onUpdateParams: (newParams: Partial<SynthParams>) => void;
}

export const SynthSection: React.FC<SynthSectionProps> = ({ params, onUpdateParams }) => {
  const waveforms: WaveformType[] = ['supersaw', 'saw', 'square', 'pulse', 'triangle', 'sine', 'noise', 'sample'];
  const filterTypes: FilterType[] = ['lowpass', 'ladder24', 'bandpass', 'highpass'];

  const cycleWaveform = () => {
    const currIdx = waveforms.indexOf(params.oscWaveform);
    const nextWave = waveforms[(currIdx + 1) % waveforms.length];
    onUpdateParams({ oscWaveform: nextWave });
  };

  const cycleFilterType = () => {
    const currIdx = filterTypes.indexOf(params.filterType);
    const nextFilter = filterTypes[(currIdx + 1) % filterTypes.length];
    onUpdateParams({ filterType: nextFilter });
  };

  const cycleUnison = () => {
    const nextUnison = ((params.unison + 1) % 4) as 0 | 1 | 2 | 3;
    onUpdateParams({ unison: nextUnison });
  };

  const cyclePolyMode = () => {
    const modes: ('poly' | 'mono' | 'legato')[] = ['poly', 'mono', 'legato'];
    const currIdx = modes.indexOf(params.polyphonyMode);
    onUpdateParams({ polyphonyMode: modes[(currIdx + 1) % modes.length] });
  };

  return (
    <div className="relative flex flex-col h-full select-none font-sans rounded-md border-2 border-[#161a22] shadow-[0_20px_50px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.2)] bg-gradient-to-b from-[#2d3542] via-[#242b36] to-[#1c222c] p-2.5 text-neutral-200 min-w-[620px]">
      {/* Metallic Texture Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:12px_12px] pointer-events-none rounded-md" />

      <div className="relative z-10 flex flex-col h-full">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#485366]/80">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black tracking-widest text-neutral-100 uppercase">
              SYNTH
            </span>
            <span className="text-[10px] text-neutral-300 uppercase font-bold tracking-wider">
              SECTION
            </span>
          </div>

          <div className="flex items-center gap-2">
            <TactileButton
              label="FX FOCUS"
              size="sm"
              ledColor="amber"
              isActive={params.effectsOn}
              onClick={() => onUpdateParams({ effectsOn: !params.effectsOn })}
            />
            <TactileButton
              label="ON"
              size="sm"
              ledColor="red"
              isActive={params.layerA_on || params.layerB_on || params.layerC_on}
              onClick={() => {
                const allOff = !params.layerA_on && !params.layerB_on && !params.layerC_on;
                onUpdateParams({
                  layerA_on: allOff,
                  layerB_on: allOff,
                  layerC_on: allOff,
                });
              }}
            />
          </div>
        </div>

        {/* Main Top Area: 3 Layer Faders + OLED & Waveform Controls + Arp/Voice */}
        <div className="grid grid-cols-[auto_1fr_auto] gap-2.5 pb-2.5 border-b border-[#485366]/80">
          {/* Layer Faders A, B, C */}
          <div className="relative rounded border border-[#485366] bg-[#222934]/90 p-2 shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]">
            <div className="text-[8px] uppercase font-black tracking-widest text-neutral-300 mb-1">
              LAYERS
            </div>
            <div className="flex items-center gap-2 bg-[#181d26] p-1.5 rounded border border-[#3b4554] shadow-inner">
              <Fader
                label="A"
                subLabel="AUX KB"
                value={params.layerA_level}
                isOn={params.layerA_on}
                onToggleOn={() => onUpdateParams({ layerA_on: !params.layerA_on })}
                onChange={(val) => onUpdateParams({ layerA_level: val })}
              />
              <Fader
                label="B"
                subLabel="AUX KB"
                value={params.layerB_level}
                isOn={params.layerB_on}
                onToggleOn={() => onUpdateParams({ layerB_on: !params.layerB_on })}
                onChange={(val) => onUpdateParams({ layerB_level: val })}
              />
              <Fader
                label="C"
                subLabel="AUX KB"
                value={params.layerC_level}
                isOn={params.layerC_on}
                onToggleOn={() => onUpdateParams({ layerC_on: !params.layerC_on })}
                onChange={(val) => onUpdateParams({ layerC_level: val })}
              />
            </div>
          </div>

          {/* Center: OLED Waveform Display & Mode Select */}
          <div className="relative rounded border border-[#485366] bg-[#222934]/90 p-2 shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)] flex flex-col items-center justify-between px-3">
            {/* Graphic OLED Screen */}
            <div className="mb-2">
              <OledDisplay
                type="synth"
                waveform={params.oscWaveform}
                category={params.oscCategory}
                detune={params.oscDetune}
                ctrl={params.oscCtrl}
                mode={params.mode}
              />
            </div>

            {/* Knobs below OLED: Info, List, Waveform Selector */}
            <div className="flex items-center justify-center gap-4">
              <div className="flex flex-col items-center">
                <TactileButton
                  label="MODE"
                  subLabel={params.mode}
                  size="sm"
                  ledColor="red"
                  isActive={params.mode === 'ANALOG'}
                  onClick={() => {
                    const nextMode: SynthMode = params.mode === 'ANALOG' ? 'SAMPLES' : 'ANALOG';
                    onUpdateParams({
                      mode: nextMode,
                      oscWaveform: nextMode === 'SAMPLES' ? 'sample' : 'supersaw',
                    });
                  }}
                />
              </div>

              <Knob
                label="WAVEFORM"
                subLabel="SEL"
                size="md"
                value={waveforms.indexOf(params.oscWaveform)}
                min={0}
                max={waveforms.length - 1}
                step={1}
                ledColor="red"
                onChange={(val) => onUpdateParams({ oscWaveform: waveforms[Math.round(val)] })}
                formatValue={() => params.oscWaveform.toUpperCase()}
              />

              <Knob
                label="DETUNE"
                subLabel="SPREAD"
                size="sm"
                value={params.oscDetune}
                min={0}
                max={10}
                step={0.1}
                defaultValue={3.4}
                onChange={(val) => onUpdateParams({ oscDetune: val })}
              />
            </div>
          </div>

          {/* Right: Arpeggiator & Voice */}
          <div className="relative rounded border border-[#485366] bg-[#222934]/90 p-2 shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)] flex flex-col gap-2">
            {/* Arp Group */}
            <div className="flex flex-col border-b border-[#485366]/60 pb-2">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] font-black text-neutral-300 uppercase tracking-widest">
                  ARPEGGIATOR / GATE
                </span>
                <TactileButton
                  label="ARP"
                  size="sm"
                  hasLed={true}
                  ledColor="red"
                  isActive={params.arpEnabled}
                  onClick={() => onUpdateParams({ arpEnabled: !params.arpEnabled })}
                />
              </div>
              <div className="flex items-center gap-2">
                <Knob
                  label="RATE"
                  subLabel="MST CLK"
                  size="sm"
                  value={params.tempoBpm}
                  min={40}
                  max={240}
                  step={1}
                  unit="BPM"
                  defaultValue={124}
                  onChange={(val) => onUpdateParams({ tempoBpm: Math.round(val) })}
                />
                <Knob
                  label="RANGE"
                  subLabel="OCT"
                  size="sm"
                  value={params.arpOctaveRange}
                  min={1}
                  max={4}
                  step={1}
                  defaultValue={2}
                  onChange={(val) => onUpdateParams({ arpOctaveRange: Math.round(val) as 1 | 2 | 3 | 4 })}
                />
                <div className="flex flex-col gap-1">
                  <TactileButton
                    label="DIR"
                    subLabel={params.arpDirection}
                    size="sm"
                    hasLed={false}
                    onClick={() => {
                      const dirs: SynthParams['arpDirection'][] = ['UP', 'DOWN', 'UP_DOWN', 'RANDOM', 'POLY'];
                      const idx = dirs.indexOf(params.arpDirection);
                      onUpdateParams({ arpDirection: dirs[(idx + 1) % dirs.length] });
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Voice / Polyphony Group */}
            <div className="flex items-center justify-between pt-1">
              <TactileButton
                label={params.polyphonyMode.toUpperCase()}
                subLabel="VOICE"
                size="sm"
                hasLed={true}
                ledColor="amber"
                isActive={params.polyphonyMode === 'poly'}
                onClick={cyclePolyMode}
              />
              <Knob
                label="GLIDE"
                size="sm"
                value={params.glide}
                min={0}
                max={1}
                step={0.01}
                defaultValue={0}
                onChange={(val) => onUpdateParams({ glide: val })}
              />
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onUpdateParams({ octaveShift: Math.max(-3, params.octaveShift - 1) })}
                    className="px-1.5 py-0.5 bg-[#181d26] text-[8px] font-bold rounded border border-[#485366] text-neutral-300 hover:bg-[#252c38] transition-colors"
                  >
                    -OCT
                  </button>
                  <span className="text-[10px] font-mono font-bold text-cyan-300 tabular-nums">
                    {params.octaveShift >= 0 ? `+${params.octaveShift}` : params.octaveShift}
                  </span>
                  <button
                    type="button"
                    onClick={() => onUpdateParams({ octaveShift: Math.min(3, params.octaveShift + 1) })}
                    className="px-1.5 py-0.5 bg-[#181d26] text-[8px] font-bold rounded border border-[#485366] text-neutral-300 hover:bg-[#252c38] transition-colors"
                  >
                    +OCT
                  </button>
                </div>
                <span className="text-[8px] text-neutral-400 uppercase font-bold tracking-wider mt-0.5">OCTAVE</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row: LFO, OSCILLATORS, FILTER, AMP ENVELOPE */}
        <div className="grid grid-cols-4 gap-2.5 pt-2 mt-auto">
          {/* LFO Section */}
          <div className="relative rounded border border-[#485366] bg-[#222934]/90 p-2 shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)] flex flex-col">
            <div className="flex items-center justify-between mb-1.5 border-b border-[#485366]/60 pb-1">
              <span className="text-[9px] font-black text-neutral-200 uppercase tracking-wider">
                LFO
              </span>
              <TactileButton
                label={params.lfoWave.toUpperCase()}
                size="sm"
                hasLed={false}
                onClick={() => {
                  const waves: SynthParams['lfoWave'][] = ['triangle', 'sine', 'saw', 'square'];
                  const idx = waves.indexOf(params.lfoWave);
                  onUpdateParams({ lfoWave: waves[(idx + 1) % waves.length] });
                }}
              />
            </div>
            <div className="flex items-center justify-around">
              <Knob
                label="RATE"
                size="sm"
                value={params.lfoRate}
                min={0.1}
                max={20}
                step={0.1}
                unit="Hz"
                defaultValue={1.5}
                onChange={(val) => onUpdateParams({ lfoRate: val })}
              />
              <Knob
                label="MOD AMT"
                size="sm"
                value={params.lfoModAmt}
                min={0}
                max={10}
                step={0.1}
                defaultValue={1.2}
                onChange={(val) => onUpdateParams({ lfoModAmt: val })}
              />
            </div>
          </div>

          {/* Oscillators Control Section */}
          <div className="relative rounded border border-[#485366] bg-[#222934]/90 p-2 shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)] flex flex-col">
            <div className="flex items-center justify-between mb-1.5 border-b border-[#485366]/60 pb-1">
              <span className="text-[9px] font-black text-neutral-200 uppercase tracking-wider">
                OSCILLATORS
              </span>
              <TactileButton
                label="PITCH ENV"
                size="sm"
                hasLed={true}
                ledColor="red"
                isActive={params.oscPitchEnv}
                onClick={() => onUpdateParams({ oscPitchEnv: !params.oscPitchEnv })}
              />
            </div>
            <div className="flex items-center justify-around">
              <Knob
                label="OSC CTRL"
                size="sm"
                value={params.oscCtrl}
                min={0}
                max={10}
                step={0.1}
                defaultValue={4.5}
                onChange={(val) => onUpdateParams({ oscCtrl: val })}
              />
              <Knob
                label="SUB / NOISE"
                size="sm"
                value={params.oscSubLevel}
                min={0}
                max={1}
                step={0.05}
                defaultValue={0.2}
                onChange={(val) => onUpdateParams({ oscSubLevel: val })}
              />
            </div>
          </div>

          {/* Filter Section */}
          <div className="relative rounded border border-[#485366] bg-[#222934]/90 p-2 shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)] flex flex-col">
            <div className="flex items-center justify-between mb-1.5 border-b border-[#485366]/60 pb-1">
              <span className="text-[9px] font-black text-neutral-200 uppercase tracking-wider">
                FILTER
              </span>
              <div className="flex items-center gap-1">
                <TactileButton
                  label={params.filterType === 'ladder24' ? 'LP24' : params.filterType.substring(0, 2).toUpperCase()}
                  size="sm"
                  hasLed={false}
                  onClick={cycleFilterType}
                />
                <TactileButton
                  label="ON"
                  size="sm"
                  hasLed={true}
                  ledColor="red"
                  isActive={params.filterOn}
                  onClick={() => onUpdateParams({ filterOn: !params.filterOn })}
                />
              </div>
            </div>
            <div className="flex items-center justify-around">
              <Knob
                label="FREQ"
                subLabel="CUTOFF"
                size="sm"
                value={params.filterCutoff}
                min={50}
                max={18000}
                step={10}
                unit="Hz"
                defaultValue={3800}
                onChange={(val) => onUpdateParams({ filterCutoff: val })}
                formatValue={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`)}
              />
              <Knob
                label="RES"
                subLabel="Q"
                size="sm"
                value={params.filterResonance}
                min={0}
                max={10}
                step={0.1}
                defaultValue={2.5}
                onChange={(val) => onUpdateParams({ filterResonance: val })}
              />
              <Knob
                label="ENV AMT"
                size="sm"
                value={params.filterEnvAmt}
                min={-10}
                max={10}
                step={0.2}
                defaultValue={3.0}
                onChange={(val) => onUpdateParams({ filterEnvAmt: val })}
              />
            </div>
          </div>

          {/* Amp Envelope & Unison Section */}
          <div className="relative rounded border border-[#485366] bg-[#222934]/90 p-2 shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)] flex flex-col">
            <div className="flex items-center justify-between mb-1.5 border-b border-[#485366]/60 pb-1">
              <span className="text-[9px] font-black text-neutral-200 uppercase tracking-wider">
                AMP ENV
              </span>
              <TactileButton
                label={`UNISON ${params.unison || 'OFF'}`}
                size="sm"
                hasLed={true}
                ledColor="amber"
                isActive={params.unison > 0}
                onClick={cycleUnison}
              />
            </div>
            <div className="flex items-center justify-around">
              <Knob
                label="ATTACK"
                size="sm"
                value={params.ampAttack}
                min={0.002}
                max={3.0}
                step={0.01}
                unit="s"
                defaultValue={0.04}
                onChange={(val) => onUpdateParams({ ampAttack: val })}
              />
              <Knob
                label="DECAY"
                size="sm"
                value={params.ampDecay}
                min={0.01}
                max={5.0}
                step={0.05}
                unit="s"
                defaultValue={1.8}
                onChange={(val) => onUpdateParams({ ampDecay: val })}
              />
              <Knob
                label="RELEASE"
                size="sm"
                value={params.ampRelease}
                min={0.02}
                max={5.0}
                step={0.05}
                unit="s"
                defaultValue={0.9}
                onChange={(val) => onUpdateParams({ ampRelease: val })}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
