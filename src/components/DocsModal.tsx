/**
 * Documentation & Technical Guide Modal
 * Details:
 * - Synthesis Architecture
 * - Layer Effects Chain & Routing
 * - Nord Formats Technical Specifications (.npno, .nsmp, .nsmp3, .nsmp4)
 * - SoundFont 2 Architecture
 * - MIDI & Keyboard Controls
 */

import React from 'react';

interface DocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DocsModal: React.FC<DocsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#171a22] border border-neutral-700 w-full max-w-4xl max-h-[85vh] rounded-lg shadow-2xl flex flex-col text-neutral-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-[#12141a]">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-red-600 shadow-[0_0_8px_#dc2626]" />
            <h2 className="text-base font-bold text-white tracking-wide uppercase">
              Manual de Operação & Arquitetura DSP (Nord Stage 4)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-neutral-300 leading-relaxed">
          {/* Section 1: Overview */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider">
              1. Visão Geral da Arquitetura do Sintetizador
            </h3>
            <p>
              Este instrumento virtual reproduz fielmente a arquitetura de síntese sonora e o painel de controle do <strong>Nord Stage 4</strong>, combinando geração analógica multi-oscilador (Saw, SuperSaw detunada, Pulse, Square, Sine, Sub e Ruído) e reprodução de samples polifônicos (SoundFont 2 e modelos de instrumentos de palco como White Grand Piano e Órgão B3 com simulação de Leslie/Rotary).
            </p>
          </section>

          {/* Section 2: Motor de Áudio & Controles */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider">
              2. Knobs, Faders e Interatividade Real
            </h3>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Arrastar verticalmente:</strong> altera o valor suavemente.</li>
              <li><strong>Tecla Shift:</strong> ativa o ajuste fino (resolução micrométrica).</li>
              <li><strong>Duplo clique em qualquer knob:</strong> restaura instantaneamente o valor padrão de fábrica.</li>
              <li><strong>Faders com escada LED:</strong> os 3 faders das Camadas A, B e C controlam os níveis individuais com medição em tempo real e botões ON/OFF dedicados.</li>
            </ul>
          </section>

          {/* Section 3: Especificações Técnicas dos Formatos */}
          <section className="space-y-3 bg-[#111318] p-4 rounded-lg border border-neutral-800">
            <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">
              3. Relatório Técnico dos Formatos de Arquivos
            </h3>

            <div className="space-y-3">
              <div>
                <h4 className="font-bold text-white text-xs">SoundFont 2 (.sf2) — Suporte Nativo Completo:</h4>
                <p className="text-neutral-400">
                  O motor inclui um decodificador binário RIFF sfbk em TypeScript puro, que analisa os chunks INFO, sdta (amostras PCM lineares de 16 bits) e pdta (estruturas phdr, pgen, shdr). As amostras são descompactadas diretamente em AudioBuffers de 32 bits no Web Audio API, mapeadas por zonas e tocadas polifonicamente com controle total de envelope e filtro.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white text-xs">Formatos Clavia Nord (.npno, .nsmp, .nsmp3, .nsmp4):</h4>
                <p className="text-neutral-400">
                  A Clavia DMI AB utiliza formatos binários proprietários codificados para os processadores DSP de hardware da série Nord (Freescale DSP56300 e Analog Devices SHARC):
                </p>
                <ul className="list-disc list-inside mt-1 text-neutral-400 space-y-1">
                  <li><strong>.npno:</strong> Nord Piano Library (v5/v6) com múltiplas camadas de velocidade, dados de ressonância simpática de cordas e ruído de pedal acústico. Possui tabelas de amostras criptografadas.</li>
                  <li><strong>.nsmp / .nsmp3 / .nsmp4:</strong> Nord Sample Library (versões 2, 3 e 4). O formato .nsmp4 foi introduzido no Nord Stage 4 e Wave 2, contendo suporte a multi-camadas de velocidade e round-robin com compressão proprietária de dicionário.</li>
                  <li><strong>Status no sintetizador:</strong> O analisador binário integrado inspeciona e documenta a integridade de qualquer arquivo Nord importado, identificando sua família e cabeçalhos. Para reprodução sonora direta no navegador sem dependências proprietárias fechadas, o sintetizador utiliza o banco nativo multi-harmônico e aceita SoundFonts 2 (.sf2) padronizados.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 4: Cadeia de Efeitos DSP */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider">
              4. Cadeia de Efeitos em Tempo Real (Layer Effects)
            </h3>
            <p>
              Todo o som sintetizado ou amostrado passa por uma cadeia completa de efeitos em tempo real:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>MOD 1:</strong> Auto-Pan estéreo, Tremolo, Ring Modulator, Auto-Wah dinâmico e Pump.</li>
              <li><strong>MOD 2:</strong> Chorus estéreo com LFO desfasado a 180°, Flanger, Phaser, Vibrato e simulação de alto-falante giratório (Rotary Spin).</li>
              <li><strong>AMP SIM / EQ:</strong> Saturação valvulada por waveshaping e equalizador paramétrico de 3 bandas com frequência média varredura contínua de 200 Hz a 8.000 Hz.</li>
              <li><strong>DELAY:</strong> Delay estéreo cruzado Ping-Pong com amortecimento analógico (filtro passa-baixa no circuito de feedback) e sincronização rítmica.</li>
              <li><strong>COMPRESSOR:</strong> Compressor de dinâmica transparente com modos Fast e Dark.</li>
              <li><strong>REVERB:</strong> Reverberação algorítmica realista com 6 salas (Room, Stage, Hall, Booth, Spring com ringing mecânico, Cathedral) e difusão Chorale.</li>
            </ul>
          </section>

          {/* Section 5: Teclado & MIDI */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider">
              5. Teclado Virtual, Atalhos e Suporte a Web MIDI
            </h3>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Teclado de computador:</strong> Linha inferior (Z, S, X, D, C, V, G, B, H, N, J, M) toca a oitava base; linha superior (Q, 2, W, 3, E, R, 5, T, 6, Y, 7, U) toca a oitava seguinte.</li>
              <li><strong>Barra de espaço:</strong> ativa ou desativa o Pedal de Sustain.</li>
              <li><strong>Pitch Stick de madeira:</strong> arraste horizontalmente para curvar a afinação com retorno por mola.</li>
              <li><strong>Roda de Modulação (Stone Wheel):</strong> arraste verticalmente para abrir o filtro ou adicionar modulação vibrato.</li>
              <li><strong>Web MIDI:</strong> conecte qualquer teclado controlador USB ao seu computador e ele será detectado automaticamente.</li>
            </ul>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-800 bg-[#12141a] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold rounded text-xs transition-colors"
          >
            Fechar Manual
          </button>
        </div>
      </div>
    </div>
  );
};
