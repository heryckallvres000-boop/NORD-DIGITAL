/**
 * Preset Management Modal
 * Features:
 * - Save current settings as custom preset
 * - Browse and load presets
 * - Category filter (ALL, PIANO, ORGAN, SYNTH, PAD, LEAD, BASS, EP)
 * - Export presets to .json
 * - Import user preset banks
 * - Duplicate & delete user presets
 * - Restore factory presets
 */

import React, { useState } from 'react';
import { Preset, SynthParams } from '../types/synth';

interface PresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPreset: Preset;
  currentParams: SynthParams;
  presets: Preset[];
  onSelectPreset: (preset: Preset) => void;
  onSavePreset: (newPreset: Preset) => void;
  onDeletePreset: (presetId: string) => void;
  onRestoreFactoryPresets: () => void;
  onImportPresets: (importedPresets: Preset[]) => void;
}

export const PresetsModal: React.FC<PresetsModalProps> = ({
  isOpen,
  onClose,
  currentPreset,
  currentParams,
  presets,
  onSelectPreset,
  onSavePreset,
  onDeletePreset,
  onRestoreFactoryPresets,
  onImportPresets,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [newPresetName, setNewPresetName] = useState<string>('');
  const [newPresetBank, setNewPresetBank] = useState<string>('U:01');
  const [newCategory, setNewCategory] = useState<Preset['category']>('SYNTH');
  const [isSavingNew, setIsSavingNew] = useState<boolean>(false);

  if (!isOpen) return null;

  const categories: Preset['category'][] = ['ALL', 'PIANO', 'ORGAN', 'SYNTH', 'PAD', 'LEAD', 'BASS', 'EP'];

  const filteredPresets = presets.filter(p => {
    const matchesCategory = filterCategory === 'ALL' || p.category === filterCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.bank.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSaveCurrent = () => {
    if (!newPresetName.trim()) return;

    const newPreset: Preset = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      bank: newPresetBank.trim() || 'U:01',
      name: newPresetName.trim(),
      category: newCategory,
      layerA_desc: 'Custom Layer A',
      layerB_desc: 'Custom Layer B',
      layerC_desc: 'Custom Layer C',
      isUserPreset: true,
      params: { ...currentParams },
    };

    onSavePreset(newPreset);
    setIsSavingNew(false);
    setNewPresetName('');
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(presets, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `Nord_Stage_4_Presets_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) {
          onImportPresets(imported);
        }
      } catch (err) {
        alert('Falha ao importar arquivo JSON de presets.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#171a22] border border-neutral-700 w-full max-w-3xl max-h-[85vh] rounded-lg shadow-2xl flex flex-col text-neutral-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-[#12141a]">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-red-600 shadow-[0_0_8px_#dc2626]" />
            <div>
              <h2 className="text-base font-bold text-white tracking-wide uppercase">
                Gerenciador de Presets & Programas
              </h2>
              <p className="text-xs text-neutral-400">
                Preset Atual: <strong className="text-cyan-400">{currentPreset.bank} - {currentPreset.name}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Toolbar: Category tabs, Search, Save New, Export */}
        <div className="p-4 border-b border-neutral-800 space-y-3 bg-[#15171f]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Search Input */}
            <input
              type="text"
              placeholder="Buscar preset ou banco..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 rounded bg-neutral-900 border border-neutral-700 text-xs text-neutral-200 focus:outline-none focus:border-cyan-500 w-56"
            />

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsSavingNew(!isSavingNew)}
                className="px-3 py-1.5 rounded text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow transition-all"
              >
                {isSavingNew ? 'Cancelar' : '+ Salvar Preset Atual'}
              </button>

              <button
                onClick={handleExportJson}
                className="px-3 py-1.5 rounded text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700"
              >
                Exportar JSON
              </button>

              <label className="px-3 py-1.5 rounded text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 cursor-pointer">
                Importar JSON
                <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
              </label>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                  filterCategory === cat
                    ? 'bg-neutral-200 text-neutral-900 shadow-sm'
                    : 'bg-neutral-900/60 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Save New Preset Form */}
          {isSavingNew && (
            <div className="p-3 bg-neutral-900 rounded border border-neutral-700 flex flex-wrap items-center gap-3">
              <input
                type="text"
                placeholder="Banco (ex: U:01)"
                value={newPresetBank}
                onChange={(e) => setNewPresetBank(e.target.value)}
                className="w-24 px-2 py-1 rounded bg-black border border-neutral-700 text-xs text-neutral-200"
              />
              <input
                type="text"
                placeholder="Nome do Preset"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                className="flex-1 min-w-[150px] px-2 py-1 rounded bg-black border border-neutral-700 text-xs text-neutral-200"
              />
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
                className="px-2 py-1 rounded bg-black border border-neutral-700 text-xs text-neutral-200"
              >
                {categories.filter(c => c !== 'ALL').map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <button
                onClick={handleSaveCurrent}
                className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
              >
                Confirmar
              </button>
            </div>
          )}
        </div>

        {/* Preset List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredPresets.map((preset) => {
            const isSelected = preset.id === currentPreset.id;
            return (
              <div
                key={preset.id}
                onClick={() => {
                  onSelectPreset(preset);
                  onClose();
                }}
                className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-neutral-800 border-red-500/80 shadow-md'
                    : 'bg-[#1b1e26] border-neutral-800 hover:border-neutral-700 hover:bg-[#20242e]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-neutral-900 text-cyan-300 border border-neutral-700">
                    {preset.bank}
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      {preset.name}
                      {preset.isUserPreset && (
                        <span className="text-[9px] uppercase bg-amber-950 text-amber-300 px-1 rounded border border-amber-800">
                          User
                        </span>
                      )}
                    </h4>
                    <span className="text-xs text-neutral-400">
                      {preset.layerA_desc} · {preset.layerB_desc} · {preset.layerC_desc}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <span className="text-[10px] uppercase font-semibold text-neutral-400 bg-neutral-900 px-2 py-0.5 rounded">
                    {preset.category}
                  </span>

                  {preset.isUserPreset && (
                    <button
                      onClick={() => onDeletePreset(preset.id)}
                      className="p-1 text-neutral-500 hover:text-red-400"
                      title="Excluir"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-800 bg-[#12141a] flex items-center justify-between text-xs">
          <button
            onClick={onRestoreFactoryPresets}
            className="text-neutral-400 hover:text-red-400 underline"
          >
            Restaurar Presets de Fábrica
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold rounded transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
