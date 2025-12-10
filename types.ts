
export type DubbingStatus = 'off' | 'processing' | 'live';
export type PackStatus = 'on' | 'off';
export type InputMode = 'script' | 'video';

export interface Pack {
  id: string;
  name: string;
  status: PackStatus;
  avatar: string;
}
