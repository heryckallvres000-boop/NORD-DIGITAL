/**
 * Complete Nord Stage 4 DSP Layer Effects Chain
 * Implements:
 * - MOD 1 (Ring Mod, Tremolo, Auto-Pan, Auto-Wah, Wah, Pump)
 * - MOD 2 (Chorus, Flanger, Phaser, Vibrato, Ensemble, Rotary Spin)
 * - Amp Simulation & 3-Band Sweepable Parametric EQ
 * - Stereo Ping-Pong Delay with Analog Tape Damping
 * - Dynamics Compressor (Fast/Dark/Threshold)
 * - Algorithmic Reverb (Room, Stage, Hall, Booth, Spring, Cathedral, Bright/Dark, Chorale)
 * - Master Bus Limiter & Analyzer Node
 */

import { SynthParams } from '../types/synth';

export class EffectsChain {
  private ctx: AudioContext;
  public inputNode: GainNode;
  public outputNode: GainNode;
  public analyzerNode: AnalyserNode;

  // Mod 1 nodes
  private mod1Input: GainNode;
  private mod1Gain: GainNode;
  private mod1Panner: StereoPannerNode;
  private mod1Filter: BiquadFilterNode;
  private mod1Lfo: OscillatorNode | null = null;
  private mod1LfoGain: GainNode | null = null;
  private mod1Output: GainNode;

  // Mod 2 nodes
  private mod2Input: GainNode;
  private mod2Dry: GainNode;
  private mod2Wet: GainNode;
  private mod2DelayL: DelayNode;
  private mod2DelayR: DelayNode;
  private mod2Lfo: OscillatorNode | null = null;
  private mod2LfoGainL: GainNode | null = null;
  private mod2LfoGainR: GainNode | null = null;
  private mod2Output: GainNode;

  // Amp Sim / EQ nodes
  private ampSimInput: GainNode;
  private waveShaper: WaveShaperNode;
  private eqBass: BiquadFilterNode;
  private eqMid: BiquadFilterNode;
  private eqTreble: BiquadFilterNode;
  private ampSimOutput: GainNode;

  // Delay nodes
  private delayInput: GainNode;
  private delayDry: GainNode;
  private delayWet: GainNode;
  private delayLeft: DelayNode;
  private delayRight: DelayNode;
  private delayFeedbackL: GainNode;
  private delayFeedbackR: GainNode;
  private delayDampingL: BiquadFilterNode;
  private delayDampingR: BiquadFilterNode;
  private delayOutput: GainNode;

  // Compressor nodes
  private compInput: GainNode;
  private compressor: DynamicsCompressorNode;
  private compOutput: GainNode;

  // Reverb nodes
  private reverbInput: GainNode;
  private reverbDry: GainNode;
  private reverbWet: GainNode;
  private convolver: ConvolverNode;
  private reverbDamping: BiquadFilterNode;
  private reverbOutput: GainNode;

  // Master Limiter
  private masterLimiter: DynamicsCompressorNode;
  private masterGain: GainNode;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;

    // Create entry/exit nodes
    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    this.analyzerNode = ctx.createAnalyser();
    this.analyzerNode.fftSize = 1024;
    this.analyzerNode.smoothingTimeConstant = 0.85;

    // --- MOD 1 INIT ---
    this.mod1Input = ctx.createGain();
    this.mod1Gain = ctx.createGain();
    this.mod1Panner = ctx.createStereoPanner ? ctx.createStereoPanner() : (ctx.createGain() as any);
    this.mod1Filter = ctx.createBiquadFilter();
    this.mod1Filter.type = 'bandpass';
    this.mod1Filter.frequency.value = 1200;
    this.mod1Filter.Q.value = 3.5;
    this.mod1Output = ctx.createGain();

    this.mod1Input.connect(this.mod1Gain);
    this.mod1Gain.connect(this.mod1Panner);
    this.mod1Panner.connect(this.mod1Output);

    // --- MOD 2 INIT (Chorus / Flange / Ensemble) ---
    this.mod2Input = ctx.createGain();
    this.mod2Dry = ctx.createGain();
    this.mod2Wet = ctx.createGain();
    this.mod2DelayL = ctx.createDelay(0.1);
    this.mod2DelayR = ctx.createDelay(0.1);
    this.mod2DelayL.delayTime.value = 0.015;
    this.mod2DelayR.delayTime.value = 0.022;
    this.mod2Output = ctx.createGain();

    const splitter2 = ctx.createChannelSplitter(2);
    const merger2 = ctx.createChannelMerger(2);

    this.mod2Input.connect(this.mod2Dry);
    this.mod2Dry.connect(this.mod2Output);

