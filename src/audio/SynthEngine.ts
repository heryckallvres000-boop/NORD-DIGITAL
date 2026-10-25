/**
 * Polyphonic Synthesizer Engine
 * Coordinates voice pool, layer faders (A, B, C), Arpeggiator, LFO modulation,
 * Pitch Stick & Mod Wheel, Sustain Pedal, Web MIDI input, and Effects Chain.
 */

import { Arpeggiator } from './Arpeggiator';
import { EffectsChain } from './EffectsChain';
import { SampleLibrary } from './SampleLibrary';
import { SynthVoice } from './SynthVoice';
import { TestAudioPlayer } from './TestAudioPlayer';
import { SynthParams } from '../types/synth';

export class SynthEngine {
  private static instance: SynthEngine;
  private ctx: AudioContext | null = null;
  private effectsChain: EffectsChain | null = null;
  private sampleLibrary: SampleLibrary;
  private arpeggiator: Arpeggiator;
  public testAudioPlayer: TestAudioPlayer;

  // Voice Pool
  private maxPolyphony = 16;
  private activeVoices: Map<number, SynthVoice> = new Map();
  private voicePool: SynthVoice[] = [];

  // Controllers & State
  public params!: SynthParams;
  private lastNoteFreq = 440;
  private pitchBendMultiplier = 1.0;
  private modWheelValue = 0.0;
  private isSustainPedalDown = false;
  private sustainedNotes: Set<number> = new Set();
  private heldKeys: Set<number> = new Set();

  // Layer Gain Nodes
  private layerGainA: GainNode | null = null;
  private layerGainB: GainNode | null = null;
  private layerGainC: GainNode | null = null;
  private synthBus: GainNode | null = null;

  // LFO
  private mainLfo: OscillatorNode | null = null;
  private mainLfoGain: GainNode | null = null;

  // Test Sound Loop
  private testSoundInterval: number | null = null;
  public isTestSoundActive = false;

  // Listeners
  private noteListeners: ((activeNotes: number[]) => void)[] = [];
  private meterListeners: ((meterLevels: { layerA: number; layerB: number; layerC: number }) => void)[] = [];
  private midiStatusListeners: ((deviceName: string | null) => void)[] = [];
  private midiCcListeners: ((cc: number, value: number) => void)[] = [];

  private constructor() {
    this.sampleLibrary = SampleLibrary.getInstance();
    this.testAudioPlayer = new TestAudioPlayer();
    this.arpeggiator = new Arpeggiator((note, vel, dur) => {
      this.triggerVoice(note, vel, false);
      setTimeout(() => {
        this.releaseVoice(note, false);
      }, dur * 1000);
    });
  }

  public static getInstance(): SynthEngine {
    if (!SynthEngine.instance) {
      SynthEngine.instance = new SynthEngine();
    }
    return SynthEngine.instance;
  }

  public initAudioContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx({ latencyHint: 'interactive' });
      this.sampleLibrary.setAudioContext(this.ctx);

      // Create effects chain
      this.effectsChain = new EffectsChain(this.ctx);

      // Connect TestAudioPlayer to effects chain input
      this.testAudioPlayer.setContextAndDestination(this.ctx, this.effectsChain.inputNode);

      // Create Layer gain nodes
      this.layerGainA = this.ctx.createGain();
      this.layerGainB = this.ctx.createGain();
      this.layerGainC = this.ctx.createGain();
      this.synthBus = this.ctx.createGain();

      this.layerGainA.connect(this.synthBus);
      this.layerGainB.connect(this.synthBus);
      this.layerGainC.connect(this.synthBus);
      this.synthBus.connect(this.effectsChain.inputNode);

      // Initialize voice pool
      for (let i = 0; i < this.maxPolyphony; i++) {
        this.voicePool.push(new SynthVoice(this.ctx, this.layerGainA));
      }

