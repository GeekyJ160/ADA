
import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  analyser: AnalyserNode | null;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ analyser }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!analyser || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let animationId: number;

    const draw = () => {
      animationId = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Bar settings
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height;

        // Gradient or Color based on height
        // Sky-400 is roughly 56, 189, 248
        const r = 56; 
        const g = 189 + (barHeight / canvas.height) * 60; 
        const b = 248;

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.8)`;
        
        // Round top of bars slightly
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [analyser]);

  if (!analyser) return <div className="h-full w-full flex items-center justify-center text-gray-600 text-xs italic">Audio Engine Standby</div>;

  return <canvas ref={canvasRef} width={300} height={80} className="w-full h-full" />;
};

export default AudioVisualizer;
