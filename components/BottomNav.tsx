
import React from 'react';

interface BottomNavProps {
  currentView: 'studio' | 'voices';
  onNavigate: (view: 'studio' | 'voices') => void;
}

const NavButton: React.FC<{ children: React.ReactNode; active?: boolean; onClick: () => void; label: string }> = ({ children, active, onClick, label }) => {
  const activeClasses = "bg-sky-500 text-white scale-110 shadow-[0_0_10px_rgba(14,165,233,0.5)]";
  const inactiveClasses = "bg-gray-800 text-gray-400 hover:bg-gray-700";
  return (
    <button 
      onClick={onClick}
      className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all duration-300 ease-in-out ${active ? activeClasses : inactiveClasses}`}
      title={label}
    >
      {children}
    </button>
  );
};

const BottomNav: React.FC<BottomNavProps> = ({ currentView, onNavigate }) => {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4 bg-black/60 p-2.5 rounded-full backdrop-blur-md border border-gray-800 shadow-xl z-50">
      <NavButton 
        active={currentView === 'studio'} 
        onClick={() => onNavigate('studio')}
        label="Dubbing Studio"
      >
        🎙️
      </NavButton>
      <NavButton 
        active={currentView === 'voices'} 
        onClick={() => onNavigate('voices')}
        label="Assets Manager"
      >
        📁
      </NavButton>
    </div>
  );
};

export default BottomNav;
