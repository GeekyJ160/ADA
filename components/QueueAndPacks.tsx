
import React from 'react';
import { Pack, PackStatus } from '../types';

interface PackCardProps {
  pack: Pack;
  onToggle: (packId: string) => void;
}

const PackCard: React.FC<PackCardProps> = ({ pack, onToggle }) => {
  const isLive = pack.status === 'on';

  return (
    <div 
      onClick={() => onToggle(pack.id)}
      className="p-4 bg-gray-800/50 rounded-xl text-center shadow-lg transition-all duration-300 ease-in-out cursor-pointer hover:-translate-y-1 hover:shadow-sky-500/20"
    >
      <div className="w-10 h-10 rounded-full bg-sky-500 mx-auto mb-2 flex items-center justify-center font-bold text-lg">
        {pack.avatar}
      </div>
      <div className="font-semibold text-sm">{pack.name}</div>
      <div className="text-xs text-gray-400 mt-1 flex items-center justify-center">
        Status: 
        <span className={`inline-block w-2.5 h-2.5 rounded-full ml-2 ${isLive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
        <span className="ml-1">{isLive ? 'On' : 'Off'}</span>
      </div>
    </div>
  );
};


interface QueueAndPacksProps {
  packs: Pack[];
  onTogglePack: (packId: string) => void;
}

const QueueAndPacks: React.FC<QueueAndPacksProps> = ({ packs, onTogglePack }) => {
  return (
    <section className="p-4 bg-[#1a1a2e] rounded-2xl border border-gray-700/50">
      <h2 className="text-lg font-semibold text-sky-300 border-b border-gray-700/50 pb-2 mb-4">🎛️ Queue & Packs</h2>
      <div className="grid grid-cols-3 gap-3">
        {packs.map(pack => (
          <PackCard key={pack.id} pack={pack} onToggle={onTogglePack} />
        ))}
      </div>
    </section>
  );
};

export default QueueAndPacks;