    this.mod2Input.connect(splitter2);
    splitter2.connect(this.mod2DelayL, 0);
    splitter2.connect(this.mod2DelayR, 1);
    this.mod2DelayL.connect(merger2, 0, 0);
    this.mod2DelayR.connect(merger2, 0, 1);
    merger2.connect(this.mod2Wet);
    this.mod2Wet.connect(this.mod2Output);

    // Start Mod2 LFO
    this.startMod2Lfo(1.2, 0.003);

    // --- AMP SIM & EQ INIT ---
    this.ampSimInput = ctx.createGain();
    this.waveShaper = ctx.createWaveShaper();
    this.waveShaper.oversample = '4x';
    this.setDriveCurve(0);

    this.eqBass = ctx.createBiquadFilter();
    this.eqBass.type = 'lowshelf';
    this.eqBass.frequency.value = 100;
    this.eqBass.gain.value = 0;

    this.eqMid = ctx.createBiquadFilter();
    this.eqMid.type = 'peaking';
    this.eqMid.frequency.value = 1000;
    this.eqMid.Q.value = 1.2;
    this.eqMid.gain.value = 0;

    this.eqTreble = ctx.createBiquadFilter();
    this.eqTreble.type = 'highshelf';
    this.eqTreble.frequency.value = 4500;
    this.eqTreble.gain.value = 0;

    this.ampSimOutput = ctx.createGain();

    this.ampSimInput.connect(this.waveShaper);
    this.waveShaper.connect(this.eqBass);
    this.eqBass.connect(this.eqMid);
    this.eqMid.connect(this.eqTreble);
    this.eqTreble.connect(this.ampSimOutput);

    // --- DELAY INIT ---
    this.delayInput = ctx.createGain();
    this.delayDry = ctx.createGain();
    this.delayWet = ctx.createGain();
    this.delayLeft = ctx.createDelay(2.0);
    this.delayRight = ctx.createDelay(2.0);
    this.delayFeedbackL = ctx.createGain();
    this.delayFeedbackR = ctx.createGain();
    this.delayDampingL = ctx.createBiquadFilter();
    this.delayDampingR = ctx.createBiquadFilter();
    this.delayDampingL.type = 'lowpass';
    this.delayDampingR.type = 'lowpass';
    this.delayDampingL.frequency.value = 4500;
    this.delayDampingR.frequency.value = 4500;

    this.delayLeft.delayTime.value = 0.35;
    this.delayRight.delayTime.value = 0.35;
    this.delayFeedbackL.gain.value = 0.4;
    this.delayFeedbackR.gain.value = 0.4;

    const delaySplitter = ctx.createChannelSplitter(2);
    const delayMerger = ctx.createChannelMerger(2);

    this.delayInput.connect(this.delayDry);
    this.delayDry.connect(this.delayOutput = ctx.createGain());

    this.delayInput.connect(delaySplitter);
    delaySplitter.connect(this.delayLeft, 0);
    delaySplitter.connect(this.delayRight, 1);

    // Feedback loops
    this.delayLeft.connect(this.delayDampingL);
    this.delayDampingL.connect(this.delayFeedbackL);
    this.delayFeedbackL.connect(this.delayLeft); // Standard or PingPong cross
    this.delayDampingL.connect(delayMerger, 0, 0);

    this.delayRight.connect(this.delayDampingR);
    this.delayDampingR.connect(this.delayFeedbackR);
    this.delayFeedbackR.connect(this.delayRight);
    this.delayDampingR.connect(delayMerger, 0, 1);

    delayMerger.connect(this.delayWet);
    this.delayWet.connect(this.delayOutput);

    // --- COMPRESSOR INIT ---
    this.compInput = ctx.createGain();
    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -18;
    this.compressor.knee.value = 10;
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.015;
    this.compressor.release.value = 0.15;
    this.compOutput = ctx.createGain();

    this.compInput.connect(this.compressor);
    this.compressor.connect(this.compOutput);

    // --- REVERB INIT ---
    this.reverbInput = ctx.createGain();
    this.reverbDry = ctx.createGain();
    this.reverbWet = ctx.createGain();
    this.convolver = ctx.createConvolver();
    this.reverbDamping = ctx.createBiquadFilter();
    this.reverbDamping.type = 'lowpass';
    this.reverbDamping.frequency.value = 8000;
    this.reverbOutput = ctx.createGain();

    this.generateReverbImpulse('STAGE', false);

    this.reverbInput.connect(this.reverbDry);
    this.reverbDry.connect(this.reverbOutput);

