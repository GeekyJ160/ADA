
import React from 'react';

const NavButton: React.FC<{ children: React.ReactNode; active?: boolean }> = ({ children, active }) => {
  const activeClasses = "bg-sky-500 scale-110";
  const inactiveClasses = "bg-gray-700/50";
  return (
    <button className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all duration-300 ease-in-out ${active ? activeClasses : inactiveClasses}`}>
      {children}
    </button>
  );
};

const BottomNav: React.FC = () => {
  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-3 bg-black/50 p-2 rounded-full backdrop-blur-sm">
      <NavButton active>🏠</NavButton>
      <NavButton>⚙️</NavButton>
      <NavButton>❓</NavButton>
    </div>
  );
};

export default BottomNav;
