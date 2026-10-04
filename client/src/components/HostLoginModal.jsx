import React, { useState } from 'react';
import { Lock, User, KeyRound, AlertCircle, X, ShieldCheck } from 'lucide-react';

export default function HostLoginModal({ isOpen, onClose, onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/host/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onLoginSuccess({ username: username.trim(), password });
        onClose();
      } else {
        setError(data.message || 'Invalid username or password.');
      }
    } catch (err) {
      // Fallback check if offline or network issue
      if (username.trim() === 'Atharwa_sri' && password === 'Atharwa@Aug') {
        onLoginSuccess({ username: 'Atharwa_sri', password: 'Atharwa@Aug' });
        onClose();
      } else {
        setError('Incorrect username or password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="bg-[#121214] border border-white/[0.12] rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative animate-subtle-fade">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-neutral-400 hover:text-white p-2 rounded-full hover:bg-white/[0.08] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.06] border border-white/10 text-white flex items-center justify-center mx-auto mb-3 shadow-sm">
            <ShieldCheck className="w-6 h-6 text-neutral-200" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-white">Host Portal Login</h2>
          <p className="text-neutral-400 text-xs sm:text-sm mt-1 font-normal">
            Enter host credentials to manage quizzes and host live rooms.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/40 border border-red-500/30 rounded-2xl text-red-300 text-xs sm:text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-medium text-neutral-400 mb-1.5">
              Host Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-3 text-neutral-500" />
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full bg-white/[0.04] border border-white/15 rounded-xl pl-10 pr-4 py-2.5 text-white font-normal placeholder-neutral-600 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20 text-sm transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider font-medium text-neutral-400 mb-1.5">
              Host Password
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3.5 top-3 text-neutral-500" />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-white/[0.04] border border-white/15 rounded-xl pl-10 pr-4 py-2.5 text-white font-normal placeholder-neutral-600 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20 text-sm transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-white text-black hover:bg-neutral-200 font-semibold text-sm rounded-full shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-3 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{loading ? 'Verifying...' : 'Unlock Host Dashboard'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
