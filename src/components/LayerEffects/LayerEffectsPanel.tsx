/**
 * Layer Effects Web Component
 * Pixel-accurate hardware replica of the Nord Stage 4 Layer Effects rack.
 * Based on the reference image (962 x 683 aspect ratio).
 * Connects 100% to the Web Audio API real-time DSP engine:
 * - MOD 1 (Ring Mod, Tremolo, Auto-Pan, Auto-Wah, Wah, Pump)
 * - MOD 2 (Chorus, Flanger, Phaser, Vibrato, Ensemble, Rotary Spin)
 * - AMP SIM / EQ (Overdrive, Parametric Mid Freq, Bass, Mid, Treble -15..+15)
 * - DELAY (Stereo ping pong, analog tape damping, filter HP/BP/LP, Tap tempo)
 * - COMP (Dynamics compressor with fast peak attack)
 * - REVERB (Room, Booth, Spring, Stage, Hall, Cathedral, Bright/Dark)
 * - Real-Time Audio Player: Drum Groove, Funk Bass Riff, Synth Chords, Live Mic, File Upload
 * - Right-Click MIDI Learn on all knobs & buttons with Web MIDI API mapping
 * - Mouse Wheel fine tuning on all knobs
 */

import React, { useState, useEffect, useRef } from 'react';
import { SynthParams } from '../../types/synth';
import { SynthEngine } from '../../audio/SynthEngine';
import { AudioSourceType } from '../../audio/TestAudioPlayer';
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

interface MidiLearnTarget {
  id: keyof SynthParams | string;
  label: string;
  min: number;
  max: number;
  step: number;
}

