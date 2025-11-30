import React, { useMemo } from 'react';
import { AudioTrack } from '../types';

interface TimelineProps {
  tracks: AudioTrack[];
  currentTime: number;
  totalDuration: number;
}

export const Timeline: React.FC<TimelineProps> = ({ tracks, currentTime, totalDuration }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Determine scale: ensure the timeline fits at least the total duration
  // Min width of 100% or more if duration is long. 
  // Let's create a visual scale: 1 second = X pixels.
  // To keep it responsive, we work with percentages relative to totalDuration.
  
  const safeDuration = Math.max(totalDuration, 1); // Avoid division by zero

  const progressPercent = (currentTime / safeDuration) * 100;

  return (
    <div className="w-full bg-slate-900 rounded-lg p-4 border border-slate-800 overflow-hidden relative">
      <div className="flex justify-between text-xs text-slate-500 mb-2">
        <span>00:00</span>
        <span>{new Date(safeDuration * 1000).toISOString().substr(14, 5)}</span>
      </div>

      <div className="relative h-40 w-full bg-slate-950 rounded border border-slate-800 overflow-x-auto custom-scrollbar">
        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 shadow-[0_0_10px_rgba(239,68,68,0.5)] transition-all duration-100 ease-linear"
          style={{ left: `${progressPercent}%` }}
        />

        {/* Tracks Visualization */}
        <div className="relative w-full h-full min-w-full">
            {tracks.map((track, index) => {
              const left = (track.startTime / safeDuration) * 100;
              const width = (track.duration / safeDuration) * 100;
              const top = 10 + index * 30; // Stagger tracks vertically

              return (
                <div
                  key={track.id}
                  className="absolute h-6 rounded-md flex items-center px-2 overflow-hidden text-[10px] text-white whitespace-nowrap shadow-sm z-10 opacity-90 hover:opacity-100 transition-opacity"
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    backgroundColor: track.color,
                    top: `${top}px`,
                  }}
                  title={`${track.fileName} (Starts at ${track.startTime}s)`}
                >
                  {track.fileName}
                </div>
              );
            })}
            
            {/* Grid lines for visual reference */}
            {Array.from({ length: 10 }).map((_, i) => (
                <div 
                    key={i} 
                    className="absolute top-0 bottom-0 border-r border-slate-900 pointer-events-none"
                    style={{ left: `${(i + 1) * 10}%` }}
                />
            ))}
        </div>
      </div>
    </div>
  );
};
