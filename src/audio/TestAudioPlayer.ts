/**
 * Test Audio Player & Live Source Generator
 * Provides real-time test audio sources for the Layer Effects rack:
 * 1. Procedural Drum Beat (Kick, Snare, Hi-Hat groove)
 * 2. Funky Bass / Guitar Riff
 * 3. Neo-Soul Synth Chords
 * 4. Live Microphone Input (getUserMedia)
 * 5. User Audio File Upload & Loop (MP3, WAV, OGG, FLAC)
 * All audio routes directly into the Web Audio API EffectsChain!
 */

export type AudioSourceType = 'drums' | 'guitar' | 'chords' | 'mic' | 'file' | 'none';

export class TestAudioPlayer {
  private ctx: AudioContext | null = null;
  private destinationNode: AudioNode | null = null;

  // Playback state
  private activeSource: AudioSourceType = 'none';
  private isPlaying = false;
  private intervalId: number | null = null;

  // Microphone stream
  private micStream: MediaStream | null = null;
  private micSourceNode: MediaStreamAudioSourceNode | null = null;
  private micGainNode: GainNode | null = null;

  // User uploaded audio buffer & node
  private uploadedBuffer: AudioBuffer | null = null;
  private uploadedSourceNode: AudioBufferSourceNode | null = null;
  private uploadedGainNode: GainNode | null = null;
  private fileName = '';

  // Noise buffer for snare & hats
  private noiseBuffer: AudioBuffer | null = null;

  // Listeners
  private listeners: ((state: { isPlaying: boolean; source: AudioSourceType; fileName?: string }) => void)[] = [];

  constructor() {}

  public setContextAndDestination(ctx: AudioContext, destination: AudioNode) {
    this.ctx = ctx;
    this.destinationNode = destination;
    this.generateNoiseBuffer();
  }

