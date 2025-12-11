import React from 'react';
import { InputMode, Character, VoicePreset } from '../types';

interface VoiceOption {
  id: string;
  name: string;
}

interface DubbingControlsProps {
  onStart: () => void;
  onStop: () => void;
  isDubbingActive: boolean;
  voices: VoiceOption[];
  selectedVoiceId: string;
  onVoiceChange: (id: string) => void;
  targetLang: string;
  onTargetLangChange: (lang: string) => void;
  inputMode: InputMode;
  onInputModeChange: (mode: InputMode) => void;
  onAutoDetect: () => void;
  characters: Character[];
  onAddCharacter: (char: Character) => void;
  onRemoveCharacter: (id: string) => void;
  presets: VoicePreset[];
}

const LANGUAGES = [
  { code: 'original', name: 'Original (No Translation)' },
  { code: 'English', name: 'English 🇺🇸' },
  { code: 'Spanish', name: 'Spanish 🇪🇸' },
  { code: 'French', name: 'French 🇫🇷' },
  { code: 'Japanese', name: 'Japanese 🇯🇵' },
  { code: 'German', name: 'German 🇩🇪' },
  { code: 'Chinese', name: 'Chinese 🇨🇳' },
  { code: 'Korean', name: 'Korean 🇰🇷' },
  { code: 'Italian', name: 'Italian 🇮🇹' },
  { code: 'Russian', name: 'Russian 🇷🇺' },
  { code: 'Hindi', name: 'Hindi 🇮🇳' },
  { code: 'Arabic', name: 'Arabic 🇸🇦' },
];

const DubbingControls: React.FC<DubbingControlsProps> = ({
  onStart,
  onStop,
  isDubbingActive,
  voices,
  selectedVoiceId,
  onVoiceChange,
  targetLang,
  onTargetLangChange,
  inputMode,
  onInputModeChange,
  onAutoDetect,
  characters,
  onAddCharacter,
  onRemoveCharacter,
  presets
}) => {
  return (
    <section className="p-4 bg-[#1a1a2e] rounded-2xl border border-gray-700/50 space-y-4 shadow-lg">
      <h2 className="text-lg font-semibold text-sky-300 border-b border-gray-700/50 pb-2">🎚️ Dubbing Studio</h2>
      
      {/* Mode Switcher */}
      <div className="bg-black/30 p-1 rounded-lg flex space-x-1 border border-gray-700/50">
        <button
            onClick={() => onInputModeChange('script')}
            disabled={isDubbingActive}
            className={`flex-1 py-2 text-xs font-bold uppercase rounded-md transition-all ${
                inputMode === 'script' 
                ? 'bg-sky-600 text-white shadow-md' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
        >
            📝 Script Dub
        </button>
        <button
            onClick={() => onInputModeChange('video')}
            disabled={isDubbingActive}
            className={`flex-1 py-2 text-xs font-bold uppercase rounded-md transition-all ${
                inputMode === 'video' 
                ? 'bg-green-600 text-white shadow-md' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
        >
            🎥 Live Video
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
         {/* Translation Selector */}
         <div className="bg-black/20 p-3 rounded-lg border border-gray-700/30 relative">
          <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold text-sky-500 uppercase tracking-wider">
                {inputMode === 'video' ? 'Translate Audio To' : 'Translate Script To'}
              </label>
              <button 
                onClick={onAutoDetect}
                disabled={isDubbingActive}
                className="text-[10px] bg-sky-500/20 hover:bg-sky-500/40 text-sky-300 px-2 py-1 rounded border border-sky-500/30 transition-all flex items-center gap-1"
                title="Auto-detect source language and set target"
              >
                ✨ Auto-Detect
              </button>
          </div>
          <select 
            className="w-full bg-gray-800 text-white p-2.5 rounded-md text-sm border border-gray-600 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none"
            value={targetLang}
            onChange={(e) => onTargetLangChange(e.target.value)}
            disabled={isDubbingActive}
          >
            {LANGUAGES.map(lang => (
              <option key={lang.code} value={lang.code}>{lang.name}</option>
            ))}
          </select>
        </div>

        {/* Voice Selector */}
        <div className="bg-black/20 p-3 rounded-lg border border-gray-700/30">
          <label className="text-xs font-bold text-purple-400 uppercase mb-2 block tracking-wider">Select Voice Actor (Gemini)</label>
          <select 
            className="w-full bg-gray-800 text-white p-2.5 rounded-md text-sm border border-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
            value={selectedVoiceId}
            onChange={(e) => onVoiceChange(e.target.value)}
            disabled={isDubbingActive}
          >
            {voices.map((voice) => (
              <option key={voice.id} value={voice.id}>
                {voice.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      <button
        onClick={isDubbingActive ? onStop : onStart}
        className={`w-full font-bold py-3 px-5 rounded-xl transition-all duration-300 ease-in-out flex items-center justify-center gap-2
          ${isDubbingActive 
            ? 'bg-red-500/80 hover:bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]' 
            : inputMode === 'video' 
                ? 'bg-gradient-to-r from-green-500 to-teal-600 text-white hover:shadow-[0_0_20px_rgba(34,197,94,0.4)]'
                : 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white hover:shadow-[0_0_20px_rgba(14,165,233,0.4)]'
          } hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none`}
      >
        {isDubbingActive ? (
          <>⏹ Stop Dubbing</>
        ) : (
          inputMode === 'video' ? <>🎙️ Start Live Translate</> : <>▶ Start Dubbing</>
        )}
      </button>
      
      {inputMode === 'video' && (
          <p className="text-xs text-center text-gray-400 animate-pulse">
            *Captures video audio & translates in real-time
          </p>
      )}
    </section>
  );
};

export default DubbingControls;