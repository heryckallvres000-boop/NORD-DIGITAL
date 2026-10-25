/**
 * Sample Library Manager
 * Manages built-in high-fidelity instrument samples and imported SF2 soundfonts.
 * Provides instant multi-sample buffers for Grand Piano, B3 Organ, Rhodes, and Strings.
 */

import { SoundFontPreset, SoundFontSample } from '../types/synth';

export interface BuiltinInstrument {
  id: string;
  name: string;
  category: 'PIANO' | 'ORGAN' | 'SYNTH' | 'STRINGS' | 'EP';
  description: string;
  generateSample: (audioContext: AudioContext, note: number) => AudioBuffer;
}

export class SampleLibrary {
  private static instance: SampleLibrary;
  private audioContext: AudioContext | null = null;
  private sampleCache: Map<string, AudioBuffer> = new Map();
  private userSoundFonts: Map<string, SoundFontPreset[]> = new Map();

  private constructor() {}

  public static getInstance(): SampleLibrary {
    if (!SampleLibrary.instance) {
      SampleLibrary.instance = new SampleLibrary();
    }
    return SampleLibrary.instance;
  }

  public setAudioContext(ctx: AudioContext) {
    this.audioContext = ctx;
  }

  /**
   * Generates or retrieves an AudioBuffer for built-in instruments
   */
  public getSample(instrumentId: string, midiNote: number): AudioBuffer | null {
    if (!this.audioContext) return null;

    const cacheKey = `${instrumentId}_${midiNote}`;
    if (this.sampleCache.has(cacheKey)) {
      return this.sampleCache.get(cacheKey)!;
    }

    const buffer = this.createSynthesizedSample(instrumentId, midiNote);
    if (buffer) {
      this.sampleCache.set(cacheKey, buffer);
    }
    return buffer;
  }

  /**
   * High-quality algorithmic sample synthesis for authentic Nord-style sound engines
   */
  private createSynthesizedSample(instrumentId: string, midiNote: number): AudioBuffer | null {
    if (!this.audioContext) return null;

    const sampleRate = this.audioContext.sampleRate;
    const freq = 440 * Math.pow(2, (midiNote - 69) / 12);

    if (instrumentId === 'nord_grand' || instrumentId === 'white_grand') {
      // Acoustic Grand Piano multi-harmonic simulation
      const duration = Math.max(1.5, 4.5 - (midiNote / 127) * 2.5);
      const length = Math.floor(sampleRate * duration);
      const buffer = this.audioContext.createBuffer(2, length, sampleRate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);

      // Inharmonicity factor for realistic piano strings
      const inharmonicity = 0.0003 * Math.pow(freq / 261.63, 0.8);
      const strikeNoiseLen = Math.floor(sampleRate * 0.012);

      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        let sample = 0;

        // 12 harmonics with physical piano decay rates
        for (let h = 1; h <= 12; h++) {
          const harmonicFreq = freq * h * Math.sqrt(1 + inharmonicity * h * h);
          if (harmonicFreq > sampleRate / 2) break;

          const hAmp = Math.pow(h, -1.25);
          const hDecay = Math.exp(-t * (1.2 + h * 0.4 + (midiNote / 127) * 2.0));
          sample += Math.sin(2 * Math.PI * harmonicFreq * t) * hAmp * hDecay;
        }

        // Hammer strike transient
        if (i < strikeNoiseLen) {
          const hammerEnv = 1 - (i / strikeNoiseLen);
          sample += (Math.random() * 2 - 1) * hammerEnv * 0.25;
        }

        // Soft stereo chorus widening
        left[i] = sample * 0.35;
        right[i] = sample * 0.35 * (1 + 0.05 * Math.sin(2 * Math.PI * 1.5 * t));
      }
      return buffer;
    }

