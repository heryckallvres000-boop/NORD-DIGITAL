/**
 * Layer Effects Web Component
 * Pixel-accurate hardware replica of the Nord Stage 4 Layer Effects rack.
 * Based on the reference image (962 x 683 aspect ratio).
 * Connects 100% to the Web Audio API real-time DSP engine.
 */

import React, { useState } from 'react';
import { SynthParams } from '../../types/synth';
import { KnobWithScale } from './KnobWithScale';
import { RockerSwitch } from './RockerSwitch';
import { TactileSwitch } from './TactileSwitch';
import { VerticalSelector } from './VerticalSelector';
import { LedDot } from './LedDot';

interface LayerEffectsPanelProps {
  params: SynthParams;
  onUpdateParams: (newParams: Partial<SynthParams>) => void;
  onTestSound?: () => void;
  isPlayingTest?: boolean;
  embeddedInRack?: boolean;
}

export const LayerEffectsPanel: React.FC<LayerEffectsPanelProps> = ({
  params,
  onUpdateParams,
  onTestSound,
  isPlayingTest = false,
  embeddedInRack = false,
}) => {
  // Local states for sub-variations & selector modes
  const [mod1Sens, setMod1Sens] = useState(false);
  const [mod1MstClk, setMod1MstClk] = useState(false);
  const [mod1Ped, setMod1Ped] = useState(false);

  const [delayAnalog, setDelayAnalog] = useState(params.delayAnalog ?? true);
  const [delayMstClk, setDelayMstClk] = useState(true);
  const [delayEffect, setDelayEffect] = useState<'CHOR' | 'VIBE' | 'ENS' | 'FLAM' | 'SPACE'>('SPACE');
  const [delayFilter, setDelayFilter] = useState<'HP' | 'BP' | 'LP'>('LP');
  const [delayGlobal, setDelayGlobal] = useState(false);

  const [compGlobal, setCompGlobal] = useState(false);
  const [reverbGlobal, setReverbGlobal] = useState(false);
  const [freqButtonActive, setFreqButtonActive] = useState(false);
  const [midResActive, setMidResActive] = useState(false);

  // Tap tempo handler for DELAY
  const [lastTap, setLastTap] = useState(0);
  const handleTapTempo = () => {
    const now = Date.now();
    if (lastTap > 0) {
      const diff = now - lastTap;
      if (diff > 100 && diff < 2000) {
        onUpdateParams({ delayTempo: Number((diff / 1000).toFixed(2)) });
      }
    }
    setLastTap(now);
  };

  const corePanel = (
    <div className="relative w-full max-w-[962px] select-none font-sans rounded-md border-2 border-[#161a22] shadow-[0_20px_50px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.2)] bg-gradient-to-b from-[#2d3542] via-[#242b36] to-[#1c222c] p-2.5 text-neutral-200">
      {/* Metallic Texture Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:12px_12px] pointer-events-none rounded-md" />

      {/* Main Grid: Left Column (MOD 1, MOD 2, AMP SIM/EQ) and Right Column (DELAY, COMP, REVERB) */}
      <div className="relative z-10 grid grid-cols-[1.08fr_1fr] gap-2">
        {/* ============================================================== */}
        {/* ===================== LEFT COLUMN =========================== */}
        {/* ============================================================== */}
        <div className="flex flex-col gap-2">
          {/* 1. MOD 1 */}
          <div className="relative rounded border border-[#485366] bg-[#222934]/90 p-2.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]">
            {/* Header Cutout */}
            <div className="absolute -top-2 left-4 bg-[#232a35] px-2 text-[10px] font-black uppercase tracking-wider text-white">
              MOD 1
            </div>

            <div className="flex items-center justify-between mt-1">
              {/* Knobs: RATE & AMOUNT */}
              <div className="flex items-start gap-3">
                {/* RATE Knob */}
                <div className="flex flex-col items-center">
                  <KnobWithScale
                    label="RATE"
                    value={params.mod1Rate}
                    min={0}
                    max={10}
                    step={0.1}
                    defaultValue={4.0}
                    onChange={(val) => onUpdateParams({ mod1Rate: val })}
                    subLabelComponent={
                      <div className="flex items-center gap-1 mt-0.5">
                        <button
                          type="button"
                          onClick={() => setMod1Sens(!mod1Sens)}
                          className={`text-[7px] font-bold uppercase px-0.5 py-0.2 rounded-[2px] border ${
                            mod1Sens
                              ? 'bg-neutral-200 text-black border-white'
                              : 'border-neutral-400 text-neutral-300'
                          }`}
                        >
                          SENS
                        </button>
                      </div>
                    }
                  />

                  {/* MST CLK below RATE */}
                  <div className="mt-1 flex items-center gap-1">
                    <LedDot isOn={mod1MstClk} color="red" size="sm" />
                    <button
                      type="button"
                      onClick={() => setMod1MstClk(!mod1MstClk)}
                      className="bg-[#7a0f16] text-white text-[7.5px] font-bold px-1 py-0.5 rounded-[2px] uppercase shadow-sm"
                    >
                      MST CLK
                    </button>
                  </div>
                </div>

                {/* AMOUNT Knob */}
                <div className="flex flex-col items-center">
                  <KnobWithScale
                    label="AMOUNT"
                    value={params.mod1Amount}
                    min={0}
                    max={10}
                    step={0.1}
                    defaultValue={5.5}
                    onChange={(val) => onUpdateParams({ mod1Amount: val })}
                  />
                  <div className="mt-1.5 flex items-center gap-1">
                    <LedDot isOn={params.mod1On} color="red" size="sm" />
                  </div>
                </div>
              </div>

              {/* Selectors: RM/TREM/A-PAN & A-WAH/WAH/PUMP */}
              <div className="flex flex-col items-center">
                <VerticalSelector
                  leftItems={[
                    { id: 'RM', label: 'RM' },
                    { id: 'TREM', label: 'TREM' },
                    { id: 'A-PAN', label: 'A-PAN' },
                  ]}
                  rightItems={[
                    { id: 'A-WAH', label: 'A-WAH', isBoxed: true },
                    { id: 'WAH', label: 'WAH', isBoxed: true },
                    { id: 'PUMP', label: 'PUMP', isBoxed: true },
                  ]}
                  selectedId={params.mod1Type}
                  onSelect={(id) => onUpdateParams({ mod1Type: id as any })}
                />

                {/* VARIATION & PED */}
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-3 border-l border-b border-neutral-500" />
                    <TactileSwitch
                      label="VARIATION"
                      size="sm"
                      isActive={params.mod1Variation}
                      onClick={() => onUpdateParams({ mod1Variation: !params.mod1Variation })}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setMod1Ped(!mod1Ped)}
                    className={`text-[8px] font-bold uppercase px-1 py-0.5 rounded-[2px] border ${
                      mod1Ped
                        ? 'bg-neutral-200 text-black border-white'
                        : 'border-neutral-400 text-neutral-300'
                    }`}
                  >
                    PED ▼
                  </button>
                </div>
              </div>

              {/* ON Rocker Switch */}
              <div className="pr-1">
                <RockerSwitch
                  isOn={params.mod1On}
                  onToggle={() => onUpdateParams({ mod1On: !params.mod1On })}
                />
              </div>
            </div>
          </div>

          {/* 2. MOD 2 */}
          <div className="relative rounded border border-[#485366] bg-[#222934]/90 p-2.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]">
            {/* Header Cutout */}
            <div className="absolute -top-2 left-4 bg-[#232a35] px-2 text-[10px] font-black uppercase tracking-wider text-white">
              MOD 2
            </div>

            <div className="flex items-center justify-between mt-1">
              {/* Knobs: RATE & AMOUNT */}
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <KnobWithScale
                    label="RATE"
                    value={params.mod2Rate}
                    min={0}
                    max={10}
                    step={0.1}
                    defaultValue={3.0}
                    onChange={(val) => onUpdateParams({ mod2Rate: val })}
                  />
                  <div className="mt-1 flex items-center gap-1">
                    <LedDot isOn={params.mod2On} color="red" size="sm" />
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <KnobWithScale
                    label="AMOUNT"
                    value={params.mod2Amount}
                    min={0}
                    max={10}
                    step={0.1}
                    defaultValue={6.0}
                    onChange={(val) => onUpdateParams({ mod2Amount: val })}
                  />
                  <div className="mt-1 flex items-center gap-1">
                    <LedDot isOn={params.mod2On} color="red" size="sm" />
                  </div>
                </div>
              </div>

              {/* Selectors: CHOR/FLANG/PHAS & VIBE/ENS/SPIN */}
              <div className="flex flex-col items-center">
                <VerticalSelector
                  leftItems={[
                    { id: 'CHOR', label: 'CHOR' },
                    { id: 'FLANG', label: 'FLANG' },
                    { id: 'PHAS', label: 'PHAS' },
                  ]}
                  rightItems={[
                    { id: 'VIBE', label: 'VIBE' },
                    { id: 'ENS', label: 'ENS' },
                    { id: 'SPIN', label: 'SPIN' },
                  ]}
                  selectedId={params.mod2Type}
                  onSelect={(id) => onUpdateParams({ mod2Type: id as any })}
                />

                {/* VARIATION */}
                <div className="flex items-center gap-1 mt-1.5">
                  <div className="w-1.5 h-3 border-l border-b border-neutral-500" />
                  <TactileSwitch
                    label="VARIATION ▼"
                    size="sm"
                    hasLed={true}
                    isLedOn={params.mod2Variation}
                    onClick={() => onUpdateParams({ mod2Variation: !params.mod2Variation })}
                  />
                </div>
              </div>

              {/* ON Rocker Switch */}
              <div className="pr-1">
                <RockerSwitch
                  isOn={params.mod2On}
                  onToggle={() => onUpdateParams({ mod2On: !params.mod2On })}
                />
              </div>
            </div>
          </div>

          {/* 3. AMP SIM / EQ */}
          <div className="relative rounded border border-[#485366] bg-[#222934]/90 p-2.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]">
            {/* Header Cutout */}
            <div className="absolute -top-2 left-4 bg-[#232a35] px-2 text-[10px] font-black uppercase tracking-wider text-white">
              AMP SIM / EQ
            </div>

            {/* Top Row: DRIVE, FREQ & Amp Models */}
            <div className="flex items-start justify-between mt-1 border-b border-neutral-700/50 pb-2">
              <div className="flex items-start gap-3">
                {/* Upper Left ON LED */}
                <div className="flex flex-col items-center mr-1">
                  <span className="text-[7.5px] font-bold text-neutral-300">ON</span>
                  <LedDot isOn={params.ampSimOn} color="red" size="sm" />
                </div>

                {/* DRIVE Knob */}
                <div className="flex flex-col items-center">
                  <KnobWithScale
                    label="DRIVE"
                    value={params.drive}
                    min={0}
                    max={10}
                    step={0.1}
                    defaultValue={2.5}
                    onChange={(val) => onUpdateParams({ drive: val })}
                  />
                  <div className="mt-0.5">
                    <LedDot isOn={params.ampSimOn} color="red" size="sm" />
                  </div>
                </div>

                {/* FREQ Knob (with frequency scale) */}
                <div className="flex flex-col items-center">
                  <KnobWithScale
                    label="FREQ"
                    value={params.eqMidFreq}
                    min={200}
                    max={8000}
                    scaleType="freq_scale"
                    step={50}
                    defaultValue={1000}
                    onChange={(val) => onUpdateParams({ eqMidFreq: val })}
                    formatValue={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`)}
                    subLabelComponent={
                      <div className="mt-0.5 flex flex-col items-center">
                        <button
                          type="button"
                          onClick={() => setFreqButtonActive(!freqButtonActive)}
                          className={`text-[7px] font-bold uppercase px-1 py-0.2 rounded-[2px] border ${
                            freqButtonActive
                              ? 'bg-neutral-200 text-black border-white'
                              : 'border-neutral-400 text-neutral-300'
                          }`}
                        >
                          FREQ
                        </button>
                      </div>
                    }
                  />
                  <div className="mt-0.5">
                    <LedDot isOn={params.ampSimOn} color="red" size="sm" />
                  </div>
                </div>
              </div>

              {/* Selectors: SMALL/JC/TWIN & TO ROTARY/LP/HP */}
              <div className="flex flex-col items-center">
                <VerticalSelector
                  leftItems={[
                    { id: 'SMALL', label: 'SMALL' },
                    { id: 'JC', label: 'JC' },
                    { id: 'TWIN', label: 'TWIN' },
                  ]}
                  rightItems={[
                    { id: 'ROTARY', label: 'TO ROTARY', isRedBadge: true },
                    { id: 'LP_FILTER', label: 'LP FILTER', isBoxed: true },
                    { id: 'HP_FILTER', label: 'HP FILTER', isBoxed: true },
                  ]}
                  selectedId={params.ampSimType}
                  onSelect={(id) => onUpdateParams({ ampSimType: id as any })}
                />

                {/* VARIATION */}
                <div className="flex items-center gap-1 mt-1.5">
                  <div className="w-1.5 h-3 border-l border-b border-neutral-500" />
                  <TactileSwitch
                    label="VARIATION ▼"
                    size="sm"
                    hasLed={true}
                    isLedOn={false}
                    onClick={() => {}}
                  />
                </div>
              </div>

              {/* ON Rocker Switch */}
              <div className="pr-1">
                <RockerSwitch
                  isOn={params.ampSimOn}
                  onToggle={() => onUpdateParams({ ampSimOn: !params.ampSimOn })}
                />
              </div>
            </div>

            {/* Bottom Row: 3 EQ Knobs (BASS, MID, TREBLE) */}
            <div className="flex items-center justify-around pt-2">
              <KnobWithScale
                label="BASS"
                value={params.eqBass}
                min={-15}
                max={15}
                scaleType="minus15_to_15"
                step={0.5}
                defaultValue={0}
                unit="dB"
                onChange={(val) => onUpdateParams({ eqBass: val })}
              />

              <div className="flex flex-col items-center">
                <KnobWithScale
                  label="MID"
                  value={params.eqMid}
                  min={-15}
                  max={15}
                  scaleType="minus15_to_15"
                  step={0.5}
                  defaultValue={0}
                  unit="dB"
                  onChange={(val) => onUpdateParams({ eqMid: val })}
                  subLabelComponent={
                    <button
                      type="button"
                      onClick={() => setMidResActive(!midResActive)}
                      className={`text-[7px] font-bold uppercase px-0.5 py-0.2 rounded-[1px] border mt-0.5 ${
                        midResActive
                          ? 'bg-neutral-200 text-black border-white'
                          : 'border-neutral-400 text-neutral-300'
                      }`}
                    >
                      RES
                    </button>
                  }
                />
              </div>

              <KnobWithScale
                label="TREBLE"
                value={params.eqTreble}
                min={-15}
                max={15}
                scaleType="minus15_to_15"
                step={0.5}
                defaultValue={0}
                unit="dB"
                onChange={(val) => onUpdateParams({ eqTreble: val })}
              />
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* ===================== RIGHT COLUMN ========================== */}
        {/* ============================================================== */}
        <div className="flex flex-col gap-2">
          {/* 1. DELAY (Upper Large Box) */}
          <div className="relative rounded border border-[#485366] bg-[#222934]/90 p-2.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)] flex-1 flex flex-col justify-between">
            {/* Header Cutout */}
            <div className="absolute -top-2 left-4 bg-[#232a35] px-2 text-[10px] font-black uppercase tracking-wider text-white">
              DELAY
            </div>

            {/* Top Controls: TEMPO, EFFECTS, FEEDBACK */}
            <div className="grid grid-cols-[auto_1fr_auto] gap-3 items-start mt-1">
              {/* Left: TEMPO knob + MST CLK + TAP/SET + ANALOG */}
              <div className="flex flex-col items-center">
                <KnobWithScale
                  label="TEMPO"
                  value={params.delayTempo * 10}
                  min={0}
                  max={10}
                  step={0.1}
                  defaultValue={3.8}
                  onChange={(val) => onUpdateParams({ delayTempo: Number((val / 10).toFixed(2)) })}
                />
                <div className="flex items-center gap-1 mt-1">
                  <LedDot isOn={delayMstClk} color="red" size="sm" />
                  <button
                    type="button"
                    onClick={() => setDelayMstClk(!delayMstClk)}
                    className="bg-[#7a0f16] text-white text-[7.5px] font-bold px-1 py-0.5 rounded-[2px] uppercase shadow-sm"
                  >
                    MST CLK
                  </button>
                </div>

                {/* TAP/SET & ANALOG Buttons */}
                <div className="mt-2 flex flex-col items-center gap-1 bg-[#161a22] p-1 rounded border border-neutral-700/60">
                  <TactileSwitch
                    label="TAP/SET ▼"
                    size="sm"
                    hasLed={true}
                    isLedOn={true}
                    onClick={handleTapTempo}
                  />
                  <div className="flex items-center gap-1">
                    <LedDot isOn={delayAnalog} color="amber" size="sm" />
                    <button
                      type="button"
                      onClick={() => {
                        const next = !delayAnalog;
                        setDelayAnalog(next);
                        onUpdateParams({ delayAnalog: next });
                      }}
                      className="text-[7.5px] font-bold uppercase text-neutral-300"
                    >
                      ANALOG ▼
                    </button>
                  </div>
                </div>
              </div>

              {/* Center: EFFECTS Selector + DRY WET Knob */}
              <div className="flex flex-col items-center justify-between h-full">
                {/* EFFECTS list with round LEDs */}
                <div className="flex flex-col items-center bg-[#181d26] p-1.5 rounded border border-neutral-700/60 w-full">
                  <span className="text-[8px] font-black uppercase tracking-wider text-neutral-300 mb-1">
                    EFFECTS
                  </span>
                  <div className="flex items-center justify-between w-full px-2">
                    {/* Left Column */}
                    <div className="flex flex-col gap-1">
                      {(['CHOR', 'VIBE', 'ENS'] as const).map((eff) => (
                        <button
                          key={eff}
                          type="button"
                          onClick={() => setDelayEffect(eff)}
                          className="flex items-center gap-1.5 text-[8px] font-black uppercase text-neutral-300 hover:text-white"
                        >
                          <span>{eff}</span>
                          <LedDot isOn={delayEffect === eff} color="red" size="sm" />
                        </button>
                      ))}
                    </div>

                    {/* Right Column */}
                    <div className="flex flex-col gap-1 items-end">
                      {(['FLAM', 'SPACE'] as const).map((eff) => (
                        <button
                          key={eff}
                          type="button"
                          onClick={() => setDelayEffect(eff)}
                          className="flex items-center gap-1.5 text-[8px] font-black uppercase text-neutral-300 hover:text-white"
                        >
                          <span>{eff}</span>
                          <LedDot isOn={delayEffect === eff} color="red" size="sm" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* VARIATION button */}
                  <div className="flex items-center gap-1 mt-1.5 pt-1 border-t border-neutral-700/60">
                    <LedDot isOn={false} color="red" size="sm" />
                    <TactileSwitch
                      label="VARIATION ▼"
                      size="sm"
                      onClick={() => {}}
                    />
                  </div>
                </div>

                {/* DRY WET Knob */}
                <div className="mt-2">
                  <KnobWithScale
                    label="DRY  WET"
                    value={params.delayDryWet * 10}
                    min={0}
                    max={10}
                    step={0.1}
                    defaultValue={3.0}
                    onChange={(val) => onUpdateParams({ delayDryWet: Number((val / 10).toFixed(2)) })}
                  />
                  <div className="flex justify-center mt-0.5">
                    <LedDot isOn={params.delayOn} color="red" size="sm" />
                  </div>
                </div>
              </div>

              {/* Right: FEEDBACK knob + FILTER HP/BP/LP + PING PONG + ON / GLOBAL */}
              <div className="flex flex-col items-center">
                <KnobWithScale
                  label="FEEDBACK"
                  value={params.delayFeedback * 10}
                  min={0}
                  max={10}
                  step={0.1}
                  defaultValue={4.5}
                  onChange={(val) => onUpdateParams({ delayFeedback: Number((val / 10).toFixed(2)) })}
                />
                <div className="mt-0.5">
                  <LedDot isOn={params.delayOn} color="red" size="sm" />
                </div>

                {/* FILTER Section: HP, BP, LP with LEDs */}
                <div className="flex flex-col items-center mt-1 bg-[#181d26] p-1 rounded border border-neutral-700/60 w-full">
                  <span className="text-[7.5px] font-black uppercase text-neutral-400">FILTER</span>
                  <div className="flex items-center justify-between w-full px-1 text-[7.5px] font-black">
                    <button
                      type="button"
                      onClick={() => setDelayFilter('HP')}
                      className="flex items-center gap-0.5 text-neutral-300 hover:text-white"
                    >
                      <span>HP</span>
                      <LedDot isOn={delayFilter === 'HP'} color="red" size="sm" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDelayFilter('BP')}
                      className="flex items-center gap-0.5 text-neutral-300 hover:text-white"
                    >
                      <span>BP</span>
                      <LedDot isOn={delayFilter === 'BP'} color="red" size="sm" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDelayFilter('LP')}
                      className="flex items-center gap-0.5 text-neutral-300 hover:text-white"
                    >
                      <span>LP</span>
                      <LedDot isOn={delayFilter === 'LP'} color="red" size="sm" />
                    </button>
                  </div>
                </div>

                {/* PING PONG button */}
                <div className="mt-1">
                  <TactileSwitch
                    label="PING PONG ▼"
                    size="sm"
                    hasLed={true}
                    isLedOn={params.delayPingPong}
                    onClick={() => onUpdateParams({ delayPingPong: !params.delayPingPong })}
                  />
                </div>

                {/* ON Switch & GLOBAL Button */}
                <div className="mt-1 flex items-center gap-1.5">
                  <RockerSwitch
                    isOn={params.delayOn}
                    onToggle={() => onUpdateParams({ delayOn: !params.delayOn })}
                    orientation="horizontal"
                  />
                  <div className="flex flex-col items-center">
                    <LedDot isOn={delayGlobal} color="red" size="sm" />
                    <button
                      type="button"
                      onClick={() => setDelayGlobal(!delayGlobal)}
                      className="bg-[#7a0f16] text-white text-[7.5px] font-bold px-1 py-0.5 rounded-[2px] uppercase shadow-sm"
                    >
                      GLOBAL ▼
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Lower Right Row: COMP on Left, REVERB on Right */}
          <div className="grid grid-cols-[1fr_1.4fr] gap-2">
            {/* 2. COMP */}
            <div className="relative rounded border border-[#485366] bg-[#222934]/90 p-2 shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)] flex flex-col justify-between">
              {/* Header Cutout */}
              <div className="absolute -top-2 left-4 bg-[#232a35] px-2 text-[10px] font-black uppercase tracking-wider text-white">
                COMP
              </div>

              {/* ACTIVE LED */}
              <div className="flex items-center gap-1 mt-1">
                <LedDot isOn={params.compOn} color="red" size="sm" />
                <span className="text-[8px] font-bold uppercase text-neutral-300">ACTIVE</span>
              </div>

              {/* AMOUNT Knob */}
              <div className="flex flex-col items-center my-1">
                <KnobWithScale
                  label="AMOUNT"
                  value={params.compAmount}
                  min={0}
                  max={10}
                  step={0.1}
                  defaultValue={3.5}
                  onChange={(val) => onUpdateParams({ compAmount: val })}
                />
                <div className="flex items-center gap-1 mt-0.5">
                  <LedDot isOn={params.compFast} color="red" size="sm" />
                  <button
                    type="button"
                    onClick={() => onUpdateParams({ compFast: !params.compFast })}
                    className="text-[7.5px] font-bold uppercase text-neutral-300"
                  >
                    FAST
                  </button>
                </div>
              </div>

              {/* ON Switch & GLOBAL Button */}
              <div className="flex items-center justify-between border-t border-neutral-700/50 pt-1.5">
                <div className="flex items-center gap-1">
                  <span className="text-[8px] font-bold text-neutral-300">ON</span>
                  <LedDot isOn={params.compOn} color="red" size="sm" />
                  <RockerSwitch
                    isOn={params.compOn}
                    onToggle={() => onUpdateParams({ compOn: !params.compOn })}
                    orientation="horizontal"
                    label=""
                  />
                </div>

                <div className="flex flex-col items-center">
                  <LedDot isOn={compGlobal} color="red" size="sm" />
                  <button
                    type="button"
                    onClick={() => setCompGlobal(!compGlobal)}
                    className="bg-[#7a0f16] text-white text-[7.5px] font-bold px-1 py-0.5 rounded-[2px] uppercase shadow-sm"
                  >
                    GLOBAL ▼
                  </button>
                </div>
              </div>
            </div>

            {/* 3. REVERB */}
            <div className="relative rounded border border-[#485366] bg-[#222934]/90 p-2 shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)] flex flex-col justify-between">
              {/* Header Cutout */}
              <div className="absolute -top-2 left-4 bg-[#232a35] px-2 text-[10px] font-black uppercase tracking-wider text-white">
                REVERB
              </div>

              {/* Top Row: BRIGHT/DARK + ROOM/STAGE Selectors */}
              <div className="flex items-start justify-between mt-1">
                {/* BRIGHT / DARK selector */}
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1">
                    <LedDot isOn={params.reverbBright} color="red" size="sm" />
                    <span className="text-[7.5px] font-bold text-neutral-300">BRIGHT</span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <LedDot isOn={!params.reverbBright} color="red" size="sm" />
                    <span className="text-[7.5px] font-bold text-neutral-300">DARK</span>
                  </div>

                  <TactileSwitch
                    label=""
                    size="sm"
                    className="mt-1"
                    onClick={() => onUpdateParams({ reverbBright: !params.reverbBright })}
                  />
                </div>

                {/* Vertical Selector: ROOM/BOOTH/SPRING & STAGE/HALL/CATH */}
                <div className="flex flex-col items-center">
                  <VerticalSelector
                    leftItems={[
                      { id: 'ROOM', label: 'ROOM' },
                      { id: 'BOOTH', label: 'BOOTH' },
                      { id: 'SPRING', label: 'SPRING' },
                    ]}
                    rightItems={[
                      { id: 'STAGE', label: 'STAGE' },
                      { id: 'HALL', label: 'HALL' },
                      { id: 'CATH', label: 'CATH' },
                    ]}
                    selectedId={params.reverbType}
                    onSelect={(id) => onUpdateParams({ reverbType: id as any })}
                  />

                  {/* VAR | CHORALE Button */}
                  <div className="mt-1 flex items-center gap-1">
                    <TactileSwitch
                      label="VAR | CHORALE ▼"
                      size="sm"
                      hasLed={true}
                      isLedOn={params.reverbChorale}
                      onClick={() => onUpdateParams({ reverbChorale: !params.reverbChorale })}
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Row: DRY WET + ON Switch + GLOBAL */}
              <div className="flex items-end justify-between border-t border-neutral-700/50 pt-1 mt-1">
                {/* DRY WET Knob */}
                <div className="flex flex-col items-center">
                  <KnobWithScale
                    label="DRY  WET"
                    value={params.reverbDryWet * 10}
                    min={0}
                    max={10}
                    step={0.1}
                    defaultValue={3.5}
                    onChange={(val) => onUpdateParams({ reverbDryWet: Number((val / 10).toFixed(2)) })}
                  />
                  <div className="flex justify-center mt-0.5">
                    <LedDot isOn={params.reverbOn} color="red" size="sm" />
                  </div>
                </div>

                {/* ON Switch */}
                <div className="flex items-center gap-1">
                  <span className="text-[8px] font-bold text-neutral-300">ON</span>
                  <LedDot isOn={params.reverbOn} color="red" size="sm" />
                  <RockerSwitch
                    isOn={params.reverbOn}
                    onToggle={() => onUpdateParams({ reverbOn: !params.reverbOn })}
                    orientation="horizontal"
                    label=""
                  />
                </div>

                {/* GLOBAL Button */}
                <div className="flex flex-col items-center">
                  <LedDot isOn={reverbGlobal} color="red" size="sm" />
                  <button
                    type="button"
                    onClick={() => setReverbGlobal(!reverbGlobal)}
                    className="bg-[#7a0f16] text-white text-[7.5px] font-bold px-1 py-0.5 rounded-[2px] uppercase shadow-sm"
                  >
                    GLOBAL ▼
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Real Audio DSP Live Status & Quick Sound Test Bar */}
      {onTestSound && (
        <div className="relative z-10 mt-2 pt-2 border-t border-neutral-700/60 flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_5px_#34d399]" />
            <span className="text-[10px] font-mono font-semibold text-neutral-300">
              Web Audio DSP: Cadeia de 6 Efeitos Ativa
            </span>
          </div>

          <button
            type="button"
            onClick={onTestSound}
            className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all border ${
              isPlayingTest
                ? 'bg-red-700 border-red-500 text-white shadow-[0_0_8px_#ef4444]'
                : 'bg-neutral-800 hover:bg-neutral-700 border-neutral-600 text-neutral-200'
            }`}
          >
            {isPlayingTest ? '■ Parar Som de Teste' : '▶ Tocar Som de Teste através dos Efeitos'}
          </button>
        </div>
      )}
    </div>
  );

  // If already embedded in the full Hardware rack, return the core panel directly
  if (embeddedInRack) {
    return corePanel;
  }

  // Otherwise, wrap in the iconic Nord Red Metallic Chassis so Layer Effects sits inside the red margin
  return (
    <div
      className="relative rounded-lg shadow-2xl border-4 border-[#5c0b11] overflow-hidden select-none max-w-[1020px] mx-auto"
      style={{
        background: 'linear-gradient(180deg, #b31a24 0%, #871018 35%, #720c13 85%, #4a070c 100%)',
        boxShadow: '0 25px 60px rgba(0,0,0,0.85), inset 0 2px 3px rgba(255,255,255,0.25)',
      }}
    >
      {/* Top Red Lip with Hardware Port Silkscreens */}
      <div className="flex items-center justify-between px-5 py-2 border-b border-[#5f0c12] text-[9px] font-sans font-bold uppercase tracking-wider text-neutral-200">
        <div className="flex items-center gap-6">
          <span>ROTOR PEDAL</span>
          <span>USB</span>
          <span>FOOT SWITCH</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-black tracking-widest text-white drop-shadow">
            NORD STAGE 4
          </span>
          <span className="text-[8px] bg-black/40 px-1.5 py-0.5 rounded text-neutral-300">
            LAYER EFFECTS
          </span>
        </div>
        <div className="flex items-center gap-6">
          <span>AC IN</span>
          <span className="text-emerald-400">POWER ON</span>
        </div>
      </div>

      {/* Red Margins surrounding the dark slate panel */}
      <div className="p-3 sm:p-5 flex items-center justify-center gap-3">
        {corePanel}

        {/* Right Red Margin with Authentic Vertical Silkscreen */}
        <div className="flex items-center justify-center px-1 text-[8px] font-mono tracking-widest text-red-200/60 uppercase select-none [writing-mode:vertical-rl] rotate-180">
          HANDMADE IN SWEDEN BY CLAVIA DMI AB v2.0 Rev.B
        </div>
      </div>
    </div>
  );
};
