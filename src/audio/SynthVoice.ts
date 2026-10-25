/**
 * Polyphonic Synthesizer Voice
 * Manages audio nodes for a single musical note:
 * - Analog multi-oscillator synthesis (Saw, SuperSaw, Pulse, Square, Tri, Sine, Sub, Noise)
 * - Sample buffer playback (Grand Piano, B3 Organ, Rhodes, Strings, SoundFont SF2)
 * - Biquad filter with dedicated ADSR envelope
 * - Dedicated Amp ADSR envelope
 * - LFO modulation routing
 * - Glide / Portamento
 */

import { FilterType, SynthParams, WaveformType } from '../types/synth';
import { SampleLibrary } from './SampleLibrary';

export class SynthVoice {
  private ctx: AudioContext;
  public midiNote: number;
  public velocity: number;
  public isReleasing = false;
  public startTime = 0;

  // Nodes
  private voiceGain: GainNode;
  private filterNode: BiquadFilterNode;
  private filterGain: GainNode;
  private pannerNode: StereoPannerNode | null = null;
  private oscillators: (OscillatorNode | AudioBufferSourceNode)[] = [];
  private oscGains: GainNode[] = [];

  constructor(ctx: AudioContext, destination: AudioNode) {
    this.ctx = ctx;
    this.midiNote = 60;
    this.velocity = 100;

    this.voiceGain = ctx.createGain();
    this.voiceGain.gain.value = 0;

    this.filterNode = ctx.createBiquadFilter();
    this.filterGain = ctx.createGain();

    if (ctx.createStereoPanner) {
      this.pannerNode = ctx.createStereoPanner();
      this.pannerNode.connect(destination);
      this.voiceGain.connect(this.pannerNode);
    } else {
      this.voiceGain.connect(destination);
    }

    this.filterNode.connect(this.voiceGain);
  }

  public noteOn(
    midiNote: number,
    velocity: number,
    params: SynthParams,
    glideFromFreq?: number
  ) {
    this.midiNote = midiNote;
    this.velocity = velocity;
    this.isReleasing = false;
    this.startTime = this.ctx.currentTime;
    const now = this.ctx.currentTime;

    // Calculate base frequency including octave shift, master tune, and fine tune
    const totalSemitones = midiNote + params.octaveShift * 12 + params.masterTune + params.fineTune / 100;
    const targetFreq = 440 * Math.pow(2, (totalSemitones - 69) / 12);

    // Setup filter
    this.configureFilter(params, velocity, now);

    // Stop and clear any previous oscillators
    this.stopOscillators();

    // Determine sound generator: SAMPLES mode or ANALOG mode
    if (params.mode === 'SAMPLES' && params.selectedSampleId) {
      this.startSamplePlayback(params.selectedSampleId, midiNote, targetFreq, params);
    } else {
      this.startAnalogSynthesis(targetFreq, params, glideFromFreq);
    }

    // Trigger Amp Envelope (ADSR)
    const velScale = params.ampVelocity ? Math.max(0.2, velocity / 127) : 1.0;
    const peakGain = 0.45 * velScale;

    this.voiceGain.gain.cancelScheduledValues(now);
    this.voiceGain.gain.setValueAtTime(0, now);
    // Attack
    const attackTime = Math.max(0.002, params.ampAttack);
    this.voiceGain.gain.linearRampToValueAtTime(peakGain, now + attackTime);
    // Decay to Sustain
    const decayTime = Math.max(0.01, params.ampDecay);
    const sustainGain = peakGain * Math.max(0.001, params.ampSustain);
    this.voiceGain.gain.exponentialRampToValueAtTime(sustainGain, now + attackTime + decayTime);
  }

  private configureFilter(params: SynthParams, velocity: number, now: number) {
    if (!params.filterOn) {
      this.filterNode.type = 'allpass';
      return;
    }

    switch (params.filterType) {
      case 'lowpass':
      case 'ladder24':
        this.filterNode.type = 'lowpass';
        break;
      case 'bandpass':
        this.filterNode.type = 'bandpass';
        break;
      case 'highpass':
        this.filterNode.type = 'highpass';
        break;
      default:
        this.filterNode.type = 'lowpass';
    }

    this.filterNode.Q.setValueAtTime(Math.max(0.5, params.filterResonance * 1.5), now);

    // Base cutoff
    const baseCutoff = Math.max(20, Math.min(20000, params.filterCutoff));
    const velMod = params.filterVelocity ? (velocity / 127) : 1.0;
    const envAmtHz = params.filterEnvAmt * 1200 * velMod;

    // Filter ADSR
    this.filterNode.frequency.cancelScheduledValues(now);
    this.filterNode.frequency.setValueAtTime(baseCutoff, now);

    const fAttack = Math.max(0.005, params.modAttack);
    const fPeak = Math.max(20, Math.min(20000, baseCutoff + envAmtHz));
    this.filterNode.frequency.linearRampToValueAtTime(fPeak, now + fAttack);

    const fDecay = Math.max(0.01, params.modDecay);
    const fSustain = Math.max(20, Math.min(20000, baseCutoff + envAmtHz * params.modSustain));
    this.filterNode.frequency.exponentialRampToValueAtTime(fSustain, now + fAttack + fDecay);
  }

