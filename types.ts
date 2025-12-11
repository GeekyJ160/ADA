
export type DubbingStatus = 'off' | 'processing' | 'live';
export type PackStatus = 'on' | 'off';
export type InputMode = 'script' | 'video';

export interface Pack {
  id: string;
  name: string;
  status: PackStatus;
  avatar: string;
}

export interface VoicePack {
  id: string;
  name: string;
  baseVoiceId: string; // The actual Gemini voice ID (Puck, Charon, etc.)
  description: string;
  avatar: string; // Emoji or icon
}

export interface SoundEffect {
  id: string;
  name: string;
  src: string; // Data URL or blob URL
}

export interface Character {
  id: string;
  name: string;
  voiceId: string; // Maps to a VoicePack ID
}

export interface VoicePreset {
  id: string;
  name: string;
  voiceId: string; // Maps to base Gemini ID
}
