
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleGenAI, Type, Modality, LiveServerMessage, Blob } from "@google/genai";
import PhoneFrame from './components/PhoneFrame';
import Header from './components/Header';
import VideoPlayer from './components/VideoPlayer';
import DubbingControls from './components/DubbingControls';
import ScriptInput from './components/QueueAndPacks';
import BottomNav from './components/BottomNav';
import Notification from './components/Notification';
import DubOutput from './components/DubOutput';
import { DubbingStatus, InputMode } from './types';

// Gemini Voices Preset
const GEMINI_VOICES = [
  { id: 'Puck', name: 'Puck (Energetic)' },
  { id: 'Charon', name: 'Charon (Deep)' },
  { id: 'Kore', name: 'Kore (Calm)' },
  { id: 'Fenrir', name: 'Fenrir (Intense)' },
  { id: 'Zephyr', name: 'Zephyr (Soft)' },
];

const App: React.FC = () => {
  const [dubbingStatus, setDubbingStatus] = useState<DubbingStatus>('off');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [script, setScript] = useState<string>(
    "Welcome to Anime Dub Agent.\nThis tool allows you to dub videos in real-time.\nSimply enter your text here, choose a language, and start dubbing!"
  );
  const [dubbedSegments, setDubbedSegments] = useState<string[]>([]);
  const [currentSubtitle, setCurrentSubtitle] = useState<string>('');
  const [notification, setNotification] = useState({ message: '', show: false });
  const [inputMode, setInputMode] = useState<InputMode>('script');
  
  // Voice & Language State
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('Puck');
  const [targetLang, setTargetLang] = useState<string>('original');

  // Audio Visualization State
  const [activeAnalyser, setActiveAnalyser] = useState<AnalyserNode | null>(null);

  // Script Dubbing Refs
  const queueRef = useRef<string[]>([]);
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

  const showNotification = useCallback((message: string, duration = 3000) => {
    setNotification({ message, show: true });
    setTimeout(() => {
      setNotification({ message: '', show: false });
    }, duration);
  }, []);

  // --- Helpers for Audio Encoding/Decoding ---

  const createBlob = (data: Float32Array): Blob => {
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

    } else if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
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
      if (videoRef.current) videoRef.current.muted = false;
      return;
    }

    const text = queueRef.current[0];
    queueRef.current = queueRef.current.slice(1);

    setCurrentSubtitle(text);
    
    try {
      const audioData = await generateSpeech(text, selectedVoiceId);
      
      if (audioData) {
        if (videoRef.current && videoRef.current.paused) {
           videoRef.current.play();
        }

        setDubbedSegments(prev => [...prev, text]);
        await playAudioChunk(audioData);
      }
    } catch (error) {
      console.error("Generation/Playback failed", error);
      showNotification("Error generating audio segment");
    }

    if (isPlayingRef.current) {
        processNextInQueue();
    }
  }, [selectedVoiceId, showNotification]);

  const translateScript = async (textSegments: string[], target: string): Promise<string[]> => {
    if (target === 'original') return textSegments;

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Translate these subtitles to ${target}. Keep the meaning and tone. Return a JSON array of strings matching the input segments one-to-one.\n\nInput: ${JSON.stringify(textSegments)}`,
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
      return JSON.parse(json);
    } catch (error) {
      console.error("Translation error:", error);
      showNotification("Translation failed. Using original text.");
      return textSegments;
    }
  };

  // --- Live Video Translation Logic ---

  const startLiveTranslation = async () => {
    if (!videoRef.current) return;

    // 1. Setup Audio Contexts
    const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    inputAudioContextRef.current = inputCtx;
    outputAudioContextRef.current = outputCtx;
    nextStartTimeRef.current = 0;

    // Create Analyser for Live Output
    const analyser = outputCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.connect(outputCtx.destination);
    setActiveAnalyser(analyser);

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
      ? "Repeat what is said in the audio with the chosen voice."
      : `You are a professional simultaneous interpreter. Translate the spoken dialogue in the audio stream into ${targetLang} immediately. Output only the translated audio. If there is no speech, remain silent.`;

    const sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      callbacks: {
        onopen: () => {
          console.log("Live session opened");
          setDubbingStatus('live');
          setIsProcessing(true);
          videoRef.current?.play();
          
          // Setup Audio Processing
          const source = inputCtx.createMediaStreamSource(stream);
          const processor = inputCtx.createScriptProcessor(4096, 1, 1);
          
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
                // Sync Logic
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                
                const pcmData = decodeBase64(base64Audio);
                const audioBuffer = await pcmToAudioBuffer(pcmData, ctx, 24000);
                
                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                
                // Route through Analyser
                source.connect(analyser); // analyser is already connected to dest
                
                source.addEventListener('ended', () => {
                   audioSourcesRef.current.delete(source);
                });
                
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                audioSourcesRef.current.add(source);
            }
            
             if (msg.serverContent?.modelTurn?.parts?.[0]?.text) {
                 setCurrentSubtitle(msg.serverContent.modelTurn.parts[0].text);
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
        speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoiceId }}
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
            let segmentsToPlay = rawSegments;
            if (targetLang !== 'original') {
                segmentsToPlay = await translateScript(rawSegments, targetLang);
            }
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

  }, [isProcessing, script, targetLang, inputMode, showNotification, processNextInQueue, selectedVoiceId]);

  const handleStopDubbing = useCallback(() => {
    isPlayingRef.current = false;
    setIsProcessing(false);
    setDubbingStatus('off');
    setCurrentSubtitle('');
    setActiveAnalyser(null);
    
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
    showNotification('Dubbing stopped.');
  }, [showNotification]);

  return (
    <div className="bg-gradient-to-br from-[#0a0a0a] to-[#16213e] min-h-screen p-2.5 flex items-center justify-center">
      <PhoneFrame>
        <div className="h-full overflow-y-auto p-2.5 space-y-5 text-white scrollbar-thin scrollbar-thumb-sky-900">
          <Header />
          <div className="space-y-5 pb-20">
            <VideoPlayer 
              ref={videoRef}
              status={dubbingStatus} 
              currentSubtitle={currentSubtitle} 
            />
            
            <DubbingControls
              onStart={handleStartDubbing}
              onStop={handleStopDubbing}
              isDubbingActive={isProcessing}
              voices={GEMINI_VOICES}
              selectedVoiceId={selectedVoiceId}
              onVoiceChange={setSelectedVoiceId}
              targetLang={targetLang}
              onTargetLangChange={setTargetLang}
              inputMode={inputMode}
              onInputModeChange={setInputMode}
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
            />
          </div>
        </div>
        <BottomNav />
      </PhoneFrame>
      <Notification message={notification.message} show={notification.show} />
    </div>
  );
};

export default App;
