
import React from 'react';
import SoundWaves from './SoundWaves';

interface DubOutputProps {
  dubbedSegments: string[];
  isProcessing: boolean;
}

const DubOutput: React.FC<DubOutputProps> = ({ dubbedSegments, isProcessing }) => {
  return (
    <section className="p-4 bg-[#1a1a2e] rounded-2xl border border-gray-700/50">
      <h2 className="text-lg font-semibold text-sky-300 border-b border-gray-700/50 pb-2 mb-3">🔄 Real-time Dubbing</h2>
      <div className="bg-sky-900/20 p-3 rounded-lg border-l-4 border-sky-400 min-h-[80px]">
        {isProcessing && <SoundWaves />}
        {dubbedSegments.length > 0 && (
          <ul className="text-sm text-gray-300 space-y-1">
            {dubbedSegments.map((segment, index) => (
              <li key={index} className="animate-[fadeIn_0.5s_ease]">
                {segment}
              </li>
            ))}
          </ul>
        )}
        {!isProcessing && dubbedSegments.length === 0 && (
           <p className="text-sm text-gray-400">Dubbed segments will appear here.</p>
        )}
      </div>
    </section>
  );
};

export default DubOutput;
