import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import PhoneFrame from './components/PhoneFrame';
import Header from './components/Header';
import VideoPlayer from './components/VideoPlayer';
import DubbingControls from './components/DubbingControls';
import ScriptInput from './components/QueueAndPacks';
import BottomNav from './components/BottomNav';
import Notification from './components/Notification';
import DubOutput from './components/DubOutput';
import { DubbingStatus } from './types';

const App: React.FC = () => {
  const [dubbingStatus, setDubbingStatus] = useState<DubbingStatus>('off');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [script, setScript] = useState<string>(
    "Welcome to Anime Dub Agent.\nThis tool allows you to dub videos in real-time.\nSimply enter your text here, choose a language, and start dubbing!"
  );
  const [dubbedSegments, setDubbedSegments] = useState<string[]>([]);
  const [currentSubtitle, setCurrentSubtitle] = useState<string>('');
  const [notification, setNotification] = useState({ message: '', show: false });
  
  // Voice & Language State
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string | null>(null);
  const [targetLang, setTargetLang] = useState<string>('original');
  const [voiceLoadingError, setVoiceLoadingError] = useState<string | null>(null);
  const [areVoicesLoading, setAreVoicesLoading] = useState<boolean>(true);

  const queueRef = useRef<string[]>([]);

  const showNotification = useCallback((message: string, duration = 3000) => {
    setNotification({ message, show: true });
    setTimeout(() => {
      setNotification({ message: '', show: false });
    }, duration);
  }, []);

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length > 0) {
        setVoices(availableVoices);
        setVoiceLoadingError(null);
        
        // Try to restore saved voice
        const savedVoiceURI = localStorage.getItem('selectedVoiceURI');
        const savedVoice = availableVoices.find(v => v.voiceURI === savedVoiceURI);
        if (savedVoice) {
          setSelectedVoiceURI(savedVoice.voiceURI);
        } else {
          const defaultVoice = availableVoices.find(v => v.default) || availableVoices[0];
          if (defaultVoice) setSelectedVoiceURI(defaultVoice.voiceURI);
        }
        setAreVoicesLoading(false);
      }
    };
    
    setAreVoicesLoading(true);
    if (!('speechSynthesis' in window)) {
      setVoiceLoadingError("Speech synthesis not supported.");
      setAreVoicesLoading(false);
      return;
    }

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  useEffect(() => {
    if (selectedVoiceURI) localStorage.setItem('selectedVoiceURI', selectedVoiceURI);
  }, [selectedVoiceURI]);
  
  const processNextInQueue = useCallback(() => {
    if (queueRef.current.length === 0) {
      showNotification('Dubbing complete!');
      setDubbingStatus('live');
      setIsProcessing(false);
      setCurrentSubtitle('');
      return;
    }

    const text = queueRef.current[0];
    queueRef.current = queueRef.current.slice(1);

    setCurrentSubtitle(text); // Show subtitle
    
    const utterance = new SpeechSynthesisUtterance(text);
    const selectedVoice = voices.find(v => v.voiceURI === selectedVoiceURI);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    // Adjust rate slightly for better dubbing feel
    utterance.rate = 1.0;

    utterance.onend = () => {
      setDubbedSegments(prev => [...prev, text]);
      processNextInQueue();
    };

    utterance.onerror = (event) => {
      console.error('TTS Error', event);
      processNextInQueue(); // Skip error and continue
    };

    window.speechSynthesis.speak(utterance);
  }, [voices, selectedVoiceURI, showNotification]);

  const handleStopDubbing = useCallback(() => {
    window.speechSynthesis.cancel();
    queueRef.current = [];
    setIsProcessing(false);
    setDubbingStatus('off');
    setCurrentSubtitle('');
    showNotification('Dubbing stopped.');
  }, [showNotification]);

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

  const handleStartDubbing = useCallback(async () => {
    if (isProcessing) return;
    if (!script.trim()) {
      showNotification('Please enter some text to dub.');
      return;
    }
    if (areVoicesLoading) {
      showNotification('Voices loading...');
      return;
    }
    
    setIsProcessing(true);
    setDubbingStatus('processing');
    setDubbedSegments([]);

    // Split script into segments by newlines
    const rawSegments = script.split(/\n+/).map(s => s.trim()).filter(Boolean);

    try {
      let segmentsToPlay = rawSegments;
      
      // Translate if needed
      if (targetLang !== 'original') {
        showNotification(`Translating to ${targetLang}...`);
        segmentsToPlay = await translateScript(rawSegments, targetLang);
      }

      // If translation happened, we change status to live for playback
      setDubbingStatus('live');
      
      queueRef.current = segmentsToPlay;
      processNextInQueue();
    } catch (e) {
      console.error(e);
      setIsProcessing(false);
      setDubbingStatus('off');
      showNotification("Error starting dubbing session.");
    }
  }, [isProcessing, script, targetLang, areVoicesLoading, showNotification, processNextInQueue]);

  return (
    <div className="bg-gradient-to-br from-[#0a0a0a] to-[#16213e] min-h-screen p-2.5 flex items-center justify-center">
      <PhoneFrame>
        <div className="h-full overflow-y-auto p-2.5 space-y-5 text-white scrollbar-thin scrollbar-thumb-sky-900">
          <Header />
          <div className="space-y-5 pb-20">
            <VideoPlayer status={dubbingStatus} currentSubtitle={currentSubtitle} />
            
            <DubbingControls
              onStart={handleStartDubbing}
              onStop={handleStopDubbing}
              isDubbingActive={isProcessing}
              voices={voices}
              selectedVoiceURI={selectedVoiceURI}
              onVoiceChange={setSelectedVoiceURI}
              targetLang={targetLang}
              onTargetLangChange={setTargetLang}
              areVoicesLoading={areVoicesLoading}
            />

            <ScriptInput 
              script={script} 
              onScriptChange={setScript} 
            />

            <DubOutput dubbedSegments={dubbedSegments} isProcessing={isProcessing} />
          </div>
        </div>
        <BottomNav />
      </PhoneFrame>
      <Notification message={notification.message} show={notification.show} />
    </div>
  );
};

export default App;