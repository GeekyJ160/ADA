
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleGenAI, Type, Modality, LiveServerMessage } from "@google/genai";
import PhoneFrame from './components/PhoneFrame';
import Header from './components/Header';
import VideoPlayer from './components/VideoPlayer';
import DubbingControls from './components/DubbingControls';
import ScriptInput from './components/QueueAndPacks';
import BottomNav from './components/BottomNav';
import Notification from './components/Notification';
import DubOutput from './components/DubOutput';
import VoiceManager from './components/VoiceManager';
import { DubbingStatus, InputMode, VoicePack, Character, VoicePreset, SoundEffect } from './types';

// Base Gemini Voices
const BASE_GEMINI_VOICES = [
  { id: 'Puck', name: 'Puck (Energetic)' },
  { id: 'Charon', name: 'Charon (Deep)' },
  { id: 'Kore', name: 'Kore (Calm)' },
  { id: 'Fenrir', name: 'Fenrir (Intense)' },
  { id: 'Zephyr', name: 'Zephyr (Soft)' },
];

// Initial Default Packs
const DEFAULT_PACKS: VoicePack[] = [
  { id: 'default_1', name: 'Standard Narrator', baseVoiceId: 'Puck', description: 'Energetic and clear', avatar: '🎙️' },
  { id: 'default_2', name: 'Anime Protagonist', baseVoiceId: 'Fenrir', description: 'Intense and heroic', avatar: '⚔️' },
  { id: 'default_3', name: 'Wise Sensei', baseVoiceId: 'Charon', description: 'Deep and calm', avatar: '🍵' },
  { id: 'default_4', name: 'Mysterious Girl', baseVoiceId: 'Kore', description: 'Calm and soothing', avatar: '🔮' },
];

// Local interface for Gemini Media Input
interface GeminiPartData {
  mimeType: string;
  data: string;
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'studio' | 'voices'>('studio');
  const [dubbingStatus, setDubbingStatus] = useState<DubbingStatus>('off');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [script, setScript] = useState<string>(
    "Welcome to Anime Dub Agent.\nThis tool allows you to dub videos in real-time.\nSimply enter your text here, choose a language, and start dubbing!"
  );
  const [dubbedSegments, setDubbedSegments] = useState<string[]>([]);
  const [currentSubtitle, setCurrentSubtitle] = useState<string>('');
  const [notification, setNotification] = useState({ message: '', show: false });
  const [inputMode, setInputMode] = useState<InputMode>('script');
  
  // Voice Packs State
  const [voicePacks, setVoicePacks] = useState<VoicePack[]>(DEFAULT_PACKS);
  const [selectedPackId, setSelectedPackId] = useState<string>(DEFAULT_PACKS[0].id);
  const [targetLang, setTargetLang] = useState<string>('original');

  // Character & SFX State
  const [characters, setCharacters] = useState<Character[]>([]);
  const [soundEffects, setSoundEffects] = useState<SoundEffect[]>([]);

