export enum Language {
  ENGLISH = 'English',
  CHINESE = 'Chinese'
}

export interface SubtitleItem {
  startTime: string;
  endTime: string;
  originalText: string;
  translatedText: string;
}

export interface ProcessingState {
  status: 'idle' | 'reading' | 'uploading' | 'processing' | 'completed' | 'error';
  message?: string;
}