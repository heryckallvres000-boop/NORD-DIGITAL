/**
 * Realtime Arpeggiator Engine
 * Handles BPM sync, rhythmic divisions, multi-octave arpeggio sequences,
 * and trigger callbacks to the polyphonic synth voice engine.
 */

import { ArpDirection, SynthParams } from '../types/synth';

export class Arpeggiator {
  private heldNotes: Set<number> = new Set();
  private noteHistory: number[] = [];
  private isRunning = false;
  private timerId: number | null = null;
  private currentStep = 0;
  private currentOctave = 0;
  private directionUp = true;
  private onTriggerNote: (midiNote: number, velocity: number, durationSeconds: number) => void;

  constructor(onTriggerNote: (midiNote: number, velocity: number, durationSeconds: number) => void) {
    this.onTriggerNote = onTriggerNote;
  }

  public noteOn(midiNote: number) {
    this.heldNotes.add(midiNote);
    if (!this.noteHistory.includes(midiNote)) {
      this.noteHistory.push(midiNote);
    }
  }

  public noteOff(midiNote: number) {
    this.heldNotes.delete(midiNote);
    this.noteHistory = this.noteHistory.filter(n => n !== midiNote);
  }

  public clearNotes() {
    this.heldNotes.clear();
    this.noteHistory = [];
  }

  public start(params: SynthParams) {
    if (this.isRunning) return;
    this.isRunning = true;
    this.currentStep = 0;
    this.directionUp = true;
    this.scheduleNextTick(params);
  }

  public stop() {
    this.isRunning = false;
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  private getStepIntervalMs(bpm: number, division: SynthParams['arpDivision']): number {
    const quarterNoteMs = (60 / Math.max(30, bpm)) * 1000;
    switch (division) {
      case '1/4': return quarterNoteMs;
      case '1/8': return quarterNoteMs / 2;
      case '1/16': return quarterNoteMs / 4;
      case '1/32': return quarterNoteMs / 8;
      case '1/8T': return (quarterNoteMs / 2) * (2 / 3);
      case '1/16T': return (quarterNoteMs / 4) * (2 / 3);
      default: return quarterNoteMs / 4;
    }
  }

  public tick(params: SynthParams) {
    if (!this.isRunning) return;

    if (this.heldNotes.size > 0) {
      const sortedNotes = Array.from(this.heldNotes).sort((a, b) => a - b);
      const octaveCount = params.arpOctaveRange;
      const totalNotesInPattern = sortedNotes.length * octaveCount;

      let noteToPlay: number | null = null;

      if (params.arpMode === 'POLY') {
        // Play all held notes simultaneously
        for (const note of sortedNotes) {
          const dur = (this.getStepIntervalMs(params.tempoBpm, params.arpDivision) / 1000) * params.arpGateLength;
          this.onTriggerNote(note, 100, Math.max(0.05, dur));
        }
      } else {
        // Monophonic arpeggio patterns
        switch (params.arpDirection) {
          case 'UP': {
            const noteIdx = this.currentStep % sortedNotes.length;
            const oct = Math.floor(this.currentStep / sortedNotes.length) % octaveCount;
            noteToPlay = sortedNotes[noteIdx] + oct * 12;
            this.currentStep = (this.currentStep + 1) % totalNotesInPattern;
            break;
          }
          case 'DOWN': {
            const rev = [...sortedNotes].reverse();
            const noteIdx = this.currentStep % rev.length;
            const oct = (octaveCount - 1) - (Math.floor(this.currentStep / rev.length) % octaveCount);
            noteToPlay = rev[noteIdx] + oct * 12;
            this.currentStep = (this.currentStep + 1) % totalNotesInPattern;
            break;
          }
          case 'UP_DOWN': {
            // Ping-pong between bottom and top
            const noteIdx = this.currentStep % sortedNotes.length;
            noteToPlay = sortedNotes[noteIdx] + this.currentOctave * 12;
            if (this.directionUp) {
              this.currentStep++;
              if (this.currentStep >= sortedNotes.length) {
                this.currentStep = 0;
                this.currentOctave++;
                if (this.currentOctave >= octaveCount) {
                  this.currentOctave = octaveCount - 1;
                  this.directionUp = false;
                }
              }
            } else {
              this.currentStep--;
              if (this.currentStep < 0) {
                this.currentStep = sortedNotes.length - 1;
                this.currentOctave--;
                if (this.currentOctave < 0) {
                  this.currentOctave = 0;
                  this.directionUp = true;
                  this.currentStep = 0;
                }
              }
            }
            break;
          }
          case 'RANDOM': {
            const randNote = sortedNotes[Math.floor(Math.random() * sortedNotes.length)];
            const randOct = Math.floor(Math.random() * octaveCount);
            noteToPlay = randNote + randOct * 12;
            break;
          }
        }

        if (noteToPlay !== null) {
          const stepIntervalSec = this.getStepIntervalMs(params.tempoBpm, params.arpDivision) / 1000;
          const noteDuration = Math.max(0.04, stepIntervalSec * params.arpGateLength);
          this.onTriggerNote(noteToPlay, 100, noteDuration);
        }
      }
    }

    this.scheduleNextTick(params);
  }

  private scheduleNextTick(params: SynthParams) {
    if (!this.isRunning) return;
    const interval = this.getStepIntervalMs(params.tempoBpm, params.arpDivision);
    this.timerId = window.setTimeout(() => {
      this.tick(params);
    }, interval);
  }
}