  private startAnalogSynthesis(
    targetFreq: number,
    params: SynthParams,
    glideFromFreq?: number
  ) {
    const now = this.ctx.currentTime;
    const oscType = params.oscWaveform;

    if (oscType === 'supersaw') {
      // Nord Stage 4 Iconic SuperSaw: multi-oscillator detuned hypersaw stack
      const detuneSpread = Math.max(2, params.oscDetune * 4.5);
      const detuneOffsets = [-detuneSpread, -detuneSpread * 0.5, 0, detuneSpread * 0.5, detuneSpread];

      detuneOffsets.forEach((cents, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';

        const freq = targetFreq;
        if (glideFromFreq && params.glide > 0) {
          osc.frequency.setValueAtTime(glideFromFreq, now);
          osc.frequency.exponentialRampToValueAtTime(freq, now + params.glide * 0.5);
        } else {
          osc.frequency.setValueAtTime(freq, now);
        }

        osc.detune.setValueAtTime(cents, now);
        gain.gain.value = 0.22;

        osc.connect(gain);
        gain.connect(this.filterNode);
        osc.start(now);

        this.oscillators.push(osc);
        this.oscGains.push(gain);
      });
    } else if (oscType === 'noise') {
      // White / pink noise source
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const gain = this.ctx.createGain();
      gain.gain.value = 0.35;
      whiteNoise.connect(gain);
      gain.connect(this.filterNode);
      whiteNoise.start(now);

      this.oscillators.push(whiteNoise);
      this.oscGains.push(gain);
    } else {
      // Standard analog waveforms: saw, square, pulse, triangle, sine
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      if (oscType === 'pulse') {
        osc.type = 'square';
      } else {
        osc.type = oscType as OscillatorType;
      }

      if (glideFromFreq && params.glide > 0) {
        osc.frequency.setValueAtTime(glideFromFreq, now);
        osc.frequency.exponentialRampToValueAtTime(targetFreq, now + params.glide * 0.5);
      } else {
        osc.frequency.setValueAtTime(targetFreq, now);
      }

      // Detune
      osc.detune.setValueAtTime(params.oscDetune * 3, now);
      gain.gain.value = 0.6;

      osc.connect(gain);
      gain.connect(this.filterNode);
      osc.start(now);

      this.oscillators.push(osc);
      this.oscGains.push(gain);

      // Add sub-oscillator if sub-level is above 0
      if (params.oscSubLevel > 0.05) {
        const subOsc = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(targetFreq / 2, now); // One octave down
        subGain.gain.value = params.oscSubLevel * 0.4;
        subOsc.connect(subGain);
        subGain.connect(this.filterNode);
        subOsc.start(now);

        this.oscillators.push(subOsc);
        this.oscGains.push(subGain);
      }
    }
  }

  private startSamplePlayback(
    sampleId: string,
    midiNote: number,
    targetFreq: number,
    params: SynthParams
  ) {
    const now = this.ctx.currentTime;
    const sampleLib = SampleLibrary.getInstance();
    const sampleData = sampleLib.getSampleData(sampleId, midiNote);

    if (sampleData && sampleData.buffer) {
      const source = this.ctx.createBufferSource();
      source.buffer = sampleData.buffer;

      // Pitch calculation relative to the sample's recorded root key
      const rootKey = sampleData.rootKey || 60;
      const semitonesOffset = (midiNote + params.octaveShift * 12 + params.masterTune + params.fineTune / 100) - rootKey;
      const rate = Math.pow(2, semitonesOffset / 12);
      source.playbackRate.setValueAtTime(Math.max(0.02, Math.min(24.0, rate)), now);

      if (sampleData.loop) {
        source.loop = true;
        if (
          sampleData.loopStart !== undefined &&
          sampleData.loopEnd !== undefined &&
          sampleData.loopEnd > sampleData.loopStart
        ) {
          source.loopStart = sampleData.loopStart;
          source.loopEnd = sampleData.loopEnd;
        }
      }

      const gain = this.ctx.createGain();
      gain.gain.value = 0.85;
      source.connect(gain);
      gain.connect(this.filterNode);
      source.start(now);

      this.oscillators.push(source);
      this.oscGains.push(gain);
    } else {
      // Fallback to rich analog saw so audio NEVER fails
      this.startAnalogSynthesis(targetFreq, params);
    }
  }

  public noteOff(releaseTimeParam?: number): number {
    if (this.isReleasing) return 0;
    this.isReleasing = true;
    const now = this.ctx.currentTime;
    const relTime = Math.max(0.02, releaseTimeParam ?? 0.3);

    this.voiceGain.gain.cancelScheduledValues(now);
    this.voiceGain.gain.setValueAtTime(this.voiceGain.gain.value, now);
    this.voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + relTime);

    // Stop oscillators after release finishes
    setTimeout(() => {
      this.stopOscillators();
    }, relTime * 1000 + 50);

    return relTime;
  }

  private stopOscillators() {
    for (const osc of this.oscillators) {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // Already stopped
      }
    }
    this.oscillators = [];

    for (const g of this.oscGains) {
      try {
        g.disconnect();
      } catch {
        // Already disconnected
      }
    }
    this.oscGains = [];
  }
}
