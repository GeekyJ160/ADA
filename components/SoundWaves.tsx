
import React from 'react';

const SoundWaves: React.FC = () => {
  return (
    <div className="flex justify-center items-center h-10">
      <div className="w-1 h-3 bg-sky-400 rounded-full mx-0.5 animate-pulse" style={{ animationDelay: '0s' }}></div>
      <div className="w-1 h-5 bg-sky-400 rounded-full mx-0.5 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
      <div className="w-1 h-3 bg-sky-400 rounded-full mx-0.5 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
    </div>
  );
};

export default SoundWaves;
