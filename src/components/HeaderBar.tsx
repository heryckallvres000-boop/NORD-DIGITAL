/**
 * Synthesizer Header Navigation Bar
 * Follows the 3-zone contract:
 * Zone 1: Brand title, Fullscreen Toggle, and Keyboard Layout Hide/Show toggle
 * Zone 2: Navigation / view switches (Hardware vs Responsive vs Effects, Zoom, Presets, Files, Manual)
 * Zone 3: Primary audio engine / Panic button
 */

import React, { useEffect, useState } from 'react';
import { Maximize2, Minimize2, Laptop, Keyboard } from 'lucide-react';

export type ViewMode = 'hardware' | 'effects_focus' | 'responsive';

interface HeaderBarProps {
  viewMode: ViewMode;
  zoomLevel: number;
  midiDevice: string | null;
  isKeyboardVisible: boolean;
  onToggleKeyboard: () => void;
  onSetViewMode: (mode: ViewMode) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onOpenPresets: () => void;
  onOpenFiles: () => void;
  onOpenDocs: () => void;
  onPanic: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  viewMode,
  zoomLevel,
  midiDevice,
  isKeyboardVisible,
  onToggleKeyboard,
  onSetViewMode,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onOpenPresets,
  onOpenFiles,
  onOpenDocs,
  onPanic,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Monitor browser fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.warn('Fullscreen request failed:', err);
    }
  };

  return (
    <header className="flex items-center justify-between gap-3 px-3 sm:px-4 py-2 bg-[#0d0f14] border-b border-neutral-800 text-neutral-300 text-xs select-none">
      {/* Zone 1: Brand title, Fullscreen & Hide Keyboard toggles */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-600 shadow-[0_0_8px_#ef4444]" />
          <span className="text-sm font-black tracking-wider text-white uppercase whitespace-nowrap hidden sm:inline">
            Nord Stage 4
          </span>
        </div>

        {/* 1-Click Toggle to Hide/Show Keyboard and Maximize Console */}
        <button
          type="button"
          onClick={onToggleKeyboard}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold transition-all border ${
            !isKeyboardVisible
              ? 'bg-amber-950/80 text-amber-200 border-amber-600 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
              : 'bg-[#181d26] text-neutral-200 border-[#3b4554] hover:bg-[#242b36] hover:text-white'
          }`}
          title={
            isKeyboardVisible
              ? 'Ocultar teclado e expandir o console para tela cheia'
              : 'Mostrar layout do teclado e controles'
          }
        >
          <Keyboard className={`w-3.5 h-3.5 ${!isKeyboardVisible ? 'text-amber-400' : 'text-cyan-400'}`} />
          <span className="font-semibold">
            {isKeyboardVisible ? 'Ocultar Teclado (Tela Cheia)' : 'Mostrar Teclado'}
          </span>
        </button>

        {/* 1-Click Native Fullscreen Button */}
        <button
          type="button"
          onClick={toggleFullscreen}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold transition-all border ${
            isFullscreen
              ? 'bg-red-950/80 text-red-200 border-red-700 hover:bg-red-900'
              : 'bg-[#181d26] text-neutral-200 border-[#3b4554] hover:bg-[#242b36] hover:text-white'
          }`}
          title={isFullscreen ? 'Sair do Modo Tela Cheia' : 'Expandir para Tela Cheia do Navegador'}
        >
          {isFullscreen ? (
            <>
              <Minimize2 className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden md:inline">Sair Fullscreen</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">Tela Cheia</span>
            </>
          )}
        </button>
      </div>

      {/* Zone 2: Nav actions & View controls */}
      <nav className="flex items-center gap-2 overflow-x-auto whitespace-nowrap">
        {/* View Mode Segmented Controls */}
        <div className="flex items-center bg-[#14171f] p-0.5 rounded border border-neutral-800">
          <button
            onClick={() => onSetViewMode('hardware')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition-all ${
              viewMode === 'hardware'
                ? 'bg-red-700 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Laptop className="w-3 h-3" />
            <span>Console Completo</span>
          </button>
          <button
            onClick={() => onSetViewMode('effects_focus')}
            className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
              viewMode === 'effects_focus'
                ? 'bg-red-700 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Layer Effects 1:1
          </button>
          <button
            onClick={() => onSetViewMode('responsive')}
            className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
              viewMode === 'responsive'
                ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Responsivo
          </button>
        </div>

        {/* Zoom Controls for Hardware view */}
        {viewMode === 'hardware' && (
          <div className="flex items-center gap-1 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800 text-[11px]">
            <span className="text-[10px] text-neutral-400 uppercase font-semibold mr-0.5 hidden lg:inline">
              Zoom:
            </span>
            <button
              onClick={onZoomOut}
              className="px-1.5 hover:text-white font-bold"
              title="Zoom out"
            >
              -
            </button>
            <span className="font-mono text-cyan-400 text-[10px]">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={onZoomIn}
              className="px-1.5 hover:text-white font-bold"
              title="Zoom in"
            >
              +
            </button>
            <button
              onClick={onResetZoom}
              className="ml-1 px-1 text-[9px] text-neutral-300 hover:text-white border-l border-neutral-700 pl-1.5 font-bold"
              title="Ajustar automaticamente à tela"
            >
              Ajustar
            </button>
          </div>
        )}

        {/* Presets Modal trigger */}
        <button
          onClick={onOpenPresets}
          className="px-3 py-1 rounded text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
        >
          Presets
        </button>

        {/* Files Modal trigger */}
        <button
          onClick={onOpenFiles}
          className="px-3 py-1 rounded text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
        >
          Arquivos (SF2 / Nord)
        </button>

        {/* Documentation / Help */}
        <button
          onClick={onOpenDocs}
          className="px-3 py-1 rounded text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
        >
          Manual DSP
        </button>

        {/* Standalone HTML File Link */}
        <a
          href="/layer-effects.html"
          target="_blank"
          rel="noopener noreferrer"
          download="nord-layer-effects.html"
          className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold text-amber-300 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-600/60 shadow-sm transition-colors"
          title="Abrir ou baixar arquivo HTML único e autônomo do Layer Effects com áudio e controles embutidos"
        >
          <span>📥 Baixar HTML Único</span>
        </a>

        {/* MIDI status indicator */}
        <div className="hidden xl:flex items-center gap-1.5 text-[10px] text-neutral-400 font-mono bg-neutral-900/60 px-2.5 py-1 rounded border border-neutral-800">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              midiDevice ? 'bg-emerald-400 shadow-[0_0_4px_#34d399]' : 'bg-neutral-600'
            }`}
          />
          <span className="truncate max-w-[120px]">
            {midiDevice ? `MIDI: ${midiDevice}` : 'MIDI Pronto'}
          </span>
        </div>
      </nav>

      {/* Zone 3: Primary Action (Panic button) */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onPanic}
          className="px-3.5 py-1 rounded text-xs font-bold text-white bg-red-700 hover:bg-red-600 border border-red-500/80 shadow-[0_0_10px_rgba(220,38,38,0.3)] transition-all active:scale-95"
        >
          PANIC (Cortar Áudio)
        </button>
      </div>
    </header>
  );
};
