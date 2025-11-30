import React from 'react';
import { AudioTrack } from '../types';
import { Trash2, Music, Clock } from 'lucide-react';

interface TrackItemProps {
  track: AudioTrack;
  onRemove: (id: string) => void;
  onStartTimeChange: (id: string, newTime: number) => void;
}

export const TrackItem: React.FC<TrackItemProps> = ({
  track,
  onRemove,
  onStartTimeChange,
}) => {
  return (
    <div
      className="flex flex-col sm:flex-row items-center gap-4 bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-md transition-all hover:border-slate-600 group"
      style={{ borderLeft: `4px solid ${track.color}` }}
    >
      <div className="flex items-center justify-center h-12 w-12 rounded-full bg-slate-900 text-slate-400">
        <Music size={20} style={{ color: track.color }} />
      </div>

      <div className="flex-1 w-full text-center sm:text-left overflow-hidden">
        <h3 className="font-semibold text-white truncate" title={track.fileName}>
          {track.fileName}
        </h3>
        <p className="text-xs text-slate-400">
          Duration: {track.duration.toFixed(2)}s
        </p>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto">
        <Clock size={16} className="text-slate-500" />
        <div className="flex flex-col">
          <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Start Time (s)</label>
          <input
            type="number"
            min="0"
            step="0.1"
            value={track.startTime}
            onChange={(e) => onStartTimeChange(track.id, parseFloat(e.target.value) || 0)}
            className="w-full sm:w-24 bg-slate-900 border border-slate-700 text-white px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <button
        onClick={() => onRemove(track.id)}
        className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-700 rounded-full transition-colors"
        title="Remove Track"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
};
