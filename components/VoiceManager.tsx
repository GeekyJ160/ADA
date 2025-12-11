
import React, { useState, useRef } from 'react';
import { VoicePack, SoundEffect, Character } from '../types';

interface VoiceManagerProps {
  packs: VoicePack[];
  selectedPackId: string;
  onSelect: (id: string) => void;
  onAdd: (pack: VoicePack) => void;
  onRemove: (id: string) => void;
  baseVoices: { id: string; name: string }[];
  // SFX Props
  soundEffects: SoundEffect[];
  onAddSFX: (sfx: SoundEffect) => void;
  onRemoveSFX: (id: string) => void;
  // Character Props
  characters: Character[];
  onAddCharacter: (char: Character) => void;
  onRemoveCharacter: (id: string) => void;
  // Import/Export
  onImportData: (data: { voicePacks: VoicePack[], characters: Character[], soundEffects: SoundEffect[] }) => void;
}

const EMOJI_CATEGORIES: Record<string, string[]> = {
  'Faces': ['😎', '🤠', '🤠', '🤡', '👻', '👺', '🤖', '👽', '💩', '😈', '💀', '😇', '🤔', '🤐', '😷', '🤒'],
  'Fantasy': ['🧙‍♂️', '🦸‍♀️', '🦹‍♂️', '🧚‍♀️', '🧛‍♂️', '🧜‍♀️', '🧝‍♂️', '🧞', '🧟', '🐉', '🦄', '🧙‍♀️', '🤴', '👸', '👼'],
  'Animals': ['🦊', '🐱', '🐺', '🦁', '🐯', '🦄', '🦖', '🦅', '🦉', '🦇', '🐼', '🐸', '🐙', '🦈', '🦋'],
  'Objects': ['⚔️', '🛡️', '🔮', '🎙️', '🎧', '🎭', '🎨', '🚀', '💊', '💣', '💎', '💡', '🔦', '🗡️', '⛓️']
};

