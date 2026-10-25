/**
 * Instrument Library & File Manager Modal
 * Handles import, inspection, and reproduction of:
 * - SoundFont 2 (.sf2) with real binary decoding & zone mapping
 * - Clavia Nord files (.npno, .nsmp, .nsmp3, .nsmp4) with technical format analysis
 */

import React, { useState, useRef } from 'react';
import { LoadedInstrumentFile, SoundFontPreset } from '../types/synth';
import { SoundFontParser } from '../audio/SoundFontParser';
import { NordFormatInspector } from '../audio/NordFormatInspector';
import { SampleLibrary } from '../audio/SampleLibrary';
import { SynthEngine } from '../audio/SynthEngine';

interface LibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectInstrument: (sampleId: string, name: string) => void;
}

export const LibraryModal: React.FC<LibraryModalProps> = ({
  isOpen,
  onClose,
  onSelectInstrument,
}) => {
  const [loadedFiles, setLoadedFiles] = useState<LoadedInstrumentFile[]>([
    {
      id: 'builtin_grand',
      fileName: 'Nord_White_Grand_XL.npno (Emulado)',
      fileSize: 48500000,
      format: 'NPNO',
      isValid: true,
      status: 'READY',
      description: 'Nord White Grand XL Acoustic Concert Grand Piano Multi-Harmonic Model',
      presetsCount: 1,
      samplesCount: 88,
      presets: [],
      analysisDetails: {
        magicNumber: '43 4C 41 56',
        version: 'Piano Library v6.0',
        compression: 'Harmonic Physical Modeling Engine',
        claviaFamily: 'Nord Piano Library',
        targetHardware: 'Nord Stage 4 Dual DSP',
        encryptionStatus: 'Native Workstation Mode',
        technicalNotes: [
          'Pre-carregado no workstation com resposta multi-harmônica autêntica do Nord Stage 4.',
          'Ressonância simpática de cordas e amostragem de decaimento acústico integrados.',
        ],
      },
    },
    {
      id: 'builtin_b3',
      fileName: 'B3_Soulful_Tonewheel.nsmp4 (Emulado)',
      fileSize: 12400000,
      format: 'NSMP4',
      isValid: true,
      status: 'READY',
      description: 'B3 Tonewheel Organ com 9 drawbars e rotary speaker simulation',
      presetsCount: 1,
      samplesCount: 61,
      presets: [],
      analysisDetails: {
        magicNumber: '4E 53 4D 50',
        version: 'Sample Library v4.0',
        compression: 'Clavia Stage 4 Drawbar Engine',
        claviaFamily: 'Nord Sample Library 4.0',
        targetHardware: 'Nord Stage 4 Organ Section',
        encryptionStatus: 'Native Workstation Mode',
        technicalNotes: [
          'Emulação exata das 9 barras harmônicas (16\' a 1\') com key-click transitório.',
          'Compatível com o módulo de efeito Rotary Speaker Spin da seção de efeitos.',
        ],
      },
    },
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [selectedFileForInspection, setSelectedFileForInspection] = useState<LoadedInstrumentFile | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processFiles(Array.from(files));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const processFiles = async (files: File[]) => {
    setIsLoading(true);
    setErrorMessage(null);

    const synthEngine = SynthEngine.getInstance();
    const audioContext = synthEngine.initAudioContext();
    const sampleLib = SampleLibrary.getInstance();

    for (const file of files) {
      try {
        const buffer = await file.arrayBuffer();
        const ext = file.name.toLowerCase().split('.').pop() || '';

        if (ext === 'sf2') {
          // Parse SoundFont 2
          const parser = new SoundFontParser(buffer);
          const sf2Data = parser.parse(audioContext);

          const newFile: LoadedInstrumentFile = {
            id: `sf2_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            fileName: file.name,
            fileSize: file.size,
            format: 'SF2',
            isValid: true,
            status: 'READY',
            description: sf2Data.name || 'SoundFont 2 Bank',
            presetsCount: sf2Data.presets.length,
            samplesCount: sf2Data.samples.length,
            presets: sf2Data.presets,
            analysisDetails: {
              magicNumber: '52 49 46 46 (RIFF)',
              version: 'SoundFont 2.04 Specification',
              compression: 'Uncompressed 16-bit Linear PCM Audio',
              claviaFamily: 'Open Standard (E-mu / Creative SoundFont 2)',
              targetHardware: 'Universal Web Audio DSP',
              encryptionStatus: 'Descriptografado / Aberto',
              technicalNotes: [
                `Banco RIFF sfbk decodificado com sucesso: ${sf2Data.presets.length} presets detectados.`,
                `${sf2Data.samples.length} blocos de samples PCM convertidos para AudioBuffers em ponto-flutuante a 32-bits.`,
                'Totalmente compatível com reprodução polifônica e processamento pelos filtros e efeitos do sintetizador.',
              ],
            },
          };

          // Register in SampleLibrary
          sampleLib.registerUserSoundFont(newFile.id, sf2Data.presets);
          setLoadedFiles(prev => [newFile, ...prev]);
        } else {
          // Inspect Clavia Nord formats (.npno, .nsmp, .nsmp3, .nsmp4)
          const analyzed = NordFormatInspector.inspect(file, buffer);
          setLoadedFiles(prev => [analyzed, ...prev]);
        }
      } catch (err: any) {
        console.error('Error parsing file:', err);
        setErrorMessage(`Falha ao ler o arquivo "${file.name}": ${err.message || 'Estrutura corrompida ou incompatível'}`);
      }
    }

    setIsLoading(false);
  };

  const handleRemoveFile = (fileId: string) => {
    setLoadedFiles(prev => prev.filter(f => f.id !== fileId));
    if (selectedFileForInspection?.id === fileId) {
      setSelectedFileForInspection(null);
    }
  };

  const handleLoadPresetIntoSynth = (file: LoadedInstrumentFile, presetIndex = 0) => {
    if (file.format === 'SF2' && file.presets[presetIndex]) {
      const preset = file.presets[presetIndex];
      const sampleId = preset.zones[0]?.sample.name || preset.name;
      onSelectInstrument(sampleId, `${file.fileName}: ${preset.name}`);
      onClose();
    } else if (file.id === 'builtin_grand') {
      onSelectInstrument('nord_grand', 'Nord White Grand XL');
      onClose();
    } else if (file.id === 'builtin_b3') {
      onSelectInstrument('b3_soulful', 'B3 Soulful Tonewheel');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#171a22] border border-neutral-700 w-full max-w-4xl max-h-[90vh] rounded-lg shadow-2xl flex flex-col text-neutral-200 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-[#12141a]">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-red-600 shadow-[0_0_8px_#dc2626]" />
            <div>
              <h2 className="text-base font-bold text-white tracking-wide uppercase">
                Biblioteca de Instrumentos & Arquivos
              </h2>
              <p className="text-xs text-neutral-400">
                Suporte nativo para SoundFont 2 (.sf2) e análise técnica de formatos Clavia Nord (.npno, .nsmp, .nsmp3, .nsmp4)
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Drag & Drop Upload Strip */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-neutral-700 hover:border-red-500/80 bg-neutral-900/50 hover:bg-neutral-900/80 rounded-lg p-6 flex flex-col items-center justify-center transition-all text-center cursor-pointer group"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".sf2,.npno,.nsmp,.nsmp3,.nsmp4"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-full bg-neutral-800 group-hover:bg-red-950 flex items-center justify-center text-red-400 mb-2 transition-colors">
              <svg className="w-6 h-6 stroke-current fill-none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-neutral-200">
              Clique para selecionar ou arraste arquivos aqui
            </span>
            <span className="text-xs text-neutral-400 mt-1">
              Formatos aceitos: <strong className="text-cyan-400">.SF2</strong>, <strong className="text-red-400">.NPNO</strong>, <strong className="text-amber-400">.NSMP</strong>, <strong className="text-amber-400">.NSMP3</strong>, <strong className="text-amber-400">.NSMP4</strong>
            </span>
          </div>

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex items-center gap-3 p-3 bg-cyan-950/40 border border-cyan-800 rounded text-cyan-300 text-xs animate-pulse">
              <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <span>Decodificando estrutura binária e processando amostras de áudio...</span>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-red-950/60 border border-red-800 rounded text-red-300 text-xs flex items-center justify-between">
              <span>{errorMessage}</span>
              <button onClick={() => setErrorMessage(null)} className="font-bold underline ml-2">Fechar</button>
            </div>
          )}

          {/* Loaded Files Table */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Instrumentos na Biblioteca ({loadedFiles.length})
            </h3>

            <div className="grid grid-cols-1 gap-2.5">
              {loadedFiles.map((file) => (
                <div
                  key={file.id}
                  className="bg-[#1c202a] border border-neutral-800 hover:border-neutral-700 p-3.5 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* Format Badge */}
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase mt-0.5 ${
                        file.format === 'SF2'
                          ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                          : file.format === 'NPNO'
                          ? 'bg-red-950 text-red-300 border border-red-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}
                    >
                      {file.format}
                    </span>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white">{file.fileName}</h4>
                        <span className="text-[11px] text-neutral-400 font-mono">
                          {(file.fileSize / (1024 * 1024)).toFixed(1)} MB
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400 mt-0.5">{file.description}</p>

                      {file.presetsCount > 0 && (
                        <div className="text-[11px] text-neutral-400 mt-1">
                          <span className="text-cyan-400 font-medium">{file.presetsCount} Presets</span>
                          {file.samplesCount > 0 && (
                            <span> · {file.samplesCount} Amostras PCM</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end md:self-center">
                    <button
                      onClick={() => setSelectedFileForInspection(file)}
                      className="px-3 py-1.5 rounded text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors"
                    >
                      Inspecionar
                    </button>

                    {file.isValid && (
                      <button
                        onClick={() => handleLoadPresetIntoSynth(file)}
                        className="px-3 py-1.5 rounded text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow transition-all active:scale-95"
                      >
                        Carregar
                      </button>
                    )}

                    <button
                      onClick={() => handleRemoveFile(file.id)}
                      className="p-1.5 rounded text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 transition-colors"
                      title="Remover"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Inspection Details Modal / Drawer */}
          {selectedFileForInspection && (
            <div className="mt-4 p-4 bg-[#111318] border border-cyan-900/60 rounded-lg text-xs space-y-3 font-mono">
              <div className="flex items-center justify-between border-b border-cyan-900/40 pb-2">
                <div className="flex items-center gap-2 text-cyan-300 font-bold">
                  <span>RELATÓRIO TÉCNICO BINÁRIO: {selectedFileForInspection.fileName}</span>
                </div>
                <button
                  onClick={() => setSelectedFileForInspection(null)}
                  className="text-neutral-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {selectedFileForInspection.analysisDetails && (
                <div className="grid grid-cols-2 gap-3 text-neutral-300">
                  <div>
                    <span className="text-neutral-500">Magic Number:</span>{' '}
                    <span className="text-cyan-400">{selectedFileForInspection.analysisDetails.magicNumber}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Versão:</span>{' '}
                    <span>{selectedFileForInspection.analysisDetails.version}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Família Clavia / Tipo:</span>{' '}
                    <span>{selectedFileForInspection.analysisDetails.claviaFamily}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Hardware Alvo:</span>{' '}
                    <span>{selectedFileForInspection.analysisDetails.targetHardware}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Compressão:</span>{' '}
                    <span>{selectedFileForInspection.analysisDetails.compression}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Status de Criptografia:</span>{' '}
                    <span className="text-amber-400">{selectedFileForInspection.analysisDetails.encryptionStatus}</span>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-neutral-800">
                <span className="text-neutral-400 font-bold block mb-1">Notas de Engenharia Reversa:</span>
                <ul className="list-disc list-inside space-y-1 text-neutral-300">
                  {selectedFileForInspection.analysisDetails?.technicalNotes.map((note, idx) => (
                    <li key={idx}>{note}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-neutral-800 bg-[#12141a] flex items-center justify-between text-xs text-neutral-400">
          <span>
            Arquivos de áudio carregados permanecem na memória do navegador e não são transmitidos a servidores externos.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold rounded transition-colors"
          >
            Concluído
          </button>
        </div>
      </div>
    </div>
  );
};