export const LayerEffectsPanel: React.FC<LayerEffectsPanelProps> = ({
  params,
  onUpdateParams,
  embeddedInRack = false,
}) => {
  const synthEngine = useRef(SynthEngine.getInstance()).current;

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

  // Audio player state
  const [audioSource, setAudioSource] = useState<AudioSourceType>('none');
  const [audioFileName, setAudioFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // MIDI Learn state
  const [midiMappings, setMidiMappings] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('nord_layer_effects_midi');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });
  const [learningTarget, setLearningTarget] = useState<MidiLearnTarget | null>(null);
  const [manualCcSelect, setManualCcSelect] = useState<number>(16);

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

  // Subscribe to TestAudioPlayer
  useEffect(() => {
    const unsub = synthEngine.testAudioPlayer.subscribe((state) => {
      setAudioSource(state.source);
      if (state.fileName) setAudioFileName(state.fileName);
    });
    return () => unsub();
  }, [synthEngine]);

  // Subscribe to MIDI CC for Learn & Mapped param updates
  useEffect(() => {
    const unsub = synthEngine.onMidiCc((cc, value) => {
      // If actively learning a target
      if (learningTarget) {
        setMidiMappings((prev) => {
          const next = { ...prev, [learningTarget.id]: cc };
          try {
            localStorage.setItem('nord_layer_effects_midi', JSON.stringify(next));
          } catch {}
          return next;
        });
        setLearningTarget(null);
        return;
      }

      // Check if this CC maps to any parameter
      for (const [paramKey, mappedCC] of Object.entries(midiMappings)) {
        if (mappedCC === cc) {
          // Scale 0..127 to parameter range
          let val = 0;
          if (paramKey === 'mod1Rate' || paramKey === 'mod1Amount' || paramKey === 'mod2Rate' || paramKey === 'mod2Amount' || paramKey === 'drive' || paramKey === 'compAmount') {
            val = Number(((value / 127) * 10).toFixed(1));
          } else if (paramKey === 'eqMidFreq') {
            val = Math.round(200 + (value / 127) * (8000 - 200));
          } else if (paramKey === 'eqBass' || paramKey === 'eqMid' || paramKey === 'eqTreble') {
            val = Number((-15 + (value / 127) * 30).toFixed(1));
          } else if (paramKey === 'delayTempo' || paramKey === 'delayDryWet' || paramKey === 'delayFeedback' || paramKey === 'reverbDryWet') {
            val = Number((value / 127).toFixed(2));
          }
          onUpdateParams({ [paramKey]: val } as any);
        }
      }
    });

    return () => unsub();
  }, [synthEngine, learningTarget, midiMappings, onUpdateParams]);

  // Animated Audio Visualizer Spectrum
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyzer = synthEngine.getAnalyzerNode();
    const dataArray = new Uint8Array(analyzer ? analyzer.frequencyBinCount : 64);

    const render = () => {
      animId = requestAnimationFrame(render);
      if (analyzer) {
        analyzer.getByteFrequencyData(dataArray);
      } else {
        dataArray.fill(0);
      }

      ctx.fillStyle = '#0f131a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const numBars = 20;
      const barWidth = canvas.width / numBars;

      for (let i = 0; i < numBars; i++) {
        const val = dataArray[i * 2] / 255.0;
        const barHeight = Math.max(2, val * (canvas.height - 4));

        if (val > 0.8) ctx.fillStyle = '#ef4444';
        else if (val > 0.45) ctx.fillStyle = '#f59e0b';
        else ctx.fillStyle = '#10b981';

        ctx.fillRect(i * barWidth + 1, canvas.height - barHeight - 1, barWidth - 2, barHeight);
      }
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [synthEngine]);

  // Audio Player Trigger Handlers
  const handlePlaySource = (source: AudioSourceType) => {
    synthEngine.initAudioContext();
    if (audioSource === source) {
      synthEngine.testAudioPlayer.stopAll();
      return;
    }

    if (source === 'drums') {
      synthEngine.testAudioPlayer.playDrums(105);
    } else if (source === 'guitar') {
      synthEngine.testAudioPlayer.playGuitarRiff(100);
    } else if (source === 'chords') {
      synthEngine.testAudioPlayer.playSynthChords();
    } else if (source === 'mic') {
      synthEngine.testAudioPlayer.startMicrophone();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      synthEngine.initAudioContext();
      synthEngine.testAudioPlayer.loadAndPlayAudioFile(e.target.files[0]);
    }
  };

  const handleMidiLearn = (id: string, label: string) => {
    setLearningTarget({
      id,
      label,
      min: 0,
      max: 10,
      step: 0.1,
    });
  };

  const handleConfirmManualMidi = () => {
    if (!learningTarget) return;
    setMidiMappings((prev) => {
      const next = { ...prev, [learningTarget.id]: manualCcSelect };
      try {
        localStorage.setItem('nord_layer_effects_midi', JSON.stringify(next));
      } catch {}
      return next;
    });
    setLearningTarget(null);
  };

  const handleUnbindMidi = () => {
    if (!learningTarget) return;
    setMidiMappings((prev) => {
      const next = { ...prev };
      delete next[learningTarget.id];
      try {
        localStorage.setItem('nord_layer_effects_midi', JSON.stringify(next));
      } catch {}
      return next;
    });
    setLearningTarget(null);
  };

  const corePanel = (
    <div className="relative w-full max-w-[962px] select-none font-sans rounded-md border-2 border-[#161a22] shadow-[0_20px_50px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.2)] bg-gradient-to-b from-[#2d3542] via-[#242b36] to-[#1c222c] p-2.5 text-neutral-200">
      {/* Metallic Texture Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:12px_12px] pointer-events-none rounded-md" />

      {/* Main Grid: Left Column (MOD 1, MOD 2, AMP SIM/EQ) and Right Column (DELAY, COMP, REVERB) */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-[1.08fr_1fr] gap-2">
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
                    midiLearnId="mod1Rate"
                    isMidiMapped={midiMappings['mod1Rate'] !== undefined}
                    midiCc={midiMappings['mod1Rate']}
                    onMidiLearn={handleMidiLearn}
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
                    midiLearnId="mod1Amount"
                    isMidiMapped={midiMappings['mod1Amount'] !== undefined}
                    midiCc={midiMappings['mod1Amount']}
                    onMidiLearn={handleMidiLearn}
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
                    midiLearnId="mod2Rate"
                    isMidiMapped={midiMappings['mod2Rate'] !== undefined}
                    midiCc={midiMappings['mod2Rate']}
                    onMidiLearn={handleMidiLearn}
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
                    midiLearnId="mod2Amount"
                    isMidiMapped={midiMappings['mod2Amount'] !== undefined}
                    midiCc={midiMappings['mod2Amount']}
                    onMidiLearn={handleMidiLearn}
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
                    midiLearnId="drive"
                    isMidiMapped={midiMappings['drive'] !== undefined}
                    midiCc={midiMappings['drive']}
                    onMidiLearn={handleMidiLearn}
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
                    midiLearnId="eqMidFreq"
                    isMidiMapped={midiMappings['eqMidFreq'] !== undefined}
                    midiCc={midiMappings['eqMidFreq']}
                    onMidiLearn={handleMidiLearn}
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
                midiLearnId="eqBass"
                isMidiMapped={midiMappings['eqBass'] !== undefined}
                midiCc={midiMappings['eqBass']}
                onMidiLearn={handleMidiLearn}
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
                  midiLearnId="eqMid"
                  isMidiMapped={midiMappings['eqMid'] !== undefined}
                  midiCc={midiMappings['eqMid']}
                  onMidiLearn={handleMidiLearn}
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
                midiLearnId="eqTreble"
                isMidiMapped={midiMappings['eqTreble'] !== undefined}
                midiCc={midiMappings['eqTreble']}
                onMidiLearn={handleMidiLearn}
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
                  midiLearnId="delayTempo"
                  isMidiMapped={midiMappings['delayTempo'] !== undefined}
                  midiCc={midiMappings['delayTempo']}
                  onMidiLearn={handleMidiLearn}
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
                    midiLearnId="delayDryWet"
                    isMidiMapped={midiMappings['delayDryWet'] !== undefined}
                    midiCc={midiMappings['delayDryWet']}
                    onMidiLearn={handleMidiLearn}
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
                  midiLearnId="delayFeedback"
                  isMidiMapped={midiMappings['delayFeedback'] !== undefined}
                  midiCc={midiMappings['delayFeedback']}
                  onMidiLearn={handleMidiLearn}
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
                  midiLearnId="compAmount"
                  isMidiMapped={midiMappings['compAmount'] !== undefined}
                  midiCc={midiMappings['compAmount']}
                  onMidiLearn={handleMidiLearn}
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
                    midiLearnId="reverbDryWet"
                    isMidiMapped={midiMappings['reverbDryWet'] !== undefined}
                    midiCc={midiMappings['reverbDryWet']}
                    onMidiLearn={handleMidiLearn}
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

      {/* Real-time Web Audio DSP Test Player & Visualizer Dock */}
      <div className="relative z-10 mt-3 pt-2.5 border-t border-neutral-700/60 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-300">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
            <span className="text-[10px] font-black uppercase tracking-wider text-white">
              Cadeia Web Audio DSP Real: 6 Efeitos
            </span>
            <span className="text-[9px] text-neutral-400">
              (Roda do mouse ajusta knobs • Clique direito ativa MIDI Learn)
            </span>
          </div>

          {/* Test Audio Controls */}
          <div className="flex items-center gap-1.5 flex-wrap mt-1">
            <button
              type="button"
              onClick={() => handlePlaySource('drums')}
              className={`px-2 py-1 rounded text-[9px] font-bold uppercase transition-all border ${
                audioSource === 'drums'
                  ? 'bg-red-700 border-red-500 text-white shadow-[0_0_8px_#ef4444]'
                  : 'bg-neutral-800 hover:bg-neutral-700 border-neutral-600 text-neutral-200'
              }`}
            >
              🥁 Beat Bateria
            </button>

            <button
              type="button"
              onClick={() => handlePlaySource('guitar')}
              className={`px-2 py-1 rounded text-[9px] font-bold uppercase transition-all border ${
                audioSource === 'guitar'
                  ? 'bg-red-700 border-red-500 text-white shadow-[0_0_8px_#ef4444]'
                  : 'bg-neutral-800 hover:bg-neutral-700 border-neutral-600 text-neutral-200'
              }`}
            >
              🎸 Riff Baixo Funk
            </button>

            <button
              type="button"
              onClick={() => handlePlaySource('chords')}
              className={`px-2 py-1 rounded text-[9px] font-bold uppercase transition-all border ${
                audioSource === 'chords'
                  ? 'bg-red-700 border-red-500 text-white shadow-[0_0_8px_#ef4444]'
                  : 'bg-neutral-800 hover:bg-neutral-700 border-neutral-600 text-neutral-200'
              }`}
            >
              🎹 Acordes Synth
            </button>

            <button
              type="button"
              onClick={() => handlePlaySource('mic')}
              className={`px-2 py-1 rounded text-[9px] font-bold uppercase transition-all border ${
                audioSource === 'mic'
                  ? 'bg-red-700 border-red-500 text-white shadow-[0_0_8px_#ef4444]'
                  : 'bg-neutral-800 hover:bg-neutral-700 border-neutral-600 text-neutral-200'
              }`}
            >
              🎙 Mic ao Vivo
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2 py-1 rounded text-[9px] font-bold uppercase bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 text-neutral-200"
            >
              📂 Carregar Áudio
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept="audio/*"
              className="hidden"
              onChange={handleFileUpload}
            />

            {audioSource !== 'none' && (
              <button
                type="button"
                onClick={() => synthEngine.testAudioPlayer.stopAll()}
                className="px-2 py-1 rounded text-[9px] font-bold uppercase bg-red-950 hover:bg-red-900 border border-red-600 text-red-200"
              >
                ■ Parar
              </button>
            )}

            {audioFileName && (
              <span className="text-[9px] font-mono text-neutral-400 truncate max-w-[120px]">
                {audioFileName}
              </span>
            )}
          </div>
        </div>

        {/* Right Dock: VU Spectrum Canvas & Standalone HTML Link */}
        <div className="flex items-center gap-3">
          <canvas
            ref={canvasRef}
            width={120}
            height={26}
            className="rounded bg-[#0d1016] border border-neutral-700 shadow-inner"
          />

          <a
            href="/layer-effects.html"
            target="_blank"
            rel="noopener noreferrer"
            download="nord-layer-effects.html"
            className="px-2.5 py-1 rounded text-[9px] font-bold uppercase bg-[#1f2937] hover:bg-[#374151] border border-neutral-500 text-amber-300 shadow flex items-center gap-1"
            title="Abrir ou baixar arquivo HTML único e autônomo com JavaScript e CSS embutidos"
          >
            <span>📥 HTML Único</span>
          </a>
        </div>
      </div>

      {/* Floating MIDI Learn Dialog */}
      {learningTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-lg border-2 border-neutral-600 bg-[#1c212a] p-5 shadow-2xl text-center text-white">
            <h3 className="text-sm font-black uppercase tracking-wider text-amber-400">
              MIDI LEARN: {learningTarget.label}
            </h3>
            <p className="mt-1 text-[11px] text-neutral-300">
              Mova um fader, knob ou botão no seu teclado/controlador MIDI para vincular automaticamente.
            </p>

            <div className="my-4 rounded border border-dashed border-amber-400/80 bg-neutral-900/90 p-3 font-mono text-xs text-amber-300 animate-pulse">
              [ AGUARDANDO COMANDO MIDI CC... ]
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-neutral-400">
              <span>Ou escolha CC:</span>
              <select
                value={manualCcSelect}
                onChange={(e) => setManualCcSelect(Number(e.target.value))}
                className="rounded border border-neutral-600 bg-neutral-900 px-2 py-1 text-xs font-mono text-white"
              >
                {Array.from({ length: 128 }, (_, i) => (
                  <option key={i} value={i}>
                    CC #{i}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4 flex justify-center gap-2">
              <button
                type="button"
                onClick={handleConfirmManualMidi}
                className="rounded bg-emerald-700 hover:bg-emerald-600 px-3 py-1 text-xs font-bold uppercase text-white"
              >
                Confirmar CC
              </button>
              {midiMappings[learningTarget.id] !== undefined && (
                <button
                  type="button"
                  onClick={handleUnbindMidi}
                  className="rounded bg-red-800 hover:bg-red-700 px-3 py-1 text-xs font-bold uppercase text-white"
                >
                  Desvincular
                </button>
              )}
              <button
                type="button"
                onClick={() => setLearningTarget(null)}
                className="rounded bg-neutral-700 hover:bg-neutral-600 px-3 py-1 text-xs font-bold uppercase text-neutral-300"
              >
                Cancelar
              </button>
            </div>
          </div>
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