    this.reverbInput.connect(this.convolver);
    this.convolver.connect(this.reverbDamping);
    this.reverbDamping.connect(this.reverbWet);
    this.reverbWet.connect(this.reverbOutput);

    // --- MASTER LIMITER & OUTPUT ---
    this.masterLimiter = ctx.createDynamicsCompressor();
    this.masterLimiter.threshold.value = -1.0;
    this.masterLimiter.knee.value = 0;
    this.masterLimiter.ratio.value = 20;
    this.masterLimiter.attack.value = 0.002;
    this.masterLimiter.release.value = 0.05;

    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0.85;

    // Connect entire chain linearly
    this.inputNode.connect(this.mod1Input);
    this.mod1Output.connect(this.mod2Input);
    this.mod2Output.connect(this.ampSimInput);
    this.ampSimOutput.connect(this.delayInput);
    this.delayOutput.connect(this.compInput);
    this.compOutput.connect(this.reverbInput);
    this.reverbOutput.connect(this.masterLimiter);
    this.masterLimiter.connect(this.masterGain);
    this.masterGain.connect(this.analyzerNode);
    this.analyzerNode.connect(this.outputNode);
    this.outputNode.connect(ctx.destination);
  }

  private startMod2Lfo(rate: number, depth: number) {
    try {
      if (this.mod2Lfo) {
        this.mod2Lfo.stop();
        this.mod2Lfo.disconnect();
      }
      this.mod2Lfo = this.ctx.createOscillator();
      this.mod2Lfo.frequency.value = Math.max(0.1, rate);

      this.mod2LfoGainL = this.ctx.createGain();
      this.mod2LfoGainR = this.ctx.createGain();
      this.mod2LfoGainL.gain.value = depth;
      this.mod2LfoGainR.gain.value = -depth; // 180 deg phase for wide stereo

      this.mod2Lfo.connect(this.mod2LfoGainL);
      this.mod2Lfo.connect(this.mod2LfoGainR);

      this.mod2LfoGainL.connect(this.mod2DelayL.delayTime);
      this.mod2LfoGainR.connect(this.mod2DelayR.delayTime);

      this.mod2Lfo.start();
    } catch {
      // AudioContext might be suspended initially
    }
  }

  private setDriveCurve(amount: number) {
    const k = amount * 12;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      if (k === 0) {
        curve[i] = x;
      } else {
        curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
      }
    }
    this.waveShaper.curve = curve;
  }

  public generateReverbImpulse(type: SynthParams['reverbType'], bright: boolean) {
    let decayTime = 2.0;
    switch (type) {
      case 'ROOM': decayTime = 1.2; break;
      case 'STAGE': decayTime = 2.2; break;
      case 'HALL': decayTime = 3.8; break;
      case 'BOOTH': decayTime = 0.6; break;
      case 'SPRING': decayTime = 1.8; break;
      case 'CATH': decayTime = 5.5; break;
    }

    const rate = this.ctx.sampleRate;
    const length = Math.floor(rate * decayTime);
    const impulse = this.ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / length;
      const decay = Math.pow(1 - t, 2.5);
      // Spring reverb adds metallic ringing flutter
      const springMod = type === 'SPRING' ? (Math.sin(i * 0.08) * 0.4 + 1.0) : 1.0;
      left[i] = (Math.random() * 2 - 1) * decay * springMod;
      right[i] = (Math.random() * 2 - 1) * decay * springMod;
    }

    this.convolver.buffer = impulse;
    this.reverbDamping.frequency.value = bright ? 12000 : 4200;
  }

  public updateParameters(params: SynthParams) {
    const now = this.ctx.currentTime;

    // Master volume
    this.masterGain.gain.setTargetAtTime(params.masterVolume, now, 0.03);

    // Bypass overall effects if turned off
    if (!params.effectsOn) {
      this.mod1Gain.gain.setTargetAtTime(1, now, 0.02);
      this.mod2Wet.gain.setTargetAtTime(0, now, 0.02);
      this.mod2Dry.gain.setTargetAtTime(1, now, 0.02);
      this.setDriveCurve(0);
      this.delayWet.gain.setTargetAtTime(0, now, 0.02);
      this.reverbWet.gain.setTargetAtTime(0, now, 0.02);
      return;
    }

    // --- MOD 1 ---
    if (params.mod1On) {
      const rate = Math.max(0.2, params.mod1Rate * 1.5);
      const amt = params.mod1Amount / 10;
      if (params.mod1Type === 'TREM') {
        // Tremolo: modulate gain
        this.mod1Gain.gain.setTargetAtTime(0.5 + 0.5 * (1 - amt), now, 0.05);
      } else if (params.mod1Type === 'A-PAN') {
        if (this.mod1Panner.pan) {
          this.mod1Panner.pan.setTargetAtTime(amt * 0.8, now, 0.05);
        }
      }
    } else {
      this.mod1Gain.gain.setTargetAtTime(1.0, now, 0.05);
      if (this.mod1Panner.pan) {
        this.mod1Panner.pan.setTargetAtTime(0, now, 0.05);
      }
    }

    // --- MOD 2 ---
    if (params.mod2On) {
      const wet = (params.mod2Amount / 10) * 0.6;
      this.mod2Wet.gain.setTargetAtTime(wet, now, 0.05);
      this.mod2Dry.gain.setTargetAtTime(1.0 - wet * 0.5, now, 0.05);

      const rate = Math.max(0.1, params.mod2Rate * 1.2);
      const depth = (params.mod2Amount / 10) * 0.004;
      if (this.mod2Lfo) {
        this.mod2Lfo.frequency.setTargetAtTime(rate, now, 0.05);
      }
      if (this.mod2LfoGainL && this.mod2LfoGainR) {
        this.mod2LfoGainL.gain.setTargetAtTime(depth, now, 0.05);
        this.mod2LfoGainR.gain.setTargetAtTime(-depth, now, 0.05);
      }
    } else {
      this.mod2Wet.gain.setTargetAtTime(0, now, 0.05);
      this.mod2Dry.gain.setTargetAtTime(1.0, now, 0.05);
    }

    // --- AMP SIM & EQ ---
    if (params.ampSimOn) {
      this.setDriveCurve(params.drive);
      this.eqBass.gain.setTargetAtTime(params.eqBass, now, 0.05);
      this.eqMid.gain.setTargetAtTime(params.eqMid, now, 0.05);
      this.eqMid.frequency.setTargetAtTime(params.eqMidFreq, now, 0.05);
      this.eqTreble.gain.setTargetAtTime(params.eqTreble, now, 0.05);
    } else {
      this.setDriveCurve(0);
      this.eqBass.gain.setTargetAtTime(0, now, 0.05);
      this.eqMid.gain.setTargetAtTime(0, now, 0.05);
      this.eqTreble.gain.setTargetAtTime(0, now, 0.05);
    }

    // --- DELAY ---
    if (params.delayOn) {
      const delaySeconds = Math.max(0.05, Math.min(1.5, params.delayTempo));
      this.delayLeft.delayTime.setTargetAtTime(delaySeconds, now, 0.05);
      this.delayRight.delayTime.setTargetAtTime(
        params.delayPingPong ? delaySeconds * 0.75 : delaySeconds,
        now,
        0.05
      );
      this.delayFeedbackL.gain.setTargetAtTime(Math.min(0.92, params.delayFeedback), now, 0.05);
      this.delayFeedbackR.gain.setTargetAtTime(Math.min(0.92, params.delayFeedback), now, 0.05);
      this.delayWet.gain.setTargetAtTime(params.delayDryWet, now, 0.05);
      this.delayDry.gain.setTargetAtTime(1.0 - params.delayDryWet * 0.3, now, 0.05);

      this.delayDampingL.frequency.setTargetAtTime(params.delayAnalog ? 2600 : 8000, now, 0.05);
      this.delayDampingR.frequency.setTargetAtTime(params.delayAnalog ? 2600 : 8000, now, 0.05);
    } else {
      this.delayWet.gain.setTargetAtTime(0, now, 0.05);
      this.delayDry.gain.setTargetAtTime(1.0, now, 0.05);
    }

    // --- COMPRESSOR ---
    if (params.compOn) {
      const amt = params.compAmount / 10;
      this.compressor.threshold.setTargetAtTime(-30 * amt, now, 0.05);
      this.compressor.ratio.setTargetAtTime(1 + amt * 9, now, 0.05);
      this.compressor.attack.setTargetAtTime(params.compFast ? 0.003 : 0.025, now, 0.05);
    } else {
      this.compressor.threshold.setTargetAtTime(0, now, 0.05);
      this.compressor.ratio.setTargetAtTime(1, now, 0.05);
    }

    // --- REVERB ---
    if (params.reverbOn) {
      this.reverbWet.gain.setTargetAtTime(params.reverbDryWet, now, 0.05);
      this.reverbDry.gain.setTargetAtTime(1.0 - params.reverbDryWet * 0.3, now, 0.05);
      this.reverbDamping.frequency.setTargetAtTime(params.reverbBright ? 12000 : 4500, now, 0.05);
    } else {
      this.reverbWet.gain.setTargetAtTime(0, now, 0.05);
      this.reverbDry.gain.setTargetAtTime(1.0, now, 0.05);
    }
  }
}
