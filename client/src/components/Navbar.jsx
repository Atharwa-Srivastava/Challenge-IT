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
    <header className="w-full bg-black/80 backdrop-blur-2xl border-b border-white/[0.08] px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-40 transition-colors">
      <div 
        onClick={onGoHome} 
        className="flex items-center gap-2.5 cursor-pointer group transition-opacity hover:opacity-85 active:scale-[0.98]"
      >
        <div className="w-8 h-8 rounded-xl bg-white/[0.08] border border-white/15 flex items-center justify-center text-white shadow-inner">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <span className="text-xl font-semibold tracking-tight text-white flex items-center">
          Orbit
          <span className="text-[10px] ml-2 px-2 py-0.5 bg-white/[0.06] text-neutral-400 border border-white/10 rounded-full font-medium tracking-wide uppercase">
            Live
          </span>
        </span>
      </div>

      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Host Login / Status Badge */}
        {isHostAuthenticated ? (
          <div className="flex items-center gap-1.5">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-neutral-200 text-xs font-medium">
              <Unlock className="w-3 h-3 text-neutral-400" />
              <span>{hostUsername || 'Host'}</span>
            </span>
            <button
              onClick={onHostLogout}
              className="px-2.5 py-1 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-neutral-400 hover:text-white text-xs font-medium border border-white/10 transition-colors flex items-center gap-1"
              title="Logout Host"
            >
              <LogOut className="w-3 h-3" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenHostLogin}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white text-black hover:bg-neutral-200 text-xs font-semibold transition-all active:scale-[0.98] shadow-sm"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Host Login</span>
          </button>
        )}

        {currentRole && (
          <span className="hidden md:inline-block text-[11px] uppercase tracking-wider font-semibold px-3 py-1 bg-white/[0.04] rounded-full text-neutral-400 border border-white/[0.08]">
            {currentRole}
          </span>
        )}

        <button
          onClick={handleToggleSound}
          className="p-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-neutral-300 hover:text-white border border-white/10 transition-colors"
          title={muted ? 'Unmute Sound' : 'Mute Sound'}
        >
          {muted ? <VolumeX className="w-3.5 h-3.5 text-neutral-500" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>

        {onGoHome && (
          <button
            onClick={onGoHome}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-neutral-200 text-xs font-medium border border-white/10 transition-colors"
          >
            <HomeIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Home</span>
          </button>
        )}
      </div>
    </header>
  );
}
