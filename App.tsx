import React, { useState, useRef, useCallback } from 'react';
import { Language, SubtitleItem, ProcessingState } from './types';
import { generateBilingualSubtitles } from './services/geminiService';
import { VideoPlayer } from './components/VideoPlayer';
import { SubtitleList } from './components/SubtitleList';
import { Button } from './components/Button';

const MAX_FILE_SIZE = 4 * 1024 * 1024 * 1024; // 4GB

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [subtitles, setSubtitles] = useState<SubtitleItem[]>([]);
  const [processingState, setProcessingState] = useState<ProcessingState>({ status: 'idle' });
  const [targetLanguage, setTargetLanguage] = useState<Language>(Language.ENGLISH);
  const [currentTime, setCurrentTime] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size > MAX_FILE_SIZE) {
      alert("File size exceeds the 4GB limit.");
      return;
    }

    // Cleanup old URL
    if (videoUrl) URL.revokeObjectURL(videoUrl);

    setFile(selectedFile);
    setVideoUrl(URL.createObjectURL(selectedFile));
    setSubtitles([]);
    setProcessingState({ status: 'idle' });
  };

  const handleProcess = async () => {
    if (!file) return;

    // Initial state
    setProcessingState({ status: 'uploading', message: 'Starting upload...' });

    try {
      // We pass the file directly now. The service handles the upload via Gemini Files API.
      const generatedSubtitles = await generateBilingualSubtitles(
        file, 
        targetLanguage,
        (statusMessage) => {
           // Map status messages to basic state or just update message
           let status: ProcessingState['status'] = 'processing';
           if (statusMessage.toLowerCase().includes('upload')) status = 'uploading';
           setProcessingState({ status, message: statusMessage });
        }
      );

      setSubtitles(generatedSubtitles);
      setProcessingState({ status: 'completed' });

    } catch (error: any) {
      console.error(error);
      let errorMsg = "Failed to generate subtitles. Please try again.";
      if (error.message?.includes("Project not found")) {
         errorMsg = "API Key Invalid or Quota Exceeded.";
      }
      if (error.toString().includes("413")) {
         errorMsg = "File is too large for the current API tier or connection.";
      }
      setProcessingState({ status: 'error', message: errorMsg + " (" + error.message + ")" });
    }
  };

  const downloadSRT = useCallback(() => {
    if (subtitles.length === 0) return;

    const srtContent = subtitles.map((sub, index) => {
      return `${index + 1}\n${sub.startTime} --> ${sub.endTime}\n${sub.translatedText}\n${sub.originalText}\n`;
    }).join('\n');

    const blob = new Blob([srtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'subtitles.srt';
    a.click();
    URL.revokeObjectURL(url);
  }, [subtitles]);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-300">
              Bilingual Subtitle Gen
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
             {subtitles.length > 0 && (
               <Button onClick={downloadSRT} variant="secondary" className="text-sm">
                 Download .SRT
               </Button>
             )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-6 grid lg:grid-cols-3 gap-6">
        
        {/* Left Col: Player & Controls (Takes 2 cols on lg) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Upload Area */}
          {!videoUrl ? (
            <div 
              className="border-2 border-dashed border-gray-700 rounded-2xl p-12 flex flex-col items-center justify-center text-center hover:bg-gray-900/50 hover:border-blue-500/50 transition-all cursor-pointer group bg-gray-900/20"
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="video/*,audio/*"
                onChange={handleFileChange} 
              />
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-xl">
                <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Upload Video or Audio</h3>
              <p className="text-gray-400 max-w-sm mx-auto">
                Drag and drop your file here, or click to browse.
                <br />
                <span className="text-sm text-gray-500 mt-2 block">Max size 4GB • MP4, MOV, MKV, MP3, WAV</span>
              </p>
            </div>
          ) : (
            <>
               <VideoPlayer 
                 videoUrl={videoUrl} 
                 subtitles={subtitles}
                 currentTime={currentTime}
                 onTimeUpdate={setCurrentTime}
                 onDurationChange={() => {}}
               />
               
               {/* Controls Bar */}
               <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
                 <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="px-3 py-1 bg-gray-800 rounded-lg text-sm text-gray-300 truncate max-w-[200px]" title={file?.name}>
                      {file?.name}
                    </div>
                    <button 
                      onClick={() => {
                        setFile(null);
                        setVideoUrl(null);
                        setSubtitles([]);
                        setProcessingState({ status: 'idle' });
                      }}
                      className="text-gray-500 hover:text-red-400 p-1"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                 </div>

                 <div className="flex items-center gap-4 w-full md:w-auto justify-end">
                    <div className="flex items-center gap-2 bg-gray-800 p-1 rounded-lg">
                      <button 
                        onClick={() => setTargetLanguage(Language.ENGLISH)}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${targetLanguage === Language.ENGLISH ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                      >
                        English Priority
                      </button>
                      <button 
                         onClick={() => setTargetLanguage(Language.CHINESE)}
                         className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${targetLanguage === Language.CHINESE ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                      >
                        Chinese Priority
                      </button>
                    </div>
                    
                    <Button 
                      onClick={handleProcess} 
                      disabled={processingState.status === 'processing' || processingState.status === 'reading' || processingState.status === 'uploading'}
                      isLoading={processingState.status === 'processing' || processingState.status === 'reading' || processingState.status === 'uploading'}
                    >
                      {processingState.status === 'idle' ? 'Generate Subtitles' : 
                       processingState.status === 'uploading' ? (processingState.message || 'Uploading...') :
                       processingState.status === 'processing' ? (processingState.message || 'Processing...') :
                       processingState.status === 'completed' ? 'Regenerate' : 'Processing...'}
                    </Button>
                 </div>
               </div>
               
               {/* Error Message */}
               {processingState.status === 'error' && (
                 <div className="bg-red-900/20 border border-red-900/50 text-red-200 p-4 rounded-xl flex items-start gap-3">
                   <svg className="w-6 h-6 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                   </svg>
                   <div>
                     <h4 className="font-semibold text-red-100">Error</h4>
                     <p className="text-sm opacity-80">{processingState.message}</p>
                   </div>
                 </div>
               )}
            </>
          )}
        </div>

        {/* Right Col: Subtitles List */}
        <div className="lg:col-span-1 h-[600px] lg:h-auto">
          <SubtitleList 
            subtitles={subtitles} 
            currentTime={currentTime}
            onSubtitleClick={setCurrentTime}
          />
        </div>

      </main>
    </div>
  );
}