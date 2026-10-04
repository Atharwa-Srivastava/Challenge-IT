import React, { useState } from 'react';
import { Volume2, VolumeX, Sparkles, Home as HomeIcon, Lock, Unlock, LogOut } from 'lucide-react';
import { sounds } from '../utils/soundEffects';

export default function Navbar({
  onGoHome,
  currentRole,
  isHostAuthenticated,
  onOpenHostLogin,
  onHostLogout
}) {
  const [muted, setMuted] = useState(sounds.muted);

  const handleToggleSound = () => {
    const isMuted = sounds.toggleMute();
    setMuted(isMuted);
  };

  return (
    <header className="w-full bg-slate-900/90 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
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

      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Host Login / Status Badge */}
        {isHostAuthenticated ? (
          <div className="flex items-center gap-1.5">
            <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-700/60 text-purple-300 text-xs font-bold">
              <Unlock className="w-3.5 h-3.5 text-purple-400" />
              <span>Atharwa (Host)</span>
            </span>
            <button
              onClick={onHostLogout}
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-red-400 text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1"
              title="Logout Host"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenHostLogin}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 text-xs font-bold border border-purple-800 transition-all hover:scale-105 active:scale-95 shadow-sm"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Host Login</span>
          </button>
        )}

        {currentRole && (
          <span className="hidden md:inline-block text-xs uppercase tracking-wider font-bold px-3 py-1 bg-slate-800 rounded-full text-slate-300 border border-slate-700">
            {currentRole}
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
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {onGoHome && (
          <button
            onClick={onGoHome}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-medium border border-slate-700 transition-colors"
          >
            <HomeIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Home</span>
          </button>
        )}
      </div>
    </header>
  );
}
