
import React from 'react';

interface PhoneFrameProps {
  children: React.ReactNode;
}

const PhoneFrame: React.FC<PhoneFrameProps> = ({ children }) => {
  return (
    <div className="w-full max-w-sm mx-auto bg-black rounded-[40px] p-2.5 shadow-2xl shadow-sky-900/50 border-2 border-gray-800 relative h-[812px]">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-7 bg-black rounded-b-2xl z-10"></div>
      <div className="h-full w-full rounded-[30px] bg-[#0a0a0a] overflow-hidden relative">
        {children}
      </div>
    </div>
  );
};

export default PhoneFrame;
