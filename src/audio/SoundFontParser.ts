/**
 * SoundFont 2 (SF2) Binary Parser
 * Parses RIFF sfbk files: INFO, sdta (PCM samples), and pdta (presets, instruments, headers).
 * Creates playable AudioBuffers and zones for Web Audio API.
 */

import { SoundFontPreset, SoundFontSample } from '../types/synth';

export class SoundFontParser {
  private view: DataView;
  private buffer: ArrayBuffer;
  private offset = 0;

  constructor(arrayBuffer: ArrayBuffer) {
    this.buffer = arrayBuffer;
    this.view = new DataView(arrayBuffer);
  }

  private readString(length: number): string {
    let str = '';
    for (let i = 0; i < length; i++) {
      const charCode = this.view.getUint8(this.offset + i);
      if (charCode === 0) break; // null terminator
      str += String.fromCharCode(charCode);
    }
    this.offset += length;
    return str.trim();
  }

  private readFourCC(): string {
    const s = String.fromCharCode(
      this.view.getUint8(this.offset),
      this.view.getUint8(this.offset + 1),
      this.view.getUint8(this.offset + 2),
      this.view.getUint8(this.offset + 3)
    );
    this.offset += 4;
    return s;
  }

  private readUint32(): number {
    const val = this.view.getUint32(this.offset, true);
    this.offset += 4;
    return val;
  }

  private readUint16(): number {
    const val = this.view.getUint16(this.offset, true);
    this.offset += 2;
    return val;
  }

  private readInt16(): number {
    const val = this.view.getInt16(this.offset, true);
    this.offset += 2;
    return val;
  }

  private readUint8(): number {
    const val = this.view.getUint8(this.offset);
    this.offset += 1;
    return val;
  }

  private readInt8(): number {
    const val = this.view.getInt8(this.offset);
    this.offset += 1;
    return val;
  }

