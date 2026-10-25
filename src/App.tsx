/**
 * Nord Stage 4 Virtual Synthesizer & SoundFont Workstation
 * Main Application Component
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SynthEngine } from './audio/SynthEngine';
import { DEFAULT_PRESETS } from './presets/defaultPresets';
import { Preset, SynthParams } from './types/synth';
import { HeaderBar, ViewMode } from './components/HeaderBar';
import { HardwarePanel } from './components/HardwarePanel';
import { LayerEffectsPanel } from './components/LayerEffects/LayerEffectsPanel';
import { PianoKeyboard } from './components/PianoKeyboard';
import { LibraryModal } from './components/LibraryModal';
import { PresetsModal } from './components/PresetsModal';
import { DocsModal } from './components/DocsModal';

export default function App() {
  const synthEngine = useRef<SynthEngine>(SynthEngine.getInstance()).current;

  // Presets & Parameters state
  const [presets, setPresets] = useState<Preset[]>(() => {
    try {
      const saved = localStorage.getItem('nord_stage4_presets');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_PRESETS;
  });

  const [currentPreset, setCurrentPreset] = useState<Preset>(() => presets[0] || DEFAULT_PRESETS[0]);
  const [params, setParams] = useState<SynthParams>(() => ({ ...currentPreset.params }));

  // UI & View state (Default to 'hardware' console mode auto-fitted to notebook screen)
  const [viewMode, setViewMode] = useState<ViewMode>('hardware');
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState<boolean>(true);
  const [activeNotes, setActiveNotes] = useState<number[]>([]);
  const [midiDevice, setMidiDevice] = useState<string | null>(null);
  const [isPlayingTest, setIsPlayingTest] = useState(false);

  // Modals state
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);
  const [isDocsOpen, setIsDocsOpen] = useState(false);

  // Sync parameters with SynthEngine
  useEffect(() => {
    synthEngine.setParams(params);
  }, [params, synthEngine]);

  // Subscribe to engine notes & MIDI
  useEffect(() => {
    const unsubNotes = synthEngine.onNotesChange((notes) => {
      setActiveNotes(notes);
    });

    const unsubMidi = synthEngine.onMidiStatusChange((device) => {
      setMidiDevice(device);
    });

    return () => {
      unsubNotes();
      unsubMidi();
    };
  }, [synthEngine]);

  // Save presets to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('nord_stage4_presets', JSON.stringify(presets));
    } catch {}
  }, [presets]);

  // Update partial parameters from any UI control
  const handleUpdateParams = useCallback((newParams: Partial<SynthParams>) => {
    setParams((prev) => {
      const updated = { ...prev, ...newParams };
      synthEngine.setParams(updated);
      return updated;
    });
  }, [synthEngine]);

  // Select Preset
  const handleSelectPreset = useCallback((preset: Preset) => {
    setCurrentPreset(preset);
    setParams({ ...preset.params });
    synthEngine.setParams(preset.params);
  }, [synthEngine]);

  // Save new user preset
  const handleSavePreset = (newPreset: Preset) => {
    setPresets((prev) => [newPreset, ...prev]);
    setCurrentPreset(newPreset);
  };

  // Delete user preset
  const handleDeletePreset = (id: string) => {
    setPresets((prev) => prev.filter((p) => p.id !== id));
    if (currentPreset.id === id) {
      handleSelectPreset(presets[0] || DEFAULT_PRESETS[0]);
    }
  };

  // Restore factory presets
  const handleRestoreFactoryPresets = () => {
    setPresets(DEFAULT_PRESETS);
    handleSelectPreset(DEFAULT_PRESETS[0]);
    localStorage.removeItem('nord_stage4_presets');
  };

  // Import presets
  const handleImportPresets = (imported: Preset[]) => {
    setPresets(imported);
    if (imported[0]) handleSelectPreset(imported[0]);
  };

  // Select instrument from library
  const handleSelectInstrumentFromLibrary = (sampleId: string, name: string) => {
    handleUpdateParams({
      mode: 'SAMPLES',
      selectedSampleId: sampleId,
      oscWaveform: 'sample',
      layerA_on: true,
      layerA_level: params.layerA_level > 0.1 ? params.layerA_level : 0.85,
    });
    // Update preset display name and layerA descriptor so OLED shows the new instrument
    setCurrentPreset((prev) => ({
      ...prev,
      name: name.slice(0, 22),
      layerA_desc: name.slice(0, 16),
    }));
  };

  // Panic: cut all audio
  const handlePanic = useCallback(() => {
    synthEngine.panic();
    setIsPlayingTest(false);
  }, [synthEngine]);

  const handleToggleTestSound = useCallback(() => {
    const active = synthEngine.toggleTestSound();
    setIsPlayingTest(active);
  }, [synthEngine]);

  return (
    <div className="flex flex-col min-h-screen bg-[#0b0c10] text-neutral-100 font-sans antialiased">
      {/* Top Bar Contract */}
      <HeaderBar
        viewMode={viewMode}
        zoomLevel={zoomLevel}
        midiDevice={midiDevice}
        isKeyboardVisible={isKeyboardVisible}
        onToggleKeyboard={() => setIsKeyboardVisible((prev) => !prev)}
        onSetViewMode={setViewMode}
        onZoomIn={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))}
        onZoomOut={() => setZoomLevel((z) => Math.max(0.65, z - 0.1))}
        onResetZoom={() => setZoomLevel(1.0)}
        onOpenPresets={() => setIsPresetsOpen(true)}
        onOpenFiles={() => setIsLibraryOpen(true)}
        onOpenDocs={() => setIsDocsOpen(true)}
        onPanic={handlePanic}
      />

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col justify-start overflow-x-hidden pb-2">
        {/* Hardware Synthesizer / Layer Effects Viewport */}
        <div className="w-full flex-1 flex items-center justify-center p-1 sm:p-2">
          {viewMode === 'effects_focus' ? (
            <div
              className="w-full flex justify-center transition-transform origin-top py-2"
              style={{
                transform: zoomLevel !== 1.0 ? `scale(${zoomLevel})` : undefined,
              }}
            >
              <LayerEffectsPanel
                params={params}
                onUpdateParams={handleUpdateParams}
                onTestSound={handleToggleTestSound}
                isPlayingTest={isPlayingTest}
              />
            </div>
          ) : (
            <HardwarePanel
              viewMode={viewMode === 'hardware' ? 'hardware' : 'responsive'}
              zoomLevel={zoomLevel}
              isKeyboardVisible={isKeyboardVisible}
              params={params}
              currentPreset={currentPreset}
              presets={presets}
              analyzerNode={synthEngine.getAnalyzerNode()}
              onUpdateParams={handleUpdateParams}
              onSelectPreset={handleSelectPreset}
              onOpenPresetManager={() => setIsPresetsOpen(true)}
              onOpenFileManager={() => setIsLibraryOpen(true)}
              onPanic={handlePanic}
            />
          )}
        </div>

        {/* Bottom Interactive Piano Keyboard & Controllers */}
        <div className={isKeyboardVisible ? 'w-full max-w-7xl mx-auto px-2 md:px-4 mt-auto' : 'hidden'}>
          <PianoKeyboard
            activeNotes={activeNotes}
            onNoteOn={(note, vel) => synthEngine.noteOn(note, vel)}
            onNoteOff={(note) => synthEngine.noteOff(note)}
            onPitchBend={(val) => synthEngine.setPitchBend(val)}
            onModWheel={(val) => synthEngine.setModWheel(val)}
            onSustainPedal={(isDown) => synthEngine.setSustainPedal(isDown)}
          />
        </div>

        {/* Discreet bottom floating bar when keyboard is hidden */}
        {!isKeyboardVisible && (
          <div className="flex items-center justify-center py-1 mt-auto">
            <button
              onClick={() => setIsKeyboardVisible(true)}
              className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#181d26]/90 hover:bg-[#252c38] text-neutral-300 hover:text-white text-xs border border-[#3b4554] shadow-lg transition-all active:scale-95"
              title="Mostrar layout do teclado e controles"
            >
              <span>🎹 Mostrar Teclado</span>
              <span className="text-[10px] text-cyan-400 font-mono hidden sm:inline">
                (Teclado do notebook / USB-MIDI ativos)
              </span>
            </button>
          </div>
        )}
      </main>

      {/* Modals */}
      <LibraryModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        onSelectInstrument={handleSelectInstrumentFromLibrary}
      />

      <PresetsModal
        isOpen={isPresetsOpen}
        onClose={() => setIsPresetsOpen(false)}
        currentPreset={currentPreset}
        currentParams={params}
        presets={presets}
        onSelectPreset={handleSelectPreset}
        onSavePreset={handleSavePreset}
        onDeletePreset={handleDeletePreset}
        onRestoreFactoryPresets={handleRestoreFactoryPresets}
        onImportPresets={handleImportPresets}
      />

      <DocsModal
        isOpen={isDocsOpen}
        onClose={() => setIsDocsOpen(false)}
      />
    </div>
  );
}
