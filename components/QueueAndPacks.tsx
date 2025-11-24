
import React from 'react';

interface ScriptInputProps {
  script: string;
  onScriptChange: (val: string) => void;
}

const ScriptInput: React.FC<ScriptInputProps> = ({ script, onScriptChange }) => {
  const handleSample = () => {
    onScriptChange(
      "The hero stands on the edge of the cliff.\nThe wind howls around him.\n'I will never give up!', he shouts into the void."
    );
  };

  return (
    <section className="p-4 bg-[#1a1a2e] rounded-2xl border border-gray-700/50 shadow-lg">
      <div className="flex justify-between items-center border-b border-gray-700/50 pb-2 mb-3">
        <h2 className="text-lg font-semibold text-sky-300">📝 Script & Subtitles</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => onScriptChange('')}
            className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded bg-gray-800 transition-colors"
          >
            Clear
          </button>
          <button 
            onClick={handleSample}
            className="text-xs text-sky-400 hover:text-sky-300 px-2 py-1 rounded bg-sky-900/30 transition-colors border border-sky-900"
          >
            Sample
          </button>
        </div>
      </div>
      
      <div className="relative group">
        <textarea
          value={script}
          onChange={(e) => onScriptChange(e.target.value)}
          placeholder="Enter subtitles or text here to generate voice-overs..."
          className="w-full h-32 bg-black/40 text-gray-200 p-3 rounded-xl border border-gray-700 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none resize-none text-sm leading-relaxed transition-all"
          spellCheck={false}
        />
        <div className="absolute bottom-3 right-3 text-xs text-gray-500 pointer-events-none">
          {script.length} chars
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-2 italic">
        Tip: Use new lines to separate subtitle segments.
      </p>
    </section>
  );
};

export default ScriptInput;