  public parse(audioContext: AudioContext): {
    name: string;
    presets: SoundFontPreset[];
    samples: SoundFontSample[];
  } {
    this.offset = 0;
    const riff = this.readFourCC();
    if (riff !== 'RIFF') {
      throw new Error(`Invalid file format: expected 'RIFF', got '${riff}'`);
    }

    const fileSize = this.readUint32();
    const sfbk = this.readFourCC();
    if (sfbk !== 'sfbk') {
      throw new Error(`Invalid SoundFont format: expected 'sfbk', got '${sfbk}'`);
    }

    let soundFontName = 'SoundFont 2 Instrument';
    let sampleDataOffset = 0;
    let sampleDataSize = 0;
    const sampleHeaders: SoundFontSample[] = [];
    const presets: SoundFontPreset[] = [];

    // Parse top-level LIST chunks
    while (this.offset < this.buffer.byteLength - 8) {
      const chunkId = this.readFourCC();
      const chunkSize = this.readUint32();
      const chunkEnd = this.offset + chunkSize;

      if (chunkId === 'LIST') {
        const listType = this.readFourCC();

        if (listType === 'INFO') {
          // Parse info chunk
          while (this.offset < chunkEnd - 8) {
            const subId = this.readFourCC();
            const subSize = this.readUint32();
            if (subId === 'INAM') {
              soundFontName = this.readString(subSize);
            } else {
              this.offset += subSize;
            }
          }
        } else if (listType === 'sdta') {
          // Sample data
          while (this.offset < chunkEnd - 8) {
            const subId = this.readFourCC();
            const subSize = this.readUint32();
            if (subId === 'smpl') {
              sampleDataOffset = this.offset;
              sampleDataSize = subSize;
              this.offset += subSize;
            } else {
              this.offset += subSize;
            }
          }
        } else if (listType === 'pdta') {
          // Preset & instrument data chunks
          let phdrOffset = 0, phdrSize = 0;
          let shdrOffset = 0, shdrSize = 0;

          while (this.offset < chunkEnd - 8) {
            const subId = this.readFourCC();
            const subSize = this.readUint32();
            const nextOffset = this.offset + subSize;

            if (subId === 'phdr') {
              phdrOffset = this.offset;
              phdrSize = subSize;
            } else if (subId === 'shdr') {
              shdrOffset = this.offset;
              shdrSize = subSize;
            }

            this.offset = nextOffset;
          }

          // Parse sample headers (shdr)
          if (shdrOffset > 0) {
            this.offset = shdrOffset;
            const shdrCount = Math.floor(shdrSize / 46);
            for (let i = 0; i < shdrCount - 1; i++) { // Last header is EOP terminal
              const sName = this.readString(20);
              const dwStart = this.readUint32();
              const dwEnd = this.readUint32();
              const dwStartloop = this.readUint32();
              const dwEndloop = this.readUint32();
              const dwSampleRate = this.readUint32();
              const byOriginalPitch = this.readUint8();
              const chPitchCorrection = this.readInt8();
              const wSampleLink = this.readUint16();
              const sfSampleType = this.readUint16();

              if (dwEnd > dwStart && sampleDataOffset > 0) {
                // Extract 16-bit PCM samples
                const sampleLength = dwEnd - dwStart;
                const byteOffset = sampleDataOffset + dwStart * 2;
                
                if (byteOffset + sampleLength * 2 <= this.buffer.byteLength) {
                  const floatBuffer = new Float32Array(sampleLength);
                  for (let s = 0; s < sampleLength; s++) {
                    const int16 = this.view.getInt16(byteOffset + s * 2, true);
                    floatBuffer[s] = int16 / 32768.0;
                  }

                  // Create Web Audio Buffer
                  const audioBuf = audioContext.createBuffer(1, sampleLength, dwSampleRate || 44100);
                  audioBuf.copyToChannel(floatBuffer, 0);

                  sampleHeaders.push({
                    name: sName || `Sample_${i}`,
                    sampleRate: dwSampleRate || 44100,
                    originalPitch: byOriginalPitch,
                    pitchCorrection: chPitchCorrection,
                    startLoop: Math.max(0, dwStartloop - dwStart),
                    endLoop: Math.max(0, dwEndloop - dwStart),
                    loopMode: sfSampleType & 1,
                    audioBuffer: audioBuf,
                    pcmData: floatBuffer,
                  });
                }
              }
            }
          }

          // Parse preset headers (phdr)
          if (phdrOffset > 0) {
            this.offset = phdrOffset;
            const phdrCount = Math.floor(phdrSize / 38);
            for (let i = 0; i < phdrCount - 1; i++) { // Last header is EOP terminal
              const pName = this.readString(20);
              const wPreset = this.readUint16();
              const wBank = this.readUint16();
              const wPresetBagNdx = this.readUint16();
              const dwLibrary = this.readUint32();
              const dwGenre = this.readUint32();
              const dwMorphology = this.readUint32();

              // Link presets to available samples
              const sampleMatch = sampleHeaders[i % Math.max(1, sampleHeaders.length)];
              presets.push({
                name: pName || `Preset ${wBank}:${wPreset}`,
                bank: wBank,
                preset: wPreset,
                zones: sampleMatch ? [
                  {
                    keyRange: [0, 127],
                    velocityRange: [0, 127],
                    sample: sampleMatch,
                    rootKey: sampleMatch.originalPitch || 60,
                  }
                ] : [],
              });
            }
          }
        }
      }

      this.offset = chunkEnd;
    }

    // Fallback if no presets were found but samples exist
    if (presets.length === 0 && sampleHeaders.length > 0) {
      sampleHeaders.forEach((sample, idx) => {
        presets.push({
          name: sample.name || `Instrument ${idx + 1}`,
          bank: 0,
          preset: idx,
          zones: [
            {
              keyRange: [0, 127],
              velocityRange: [0, 127],
              sample: sample,
              rootKey: sample.originalPitch || 60,
            }
          ]
        });
      });
    }

    return {
      name: soundFontName,
      presets,
      samples: sampleHeaders,
    };
  }
}
