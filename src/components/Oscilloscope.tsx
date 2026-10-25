/**
 * Live Master Audio Oscilloscope & Frequency Spectrum Visualizer
 */

import React, { useRef, useEffect } from 'react';

interface OscilloscopeProps {
  analyzerNode: AnalyserNode | null;
  width?: number;
  height?: number;
}

export const Oscilloscope: React.FC<OscilloscopeProps> = ({
  analyzerNode,
  width = 160,
  height = 40,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyzerNode ? analyzerNode.frequencyBinCount : 256;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animationFrameId.current = requestAnimationFrame(render);

      ctx.fillStyle = '#0a0c10';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw subtle grid
      ctx.strokeStyle = '#151922';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();

      if (analyzerNode) {
        analyzerNode.getByteTimeDomainData(dataArray);
      } else {
        // Idle line
        for (let i = 0; i < bufferLength; i++) dataArray[i] = 128;
      }

      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#38bdf8';
      ctx.shadowBlur = 4;
      ctx.shadowColor = '#0284c7';
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    render();

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [analyzerNode]);

  return (
    <div className="relative rounded overflow-hidden border border-neutral-800 shadow-inner">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full h-full block"
      />
      <div className="absolute top-0.5 left-1 text-[7px] font-mono text-cyan-400/80 pointer-events-none uppercase">
        OUTPUT SCOPE
      </div>
    </div>
  );
};