const VoiceManager: React.FC<VoiceManagerProps> = ({
  packs,
  selectedPackId,
  onSelect,
  onAdd,
  onRemove,
  baseVoices,
  soundEffects,
  onAddSFX,
  onRemoveSFX,
  characters,
  onAddCharacter,
  onRemoveCharacter,
  onImportData
}) => {
  const [activeTab, setActiveTab] = useState<'voices' | 'characters' | 'sfx'>('voices');
  
  // Voice State
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBaseVoice, setNewBaseVoice] = useState(baseVoices[0].id);
  const [newDesc, setNewDesc] = useState('');
  const [newAvatar, setNewAvatar] = useState(EMOJI_CATEGORIES.Faces[0]);
  const [avatarTab, setAvatarTab] = useState<'emoji' | 'upload'>('emoji');
  const [activeCategory, setActiveCategory] = useState('Faces');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  // SFX State
  const [isAddingSFX, setIsAddingSFX] = useState(false);
  const [sfxName, setSfxName] = useState('');
  const sfxInputRef = useRef<HTMLInputElement>(null);
  const [sfxFile, setSfxFile] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Character State
  const [isAddingChar, setIsAddingChar] = useState(false);
  const [charName, setCharName] = useState('');
  const [charVoiceId, setCharVoiceId] = useState(''); // Maps to Pack ID

  const handleCreatePack = () => {
    if (!newName.trim()) return;
    
    const newPack: VoicePack = {
      id: `custom_${Date.now()}`,
      name: newName,
      baseVoiceId: newBaseVoice,
      description: newDesc || 'Custom Voice Pack',
      avatar: newAvatar
    };
    
    onAdd(newPack);
    setIsAdding(false);
    setNewName('');
    setNewDesc('');
    setNewAvatar(EMOJI_CATEGORIES.Faces[0]);
  };

  const handleCreateCharacter = () => {
      if (!charName.trim() || !charVoiceId) return;

      const newChar: Character = {
          id: `char_${Date.now()}`,
          name: charName,
          voiceId: charVoiceId
      };
      
      onAddCharacter(newChar);
      setIsAddingChar(false);
      setCharName('');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setNewAvatar(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSFXUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      setUploadError(null);
      setUploadProgress(0);
      
      if (file) {
          // Validation
          if (!file.type.startsWith('audio/')) {
             setUploadError("Invalid file type. Please upload an audio file.");
             return;
          }
          if (file.size > 5 * 1024 * 1024) { // 5MB limit
             setUploadError("File too large. Max size is 5MB.");
             return;
          }

          setIsUploading(true);
          const reader = new FileReader();
          
          reader.onprogress = (event) => {
              if (event.lengthComputable) {
                  const percent = Math.round((event.loaded / event.total) * 100);
                  setUploadProgress(percent);
              }
          };

          reader.onloadend = () => {
              setIsUploading(false);
              if (typeof reader.result === 'string') {
                  setSfxFile(reader.result);
                  if (!sfxName) {
                       // Clean filename
                      const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
                      setSfxName(cleanName);
                  }
              }
          };

          reader.onerror = () => {
              setIsUploading(false);
              setUploadError("Error reading file. Please try again.");
          };

          reader.readAsDataURL(file);
      }
  };

  const handleCreateSFX = () => {
      if (!sfxName.trim() || !sfxFile) return;

      const newSFX: SoundEffect = {
          id: `sfx_${Date.now()}`,
          name: sfxName,
          src: sfxFile
      };

      onAddSFX(newSFX);
      setIsAddingSFX(false);
      setSfxName('');
      setSfxFile(null);
      setUploadProgress(0);
      setUploadError(null);
  };

  const previewSFX = (src: string) => {
      const audio = new Audio(src);
      audio.play().catch(e => console.error("Preview failed", e));
  };

  const isImageAvatar = (avatar: string) => {
    return avatar.startsWith('data:') || avatar.startsWith('http');
  };

  const getPackAvatar = (packId: string) => {
      const pack = packs.find(p => p.id === packId);
      return pack?.avatar || '👤';
  };

  const getPackName = (packId: string) => {
      const pack = packs.find(p => p.id === packId);
      return pack?.name || 'Unknown Voice';
  };

  // --- Export/Import Logic ---

  const handleExport = () => {
    const data = {
        voicePacks: packs,
        characters: characters,
        soundEffects: soundEffects
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `ada_assets_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const json = JSON.parse(event.target?.result as string);
            onImportData(json);
        } catch (err) {
            console.error("Invalid JSON", err);
            alert("Failed to parse backup file. Please ensure it is a valid JSON file.");
        }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset
  };

  return (
    <section className="space-y-4 pb-20 animate-[fadeIn_0.3s_ease]">
      
      {/* Import/Export Header Actions */}
      <div className="flex justify-between items-center bg-gray-900/50 p-3 rounded-xl border border-gray-700/50">
          <h2 className="text-gray-400 text-xs font-bold uppercase tracking-wider">Asset Backup</h2>
          <div className="flex gap-2">
             <button 
                onClick={() => importInputRef.current?.click()}
                className="text-xs bg-gray-800 hover:bg-gray-700 text-sky-400 px-3 py-1.5 rounded-lg border border-gray-600 transition-colors flex items-center gap-1 font-bold"
             >
                ⬇️ Import
             </button>
             <input 
                ref={importInputRef}
                type="file" 
                accept=".json"
                className="hidden"
                onChange={handleImportFile}
             />
             <button 
                onClick={handleExport}
                className="text-xs bg-gray-800 hover:bg-gray-700 text-green-400 px-3 py-1.5 rounded-lg border border-gray-600 transition-colors flex items-center gap-1 font-bold"
             >
                ⬆️ Export All
             </button>
          </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex bg-black/40 p-1 rounded-xl mb-6 border border-gray-800 space-x-1">
          <button 
            onClick={() => setActiveTab('voices')}
            className={`flex-1 py-2 rounded-lg font-bold text-xs md:text-sm transition-all ${activeTab === 'voices' ? 'bg-sky-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
          >
              🗣️ Voices
          </button>
          <button 
            onClick={() => setActiveTab('characters')}
            className={`flex-1 py-2 rounded-lg font-bold text-xs md:text-sm transition-all ${activeTab === 'characters' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
          >
              👥 Characters
          </button>
          <button 
            onClick={() => setActiveTab('sfx')}
            className={`flex-1 py-2 rounded-lg font-bold text-xs md:text-sm transition-all ${activeTab === 'sfx' ? 'bg-amber-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
          >
              🔊 SFX
          </button>
      </div>

      {activeTab === 'voices' && (
        <>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-sky-400">Manage Voices</h2>
                <button 
                onClick={() => setIsAdding(!isAdding)}
                className="bg-sky-600 hover:bg-sky-500 text-white px-3 py-1 rounded-full text-sm font-bold transition-colors shadow-lg shadow-sky-900/20"
                >
                {isAdding ? 'Cancel' : '+ New Pack'}
                </button>
            </div>

            {isAdding && (
                <div className="bg-[#1a1a2e] p-4 rounded-xl border border-sky-500/50 shadow-lg mb-4 space-y-4">
                    {/* Avatar UI */}
                    <div className="flex gap-4">
                        <div className="flex-shrink-0">
                        <label className="text-xs text-gray-400 uppercase font-bold block mb-2 text-center">Preview</label>
                        <div className="w-20 h-20 rounded-full bg-black/50 border-2 border-sky-500 flex items-center justify-center overflow-hidden mx-auto shadow-[0_0_15px_rgba(14,165,233,0.3)]">
                            {isImageAvatar(newAvatar) ? (
                                <img src={newAvatar} alt="preview" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-4xl">{newAvatar}</span>
                            )}
                        </div>
                        </div>

                        <div className="flex-1 min-w-0">
                        <div className="flex space-x-2 mb-2 bg-black/30 p-1 rounded-lg">
                            <button 
                            onClick={() => setAvatarTab('emoji')}
                            className={`flex-1 text-xs py-1 rounded font-bold transition-colors ${avatarTab === 'emoji' ? 'bg-sky-600 text-white' : 'text-gray-400 hover:text-white'}`}
                            >
                            Emojis
                            </button>
                            <button 
                            onClick={() => setAvatarTab('upload')}
                            className={`flex-1 text-xs py-1 rounded font-bold transition-colors ${avatarTab === 'upload' ? 'bg-sky-600 text-white' : 'text-gray-400 hover:text-white'}`}
                            >
                            Upload
                            </button>
                        </div>

                        <div className="bg-black/20 rounded-lg p-2 h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-sky-900 border border-gray-700/50">
                            {avatarTab === 'emoji' ? (
                            <>
                                <div className="flex gap-1 mb-2 overflow-x-auto pb-1 scrollbar-none">
                                {Object.keys(EMOJI_CATEGORIES).map(cat => (
                                    <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${activeCategory === cat ? 'bg-sky-500/30 text-sky-300 border border-sky-500/50' : 'bg-gray-800 text-gray-400'}`}
                                    >
                                    {cat}
                                    </button>
                                ))}
                                </div>
                                <div className="grid grid-cols-5 gap-2">
                                {EMOJI_CATEGORIES[activeCategory].map(emoji => (
                                    <button
                                    key={emoji}
                                    onClick={() => setNewAvatar(emoji)}
                                    className={`text-xl hover:bg-white/10 rounded p-1 transition-colors ${newAvatar === emoji ? 'bg-white/10 ring-1 ring-sky-500' : ''}`}
                                    >
                                    {emoji}
                                    </button>
                                ))}
                                </div>
                            </>
                            ) : (
                            <div className="h-full flex flex-col items-center justify-center space-y-2">
                                <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="bg-gray-700 hover:bg-gray-600 text-white text-xs px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                                >
                                <span>📁 Choose File</span>
                                </button>
                                <input 
                                ref={fileInputRef}
                                type="file" 
                                accept="image/*" 
                                className="hidden"
                                onChange={handleImageUpload}
                                />
                            </div>
                            )}
                        </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-gray-400 uppercase font-bold">Pack Name</label>
                            <input 
                            type="text" 
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Name..."
                            className="w-full bg-black/40 text-white p-2 rounded border border-gray-700 focus:border-sky-500 outline-none text-sm mt-1"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 uppercase font-bold">Voice Model</label>
                            <select 
                            value={newBaseVoice}
                            onChange={(e) => setNewBaseVoice(e.target.value)}
                            className="w-full bg-black/40 text-white p-2 rounded border border-gray-700 focus:border-sky-500 outline-none text-sm mt-1"
                            >
                            {baseVoices.map(v => (
                                <option key={v.id} value={v.id}>{v.name}</option>
                            ))}
                            </select>
                        </div>
                    </div>
                    
                    <div>
                        <label className="text-xs text-gray-400 uppercase font-bold">Description</label>
                        <input 
                        type="text" 
                        value={newDesc}
                        onChange={(e) => setNewDesc(e.target.value)}
                        placeholder="Description..."
                        className="w-full bg-black/40 text-white p-2 rounded border border-gray-700 focus:border-sky-500 outline-none text-sm mt-1"
                        />
                    </div>

                    <button 
                        onClick={handleCreatePack}
                        className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold py-2 rounded-lg hover:opacity-90 transition-opacity"
                    >
                        Create Voice Pack
                    </button>
                </div>
            )}

            <div className="grid gap-3">
                {packs.map((pack) => (
                <div 
                    key={pack.id}
                    onClick={() => onSelect(pack.id)}
                    className={`relative p-3 rounded-xl border transition-all cursor-pointer group flex items-center gap-3 ${
                    selectedPackId === pack.id 
                    ? 'bg-sky-900/20 border-sky-500 shadow-[0_0_15px_rgba(14,165,233,0.3)]' 
                    : 'bg-[#1a1a2e] border-gray-700 hover:border-gray-500'
                    }`}
                >
                    <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center text-2xl border border-gray-700 overflow-hidden flex-shrink-0">
                    {isImageAvatar(pack.avatar) ? (
                        <img src={pack.avatar} alt={pack.name} className="w-full h-full object-cover" />
                    ) : (
                        <span>{pack.avatar}</span>
                    )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                    <h3 className={`font-bold text-sm truncate ${selectedPackId === pack.id ? 'text-sky-300' : 'text-gray-200'}`}>
                        {pack.name}
                    </h3>
                    <p className="text-xs text-gray-400 truncate">{pack.description}</p>
                    </div>
                    
                    {/* Selection Indicator */}
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    selectedPackId === pack.id ? 'border-sky-500' : 'border-gray-600'
                    }`}>
                    {selectedPackId === pack.id && <div className="w-2 h-2 bg-sky-500 rounded-full" />}
                    </div>

                    {packs.length > 1 && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onRemove(pack.id); }}
                            className="absolute top-2 right-2 text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                        >
                            ✕
                        </button>
                    )}
                </div>
                ))}
            </div>
        </>
      )}

      {activeTab === 'characters' && (
         <>
             <div className="flex justify-between items-center mb-4">
                 <h2 className="text-xl font-bold text-purple-400">Character Profiles</h2>
                 <button 
                 onClick={() => {
                     setIsAddingChar(!isAddingChar);
                     if (packs.length > 0 && !charVoiceId) {
                         setCharVoiceId(packs[0].id);
                     }
                 }}
                 className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded-full text-sm font-bold transition-colors shadow-lg shadow-purple-900/20"
                 >
                 {isAddingChar ? 'Cancel' : '+ New Profile'}
                 </button>
             </div>

             {isAddingChar && (
                 <div className="bg-[#1a1a2e] p-4 rounded-xl border border-purple-500/50 shadow-lg mb-4 space-y-4">
                     <div>
                         <label className="text-xs text-gray-400 uppercase font-bold">Character Name</label>
                         <input 
                         type="text" 
                         value={charName}
                         onChange={(e) => setCharName(e.target.value)}
                         placeholder="e.g. Hero, Villain, Sakura..."
                         className="w-full bg-black/40 text-white p-2 rounded border border-gray-700 focus:border-purple-500 outline-none text-sm mt-1"
                         />
                         <p className="text-[10px] text-gray-500 mt-1">Used in script as <code className="text-purple-400">Name: Dialogue</code></p>
                     </div>

                     <div>
                         <label className="text-xs text-gray-400 uppercase font-bold">Assign Voice Pack</label>
                         <div className="mt-1 flex gap-3 items-center">
                             {/* Preview Selected Pack Avatar */}
                             <div className="w-10 h-10 rounded-full bg-black/50 border border-gray-600 flex items-center justify-center text-xl overflow-hidden flex-shrink-0">
                                 {isImageAvatar(getPackAvatar(charVoiceId)) ? (
                                      <img src={getPackAvatar(charVoiceId)} alt="prev" className="w-full h-full object-cover" />
                                 ) : (
                                      <span>{getPackAvatar(charVoiceId)}</span>
                                 )}
                             </div>
                             
                             <select 
                             value={charVoiceId}
                             onChange={(e) => setCharVoiceId(e.target.value)}
                             className="flex-1 bg-black/40 text-white p-2 rounded border border-gray-700 focus:border-purple-500 outline-none text-sm"
                             >
                             {packs.map(p => (
                                 <option key={p.id} value={p.id}>{p.name}</option>
                             ))}
                             </select>
                         </div>
                     </div>

                     <button 
                         onClick={handleCreateCharacter}
                         disabled={!charName.trim() || !charVoiceId}
                         className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white font-bold py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                     >
                         Save Profile
                     </button>
                 </div>
             )}

             <div className="grid gap-3">
                 {characters.length === 0 && (
                     <div className="text-center text-gray-500 py-10 bg-black/20 rounded-xl border border-dashed border-gray-800">
                         No character profiles created yet.
                     </div>
                 )}
                 {characters.map((char) => (
                     <div key={char.id} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-xl border border-gray-800 hover:border-purple-500/50 transition-colors">
                         <div className="flex items-center gap-3 overflow-hidden flex-1">
                             <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-xl flex-shrink-0 border border-purple-500/30 overflow-hidden">
                                 {isImageAvatar(getPackAvatar(char.voiceId)) ? (
                                      <img src={getPackAvatar(char.voiceId)} alt="avatar" className="w-full h-full object-cover" />
                                 ) : (
                                      <span>{getPackAvatar(char.voiceId)}</span>
                                 )}
                             </div>
                             <div className="min-w-0 flex-1">
                                 <h3 className="font-bold text-gray-200 truncate text-sm">{char.name}</h3>
                                 <div className="flex items-center gap-1 text-[10px] text-gray-500 truncate">
                                     <span>Uses:</span>
                                     <span className="text-purple-300 bg-purple-900/20 px-1 rounded">{getPackName(char.voiceId)}</span>
                                 </div>
                             </div>
                         </div>
                         <button 
                             onClick={() => onRemoveCharacter(char.id)}
                             className="text-gray-500 hover:text-red-500 p-2 transition-colors"
                             title="Remove Profile"
                         >
                             ✕
                         </button>
                     </div>
                 ))}
             </div>
         </>
      )}

      {activeTab === 'sfx' && (
        <>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-amber-400">Sound Effects</h2>
                <button 
                onClick={() => {
                    setIsAddingSFX(!isAddingSFX);
                    setUploadError(null);
                    setUploadProgress(0);
                }}
                className="bg-amber-600 hover:bg-amber-500 text-white px-3 py-1 rounded-full text-sm font-bold transition-colors shadow-lg shadow-amber-900/20"
                >
                {isAddingSFX ? 'Cancel' : '+ New SFX'}
                </button>
            </div>

            {isAddingSFX && (
                <div className="bg-[#1a1a2e] p-4 rounded-xl border border-amber-500/50 shadow-lg mb-4 space-y-4">
                     <button 
                       onClick={() => !isUploading && sfxInputRef.current?.click()}
                       disabled={isUploading}
                       className={`w-full bg-black/30 hover:bg-black/50 text-gray-300 text-sm py-4 rounded-lg border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 relative overflow-hidden ${isUploading ? 'border-amber-500 cursor-wait' : 'border-gray-600 hover:border-amber-500 cursor-pointer'}`}
                     >
                       {isUploading ? (
                          <div className="w-full px-4 text-center">
                              <span className="text-amber-400 font-bold mb-1 block">Uploading... {uploadProgress}%</span>
                              <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-amber-500 transition-all duration-300"
                                    style={{ width: `${uploadProgress}%` }}
                                  ></div>
                              </div>
                          </div>
                       ) : (
                          <>
                             <span className="text-2xl">📁</span>
                             <span>{sfxFile ? 'File Selected' : 'Click to Upload Audio (MP3/WAV)'}</span>
                          </>
                       )}
                     </button>
                     <input 
                       ref={sfxInputRef}
                       type="file" 
                       accept="audio/*" 
                       className="hidden"
                       onChange={handleSFXUpload}
                     />
                     
                     {uploadError && (
                         <div className="text-red-400 text-xs text-center bg-red-500/10 p-2 rounded border border-red-500/30">
                             ⚠️ {uploadError}
                         </div>
                     )}

                    <div>
                        <label className="text-xs text-gray-400 uppercase font-bold">SFX Name (triggered in script)</label>
                        <input 
                        type="text" 
                        value={sfxName}
                        onChange={(e) => setSfxName(e.target.value)}
                        placeholder="e.g. Explosion, Laugh, Bell..."
                        className="w-full bg-black/40 text-white p-2 rounded border border-gray-700 focus:border-amber-500 outline-none text-sm mt-1"
                        />
                        <p className="text-[10px] text-gray-500 mt-1">Usage: <code className="text-amber-400">[SFX: {sfxName || 'Name'}]</code></p>
                    </div>

                    <button 
                        onClick={handleCreateSFX}
                        disabled={!sfxFile || !sfxName || isUploading}
                        className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Save Sound Effect
                    </button>
                </div>
            )}

            <div className="grid gap-3">
                {soundEffects.length === 0 && (
                    <div className="text-center text-gray-500 py-10 bg-black/20 rounded-xl border border-dashed border-gray-800">
                        No custom sound effects yet.
                    </div>
                )}
                {soundEffects.map((sfx) => (
                    <div key={sfx.id} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-xl border border-gray-800 hover:border-amber-500/50 transition-colors">
                        <div className="flex items-center gap-3 overflow-hidden flex-1">
                            <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-xl flex-shrink-0">
                                🔊
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="font-bold text-gray-200 truncate text-sm">{sfx.name}</h3>
                                <code className="text-[10px] text-gray-500 block truncate">[SFX: {sfx.name}]</code>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => previewSFX(sfx.src)}
                                className="text-xs bg-amber-600/20 hover:bg-amber-600 text-amber-500 hover:text-white px-3 py-1.5 rounded-full font-bold transition-all flex items-center gap-1"
                            >
                                Preview ▶
                            </button>
                            <button 
                                onClick={() => onRemoveSFX(sfx.id)}
                                className="text-gray-500 hover:text-red-500 p-2 transition-colors"
                                title="Remove SFX"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </>
      )}
    </section>
  );
};

export default VoiceManager;
