import React from 'react';

interface DubbingControlsProps {
  onStart: () => void;
  onStop: () => void;
  isDubbingActive: boolean;
  voices: SpeechSynthesisVoice[];
  selectedVoiceURI: string | null;
  onVoiceChange: (uri: string) => void;
  voiceLoadingError: string | null;
  areVoicesLoading: boolean;
}

const DubbingControls: React.FC<DubbingControlsProps> = ({
  onStart,
  onStop,
  isDubbingActive,
  voices,
  selectedVoiceURI,
  onVoiceChange,
  voiceLoadingError,
  areVoicesLoading,
}) => {
  const handleButtonClick = () => {
    if (isDubbingActive) {
      onStop();
    } else {
      onStart();
    }
  };

  const renderVoiceOptions = () => {
    if (voiceLoadingError) {
      return <option disabled>{voiceLoadingError}</option>;
    }
    if (areVoicesLoading) {
      return <option disabled>Loading voices...</option>;
    }
    if (voices.length === 0) {
      return <option disabled>No voices available</option>;
    }
    
    // Group voices by language for better organization
    const groupedVoices = voices.reduce((acc, voice) => {
      const lang = voice.lang;
      if (!acc[lang]) {
        acc[lang] = [];
      }
      acc[lang].push(voice);
      return acc;
    }, {} as Record<string, SpeechSynthesisVoice[]>);

    const languageNames = new Intl.DisplayNames(['en'], { type: 'language' });

    return Object.keys(groupedVoices).sort().map(lang => {
      let languageLabel = lang;
      try {
        // Use full language name if possible, fallback to lang code
        const mainLangCode = lang.split('-')[0];
        // Fix: The method to get a display name from Intl.DisplayNames is `of()`, not `getDisplayName()`.
        const displayName = languageNames.of(mainLangCode);
        if (displayName) {
          languageLabel = `${displayName} (${lang})`;
        }
      } catch (e) {
        // Intl.DisplayNames might not support all lang codes, fallback to lang code
        console.warn(`Could not get display name for language code: ${lang}`);
      }
      return (
        <optgroup label={languageLabel} key={lang}>
          {groupedVoices[lang].map(voice => (
            <option key={voice.voiceURI} value={voice.voiceURI}>
              {voice.name}
            </option>
          ))}
        </optgroup>
      );
    });
  };
  
  const isVoiceSelectionDisabled = areVoicesLoading || !!voiceLoadingError || voices.length === 0;
  // Make disabling start button more explicit: disable if dubbing is not active AND (voice selection is disabled or no voice is selected)
  const isStartButtonDisabled = !isDubbingActive && (isVoiceSelectionDisabled || !selectedVoiceURI);

  return (
    <section className="p-4 bg-[#1a1a2e] rounded-2xl border border-gray-700/50 space-y-4">
      <h2 className="text-lg font-semibold text-sky-300 border-b border-gray-700/50 pb-2">🔴 Live Dubbing</h2>
      
      <div className="space-y-3">
        <div>
          <label htmlFor="language" className="text-sm font-medium text-gray-300 mb-1 block">Language</label>
          <select id="language" className="w-full bg-gray-800/50 border border-gray-600/50 p-3 rounded-lg text-sm focus:ring-sky-500 focus:border-sky-500">
            <option>English</option>
            <option>Spanish</option>
            <option>French</option>
            <option>Japanese</option>
          </select>
        </div>
        <div>
          <label htmlFor="voicePack" className="text-sm font-medium text-gray-300 mb-1 block">Voice Pack</label>
          <select 
            id="voicePack" 
            className="w-full bg-gray-800/50 border border-gray-600/50 p-3 rounded-lg text-sm focus:ring-sky-500 focus:border-sky-500 disabled:opacity-50 disabled:cursor-not-allowed"
            value={selectedVoiceURI || ''}
            onChange={(e) => onVoiceChange(e.target.value)}
            disabled={isVoiceSelectionDisabled}
            aria-label="Select a voice for dubbing"
          >
            {renderVoiceOptions()}
          </select>
        </div>
      </div>
      
      <button
        onClick={handleButtonClick}
        disabled={isStartButtonDisabled}
        className="w-full font-bold py-3 px-5 rounded-full transition-all duration-300 ease-in-out text-white bg-gradient-to-r from-sky-500 to-indigo-600 hover:shadow-lg hover:shadow-sky-500/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
      >
        {isDubbingActive ? 'Stop Dubbing' : 'Start Dubbing'}
      </button>
    </section>
  );
};

export default DubbingControls;
