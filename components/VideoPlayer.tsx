import React, { useRef, useEffect, useState } from 'react';
import { SubtitleItem } from '../types';

interface VideoPlayerProps {
  videoUrl: string;
  subtitles: SubtitleItem[];
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
}

// Helper to parse "HH:MM:SS,mmm" to seconds
const parseTime = (timeStr: string): number => {
  const [hms, ms] = timeStr.split(',');
  const [h, m, s] = hms.split(':').map(Number);
  return h * 3600 + m * 60 + s + (parseInt(ms || '0') / 1000);
};

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  subtitles,
  currentTime,
  onTimeUpdate,
  onDurationChange
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentSubtitle, setCurrentSubtitle] = useState<SubtitleItem | null>(null);

  // Sync external currentTime (from subtitle click) to video player
  useEffect(() => {
    if (videoRef.current && Math.abs(videoRef.current.currentTime - currentTime) > 0.5) {
      videoRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  // Find active subtitle to display on overlay
  useEffect(() => {
    const active = subtitles.find(sub => {
      const start = parseTime(sub.startTime);
      const end = parseTime(sub.endTime);
      return currentTime >= start && currentTime <= end;
    });
    setCurrentSubtitle(active || null);
  }, [currentTime, subtitles]);

  return (
    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-gray-800 group">
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-contain"
        controls
        onTimeUpdate={(e) => onTimeUpdate(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => onDurationChange(e.currentTarget.duration)}
      />
      
      {/* Subtitle Overlay */}
      {currentSubtitle && (
        <div className="absolute bottom-16 left-0 right-0 px-4 text-center pointer-events-none transition-opacity duration-300">
           <div className="inline-block bg-black/60 backdrop-blur-sm p-3 rounded-lg">
             <p className="text-white text-lg md:text-xl font-semibold drop-shadow-md">
               {currentSubtitle.translatedText}
             </p>
             <p className="text-gray-300 text-sm md:text-base mt-1 drop-shadow-md">
               {currentSubtitle.originalText}
             </p>
           </div>
        </div>
      )}
    </div>
  );
};