  // Audio Visualization & Recording State
  const [activeAnalyser, setActiveAnalyser] = useState<AnalyserNode | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);

  // Script Dubbing Refs
  const queueRef = useRef<{ text: string; voiceId: string; originalText: string }[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptAnalyserRef = useRef<AnalyserNode | null>(null);
  const isPlayingRef = useRef<boolean>(false);
  
  // Live Dubbing Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const liveSessionRef = useRef<any>(null); // To store the active session promise
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const inputProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const turnTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Recording Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);

  const showNotification = useCallback((message: string, duration = 3000) => {
    setNotification({ message, show: true });
    setTimeout(() => {
      setNotification({ message: '', show: false });
    }, duration);
  }, []);

  // --- Voice & Asset Management ---
  const handleAddPack = (pack: VoicePack) => {
      setVoicePacks(prev => [...prev, pack]);
      setSelectedPackId(pack.id); // Auto select new pack
      showNotification(`Added pack: ${pack.name}`);
  };

  const handleRemovePack = (id: string) => {
      if (voicePacks.length <= 1) {
          showNotification("Cannot remove the last pack.");
          return;
      }
      setVoicePacks(prev => prev.filter(p => p.id !== id));
      if (selectedPackId === id) {
          setSelectedPackId(voicePacks.find(p => p.id !== id)?.id || voicePacks[0].id);
      }
      showNotification("Pack removed.");
  };

  const handleAddCharacter = (char: Character) => {
      setCharacters(prev => [...prev, char]);
      showNotification(`Created profile: ${char.name}`);
  };

  const handleRemoveCharacter = (id: string) => {
      setCharacters(prev => prev.filter(c => c.id !== id));
  };

  const handleAddSFX = (sfx: SoundEffect) => {
      setSoundEffects(prev => [...prev, sfx]);
      showNotification(`SFX Added: ${sfx.name}`);
  };

  const handleRemoveSFX = (id: string) => {
      setSoundEffects(prev => prev.filter(s => s.id !== id));
      showNotification("SFX Removed.");
  };

  const getActiveBaseVoiceId = () => {
      const pack = voicePacks.find(p => p.id === selectedPackId);
      return pack ? pack.baseVoiceId : 'Puck';
  };

  const handleImportData = (data: { voicePacks?: VoicePack[], characters?: Character[], soundEffects?: SoundEffect[] }) => {
     let addedCount = 0;
     
     if (data.voicePacks) {
         setVoicePacks(prev => {
             const existingIds = new Set(prev.map(p => p.id));
             const unique = data.voicePacks!.filter(p => !existingIds.has(p.id));
             addedCount += unique.length;
             return [...prev, ...unique];
         });
     }
     
     if (data.characters) {
         setCharacters(prev => {
             const existingIds = new Set(prev.map(c => c.id));
             const unique = data.characters!.filter(c => !existingIds.has(c.id));
             addedCount += unique.length;
             return [...prev, ...unique];
         });
     }

     if (data.soundEffects) {
        setSoundEffects(prev => {
             const existingIds = new Set(prev.map(s => s.id));
             const unique = data.soundEffects!.filter(s => !existingIds.has(s.id));
             addedCount += unique.length;
             return [...prev, ...unique];
        });
     }
     
     if (addedCount > 0) {
         showNotification(`Imported ${addedCount} new assets successfully!`);
     } else {
         showNotification("No new unique assets found in import.");
     }
  };

  // --- Helpers for Audio Encoding/Decoding ---

  const createBlob = (data: Float32Array): GeminiPartData => {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    const bytes = new Uint8Array(int16.buffer);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const b64 = btoa(binary);

    return {
      data: b64,
      mimeType: 'audio/pcm;rate=16000',
    };
  };

  const decodeBase64 = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const pcmToAudioBuffer = async (data: Uint8Array, ctx: AudioContext, sampleRate: number) => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length; 
    const buffer = ctx.createBuffer(1, frameCount, sampleRate);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i] / 32768.0;
    }
    return buffer;
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
          if (typeof reader.result === 'string') {
             const base64 = reader.result.split(',')[1];
             resolve(base64);
          } else {
             reject(new Error("Failed to read blob as string"));
          }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // --- Recording Logic ---

  const startRecording = (audioCtx: AudioContext, sourceNode: AudioNode) => {
    if (!videoRef.current) return;

    // Reset previous recording
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
      setRecordedUrl(null);
    }
    recordedChunksRef.current = [];

    try {
      // 1. Create a destination for the audio to be recorded
      const recDest = audioCtx.createMediaStreamDestination();
      sourceNode.connect(recDest);

      // 2. Get the video stream
      // @ts-ignore - captureStream exists on HTMLVideoElement in most modern browsers
      const videoStream = videoRef.current.captureStream ? videoRef.current.captureStream() : (videoRef.current as any).mozCaptureStream();
      
      if (!videoStream) {
        console.warn("captureStream not supported");
        return;
      }

      // 3. Combine tracks (Video + Dubbed Audio)
      const combinedStream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...recDest.stream.getAudioTracks()
      ]);

      // 4. Initialize MediaRecorder
      const options = { mimeType: 'video/webm; codecs=vp9' };
      // Check support
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
         // Fallback
         // @ts-ignore
         options.mimeType = 'video/webm'; 
      }

      const recorder = new MediaRecorder(combinedStream, options);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedUrl(url);
        showNotification("Recording ready for download!");
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      console.log("Recording started...");

    } catch (e) {
      console.error("Failed to start recording:", e);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
  };

  // --- Language Detection Logic ---

  const handleAutoDetectLanguage = async () => {
    setIsProcessing(true);
    showNotification("Detecting language...");
    
    try {
        let promptContent: any = "";
        
        if (inputMode === 'script') {
            if (!script.trim()) {
                showNotification("No script to detect.");
                setIsProcessing(false);
                return;
            }
            promptContent = `Analyze the language of this text: "${script}". Return JSON: { "language": "LanguageName", "isoCode": "ISO_2_LETTER_CODE" }`;
        } else {
            // Video Mode
            if (!videoRef.current) return;
            
            // Capture snippet
            // @ts-ignore
            const stream = videoRef.current.captureStream();
            const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
            const chunks: BlobPart[] = [];
            
            await new Promise<void>((resolve) => {
                recorder.ondataavailable = e => chunks.push(e.data);
                recorder.onstop = () => resolve();
                recorder.start();
                
                // Play video temporarily if paused to get data
                const wasPaused = videoRef.current?.paused;
                if (wasPaused) {
                    if (videoRef.current) videoRef.current.muted = true;
                    videoRef.current?.play().catch(e => console.error(e));
                }
                
                setTimeout(() => {
                    recorder.stop();
                    if (wasPaused) {
                        videoRef.current?.pause();
                        if (videoRef.current) videoRef.current.muted = false;
                    }
                }, 2000); 
            });
            
            const blob = new Blob(chunks, { type: 'video/webm' });
            const base64 = await blobToBase64(blob);
            
            promptContent = [
                {
                    inlineData: {
                        mimeType: "video/webm",
                        data: base64
                    }
                },
                { text: `Listen to the audio. Identify the spoken language. Return JSON: { "language": "LanguageName", "isoCode": "ISO_2_LETTER_CODE" }` }
            ];
        }

        // Call Gemini
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const result = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: Array.isArray(promptContent) ? [{ parts: promptContent }] : [{ parts: [{ text: promptContent }] }],
            config: { responseMimeType: "application/json" }
        });
        
        const detection = JSON.parse(result.text);
        const detectedCode = detection.isoCode?.toLowerCase();
        const detectedName = detection.language;
        
        showNotification(`Detected: ${detectedName}`);
        
        // Auto-select logic
        // If detected is English, we assume 'original' or manual choice.
        // If detected is NOT English, we default to English target.
        if (detectedCode === 'en') {
             setTargetLang('original');
        } else {
             setTargetLang('English');
        }

    } catch (e) {
        console.error(e);
        showNotification("Detection failed.");
    } finally {
        setIsProcessing(false);
    }
  };

  // --- Script Dubbing Logic ---

  const initAudioContext = () => {
    if (!audioContextRef.current) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = ctx;
      
      // Create Analyser
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.connect(ctx.destination); // Analyser -> Speakers
      
      scriptAnalyserRef.current = analyser;
      setActiveAnalyser(analyser);

      // Start Recording from this analyser
      startRecording(ctx, analyser);

    } else if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
      // Ensure recording starts if context was just suspended
      if (scriptAnalyserRef.current) {
         startRecording(audioContextRef.current, scriptAnalyserRef.current);
      }
    }
  };

  const playSFX = async (sfxId: string) => {
      if (!audioContextRef.current || !scriptAnalyserRef.current) return;
      
      const sfx = soundEffects.find(s => s.name.toLowerCase() === sfxId.toLowerCase());
      if (!sfx) {
          console.warn(`SFX ${sfxId} not found`);
          return;
      }

      try {
          const response = await fetch(sfx.src);
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
          
          const source = audioContextRef.current.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(scriptAnalyserRef.current);
          source.start();
      } catch (e) {
          console.error("Failed to play SFX", e);
      }
  };

  const playAudioChunk = async (base64Audio: string) => {
    if (!audioContextRef.current) return;
    
    try {
      const pcmData = decodeBase64(base64Audio);
      const audioBuffer = await pcmToAudioBuffer(pcmData, audioContextRef.current, 24000);
      
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      
      // Route through analyser if available
      if (scriptAnalyserRef.current) {
        source.connect(scriptAnalyserRef.current);
      } else {
        source.connect(audioContextRef.current.destination);
      }
      
      return new Promise<void>((resolve) => {
        source.onended = () => resolve();
        source.start();
      });
    } catch (error) {
      console.error("Audio playback error:", error);
    }
  };

  const generateSpeech = async (text: string, voiceName: string) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName }
          }
        }
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  };

  const processNextInQueue = useCallback(async () => {
    if (queueRef.current.length === 0) {
      showNotification('Dubbing complete!');
      setDubbingStatus('off');
      setIsProcessing(false);
      setCurrentSubtitle('');
      handleStopDubbing(); // Trigger stop to finish recording
      return;
    }

    const item = queueRef.current[0];
    queueRef.current = queueRef.current.slice(1);

    const fullText = item.text;
    
    // Check for SFX Tag [SFX: Name]
    const sfxMatch = fullText.match(/^\[SFX:\s*(.+?)\]\s*(.*)/i);
    let textToSpeak = fullText;
    
    if (sfxMatch) {
        const sfxName = sfxMatch[1];
        textToSpeak = sfxMatch[2]; // Remaining text
        // Play SFX immediately
        await playSFX(sfxName);
        
        // If there is no remaining text (just SFX line), wait briefly then next
        if (!textToSpeak.trim()) {
             setDubbedSegments(prev => [...prev, `[SFX] ${sfxName}`]);
             setTimeout(() => {
                 if (isPlayingRef.current) processNextInQueue();
             }, 1000);
             return;
        }
    }

    setCurrentSubtitle(item.originalText || textToSpeak);
    
    try {
      // Use the actual Gemini Voice ID from the selected pack
      const audioData = await generateSpeech(textToSpeak, item.voiceId);
      
      if (audioData) {
        if (videoRef.current && videoRef.current.paused) {
           videoRef.current.play();
        }

        setDubbedSegments(prev => [...prev, item.originalText]);
        await playAudioChunk(audioData);
      }
    } catch (error) {
      console.error("Generation/Playback failed", error);
      showNotification("Error generating audio segment");
    }

    if (isPlayingRef.current) {
        processNextInQueue();
    }
  }, [selectedPackId, voicePacks, showNotification, soundEffects]); // Added soundEffects dep

  const translateScript = async (textSegments: string[], target: string): Promise<{ text: string; voiceId: string; originalText: string }[]> => {
    // Basic Parsing: Speaker: Text
    // We want the translation to preserve the speaker format if possible, OR we handle it pre-translation?
    // Better: Parse lines first, then translate ONLY text content, then reconstruct.
    
    // 1. Parse raw segments into structure
    const parsedSegments = textSegments.map(seg => {
        const match = seg.match(/^([^:]+):\s*(.+)$/);
        let speakerName = 'Unknown';
        let content = seg;
        let voiceId = getActiveBaseVoiceId(); // Default

        if (match) {
            speakerName = match[1].trim();
            content = match[2].trim();
            // Find character
            const char = characters.find(c => c.name.toLowerCase() === speakerName.toLowerCase());
            if (char) {
                 const pack = voicePacks.find(p => p.id === char.voiceId);
                 if (pack) voiceId = pack.baseVoiceId;
            }
        }
        return { speakerName, content, voiceId, raw: seg };
    });

    if (target === 'original') {
        return parsedSegments.map(p => ({
            text: p.content,
            voiceId: p.voiceId,
            originalText: p.raw
        }));
    }

    // 2. Prepare for Translation
    // We only send the CONTENT for translation to avoid Gemini messing up the "Speaker:" keys or getting confused.
    const contentsToTranslate = parsedSegments.map(p => p.content);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Translate these subtitles to ${target}. Keep the meaning and tone. Return a JSON array of strings matching the input segments one-to-one.\n\nInput: ${JSON.stringify(contentsToTranslate)}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      });

      const json = response.text;
      if (!json) throw new Error("No response text from Gemini");
      const translatedContents: string[] = JSON.parse(json);

      // 3. Recombine
      return parsedSegments.map((p, index) => ({
          text: translatedContents[index] || p.content,
          voiceId: p.voiceId,
          originalText: `${p.speakerName !== 'Unknown' ? p.speakerName + ': ' : ''}${translatedContents[index] || p.content}`
      }));

    } catch (error) {
      console.error("Translation error:", error);
      showNotification("Translation failed. Using original text.");
      return parsedSegments.map(p => ({
            text: p.content,
            voiceId: p.voiceId,
            originalText: p.raw
      }));
    }
  };

  // --- Live Video Translation Logic ---

  const startLiveTranslation = async () => {
    if (!videoRef.current) return;

    // 1. Setup Audio Contexts with Interactive Latency Hint
    const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ 
        sampleRate: 16000,
        latencyHint: 'interactive'
    });
    const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ 
        sampleRate: 24000,
        latencyHint: 'interactive'
    });
    
    inputAudioContextRef.current = inputCtx;
    outputAudioContextRef.current = outputCtx;
    nextStartTimeRef.current = 0;

    // Create Analyser for Live Output
    const analyser = outputCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.connect(outputCtx.destination);
    setActiveAnalyser(analyser);

    // Start Recording from this analyser
    startRecording(outputCtx, analyser);

    // 2. Capture Video Stream
    let stream: MediaStream;
    try {
        // @ts-ignore
        stream = videoRef.current.captureStream();
    } catch (e) {
        console.error("captureStream failed", e);
        showNotification("Browser does not support capturing video audio.");
        return;
    }

    // 3. Connect to Live API
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const sysInstruction = targetLang === 'original' 
      ? "Repeat the spoken dialogue in the audio stream using the chosen voice. Match the original emotion and timing."
      : `You are a professional voice actor dubbing an anime. Translate the spoken dialogue in the audio stream into ${targetLang} immediately. Speak with the same emotion, intensity, and pacing as the original speaker. Output only the dubbed audio. If there is no speech, remain silent.`;

    const voiceToUse = getActiveBaseVoiceId();

    const sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      callbacks: {
        onopen: () => {
          console.log("Live session opened");
          setDubbingStatus('live');
          setIsProcessing(true);
          setCurrentSubtitle(''); // Clear previous
          videoRef.current?.play();
          
          // Setup Audio Processing
          const source = inputCtx.createMediaStreamSource(stream);
          // Reduced buffer size from 4096 to 2048 to minimize input latency (~128ms)
          const processor = inputCtx.createScriptProcessor(2048, 1, 1);
          
          processor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const pcmBlob = createBlob(inputData);
            sessionPromise.then(session => {
              session.sendRealtimeInput({ media: pcmBlob });
            });
          };

          source.connect(processor);
          // Mute processing path to prevent feedback loop
          const gainZero = inputCtx.createGain();
          gainZero.gain.value = 0;
          processor.connect(gainZero);
          gainZero.connect(inputCtx.destination);

          inputSourceRef.current = source;
          inputProcessorRef.current = processor;
        },
        onmessage: async (msg: LiveServerMessage) => {
            const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
                const ctx = outputAudioContextRef.current;
                const now = ctx.currentTime;

                // Sync Logic - Adaptive Buffering
                if (nextStartTimeRef.current < now) {
                    nextStartTimeRef.current = now;
                }
                
                const pcmData = decodeBase64(base64Audio);
                const audioBuffer = await pcmToAudioBuffer(pcmData, ctx, 24000);
                
                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                
                // Adaptive Playback Rate
                // If buffer is > 500ms, speed up slightly to catch up
                const bufferDepth = nextStartTimeRef.current - now;
                let playbackRate = 1.0;
                
                if (bufferDepth > 0.5) {
                    playbackRate = 1.05; // 5% faster
                } else if (bufferDepth > 1.0) {
                    playbackRate = 1.1; // 10% faster (aggressive catchup)
                }
                
                source.playbackRate.value = playbackRate;
                
                // Route through Analyser
                source.connect(analyser); // analyser is already connected to dest & recorder
                
                source.addEventListener('ended', () => {
                   audioSourcesRef.current.delete(source);
                });
                
                source.start(nextStartTimeRef.current);
                // Adjust next start time considering the playback rate
                nextStartTimeRef.current += (audioBuffer.duration / playbackRate);
                audioSourcesRef.current.add(source);
            }
            
            // Handle Transcription (Live Subtitles)
            const transcription = msg.serverContent?.outputTranscription?.text;
            if (transcription) {
               if (turnTimeoutRef.current) {
                   clearTimeout(turnTimeoutRef.current);
                   turnTimeoutRef.current = null;
               }
               setCurrentSubtitle(prev => prev + transcription);
            }

            const interrupted = msg.serverContent?.interrupted;
            if (interrupted) {
                setCurrentSubtitle('');
                nextStartTimeRef.current = 0; // Reset sync on interrupt
            }
            
            if (msg.serverContent?.turnComplete) {
                // Clear subtitle after 3 seconds of silence to keep it visible for reading
                if (turnTimeoutRef.current) clearTimeout(turnTimeoutRef.current);
                turnTimeoutRef.current = setTimeout(() => {
                    setCurrentSubtitle('');
                }, 3000);
            }
        },
        onclose: () => {
          console.log("Live session closed");
          handleStopDubbing();
        },
        onerror: (err) => {
          console.error("Live session error", err);
          showNotification("Live session disconnected.");
          handleStopDubbing();
        }
      },
      config: {
        responseModalities: [Modality.AUDIO],
        outputAudioTranscription: {}, // Request real-time transcription
        speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceToUse }}
        },
        systemInstruction: sysInstruction,
      }
    });

    liveSessionRef.current = sessionPromise;
  };

  // --- Main Handlers ---

  const handleStartDubbing = useCallback(async () => {
    if (isProcessing) return;
    
    setDubbedSegments([]);
    setCurrentSubtitle('');
    setRecordedUrl(null); // Clear old recording
    if (turnTimeoutRef.current) clearTimeout(turnTimeoutRef.current);

    if (inputMode === 'script') {
        if (!script.trim()) {
            showNotification('Please enter some text to dub.');
            return;
        }
        initAudioContext();
        setIsProcessing(true);
        setDubbingStatus('processing');
        isPlayingRef.current = true;

        const rawSegments = script.split(/\n+/).map(s => s.trim()).filter(Boolean);
        try {
            // Updated translation flow that respects speakers
            let segmentsToPlay: { text: string; voiceId: string; originalText: string }[] = [];
            segmentsToPlay = await translateScript(rawSegments, targetLang);
            
            setDubbingStatus('live');
            queueRef.current = segmentsToPlay;
            processNextInQueue();
        } catch (e) {
            console.error(e);
            setIsProcessing(false);
            setDubbingStatus('off');
            showNotification("Error starting script dubbing.");
        }
    } else {
        // Video Mode
        setDubbingStatus('processing'); // Connecting...
        startLiveTranslation();
    }

  }, [isProcessing, script, targetLang, inputMode, showNotification, processNextInQueue, selectedPackId]);

  const handleStopDubbing = useCallback(() => {
    stopRecording(); // Stop the MediaRecorder

    isPlayingRef.current = false;
    setIsProcessing(false);
    setDubbingStatus('off');
    setCurrentSubtitle('');
    setActiveAnalyser(null);
    if (turnTimeoutRef.current) clearTimeout(turnTimeoutRef.current);
    
    // Cleanup Script Audio
    queueRef.current = [];
    if (audioContextRef.current) {
      audioContextRef.current.suspend();
    }
    scriptAnalyserRef.current = null;

    // Cleanup Live Audio
    if (liveSessionRef.current) {
        liveSessionRef.current.then((session: any) => session.close()); // Close session
        liveSessionRef.current = null;
    }
    
    inputProcessorRef.current?.disconnect();
    inputSourceRef.current?.disconnect();
    inputProcessorRef.current = null;
    inputSourceRef.current = null;

    if (inputAudioContextRef.current) inputAudioContextRef.current.close();
    if (outputAudioContextRef.current) outputAudioContextRef.current.close();
    
    audioSourcesRef.current.forEach(s => s.stop());
    audioSourcesRef.current.clear();

    if (videoRef.current) {
      videoRef.current.muted = false;
      videoRef.current.pause(); // Optional: pause video when dubbing stops
    }
    showNotification('Dubbing stopped. Recording saved below.');
  }, [showNotification]);

  return (
    <div className="bg-gradient-to-br from-[#0a0a0a] to-[#16213e] min-h-screen p-2.5 flex items-center justify-center">
      <PhoneFrame>
        <div className="h-full overflow-y-auto p-2.5 space-y-5 text-white scrollbar-thin scrollbar-thumb-sky-900">
          <Header />
          <div className="space-y-5 pb-20">
            {currentView === 'studio' ? (
              <>
                <VideoPlayer 
                  ref={videoRef}
                  status={dubbingStatus} 
                  currentSubtitle={currentSubtitle} 
                />
                
                <DubbingControls
                  onStart={handleStartDubbing}
                  onStop={handleStopDubbing}
                  isDubbingActive={isProcessing}
                  voices={voicePacks} // Pass packs to controls
                  selectedVoiceId={selectedPackId} // Actually pack ID
                  onVoiceChange={setSelectedPackId}
                  targetLang={targetLang}
                  onTargetLangChange={setTargetLang}
                  inputMode={inputMode}
                  onInputModeChange={setInputMode}
                  onAutoDetect={handleAutoDetectLanguage}
                  
                  // Char Management
                  characters={characters}
                  onAddCharacter={handleAddCharacter}
                  onRemoveCharacter={handleRemoveCharacter}
                  presets={[]} // Unused in this version
                />

                {inputMode === 'script' && (
                    <ScriptInput 
                    script={script} 
                    onScriptChange={setScript} 
                    />
                )}

                <DubOutput 
                  dubbedSegments={dubbedSegments} 
                  isProcessing={isProcessing} 
                  activeAnalyser={activeAnalyser}
                  recordedUrl={recordedUrl}
                />
              </>
            ) : (
              <VoiceManager 
                packs={voicePacks}
                selectedPackId={selectedPackId}
                onSelect={setSelectedPackId}
                onAdd={handleAddPack}
                onRemove={handleRemovePack}
                baseVoices={BASE_GEMINI_VOICES}
                // SFX
                soundEffects={soundEffects}
                onAddSFX={handleAddSFX}
                onRemoveSFX={handleRemoveSFX}
                // Characters
                characters={characters}
                onAddCharacter={handleAddCharacter}
                onRemoveCharacter={handleRemoveCharacter}
                // Import
                onImportData={handleImportData}
              />
            )}
          </div>
        </div>
        <BottomNav 
            currentView={currentView}
            onNavigate={setCurrentView}
        />
      </PhoneFrame>
      <Notification message={notification.message} show={notification.show} />
    </div>
  );
};

export default App;