    if (instrumentId === 'b3_soulful' || instrumentId === 'b3_organ') {
      // B3 Tonewheel Organ: 9 drawbars (16', 5 1/3', 8', 4', 2 2/3', 2', 1 3/5', 1 1/3', 1')
      const duration = 2.0; // Looped organ tone
      const length = Math.floor(sampleRate * duration);
      const buffer = this.audioContext.createBuffer(2, length, sampleRate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);

      // Drawbar ratios: sub-octave, 5th, fundamental, octave, 12th, 15th, 17th, 19th, 22nd
      const drawbars = [
        { ratio: 0.5, amp: 0.8 },   // 16'
        { ratio: 1.498, amp: 0.7 }, // 5 1/3'
        { ratio: 1.0, amp: 1.0 },   // 8'
        { ratio: 2.0, amp: 0.8 },   // 4'
        { ratio: 2.996, amp: 0.5 }, // 2 2/3'
        { ratio: 4.0, amp: 0.6 },   // 2'
        { ratio: 5.04, amp: 0.3 },  // 1 3/5'
        { ratio: 5.993, amp: 0.2 }, // 1 1/3'
        { ratio: 8.0, amp: 0.2 },   // 1'
      ];

      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        let s = 0;
        for (const db of drawbars) {
          const f = freq * db.ratio;
          if (f < sampleRate / 2) {
            s += Math.sin(2 * Math.PI * f * t) * db.amp;
          }
        }
        // Key click transient at beginning
        if (i < sampleRate * 0.008) {
          s += (Math.random() * 2 - 1) * (1 - i / (sampleRate * 0.008)) * 0.3;
        }

        left[i] = s * 0.15;
        right[i] = s * 0.15;
      }
      return buffer;
    }

    if (instrumentId === 'rhodes_stage' || instrumentId === 'mark1') {
      // Vintage Mark I Electric Piano (tine + pickup resonance)
      const duration = 3.5;
      const length = Math.floor(sampleRate * duration);
      const buffer = this.audioContext.createBuffer(2, length, sampleRate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);

      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const decay = Math.exp(-t * (1.1 + (midiNote / 127) * 1.5));
        // Fundamental + tine bell tone (harmonic 7) + overtone 2
        const s = (
          Math.sin(2 * Math.PI * freq * t) * 0.7 +
          Math.sin(2 * Math.PI * freq * 2 * t) * 0.2 * Math.exp(-t * 3.5) +
          Math.sin(2 * Math.PI * freq * 7.1 * t) * 0.25 * Math.exp(-t * 8.0)
        ) * decay;

        left[i] = s * 0.4;
        right[i] = s * 0.4;
      }
      return buffer;
    }

    if (instrumentId === 'vintage_strings' || instrumentId === 'vista_pad') {
      // Lush Ensemble Analog Strings with rich detuning
      const duration = 3.0;
      const length = Math.floor(sampleRate * duration);
      const buffer = this.audioContext.createBuffer(2, length, sampleRate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);

      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        let l = 0;
        let r = 0;
        // 5 detuned saw voices
        const detunes = [-0.08, -0.03, 0.0, 0.03, 0.08];
        for (let d = 0; d < detunes.length; d++) {
          const f = freq * (1 + detunes[d] * 0.015);
          const saw = 2 * ((t * f) % 1) - 1;
          const pan = d / (detunes.length - 1);
          l += saw * (1 - pan);
          r += saw * pan;
        }

        left[i] = l * 0.12;
        right[i] = r * 0.12;
      }
      return buffer;
    }

    return null;
  }

  public registerUserSoundFont(fileId: string, presets: SoundFontPreset[]) {
    this.userSoundFonts.set(fileId, presets);
  }

  public getUserSoundFonts(): Map<string, SoundFontPreset[]> {
    return this.userSoundFonts;
  }

  public getAllPresetsList(): { id: string; name: string; type: 'BUILTIN' | 'SF2'; sampleId: string }[] {
    const list: { id: string; name: string; type: 'BUILTIN' | 'SF2'; sampleId: string }[] = [
      { id: 'nord_grand', name: 'Nord White Grand XL', type: 'BUILTIN', sampleId: 'nord_grand' },
      { id: 'b3_soulful', name: 'B3 Soulful Tonewheel', type: 'BUILTIN', sampleId: 'b3_soulful' },
      { id: 'rhodes_stage', name: 'Mark I Stage 73 Rhodes', type: 'BUILTIN', sampleId: 'rhodes_stage' },
      { id: 'vista_pad', name: 'Vista Pad Strings Whl', type: 'BUILTIN', sampleId: 'vista_pad' },
    ];

    for (const [fileId, presets] of this.userSoundFonts.entries()) {
      for (const p of presets) {
        list.push({
          id: `sf2_${fileId}_${p.bank}_${p.preset}`,
          name: `SF2: ${p.name}`,
          type: 'SF2' as const,
          sampleId: p.zones[0]?.sample.name || p.name,
        });
      }
    }

    return list;
  }
}
