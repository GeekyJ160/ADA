
import React, { forwardRef } from 'react';
import { DubbingStatus } from '../types';

interface VideoPlayerProps {
  status: DubbingStatus;
  currentSubtitle?: string;
}

const StatusIndicator: React.FC<{ status: DubbingStatus }> = ({ status }) => {
  const baseClasses = "status-indicator inline-block w-3 h-3 rounded-full mr-2";
  
  if (status === 'live') {
    return <span className={`${baseClasses} bg-green-500 animate-pulse`} />;
  }
  if (status === 'processing') {
    return <span className={`${baseClasses} bg-yellow-400 animate-spin`} />;
  }
  return <span className={`${baseClasses} bg-red-500`} />;
};

const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(({ status, currentSubtitle }, ref) => {
  const statusTextMap: Record<DubbingStatus, string> = {
    off: 'DUB OFF',
    processing: 'Connecting...',
    live: 'LIVE DUB'
  };

  return (
    <section className="p-4 bg-[#1a1a2e] rounded-2xl border border-gray-700/50 shadow-lg shadow-black/40 relative">
      <h2 className="text-lg font-semibold text-sky-300 border-b border-gray-700/50 pb-2 mb-3 flex justify-between items-center">
        <span>📺 Anime Player</span>
        <div className="flex items-center font-semibold text-xs bg-black/30 px-2 py-1 rounded-full">
          <StatusIndicator status={status} />
          <span id="dubStatusText">{statusTextMap[status]}</span>
        </div>
      </h2>
      
      <div className="aspect-video bg-black rounded-lg mb-1 relative group overflow-hidden border border-gray-800">
        <video 
          ref={ref}
          className="w-full h-full rounded-lg object-cover opacity-80" 
          muted={status === 'live'} // Auto-mute original audio when dubbing is live
          loop
          playsInline
          crossOrigin="anonymous"
          src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4" 
        >
          Your browser does not support the video tag.
        </video>
        
        {/* Loading/Translating Overlay */}
        {status === 'processing' && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-20 backdrop-blur-sm transition-all duration-300">
            <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-sky-400 font-semibold animate-pulse tracking-wide text-sm">INITIALIZING AI...</p>
            <p className="text-xs text-gray-400 mt-1">Connecting to Gemini Live</p>
          </div>
        )}

        {/* Subtitle Overlay */}
        <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 w-[90%] text-center transition-opacity duration-300 ${currentSubtitle && status !== 'processing' ? 'opacity-100' : 'opacity-0'}`}>
          <span className="bg-black/80 text-white px-4 py-2 rounded-lg text-sm md:text-base font-medium shadow-lg backdrop-blur-sm leading-relaxed border border-white/10 box-decoration-clone">
            {currentSubtitle}
          </span>
        </div>

        {/* Video Controls Overlay (Visual Only) */}
        <div className="absolute bottom-2 left-0 right-0 px-4 py-2 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="h-1 w-full bg-gray-600 rounded-full overflow-hidden">
            <div className="h-full w-1/3 bg-sky-500"></div>
          </div>
        </div>
      </div>
    </section>
  );
});

export default VideoPlayer;
