/**
 * Realistic Piano Keyboard & Expressive Controllers
 * Features:
 * - 61-key playable keyboard with glossy keys and active press highlights
 * - Nord's iconic Wooden Pitch Stick with spring-loaded physical return
 * - Textured Stone Modulation Wheel
 * - Sustain Pedal toggle (and spacebar shortcut)
 * - Computer keyboard playing mode with key hints
 * - Responsive viewport fitting
 */

import React, { useEffect, useRef, useState } from 'react';

interface PianoKeyboardProps {
  activeNotes: number[];
  onNoteOn: (note: number, velocity?: number) => void;
  onNoteOff: (note: number) => void;
  onPitchBend: (val: number) => void;
  onModWheel: (val: number) => void;
  onSustainPedal: (isDown: boolean) => void;
}

export const PianoKeyboard: React.FC<PianoKeyboardProps> = ({
  activeNotes,
  onNoteOn,
  onNoteOff,
  onPitchBend,
  onModWheel,
  onSustainPedal,
}) => {
  const [pitchStickY, setPitchStickY] = useState(0); // -1.0 to +1.0
  const [modWheelY, setModWheelY] = useState(0); // 0.0 to 1.0
  const [isSustained, setIsSustained] = useState(false);
  const [baseOctave, setBaseOctave] = useState(3); // Start at C3
  const [showKeyLabels, setShowKeyLabels] = useState(true);

  const pitchStickRef = useRef<HTMLDivElement>(null);
  const modWheelRef = useRef<HTMLDivElement>(null);
  const isDraggingPitch = useRef(false);
  const isDraggingMod = useRef(false);

  // Computer keyboard note mapping (Key -> Semitone offset from baseOctave C)
  const keyMap: Record<string, number> = {
    // Lower row (C3 .. E4)
    z: 0, s: 1, x: 2, d: 3, c: 4, v: 5, g: 6, b: 7, h: 8, n: 9, j: 10, m: 11,
    ',': 12, 'l': 13, '.': 14, ';': 15, '/': 16,
    // Upper row (C4 .. E5)
    q: 12, '2': 13, w: 14, '3': 15, e: 16, r: 17, '5': 18, t: 19, '6': 20, y: 21, '7': 22, u: 23,
    i: 24, '9': 25, o: 26, '0': 27, p: 28,
  };

  const activeKeysPressed = useRef<Set<string>>(new Set());

  // Setup computer keyboard listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsSustained(prev => {
          const next = !prev;
          onSustainPedal(next);
          return next;
        });
        return;
      }

      const key = e.key.toLowerCase();
      if (key in keyMap && !activeKeysPressed.current.has(key)) {
        activeKeysPressed.current.add(key);
        const midiNote = baseOctave * 12 + keyMap[key];
        onNoteOn(midiNote, 105);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key in keyMap) {
        activeKeysPressed.current.delete(key);
        const midiNote = baseOctave * 12 + keyMap[key];
        onNoteOff(midiNote);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [baseOctave, onNoteOn, onNoteOff, onSustainPedal]);

  // Handle Pitch Stick Pointer
  const handlePitchPointerDown = (e: React.PointerEvent) => {
    isDraggingPitch.current = true;
    updatePitchFromPointer(e);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePitchPointerMove = (e: React.PointerEvent) => {
    if (!isDraggingPitch.current) return;
    updatePitchFromPointer(e);
  };

  const handlePitchPointerUp = (e: React.PointerEvent) => {
    isDraggingPitch.current = false;
    // Spring return to center
    setPitchStickY(0);
    onPitchBend(0);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const updatePitchFromPointer = (e: React.PointerEvent) => {
    if (!pitchStickRef.current) return;
    const rect = pitchStickRef.current.getBoundingClientRect();
    const relativeX = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const clamped = Math.max(-1, Math.min(1, relativeX));
    setPitchStickY(clamped);
    onPitchBend(clamped);
  };

  // Handle Mod Wheel Pointer
  const handleModPointerDown = (e: React.PointerEvent) => {
    isDraggingMod.current = true;
    updateModFromPointer(e);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleModPointerMove = (e: React.PointerEvent) => {
    if (!isDraggingMod.current) return;
    updateModFromPointer(e);
  };

  const handleModPointerUp = (e: React.PointerEvent) => {
    isDraggingMod.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const updateModFromPointer = (e: React.PointerEvent) => {
    if (!modWheelRef.current) return;
    const rect = modWheelRef.current.getBoundingClientRect();
    const relativeY = (rect.bottom - e.clientY) / rect.height;
    const clamped = Math.max(0, Math.min(1, relativeY));
    setModWheelY(clamped);
    onModWheel(clamped);
  };

  // Generate 61 keys (C2 to C7 = 61 notes, or C1 to C6)
  // Let's render 49-61 keys based on baseOctave
  const startMidi = (baseOctave - 1) * 12; // e.g. Octave 3 => start at C2 (36)
  const totalKeys = 49; // 4 octaves + 1 note (C to C)

  const keys = [];
  for (let i = 0; i < totalKeys; i++) {
    const noteNum = startMidi + i;
    const noteInOctave = noteNum % 12;
    const isBlack = [1, 3, 6, 8, 10].includes(noteInOctave);
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const noteName = `${noteNames[noteInOctave]}${Math.floor(noteNum / 12) - 1}`;

    // Find computer key binding if within base octave range
    let computerKeyLabel = '';
    const offset = noteNum - (baseOctave * 12);
    for (const [k, off] of Object.entries(keyMap)) {
      if (off === offset) {
        computerKeyLabel = k.toUpperCase();
        break;
      }
    }

    keys.push({
      midi: noteNum,
      isBlack,
      name: noteName,
      keyLabel: computerKeyLabel,
    });
  }

  return (
    <div className="flex flex-col w-full bg-[#14161b] p-3 rounded-b-lg border-t-2 border-neutral-950 shadow-2xl select-none">
      {/* Top Controller Bar */}
      <div className="flex items-center justify-between mb-2 px-2 text-neutral-300 text-xs">
        <div className="flex items-center gap-4">
          {/* Octave Shift */}
          <div className="flex items-center gap-1.5 bg-neutral-900 px-2.5 py-1 rounded border border-neutral-800">
            <span className="text-[10px] uppercase font-bold text-neutral-400">Octave:</span>
            <button
              onClick={() => setBaseOctave(Math.max(1, baseOctave - 1))}
              className="w-6 h-6 rounded bg-neutral-800 hover:bg-neutral-700 active:scale-95 font-bold text-xs border border-neutral-700 text-neutral-200"
            >
              -
            </button>
            <span className="w-8 text-center font-mono font-bold text-cyan-300">
              C{baseOctave - 1}-C{baseOctave + 3}
            </span>
            <button
              onClick={() => setBaseOctave(Math.min(5, baseOctave + 1))}
              className="w-6 h-6 rounded bg-neutral-800 hover:bg-neutral-700 active:scale-95 font-bold text-xs border border-neutral-700 text-neutral-200"
            >
              +
            </button>
          </div>

          {/* Sustain Pedal Toggle */}
          <button
            onClick={() => {
              const next = !isSustained;
              setIsSustained(next);
              onSustainPedal(next);
            }}
            className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-2 border transition-all ${
              isSustained
                ? 'bg-red-950 border-red-500 text-white shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:bg-neutral-800'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isSustained ? 'bg-red-500 shadow-[0_0_5px_#ef4444]' : 'bg-neutral-600'
              }`}
            />
            Sustain Pedal (Space)
          </button>

          <button
            onClick={() => setShowKeyLabels(!showKeyLabels)}
            className="px-2.5 py-1 rounded text-[11px] font-medium bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-200"
          >
            {showKeyLabels ? 'Hide Key Hints' : 'Show Key Hints'}
          </button>
        </div>

        <div className="text-[11px] font-mono text-neutral-400">
          Keys Active: <span className="text-cyan-300 font-bold">{activeNotes.length}</span>
        </div>
      </div>

      {/* Main Assembly: Expressive Left Controllers + Piano Keys */}
      <div className="flex items-stretch gap-4 h-[160px] bg-[#0d0e12] p-2 rounded border border-neutral-900 shadow-inner">
        {/* Nord Expressive Controllers: Wooden Pitch Stick + Stone Mod Wheel */}
        <div className="flex items-center gap-3 bg-[#181a20] px-3 py-2 rounded border border-neutral-800 shadow-md">
          {/* Wooden Pitch Stick */}
          <div className="flex flex-col items-center justify-between h-full">
            <span className="text-[8px] uppercase font-bold text-neutral-400 tracking-tighter">
              PITCH STICK
            </span>
            <div
              ref={pitchStickRef}
              onPointerDown={handlePitchPointerDown}
              onPointerMove={handlePitchPointerMove}
              onPointerUp={handlePitchPointerUp}
              className="relative w-12 h-24 bg-neutral-950 rounded-md border border-neutral-800 shadow-inner cursor-ew-resize touch-none flex items-center justify-center p-1"
            >
              {/* Wooden Stick simulation */}
              <div
                className="w-5 h-16 rounded-md shadow-lg border border-amber-950 cursor-grab active:cursor-grabbing transition-transform flex flex-col items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #a05a2c 0%, #7c3f1d 50%, #54270f 100%)',
                  transform: `translateX(${pitchStickY * 14}px) rotate(${pitchStickY * 12}deg)`,
                }}
              >
                {/* Thumb impression groove */}
                <div className="w-2.5 h-6 rounded-full bg-amber-950/60 shadow-inner border-t border-amber-800/40" />
              </div>
            </div>
            <span className="text-[8px] font-mono text-cyan-400">
              {pitchStickY > 0.05 ? `+${(pitchStickY * 2).toFixed(1)}` : pitchStickY < -0.05 ? `${(pitchStickY * 2).toFixed(1)}` : '0'}
            </span>
          </div>

          {/* Stone Mod Wheel */}
          <div className="flex flex-col items-center justify-between h-full">
            <span className="text-[8px] uppercase font-bold text-neutral-400 tracking-tighter">
              MOD WHEEL
            </span>
            <div
              ref={modWheelRef}
              onPointerDown={handleModPointerDown}
              onPointerMove={handleModPointerMove}
              onPointerUp={handleModPointerUp}
              className="relative w-8 h-24 bg-neutral-950 rounded-md border border-neutral-800 shadow-inner cursor-ns-resize touch-none flex items-center justify-center overflow-hidden"
            >
              {/* Mod Wheel Drum with textured ridges */}
              <div
                className="w-full h-full rounded shadow-md border-x border-neutral-700 cursor-grab active:cursor-grabbing relative"
                style={{
                  background: 'repeating-linear-gradient(0deg, #333842 0px, #20242b 4px, #404652 8px)',
                  transform: `translateY(${(1 - modWheelY) * 20 - 10}px)`,
                }}
              >
                {/* Center marker */}
                <div className="absolute top-1/2 left-0 right-0 h-1 bg-cyan-400/80 shadow-[0_0_4px_#38bdf8]" />
              </div>
            </div>
            <span className="text-[8px] font-mono text-cyan-400">
              {Math.round(modWheelY * 100)}%
            </span>
          </div>
        </div>

        {/* Playable Piano Keys */}
        <div className="relative flex-1 flex h-full overflow-x-auto select-none rounded bg-[#0b0c0f]">
          {keys.map((key) => {
            const isActive = activeNotes.includes(key.midi);

            if (key.isBlack) {
              return (
                <div
                  key={key.midi}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    onNoteOn(key.midi, 110);
                  }}
                  onPointerUp={() => onNoteOff(key.midi)}
                  onPointerLeave={() => {
                    if (isActive) onNoteOff(key.midi);
                  }}
                  className={`absolute z-10 w-[24px] h-[95px] rounded-b-[3px] border border-black cursor-pointer shadow-[0_4px_6px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.2)] transition-all flex flex-col justify-end items-center pb-2 ${
                    isActive
                      ? 'bg-cyan-500 shadow-[0_0_12px_#06b6d4,inset_0_2px_4px_rgba(0,0,0,0.5)] translate-y-1'
                      : 'bg-gradient-to-b from-[#252830] via-[#15171c] to-[#0a0b0d] hover:brightness-125'
                  }`}
                  style={{
                    // Position black key over the boundary of previous white key
                    // Let's compute left offset by counting previous white keys
                    left: `${getWhiteKeyOffset(key.midi, startMidi) * 36 - 12}px`,
                  }}
                >
                  {showKeyLabels && key.keyLabel && (
                    <span className="text-[8px] font-mono font-bold text-neutral-400 bg-neutral-900/90 px-1 rounded">
                      {key.keyLabel}
                    </span>
                  )}
                </div>
              );
            }

            return (
              <div
                key={key.midi}
                onPointerDown={(e) => {
                  e.preventDefault();
                  onNoteOn(key.midi, 100);
                }}
                onPointerUp={() => onNoteOff(key.midi)}
                onPointerLeave={() => {
                  if (isActive) onNoteOff(key.midi);
                }}
                className={`relative flex-1 min-w-[34px] max-w-[40px] h-full rounded-b-[5px] border-r border-b border-l border-neutral-300 cursor-pointer transition-all flex flex-col justify-end items-center pb-2 select-none shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_2px_4px_rgba(0,0,0,0.4)] ${
                  isActive
                    ? 'bg-gradient-to-b from-cyan-100 to-cyan-300 translate-y-1 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]'
                    : 'bg-gradient-to-b from-[#ffffff] via-[#f7f7f9] to-[#ececf0] hover:brightness-95'
                }`}
              >
                {showKeyLabels && (
                  <div className="flex flex-col items-center">
                    {key.keyLabel && (
                      <span className="text-[9px] font-mono font-bold text-neutral-800 bg-neutral-200/80 px-1 rounded shadow-sm mb-0.5">
                        {key.keyLabel}
                      </span>
                    )}
                    <span className="text-[8px] font-sans font-semibold text-neutral-400">
                      {key.name}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Helper to determine white key index for positioning black keys
function getWhiteKeyOffset(midiNote: number, startMidi: number): number {
  let whiteCount = 0;
  for (let n = startMidi; n < midiNote; n++) {
    const inOct = n % 12;
    if (![1, 3, 6, 8, 10].includes(inOct)) {
      whiteCount++;
    }
  }
  return whiteCount;
}
