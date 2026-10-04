import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Sparkles, Home as HomeIcon, Lock, Unlock, LogOut } from 'lucide-react';
import { sounds } from '../utils/soundEffects';

export default function Navbar({
  onGoHome,
  currentRole,
  isHostAuthenticated,
  hostUsername,
  onOpenHostLogin,
  onHostLogout
}) {
  const [muted, setMuted] = useState(sounds.muted);

  useEffect(() => {
    const unsub = sounds.subscribe((status) => {
      setMuted(status.muted);
    });
    return () => unsub();
  }, []);

  const handleToggleSound = () => {
    sounds.toggleMute();
  };

  return (
    <header className="w-full bg-black/95 backdrop-blur-md border-b border-neutral-800 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
      <div 
        onClick={onGoHome} 
        className="flex items-center gap-2 cursor-pointer group transition-transform active:scale-95"
      >
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-pink-600 to-amber-500 flex items-center justify-center shadow-lg shadow-purple-500/30 group-hover:rotate-6 transition-transform">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <span className="text-2xl font-black tracking-tight text-white flex items-center">
          Orbit<span className="text-purple-400 font-extrabold italic ml-0.5">.</span>
          <span className="text-xs ml-2 px-2 py-0.5 bg-neutral-900 text-purple-300 border border-neutral-800 rounded-full font-semibold">
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
              <span>{hostUsername || 'Host'}</span>
            </span>
            <button
              onClick={onHostLogout}
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-red-400 text-xs font-semibold border border-neutral-800 transition-colors flex items-center gap-1"
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
          <span className="hidden md:inline-block text-xs uppercase tracking-wider font-bold px-3 py-1 bg-neutral-900 rounded-full text-neutral-300 border border-neutral-800">
            {currentRole}
          </span>
        )}

        <button
          onClick={handleToggleSound}
          className={`p-2 rounded-xl border transition-all ${
            muted
              ? 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
              : 'bg-purple-950 text-purple-300 border-purple-800 hover:bg-purple-900/80'
          }`}
          title={muted ? 'Unmute Sound Effects' : 'Mute Sound Effects'}
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {onGoHome && (
          <button
            onClick={onGoHome}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs sm:text-sm font-medium border border-neutral-800 transition-colors"
          >
            <HomeIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Home</span>
          </button>
        )}
      </div>
    </header>
  );
}
