
import React from 'react';
import SoundWaves from './SoundWaves';
import AudioVisualizer from './AudioVisualizer';

interface DubOutputProps {
  dubbedSegments: string[];
  isProcessing: boolean;
  activeAnalyser: AnalyserNode | null;
}

const DubOutput: React.FC<DubOutputProps> = ({ dubbedSegments, isProcessing, activeAnalyser }) => {
  return (
    <section className="p-4 bg-[#1a1a2e] rounded-2xl border border-gray-700/50">
      <h2 className="text-lg font-semibold text-sky-300 border-b border-gray-700/50 pb-2 mb-3">🔄 Real-time Dubbing</h2>
      
      {/* Visualizer Area */}
      <div className="bg-black/40 rounded-lg border border-gray-700/30 h-24 mb-3 overflow-hidden relative">
         {activeAnalyser ? (
             <AudioVisualizer analyser={activeAnalyser} />
         ) : isProcessing ? (
             <div className="h-full flex items-center justify-center">
                 <SoundWaves />
             </div>
         ) : (
            <div className="h-full flex items-center justify-center text-gray-600 text-xs uppercase tracking-widest">
                Waiting for audio...
            </div>
         )}
      </div>

      <div className="bg-sky-900/10 p-3 rounded-lg border-l-4 border-sky-400 min-h-[60px] max-h-[150px] overflow-y-auto scrollbar-thin scrollbar-thumb-sky-900">
        {dubbedSegments.length > 0 ? (
          <ul className="text-sm text-gray-300 space-y-2">
            {dubbedSegments.slice().reverse().map((segment, index) => (
              <li key={index} className="animate-[fadeIn_0.5s_ease] border-b border-gray-700/50 pb-1 last:border-0">
                {segment}
              </li>
            ))}
          </ul>
        ) : (
           <p className="text-sm text-gray-500 italic">History will appear here.</p>
        )}
      </div>
    </section>
  );
};

export default DubOutput;