  private generateNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
  }

  public subscribe(cb: (state: { isPlaying: boolean; source: AudioSourceType; fileName?: string }) => void) {
    this.listeners.push(cb);
    cb({ isPlaying: this.isPlaying, source: this.activeSource, fileName: this.fileName });
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notify() {
    this.listeners.forEach((cb) =>
      cb({ isPlaying: this.isPlaying, source: this.activeSource, fileName: this.fileName })
    );
  }

  public stopAll() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.uploadedSourceNode) {
      try {
        this.uploadedSourceNode.stop();
        this.uploadedSourceNode.disconnect();
      } catch {}
      this.uploadedSourceNode = null;
    }

    if (this.micSourceNode) {
      try {
        this.micSourceNode.disconnect();
      } catch {}
      this.micSourceNode = null;
    }

    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }

    this.isPlaying = false;
    this.activeSource = 'none';
    this.notify();
  }

  /**
   * 1. Procedural 16-Step Drum Groove
   */
  public playDrums(bpm = 105) {
    if (!this.ctx || !this.destinationNode) return;
    this.stopAll();

    const secondsPer16th = 60 / bpm / 4;
    let step = 0;

    // Pattern definition (16 steps)
    // Kick on 0, 6, 8, 10
    // Snare on 4, 12
    // Closed Hat on 0, 2, 4, 6, 8, 10, 12, 14, Open Hat on 14
    const kickSteps = [0, 6, 8, 10];
    const snareSteps = [4, 12];
    const hatSteps = [0, 2, 4, 6, 8, 10, 12];
    const openHatSteps = [14];

    const playStep = () => {
      if (!this.ctx || !this.destinationNode) return;
      const now = this.ctx.currentTime;

      if (kickSteps.includes(step)) {
        this.triggerKick(now);
      }
      if (snareSteps.includes(step)) {
        this.triggerSnare(now);
      }
      if (hatSteps.includes(step)) {
        this.triggerHiHat(now, false);
      }
      if (openHatSteps.includes(step)) {
        this.triggerHiHat(now, true);
      }

      step = (step + 1) % 16;
    };

    playStep();
    this.intervalId = window.setInterval(playStep, secondsPer16th * 1000);
    this.isPlaying = true;
    this.activeSource = 'drums';
    this.notify();
  }

  private triggerKick(time: number) {
    if (!this.ctx || !this.destinationNode) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.12);

    gain.gain.setValueAtTime(0.9, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.28);

    osc.connect(gain);
    gain.connect(this.destinationNode);

    osc.start(time);
    osc.stop(time + 0.3);
  }

  private triggerSnare(time: number) {
    if (!this.ctx || !this.destinationNode || !this.noiseBuffer) return;

    // Tone body
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, time);
    osc.frequency.exponentialRampToValueAtTime(100, time + 0.08);
    oscGain.gain.setValueAtTime(0.4, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
    osc.connect(oscGain);
    oscGain.connect(this.destinationNode);
    osc.start(time);
    osc.stop(time + 0.15);

    // Snappy noise
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 900;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.55, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.destinationNode);

    noise.start(time);
    noise.stop(time + 0.25);
  }

  private triggerHiHat(time: number, isOpen: boolean) {
    if (!this.ctx || !this.destinationNode || !this.noiseBuffer) return;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7500;

    const gain = this.ctx.createGain();
    const duration = isOpen ? 0.35 : 0.06;
    gain.gain.setValueAtTime(isOpen ? 0.35 : 0.25, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.destinationNode);

    noise.start(time);
    noise.stop(time + duration + 0.02);
  }

  /**
   * 2. Funky Slap Bass / Guitar Riff
   */
  public playGuitarRiff(bpm = 100) {
    if (!this.ctx || !this.destinationNode) return;
    this.stopAll();

    // Funky D-minor pentatonic bassline notes (MIDI numbers):
    // D2(38), D2(38), F2(41), G2(43), G#2(44), A2(45), C3(48), D3(50)
    const riff = [
      { note: 38, dur: 0.18, timeOffset: 0 },
      { note: 38, dur: 0.12, timeOffset: 0.3 },
      { note: 41, dur: 0.15, timeOffset: 0.6 },
      { note: 43, dur: 0.22, timeOffset: 0.9 },
      { note: 45, dur: 0.14, timeOffset: 1.2 },
      { note: 48, dur: 0.25, timeOffset: 1.5 },
      { note: 50, dur: 0.35, timeOffset: 1.8 },
      { note: 43, dur: 0.18, timeOffset: 2.1 },
    ];

    const cycleLengthMs = 2400;

    const playRiff = () => {
      if (!this.ctx || !this.destinationNode) return;
      const baseTime = this.ctx.currentTime;

      riff.forEach(({ note, dur, timeOffset }) => {
        const time = baseTime + timeOffset;
        this.triggerPluckedBass(note, time, dur);
      });
    };

    playRiff();
    this.intervalId = window.setInterval(playRiff, cycleLengthMs);
    this.isPlaying = true;
    this.activeSource = 'guitar';
    this.notify();
  }

  private triggerPluckedBass(midiNote: number, time: number, dur: number) {
    if (!this.ctx || !this.destinationNode) return;
    const freq = 440 * Math.pow(2, (midiNote - 69) / 12);

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc2.type = 'square';
    osc1.frequency.setValueAtTime(freq, time);
    osc2.frequency.setValueAtTime(freq * 1.003, time);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 6;
    filter.frequency.setValueAtTime(freq * 6, time);
    filter.frequency.exponentialRampToValueAtTime(freq * 1.5, time + dur);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur + 0.05);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.destinationNode);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + dur + 0.06);
    osc2.stop(time + dur + 0.06);
  }

  /**
   * 3. Neo-Soul Chords (Rhodes / Oberheim style)
   */
  public playSynthChords() {
    if (!this.ctx || !this.destinationNode) return;
    this.stopAll();

    // Sequence of 4 lush chords:
    // 1. Dm9: D3, F3, A3, C4, E4
    // 2. G13: G2, F3, B3, E4
    // 3. Cmaj9: C3, E3, G3, B3, D4
    // 4. A7alt: A2, G3, C#4, F4
    const chords = [
      [50, 53, 57, 60, 64],
      [43, 53, 59, 64],
      [48, 52, 55, 59, 62],
      [45, 55, 61, 65],
    ];

    let chordIdx = 0;
    const playNextChord = () => {
      if (!this.ctx || !this.destinationNode) return;
      const notes = chords[chordIdx];
      const now = this.ctx.currentTime;
      const dur = 2.1;

      notes.forEach((midi) => {
        const freq = 440 * Math.pow(2, (midi - 69) / 12);
        const osc = this.ctx!.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        const filter = this.ctx!.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2500, now);

        const gain = this.ctx!.createGain();
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.18, now + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.destinationNode!);

        osc.start(now);
        osc.stop(now + dur + 0.1);
      });

      chordIdx = (chordIdx + 1) % chords.length;
    };

    playNextChord();
    this.intervalId = window.setInterval(playNextChord, 2200);
    this.isPlaying = true;
    this.activeSource = 'chords';
    this.notify();
  }

  /**
   * 4. Live Microphone Input
   */
  public async startMicrophone(): Promise<boolean> {
    if (!this.ctx || !this.destinationNode) return false;
    this.stopAll();

    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      this.micSourceNode = this.ctx.createMediaStreamSource(this.micStream);
      this.micGainNode = this.ctx.createGain();
      this.micGainNode.gain.value = 1.0;

      this.micSourceNode.connect(this.micGainNode);
      this.micGainNode.connect(this.destinationNode);

      this.isPlaying = true;
      this.activeSource = 'mic';
      this.notify();
      return true;
    } catch (err) {
      console.error('Microphone access failed:', err);
      return false;
    }
  }

  /**
   * 5. User Uploaded Audio File Loop
   */
  public async loadAndPlayAudioFile(file: File): Promise<boolean> {
    if (!this.ctx || !this.destinationNode) return false;
    this.stopAll();

    try {
      const arrayBuffer = await file.arrayBuffer();
      this.uploadedBuffer = await this.ctx.decodeAudioData(arrayBuffer);
      this.fileName = file.name;

      this.playUploadedBuffer();
      return true;
    } catch (err) {
      console.error('Failed to decode audio file:', err);
      return false;
    }
  }

  public playUploadedBuffer() {
    if (!this.ctx || !this.destinationNode || !this.uploadedBuffer) return;
    this.stopAll();

    const source = this.ctx.createBufferSource();
    source.buffer = this.uploadedBuffer;
    source.loop = true;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.85;

    source.connect(gain);
    gain.connect(this.destinationNode);

    source.start(0);
    this.uploadedSourceNode = source;
    this.uploadedGainNode = gain;

    this.isPlaying = true;
    this.activeSource = 'file';
    this.notify();
  }
}
