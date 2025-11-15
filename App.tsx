
import React, { useState, useEffect, useCallback, useRef } from 'react';
import PhoneFrame from './components/PhoneFrame';
import Header from './components/Header';
import VideoPlayer from './components/VideoPlayer';
import DubbingControls from './components/DubbingControls';
import QueueAndPacks from './components/QueueAndPacks';
import BottomNav from './components/BottomNav';
import Notification from './components/Notification';
import DubOutput from './components/DubOutput';
import { DubbingStatus, Pack } from './types';

const App: React.FC = () => {
  const [dubbingStatus, setDubbingStatus] = useState<DubbingStatus>('off');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [queue, setQueue] = useState<string[]>([]);
  const [dubbedSegments, setDubbedSegments] = useState<string[]>([]);
  const [notification, setNotification] = useState({ message: '', show: false });
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string | null>(null);
  const [voiceLoadingError, setVoiceLoadingError] = useState<string | null>(null);
  const [areVoicesLoading, setAreVoicesLoading] = useState<boolean>(true);

  const [packs, setPacks] = useState<Pack[]>([
    { id: 'pack1', name: 'Pack 1', status: 'off', avatar: 'A' },
    { id: 'pack2', name: 'Pack 2', status: 'off', avatar: 'B' },
    { id: 'pack3', name: 'Pack 3', status: 'off', avatar: 'C' },
  ]);

  const queueRef = useRef(queue);
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  const showNotification = useCallback((message: string, duration = 3000) => {
    setNotification({ message, show: true });
    setTimeout(() => {
      setNotification({ message: '', show: false });
    }, duration);
  }, []);

  useEffect(() => {
    if (selectedVoiceURI) {
      localStorage.setItem('selectedVoiceURI', selectedVoiceURI);
    }
  }, [selectedVoiceURI]);

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length > 0) {
        setVoices(availableVoices);
        setVoiceLoadingError(null);

        const savedVoiceURI = localStorage.getItem('selectedVoiceURI');
        const savedVoice = availableVoices.find(v => v.voiceURI === savedVoiceURI);
        
        if (savedVoice) {
          setSelectedVoiceURI(savedVoice.voiceURI);
        } else {
          const fallbackVoice = availableVoices[0];
          if (fallbackVoice) {
            setSelectedVoiceURI(fallbackVoice.voiceURI);
            // Notify user if their previously saved voice is no longer available
            if (savedVoiceURI) {
              showNotification("Previous voice unavailable. Switched to a default voice.", 4000);
            }
          } else {
            setSelectedVoiceURI(null);
          }
        }
        
        setAreVoicesLoading(false);
      }
    };
    
    setAreVoicesLoading(true);

    if (!('speechSynthesis' in window)) {
      const errorMsg = "Speech synthesis not supported on this browser.";
      setVoiceLoadingError(errorMsg);
      showNotification(errorMsg, 5000);
      setAreVoicesLoading(false);
      return;
    }

    const voiceLoadTimeout = setTimeout(() => {
      if (window.speechSynthesis.getVoices().length === 0) {
        const errorMsg = "No voices found on this device. Try another browser.";
        setVoiceLoadingError(errorMsg);
        showNotification(errorMsg, 5000);
        setAreVoicesLoading(false);
      }
    }, 3000);

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      clearTimeout(voiceLoadTimeout);
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [showNotification]);
  
  const processNextInQueue = useCallback(() => {
    if (queueRef.current.length === 0) {
      showNotification('All segments dubbed!');
      setDubbingStatus('live');
      setIsProcessing(false);
      return;
    }

    const text = queueRef.current[0];
    setQueue(prev => prev.slice(1));

    const utterance = new SpeechSynthesisUtterance(text);
    const selectedVoice = voices.find(v => v.voiceURI === selectedVoiceURI);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onend = () => {
      setDubbedSegments(prev => [...prev, `Dubbed: "${text}"`]);
      processNextInQueue();
    };

    utterance.onerror = (event) => {
      console.error('SpeechSynthesisUtterance.onerror', event);
      let errorMessage = 'Error in speech synthesis!';
      if ('error' in event && typeof event.error === 'string') {
          switch (event.error) {
              case 'synthesis-failed':
                  errorMessage = 'Speech synthesis failed.';
                  break;
              case 'language-unavailable':
                  errorMessage = 'The selected language is not available.';
                  break;
              case 'voice-unavailable':
                  errorMessage = 'The selected voice is currently unavailable.';
                  break;
              case 'network':
                  errorMessage = 'A network error occurred during synthesis.';
                  break;
              default:
                  errorMessage = `Speech error: ${event.error}`;
          }
      }
      showNotification(errorMessage, 4000);
      processNextInQueue();
    };

    window.speechSynthesis.speak(utterance);
  }, [voices, selectedVoiceURI, showNotification]);

  const handleStopDubbing = useCallback(() => {
    window.speechSynthesis.cancel();
    setQueue([]);
    queueRef.current = [];
    setIsProcessing(false);
    setDubbingStatus('off');
    showNotification('Dubbing stopped.');
  }, [showNotification]);

  const handleStartDubbing = useCallback(() => {
    if (isProcessing) {
      showNotification('Already processing!');
      return;
    }
    const activePacks = packs.some(p => p.status === 'on');
    if (!activePacks) {
      showNotification('No active packs! Please turn a pack on.');
      return;
    }
    if (voiceLoadingError) {
      showNotification(`Cannot start dubbing: ${voiceLoadingError}`, 4000);
      return;
    }
    if (areVoicesLoading || voices.length === 0) {
      showNotification('Cannot start dubbing: Voices not available yet.', 4000);
      return;
    }
    
    setIsProcessing(true);
    setDubbingStatus('processing');
    setDubbedSegments([]);
    
    const sampleQueue = [
      'Hello, this is the first segment.',
      'Now, we proceed to the second part of our story.',
      'Finally, the last segment of the scene.'
    ];
    setQueue(sampleQueue);
    queueRef.current = sampleQueue;
    
    processNextInQueue();
  }, [isProcessing, packs, processNextInQueue, voiceLoadingError, voices, areVoicesLoading, showNotification]);
  
  const handleTogglePack = (packId: string) => {
    setPacks(packs.map(p => p.id === packId ? { ...p, status: p.status === 'on' ? 'off' : 'on' } : p));
  };
  
  const isDubbingActive = dubbingStatus !== 'off' || isProcessing;

  return (
    <div className="bg-gradient-to-br from-[#0a0a0a] to-[#16213e] min-h-screen p-2.5 flex items-center justify-center">
      <PhoneFrame>
        <div className="h-full overflow-y-auto p-2.5 space-y-5 text-white">
          <Header />
          <div className="space-y-5">
            <VideoPlayer status={dubbingStatus} />
            <DubbingControls
              onStart={handleStartDubbing}
              onStop={handleStopDubbing}
              isDubbingActive={isDubbingActive}
              voices={voices}
              selectedVoiceURI={selectedVoiceURI}
              onVoiceChange={setSelectedVoiceURI}
              voiceLoadingError={voiceLoadingError}
              areVoicesLoading={areVoicesLoading}
            />
            <DubOutput dubbedSegments={dubbedSegments} isProcessing={isProcessing} />
            <QueueAndPacks packs={packs} onTogglePack={handleTogglePack} />
          </div>
        </div>
        <BottomNav />
      </PhoneFrame>
      <Notification message={notification.message} show={notification.show} />
    </div>
  );
};

export default App;
