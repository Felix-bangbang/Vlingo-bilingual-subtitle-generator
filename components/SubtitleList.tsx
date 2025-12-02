import React, { useRef, useEffect } from 'react';
import { SubtitleItem } from '../types';

interface SubtitleListProps {
  subtitles: SubtitleItem[];
  currentTime: number;
  onSubtitleClick: (startTime: number) => void;
}

const parseTime = (timeStr: string): number => {
  const [hms, ms] = timeStr.split(',');
  const [h, m, s] = hms.split(':').map(Number);
  return h * 3600 + m * 60 + s + (parseInt(ms || '0') / 1000);
};

export const SubtitleList: React.FC<SubtitleListProps> = ({
  subtitles,
  currentTime,
  onSubtitleClick
}) => {
  const activeItemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentTime]); // Trigger scroll when active item likely changes, though this might be too frequent. Ideally we debounce or check index change.

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      <div className="p-4 border-b border-gray-800 bg-gray-900/50">
        <h3 className="text-lg font-semibold text-white">Subtitles</h3>
        <p className="text-sm text-gray-400">{subtitles.length} lines generated</p>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
        {subtitles.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 p-8 text-center">
            <svg className="w-12 h-12 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            <p>No subtitles generated yet.</p>
            <p className="text-sm mt-2">Upload a video to start.</p>
          </div>
        ) : (
          subtitles.map((sub, index) => {
            const start = parseTime(sub.startTime);
            const end = parseTime(sub.endTime);
            const isActive = currentTime >= start && currentTime <= end;

            return (
              <div
                key={index}
                ref={isActive ? activeItemRef : null}
                onClick={() => onSubtitleClick(start)}
                className={`
                  p-3 rounded-lg cursor-pointer transition-all duration-200 border
                  ${isActive 
                    ? 'bg-blue-900/30 border-blue-500/50 shadow-lg shadow-blue-900/10' 
                    : 'bg-gray-800/50 border-gray-700/50 hover:bg-gray-800 hover:border-gray-600'
                  }
                `}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-xs font-mono ${isActive ? 'text-blue-300' : 'text-gray-500'}`}>
                    {sub.startTime} - {sub.endTime}
                  </span>
                </div>
                <div className="space-y-1">
                  <p className={`text-sm font-medium ${isActive ? 'text-white' : 'text-gray-200'}`}>
                    {sub.translatedText}
                  </p>
                  <p className={`text-xs ${isActive ? 'text-blue-200' : 'text-gray-400'}`}>
                    {sub.originalText}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};