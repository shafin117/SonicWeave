export interface AudioTrack {
  id: string;
  file: File;
  fileName: string;
  buffer: AudioBuffer;
  duration: number;
  startTime: number; // In seconds
  color: string;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  totalDuration: number;
}

export interface ProcessingState {
  isProcessing: boolean;
  message: string;
}