      // Initialize Web MIDI API
      this.initMidi();
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    return this.ctx;
  }

  public getAudioContext(): AudioContext | null {
    return this.ctx;
  }

  public getEffectsChain(): EffectsChain | null {
    return this.effectsChain;
  }

  public getAnalyzerNode(): AnalyserNode | null {
    return this.effectsChain?.analyzerNode || null;
  }

  public setParams(params: SynthParams) {
    this.params = params;

    if (this.effectsChain) {
      this.effectsChain.updateParameters(params);
    }

    if (this.ctx && this.layerGainA && this.layerGainB && this.layerGainC) {
      const now = this.ctx.currentTime;
      const levelA = params.layerA_on ? params.layerA_level : 0;
      const levelB = params.layerB_on ? params.layerB_level : 0;
      const levelC = params.layerC_on ? params.layerC_level : 0;

      this.layerGainA.gain.setTargetAtTime(levelA, now, 0.03);
      this.layerGainB.gain.setTargetAtTime(levelB, now, 0.03);
      this.layerGainC.gain.setTargetAtTime(levelC, now, 0.03);
    }

    // Update Arpeggiator
    if (params.arpEnabled) {
      this.arpeggiator.start(params);
    } else {
      this.arpeggiator.stop();
    }
  }

  public noteOn(midiNote: number, velocity = 100) {
    this.initAudioContext();
    this.heldKeys.add(midiNote);
    this.notifyNoteListeners();

    if (this.params.arpEnabled) {
      this.arpeggiator.noteOn(midiNote);
    } else {
      this.triggerVoice(midiNote, velocity, true);
    }
  }

  public noteOff(midiNote: number) {
    this.heldKeys.delete(midiNote);
    this.notifyNoteListeners();

    if (this.params.arpEnabled) {
      this.arpeggiator.noteOff(midiNote);
    } else {
      if (this.isSustainPedalDown) {
        this.sustainedNotes.add(midiNote);
      } else {
        this.releaseVoice(midiNote, true);
      }
    }
  }

  private triggerVoice(midiNote: number, velocity: number, isRealKey = true) {
    if (!this.ctx) return;

    // Handle Monophonic / Legato mode
    if (this.params.polyphonyMode === 'mono' || this.params.polyphonyMode === 'legato') {
      for (const [key, voice] of this.activeVoices.entries()) {
        voice.noteOff(0.04);
        this.activeVoices.delete(key);
      }
    }

    // Check if voice for this note already exists
    let voice = this.activeVoices.get(midiNote);

    if (!voice) {
      // Find idle voice from pool or steal oldest
      voice = this.voicePool.find(v => !v.isReleasing && !Array.from(this.activeVoices.values()).includes(v));

      if (!voice) {
        // Voice stealing: steal oldest voice
        const oldestEntry = Array.from(this.activeVoices.entries())[0];
        if (oldestEntry) {
          const [oldNote, oldVoice] = oldestEntry;
          oldVoice.noteOff(0.02);
          this.activeVoices.delete(oldNote);
          voice = oldVoice;
        } else {
          voice = this.voicePool[0];
        }
      }
    }

    const glideFreq = this.params.glide > 0 ? this.lastNoteFreq : undefined;
    voice.noteOn(midiNote, velocity, this.params, glideFreq);
    this.activeVoices.set(midiNote, voice);

    // Save frequency for glide
    const totalSemitones = midiNote + this.params.octaveShift * 12 + this.params.masterTune;
    this.lastNoteFreq = 440 * Math.pow(2, (totalSemitones - 69) / 12);
  }

  private releaseVoice(midiNote: number, isRealKey = true) {
    const voice = this.activeVoices.get(midiNote);
    if (voice) {
      voice.noteOff(this.params.ampRelease);
      this.activeVoices.delete(midiNote);
    }
  }

  public setSustainPedal(isDown: boolean) {
    this.isSustainPedalDown = isDown;
    if (!isDown) {
      // Release all sustained notes that are not currently held physically
      for (const note of this.sustainedNotes) {
        if (!this.heldKeys.has(note)) {
          this.releaseVoice(note);
        }
      }
      this.sustainedNotes.clear();
    }
  }

  public setPitchBend(value: number) {
    // Value between -1.0 (down 2 semitones) and +1.0 (up 2 semitones)
    this.pitchBendMultiplier = Math.pow(2, (value * 2) / 12);
  }

  public setModWheel(value: number) {
    // Value between 0.0 and 1.0
    this.modWheelValue = value;
    // Mod wheel can modulate vibrato or filter cutoff dynamically
    if (this.params && this.effectsChain) {
      if (value > 0.05) {
        const modulatedCutoff = this.params.filterCutoff + value * 3000;
        this.effectsChain.updateParameters({
          ...this.params,
          filterCutoff: Math.min(20000, modulatedCutoff),
        });
      }
    }
  }

  public panic() {
    // All Notes Off
    for (const voice of this.voicePool) {
      voice.noteOff(0.01);
    }
    this.activeVoices.clear();
    this.sustainedNotes.clear();
    this.heldKeys.clear();
    this.arpeggiator.clearNotes();
    if (this.testSoundInterval !== null) {
      clearInterval(this.testSoundInterval);
      this.testSoundInterval = null;
      this.isTestSoundActive = false;
    }
    this.notifyNoteListeners();
  }

  public toggleTestSound(): boolean {
    this.initAudioContext();
    if (this.isTestSoundActive) {
      if (this.testSoundInterval !== null) {
        clearInterval(this.testSoundInterval);
        this.testSoundInterval = null;
      }
      this.isTestSoundActive = false;
      this.panic();
      return false;
    } else {
      this.isTestSoundActive = true;
      // Play a lush chord sequence (C minor 9 / F minor 7)
      const chord = [60, 63, 67, 70, 74];
      let step = 0;

      const playChord = () => {
        chord.forEach((note) => {
          this.triggerVoice(note, 90, false);
          setTimeout(() => {
            this.releaseVoice(note, false);
          }, 1800);
        });
        step++;
      };

      playChord();
      this.testSoundInterval = window.setInterval(playChord, 2200);
      return true;
    }
  }

  private notifyNoteListeners() {
    const notes = Array.from(this.heldKeys);
    for (const listener of this.noteListeners) {
      listener(notes);
    }
  }

  public onNotesChange(callback: (activeNotes: number[]) => void) {
    this.noteListeners.push(callback);
    return () => {
      this.noteListeners = this.noteListeners.filter(l => l !== callback);
    };
  }

  public onMidiStatusChange(callback: (deviceName: string | null) => void) {
    this.midiStatusListeners.push(callback);
    return () => {
      this.midiStatusListeners = this.midiStatusListeners.filter(l => l !== callback);
    };
  }

  private initMidi() {
    if (navigator.requestMIDIAccess) {
      navigator.requestMIDIAccess().then(
        (midiAccess) => {
          let connectedName: string | null = null;
          for (const input of midiAccess.inputs.values()) {
            connectedName = input.name || 'MIDI Device';
            input.onmidimessage = (e) => this.handleMidiMessage(e);
          }

          for (const l of this.midiStatusListeners) {
            l(connectedName);
          }

          midiAccess.onstatechange = (e: any) => {
            const port = e.port;
            if (port.type === 'input') {
              if (port.state === 'connected') {
                port.onmidimessage = (msg: any) => this.handleMidiMessage(msg);
                for (const l of this.midiStatusListeners) l(port.name || 'Connected');
              } else {
                for (const l of this.midiStatusListeners) l(null);
              }
            }
          };
        },
        () => {
          // Web MIDI not supported or denied
        }
      );
    }
  }

  public onMidiCc(callback: (cc: number, value: number) => void) {
    this.midiCcListeners.push(callback);
    return () => {
      this.midiCcListeners = this.midiCcListeners.filter((l) => l !== callback);
    };
  }

  private handleMidiMessage(event: any) {
    const data = event.data;
    if (!data) return;
    const cmd = data[0] >> 4;
    const note = data[1];
    const velocity = data[2];

    switch (cmd) {
      case 0x9: // Note On
        if (velocity > 0) {
          this.noteOn(note, velocity);
        } else {
          this.noteOff(note);
        }
        break;
      case 0x8: // Note Off
        this.noteOff(note);
        break;
      case 0xb: // Control Change
        // Notify custom MIDI CC listeners (for MIDI Learn & Param mapping)
        for (const l of this.midiCcListeners) {
          l(note, velocity);
        }

        if (note === 1) { // Mod Wheel
          this.setModWheel(velocity / 127);
        } else if (note === 64) { // Sustain Pedal
          this.setSustainPedal(velocity >= 64);
        } else if (note === 120 || note === 123) { // All Sound Off / All Notes Off
          this.panic();
        }
        break;
      case 0xe: // Pitch Bend
        const bend = ((data[2] << 7) | data[1]) - 8192;
        this.setPitchBend(bend / 8192);
        break;
    }
  }
}
