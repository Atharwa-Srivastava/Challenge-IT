import React, { useState } from 'react';
import { Volume2, VolumeX, Sparkles, Home as HomeIcon } from 'lucide-react';
import { sounds } from '../utils/soundEffects';

export default function Navbar({ onGoHome, currentRole }) {
  const [muted, setMuted] = useState(sounds.muted);

  const handleToggleSound = () => {
    const isMuted = sounds.toggleMute();
    setMuted(isMuted);
  };

  return (
    <header className="w-full bg-slate-900/90 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
      <div 
        onClick={onGoHome} 
        className="flex items-center gap-2 cursor-pointer group transition-transform active:scale-95"
      >
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-pink-600 to-amber-500 flex items-center justify-center shadow-lg shadow-purple-500/30 group-hover:rotate-6 transition-transform">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <span className="text-2xl font-black tracking-tight text-white flex items-center">
          Kahoot<span className="text-purple-400 font-extrabold italic ml-0.5">!</span>
          <span className="text-xs ml-2 px-2 py-0.5 bg-purple-950 text-purple-300 border border-purple-800 rounded-full font-semibold">
            LIVE
          </span>
        </span>
      </div>

      <div className="flex items-center gap-3">
        {currentRole && (
          <span className="hidden sm:inline-block text-xs uppercase tracking-wider font-bold px-3 py-1 bg-slate-800 rounded-full text-slate-300 border border-slate-700">
            Role: <span className="text-purple-400">{currentRole}</span>
          </span>
        )}

        <button
          onClick={handleToggleSound}
          className={`p-2 rounded-xl border transition-all ${
            muted
              ? 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              : 'bg-purple-900/40 text-purple-300 border-purple-700/50 hover:bg-purple-900/60'
          }`}
          title={muted ? 'Unmute Sound Effects' : 'Mute Sound Effects'}
        >
          {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>

        {onGoHome && (
          <button
            onClick={onGoHome}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700 transition-colors"
          >
            <HomeIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Lobby</span>
          </button>
        )}
      </div>
    </header>
  );
}
