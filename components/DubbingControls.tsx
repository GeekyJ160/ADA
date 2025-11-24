
import React, { useMemo } from 'react';

interface DubbingControlsProps {
  onStart: () => void;
  onStop: () => void;
  isDubbingActive: boolean;
  voices: SpeechSynthesisVoice[];
  selectedVoiceURI: string | null;
  onVoiceChange: (uri: string) => void;
  targetLang: string;
  onTargetLangChange: (lang: string) => void;
  areVoicesLoading: boolean;
}

const LANGUAGES = [
  { code: 'original', name: 'Original (No Translation)' },
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
  selectedVoiceURI,
  onVoiceChange,
  targetLang,
  onTargetLangChange,
  areVoicesLoading,
}) => {
  
  const voiceOptions = useMemo(() => {
    if (areVoicesLoading) return <option disabled>Loading voices...</option>;
    if (voices.length === 0) return <option disabled>No voices available</option>;
    
    const groupedVoices = voices.reduce((acc, voice) => {
      const baseLang = voice.lang.split('-')[0];
      if (!acc[baseLang]) acc[baseLang] = [];
      acc[baseLang].push(voice);
      return acc;
    }, {} as Record<string, SpeechSynthesisVoice[]>);

    const languageNames = new Intl.DisplayNames(['en'], { type: 'language' });

    return Object.keys(groupedVoices).sort().map(baseLang => {
      let languageLabel = baseLang;
      try {
        const name = languageNames.of(baseLang);
        if (name) languageLabel = name;
      } catch (e) {}
      
      return (
        <optgroup label={languageLabel} key={baseLang}>
          {groupedVoices[baseLang].map(voice => (
            <option key={voice.voiceURI} value={voice.voiceURI}>
              {voice.name.replace('Google', '').replace('Microsoft', '').trim()} ({voice.lang})
            </option>
          ))}
        </optgroup>
      );
    });
  }, [voices, areVoicesLoading]);

  return (
    <section className="p-4 bg-[#1a1a2e] rounded-2xl border border-gray-700/50 space-y-4 shadow-lg">
      <h2 className="text-lg font-semibold text-sky-300 border-b border-gray-700/50 pb-2">🎚️ Dubbing Studio</h2>
      
      <div className="grid grid-cols-1 gap-4">
         {/* Translation Selector */}
         <div className="bg-black/20 p-3 rounded-lg border border-gray-700/30">
          <label className="text-xs font-bold text-sky-500 uppercase mb-2 block tracking-wider">1. Translate To</label>
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
          <label className="text-xs font-bold text-purple-400 uppercase mb-2 block tracking-wider">2. Select Voice Actor</label>
          <select 
            className="w-full bg-gray-800 text-white p-2.5 rounded-md text-sm border border-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
            value={selectedVoiceURI || ''}
            onChange={(e) => onVoiceChange(e.target.value)}
            disabled={areVoicesLoading}
          >
            {voiceOptions}
          </select>
        </div>
      </div>
      
      <button
        onClick={isDubbingActive ? onStop : onStart}
        disabled={!selectedVoiceURI}
        className={`w-full font-bold py-3 px-5 rounded-xl transition-all duration-300 ease-in-out flex items-center justify-center gap-2
          ${isDubbingActive 
            ? 'bg-red-500/80 hover:bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]' 
            : 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white hover:shadow-[0_0_20px_rgba(14,165,233,0.4)] hover:-translate-y-0.5'
          } disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none`}
      >
        {isDubbingActive ? (
          <>⏹ Stop Dubbing</>
        ) : (
          <>▶ Start Dubbing</>
        )}
      </button>
    </section>
  );
};

export default DubbingControls;
