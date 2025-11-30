import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, Download, Play, Pause, UploadCloud, Volume2 } from 'lucide-react';
import { AudioTrack, PlaybackState, ProcessingState } from './types';
import { createAudioContext, decodeAudioFile, mixAudioTracks, audioBufferToWav } from './services/audioUtils';
import { TrackItem } from './components/TrackItem';
import { Timeline } from './components/Timeline';

// Color palette for tracks
const TRACK_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1'];

const App: React.FC = () => {
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    currentTime: 0,
    totalDuration: 0,
  });
  const [processingState, setProcessingState] = useState<ProcessingState>({
    isProcessing: false,
    message: '',
  });
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);
  const mergedBufferRef = useRef<AudioBuffer | null>(null);

  // Initialize AudioContext
  useEffect(() => {
    audioContextRef.current = createAudioContext();
    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  // Update total duration whenever tracks change
  useEffect(() => {
    if (tracks.length === 0) {
      setPlaybackState(prev => ({ ...prev, totalDuration: 0 }));
      return;
    }
    const maxDuration = tracks.reduce((max, track) => Math.max(max, track.startTime + track.duration), 0);
    setPlaybackState(prev => ({ ...prev, totalDuration: maxDuration }));
    
    // Invalidate merged buffer
    mergedBufferRef.current = null;
  }, [tracks]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !audioContextRef.current) return;

    setProcessingState({ isProcessing: true, message: 'Decoding audio...' });

    try {
      const newTracks: AudioTrack[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const buffer = await decodeAudioFile(file, audioContextRef.current);
        
        // Auto-increment start time if tracks exist, otherwise 0
        // Simple logic: If adding first track, start at 0.
        // If adding subsequent, maybe start after the last one ends? 
        // For now, let's default to 0 and let user adjust, or default to end of last track.
        let defaultStartTime = 0;
        if (tracks.length > 0) {
           const lastTrack = tracks[tracks.length - 1];
           defaultStartTime = lastTrack.startTime + lastTrack.duration;
        }

        newTracks.push({
          id: Math.random().toString(36).substr(2, 9),
          file,
          fileName: file.name,
          buffer,
          duration: buffer.duration,
          startTime: defaultStartTime,
          color: TRACK_COLORS[(tracks.length + i) % TRACK_COLORS.length],
        });
      }

      setTracks(prev => [...prev, ...newTracks]);
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Failed to process audio file. Please try another format.");
    } finally {
      setProcessingState({ isProcessing: false, message: '' });
      // Reset file input
      event.target.value = '';
    }
  };

  const removeTrack = (id: string) => {
    stopAudio();
    setTracks(prev => prev.filter(t => t.id !== id));
  };

  const updateTrackStartTime = (id: string, newTime: number) => {
    // Stop playback if modifying timeline
    if (playbackState.isPlaying) stopAudio();
    
    setTracks(prev => prev.map(t => 
      t.id === id ? { ...t, startTime: Math.max(0, newTime) } : t
    ));
  };

  const prepareMergedAudio = useCallback(() => {
    if (!audioContextRef.current || tracks.length === 0) return null;
    
    if (!mergedBufferRef.current) {
      mergedBufferRef.current = mixAudioTracks(tracks, audioContextRef.current);
    }
    return mergedBufferRef.current;
  }, [tracks]);

  const togglePlayPause = () => {
    if (tracks.length === 0) return;

    if (playbackState.isPlaying) {
      pauseAudio();
    } else {
      playAudio();
    }
  };

  const playAudio = () => {
    const ctx = audioContextRef.current;
    const buffer = prepareMergedAudio();

    if (!ctx || !buffer) return;

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    sourceNodeRef.current = ctx.createBufferSource();
    sourceNodeRef.current.buffer = buffer;
    sourceNodeRef.current.connect(ctx.destination);

    // Calculate start offset
    const offset = pauseTimeRef.current % buffer.duration;
    
    sourceNodeRef.current.start(0, offset);
    startTimeRef.current = ctx.currentTime - offset;

    setPlaybackState(prev => ({ ...prev, isPlaying: true }));
    
    // Animation loop for progress
    const updateProgress = () => {
      if (!ctx) return;
      const current = ctx.currentTime - startTimeRef.current;
      
      if (current >= buffer.duration) {
        stopAudio();
        return;
      }

      setPlaybackState(prev => ({ ...prev, currentTime: current }));
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    };
    
    animationFrameRef.current = requestAnimationFrame(updateProgress);

    sourceNodeRef.current.onended = () => {
       // Handled by time check usually, but backup here
    };
  };

  const pauseAudio = () => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current = null;
    }
    if (audioContextRef.current) {
      pauseTimeRef.current = audioContextRef.current.currentTime - startTimeRef.current;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setPlaybackState(prev => ({ ...prev, isPlaying: false }));
  };

  const stopAudio = () => {
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch(e) {}
      sourceNodeRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    pauseTimeRef.current = 0;
    setPlaybackState(prev => ({ ...prev, isPlaying: false, currentTime: 0 }));
  };

  const handleDownload = () => {
    const buffer = prepareMergedAudio();
    if (!buffer) return;

    const wavBlob = audioBufferToWav(buffer);
    const url = URL.createObjectURL(wavBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'merged-audio.wav';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 pb-20">
      {/* Header */}
      <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 className="text-blue-500" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              SonicWeave
            </h1>
          </div>
          <div className="flex items-center gap-4">
             {tracks.length > 0 && (
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors border border-slate-700"
                >
                  <Download size={16} />
                  <span className="hidden sm:inline">Export WAV</span>
                </button>
             )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        
        {/* Hero / Empty State */}
        {tracks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/50">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6">
              <UploadCloud size={40} className="text-blue-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Start your composition</h2>
            <p className="text-slate-400 mb-8 text-center max-w-md">
              Upload audio clips, arrange them in time like subtitles, and merge them into a seamless track.
            </p>
            <label className="cursor-pointer group relative">
              <input type="file" className="hidden" accept="audio/*" multiple onChange={handleFileUpload} />
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg blur opacity-75 group-hover:opacity-100 transition duration-200"></div>
              <div className="relative flex items-center gap-2 px-8 py-4 bg-slate-900 rounded-lg leading-none border border-slate-700 group-hover:bg-slate-800 transition">
                <Plus className="text-blue-400" />
                <span className="font-semibold text-white">Upload Audio</span>
              </div>
            </label>
          </div>
        )}

        {/* Workspace */}
        {tracks.length > 0 && (
          <div className="space-y-8 animate-fade-in">
            
            {/* Timeline */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Timeline Preview</h2>
                <div className="text-sm font-mono text-blue-400 bg-blue-900/20 px-3 py-1 rounded-full border border-blue-900/50">
                  {playbackState.currentTime.toFixed(2)}s / {playbackState.totalDuration.toFixed(2)}s
                </div>
              </div>
              <Timeline 
                tracks={tracks} 
                currentTime={playbackState.currentTime} 
                totalDuration={playbackState.totalDuration} 
              />
              
              {/* Playback Controls */}
              <div className="flex items-center justify-center gap-6 mt-6">
                <button
                  onClick={togglePlayPause}
                  className="w-14 h-14 flex items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/50 transition-transform active:scale-95"
                >
                  {playbackState.isPlaying ? <Pause fill="currentColor" /> : <Play fill="currentColor" className="ml-1" />}
                </button>
              </div>
            </section>

            {/* Track List */}
            <section className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">Audio Tracks</h2>
                
                {/* Add Next Audio Track Option - Pops up here as requested */}
                <label className="cursor-pointer">
                  <input type="file" className="hidden" accept="audio/*" multiple onChange={handleFileUpload} />
                  <div className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors font-medium px-4 py-2 hover:bg-blue-900/20 rounded-lg">
                    <Plus size={16} />
                    Add Next Track
                  </div>
                </label>
              </div>

              <div className="space-y-4">
                {tracks.map(track => (
                  <TrackItem 
                    key={track.id} 
                    track={track} 
                    onRemove={removeTrack}
                    onStartTimeChange={updateTrackStartTime}
                  />
                ))}
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Global Processing Indicator */}
      {processingState.isProcessing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center">
           <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700 shadow-2xl flex flex-col items-center animate-bounce-in">
             <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
             <p className="text-white font-medium">{processingState.message}</p>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;