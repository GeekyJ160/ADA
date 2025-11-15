
import React from 'react';
import { DubbingStatus } from '../types';

interface VideoPlayerProps {
  status: DubbingStatus;
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

const VideoPlayer: React.FC<VideoPlayerProps> = ({ status }) => {
  const statusTextMap: Record<DubbingStatus, string> = {
    off: 'DUB OFF',
    processing: 'Processing...',
    live: 'DUB LIVE'
  };

  return (
    <section className="p-4 bg-[#1a1a2e] rounded-2xl border border-gray-700/50">
      <h2 className="text-lg font-semibold text-sky-300 border-b border-gray-700/50 pb-2 mb-3">📺 Anime Player</h2>
      <div className="aspect-video bg-black rounded-lg mb-4 flex items-center justify-center">
        <video className="w-full h-full rounded-lg" controls src="https://picsum.photos/320/180.mp4" poster="https://picsum.photos/320/180">
          Your browser does not support the video tag.
        </video>
      </div>
      <div className="flex items-center font-semibold text-sm">
        <StatusIndicator status={status} />
        <span id="dubStatusText">{statusTextMap[status]}</span>
      </div>
    </section>
  );
};

export default VideoPlayer;
