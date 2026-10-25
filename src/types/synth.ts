/**
 * Synthesizer & Audio Engine Types
 * Modeled after the Nord Stage 4 architecture
 */

export type SynthMode = 'SAMPLES' | 'ANALOG' | 'EXTERN';

export type WaveformType = 'saw' | 'square' | 'pulse' | 'triangle' | 'sine' | 'supersaw' | 'noise' | 'sample';

export type FilterType = 'lowpass' | 'bandpass' | 'highpass' | 'ladder24';

export type LfoDestination = 'pitch' | 'cutoff' | 'amp' | 'pan';

export type ArpDirection = 'UP' | 'DOWN' | 'UP_DOWN' | 'RANDOM' | 'POLY';

export type Mod1Type = 'RM' | 'TREM' | 'A-PAN' | 'A-WAH' | 'WAH' | 'PUMP';

export type Mod2Type = 'CHOR' | 'FLANG' | 'PHAS' | 'VIBE' | 'ENS' | 'SPIN';

export type AmpSimType = 'SMALL' | 'JC' | 'TWIN' | 'ROTARY' | 'LP_FILTER' | 'HP_FILTER';

export type ReverbType = 'ROOM' | 'STAGE' | 'HALL' | 'BOOTH' | 'SPRING' | 'CATH';

export interface SynthParams {
  // Mode & General
  mode: SynthMode;
  polyphonyMode: 'poly' | 'mono' | 'legato';
  glide: number; // 0 to 1 (portamento time)
  octaveShift: number; // -3 to +3
  unison: 0 | 1 | 2 | 3;
  masterTune: number; // semitones (-12 to +12)
  fineTune: number; // cents (-50 to +50)

  // Layers A, B, C Levels (Faders 0 to 1) & On/Off
  layerA_level: number;
  layerA_on: boolean;
  layerB_level: number;
  layerB_on: boolean;
  layerC_level: number;
  layerC_on: boolean;

  // Oscillators
  oscWaveform: WaveformType;
  oscCategory: 'ANALOG' | 'SAMPLES' | 'WAVETABLE';
  oscDetune: number; // Detune in cents / supersaw spread (0 to 10)
  oscCtrl: number; // Shape / Pulse width / Sub mix (0 to 10)
  oscEnvAmt: number; // Pitch envelope modulation (-10 to +10)
  oscPitchEnv: boolean; // Route env to pitch
  oscSubLevel: number; // Sub oscillator level 0 to 1
  selectedSampleId?: string; // ID of loaded SF2 / sample

  // Filter
  filterType: FilterType;
  filterCutoff: number; // 20 to 20000 Hz
  filterResonance: number; // 0 to 10 (Q factor)
  filterEnvAmt: number; // -10 to +10
  filterVelocity: boolean; // Velocity modulates filter
  filterOn: boolean;

  // Envelopes
  // Amp ADSR
  ampAttack: number; // 0.001 to 5 s
  ampDecay: number; // 0.01 to 10 s
  ampSustain: number; // 0 to 1 (gain)
  ampRelease: number; // 0.01 to 10 s
  ampVelocity: boolean;

  // Mod / Filter ADSR
  modAttack: number; // 0.001 to 5 s
  modDecay: number; // 0.01 to 10 s
  modSustain: number; // 0 to 1
  modRelease: number; // 0.01 to 10 s

  // LFO
  lfoWave: 'sine' | 'triangle' | 'saw' | 'square' | 's_h';
  lfoRate: number; // 0.1 to 20 Hz
  lfoModAmt: number; // 0 to 10
  lfoDest: LfoDestination;
  lfoSync: boolean; // Sync to MST CLK

  // Arpeggiator / Gate
  arpEnabled: boolean;
  arpMode: 'ARP' | 'GATE' | 'POLY';
  arpRate: number; // Division or Hz
  arpDivision: '1/4' | '1/8' | '1/16' | '1/32' | '1/8T' | '1/16T';
  arpOctaveRange: 1 | 2 | 3 | 4;
  arpDirection: ArpDirection;
  arpGateLength: number; // 0.1 to 1.0 (note duration ratio)
  tempoBpm: number; // 40 to 280 BPM

  // Vibrato
  vibratoOn: boolean;
  vibratoRate: number;
  vibratoDepth: number;
  vibratoDelay: boolean;
  vibratoWheel: boolean;

  // Layer Effects
  effectsOn: boolean;

  // MOD 1
  mod1On: boolean;
  mod1Type: Mod1Type;
  mod1Rate: number; // 0 to 10
  mod1Amount: number; // 0 to 10 (Sens / Amount)
  mod1Variation: boolean;

  // MOD 2
  mod2On: boolean;
  mod2Type: Mod2Type;
  mod2Rate: number; // 0 to 10
  mod2Amount: number; // 0 to 10
  mod2Variation: boolean;

  // AMP SIM / EQ
  ampSimOn: boolean;
  ampSimType: AmpSimType;
  drive: number; // 0 to 10
  eqBass: number; // -15 to +15 dB
  eqMid: number; // -15 to +15 dB
  eqMidFreq: number; // 200 to 8000 Hz
  eqTreble: number; // -15 to +15 dB

  // DELAY
  delayOn: boolean;
  delayTempo: number; // ms or BPM division
  delayFeedback: number; // 0 to 0.95
  delayDryWet: number; // 0 to 1
  delayPingPong: boolean;
  delayAnalog: boolean;

  // COMPRESSOR
  compOn: boolean;
  compAmount: number; // 0 to 10
  compFast: boolean;
  compDark: boolean;

  // REVERB
  reverbOn: boolean;
  reverbType: ReverbType;
  reverbDryWet: number; // 0 to 1
  reverbBright: boolean;
  reverbChorale: boolean;

  // Master
  masterVolume: number; // 0 to 1
}

export interface Preset {
  id: string;
  bank: string; // e.g. "A:11"
  name: string;
  category: 'ALL' | 'PIANO' | 'ORGAN' | 'SYNTH' | 'PAD' | 'LEAD' | 'BASS' | 'STRINGS' | 'EP';
  layerA_desc: string;
  layerB_desc: string;
  layerC_desc: string;
  isUserPreset?: boolean;
  params: SynthParams;
}

export interface SoundFontSample {
  name: string;
  sampleRate: number;
  originalPitch: number; // MIDI key (0 - 127)
  pitchCorrection: number; // cents (-50 to +50)
  startLoop: number;
  endLoop: number;
  loopMode: number;
  audioBuffer?: AudioBuffer;
  pcmData?: Float32Array;
}

export interface SoundFontPreset {
  name: string;
  bank: number;
  preset: number;
  zones: {
    keyRange: [number, number];
    velocityRange: [number, number];
    sample: SoundFontSample;
    rootKey?: number;
    attenuation?: number;
    pan?: number;
  }[];
}

export interface LoadedInstrumentFile {
  id: string;
  fileName: string;
  fileSize: number;
  format: 'SF2' | 'NPNO' | 'NSMP' | 'NSMP3' | 'NSMP4' | 'UNKNOWN';
  isValid: boolean;
  status: 'READY' | 'ANALYZED' | 'UNSUPPORTED' | 'ERROR';
  description: string;
  presetsCount: number;
  samplesCount: number;
  presets: SoundFontPreset[];
  analysisDetails?: {
    magicNumber?: string;
    version?: string;
    compression?: string;
    claviaFamily?: string;
    targetHardware?: string;
    encryptionStatus?: string;
    technicalNotes: string[];
  };
}
