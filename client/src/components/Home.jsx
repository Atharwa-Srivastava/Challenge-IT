import React, { useState, useEffect } from 'react';
import { Play, PlusCircle, Sparkles, Users, HelpCircle, ArrowRight, Eye, Trash2, Smartphone, Monitor } from 'lucide-react';
import { KAHOOT_COLORS } from '../constants';
import { getHostAuthHeader } from '../utils/auth';

export default function Home({
  onHostQuiz,
  onJoinWithPin,
  onCreateQuiz,
  isHostAuthenticated,
  hostUsername,
  onOpenHostLogin
}) {
  const [quizzes, setQuizzes] = useState([]);
  const [pinInput, setPinInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [previewQuiz, setPreviewQuiz] = useState(null);

  const handleHostAction = (quiz) => {
    if (!isHostAuthenticated) {
      onOpenHostLogin();
      return;
    }
    onHostQuiz(quiz);
  };

  const handleCreateAction = () => {
    if (!isHostAuthenticated) {
      onOpenHostLogin();
      return;
    }
    onCreateQuiz();
  };

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/quizzes', {
        headers: {
          'x-host-auth': getHostAuthHeader()
        }
      });
      let serverQuizzes = [];
      if (res.ok) {
        serverQuizzes = await res.json();
      }

      // Merge with localStorage backup
      let localQuizzes = [];
      try {
        localQuizzes = JSON.parse(localStorage.getItem('kahoot_custom_quizzes') || '[]');
      } catch (e) {}

      const combined = [...serverQuizzes];
      for (const lq of localQuizzes) {
        if (!combined.some(sq => sq.id === lq.id)) {
          combined.push(lq);
        }
      }

      setQuizzes(combined);
    } catch (e) {
      console.error('Error fetching quizzes:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isHostAuthenticated) {
      fetchQuizzes();
    } else {
      setQuizzes([]);
      setLoading(false);
    }
  }, [isHostAuthenticated]);

  const handleDeleteQuiz = async (quizId, e) => {
    e.stopPropagation();
    if (!isHostAuthenticated) {
      onOpenHostLogin();
      return;
    }
    if (!confirm('Are you sure you want to delete this custom quiz?')) return;
    try {
      // Remove from server
      await fetch(`/api/quizzes/${quizId}`, {
        method: 'DELETE',
        headers: { 'x-host-auth': getHostAuthHeader() }
      });
      // Remove from local backup
      try {
        const stored = JSON.parse(localStorage.getItem('kahoot_custom_quizzes') || '[]');
        localStorage.setItem('kahoot_custom_quizzes', JSON.stringify(stored.filter(q => q.id !== quizId)));
      } catch (e) {}
      setQuizzes(quizzes.filter(q => q.id !== quizId));
    } catch (err) {
      alert('Failed to delete quiz.');
    }
  };

  const handleQuickJoin = (e) => {
    e.preventDefault();
    if (pinInput.trim().length >= 4) {
      onJoinWithPin(pinInput.trim());
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-12">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-[#09090b] border border-white/[0.08] p-8 sm:p-14 shadow-2xl bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(255,255,255,0.06),rgba(0,0,0,0))]">
        <div className="max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/10 text-neutral-300 text-xs font-medium uppercase tracking-wider mb-4">
            <Sparkles className="w-3 h-3 text-neutral-300" /> Real-time Interactive Trivia
          </div>
          <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight text-white leading-tight mb-4">
            Simple. Fast. <span className="text-neutral-400">Live.</span>
          </h1>
          <p className="text-neutral-400 text-base sm:text-lg mb-8 leading-relaxed font-normal">
            Enter your Game PIN below to join the live room, compete on speed and accuracy, and climb the podium.
          </p>

          {/* Quick Join PIN input */}
          <form onSubmit={handleQuickJoin} className="flex flex-col sm:flex-row gap-2.5 max-w-md">
            <input
              type="text"
              maxLength={6}
              placeholder="Game PIN"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
              className="flex-1 bg-white/[0.04] border border-white/15 rounded-full px-5 py-3 text-white font-mono text-lg placeholder-neutral-600 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20 tracking-widest text-center sm:text-left transition-colors"
            />
            <button
              type="submit"
              disabled={pinInput.trim().length < 4}
              className={`px-7 py-3 rounded-full font-semibold text-sm transition-all active:scale-[0.98] ${
                pinInput.trim().length >= 4
                  ? 'bg-white text-black hover:bg-neutral-200 shadow-md cursor-pointer'
                  : 'bg-white/[0.06] text-neutral-500 border border-white/[0.08] cursor-not-allowed'
              }`}
            >
              Join Game
            </button>
          </form>
        </div>
      </div>

      {/* Host Controls & Quiz Library (Visible ONLY to Logged-in Host) */}
      {isHostAuthenticated && (
        <>
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-semibold text-neutral-300 bg-white/[0.06] px-3 py-1 rounded-full border border-white/10">
                Host Control Center
              </span>
              <span className="text-neutral-500 text-xs sm:text-sm">
                (Logged in: {hostUsername || 'Host'})
              </span>
            </div>
          </div>

          {/* Action Cards (Host or Build) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              onClick={() => {
                const el = document.getElementById('quiz-library');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="group cursor-pointer bg-[#101012] hover:bg-[#151518] border border-white/[0.08] hover:border-white/20 rounded-3xl p-6 sm:p-8 transition-all shadow-xl"
            >
              <div className="w-12 h-12 rounded-2xl bg-white/[0.06] border border-white/10 text-white flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Monitor className="w-6 h-6 text-neutral-200" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-neutral-200 transition-colors">
                Host a Live Game
              </h3>
              <p className="text-neutral-400 text-sm mb-4 leading-relaxed font-normal">
                Pick from our pre-made trivia collections or run your own customized quiz. You control the pace, timer, and leaderboard.
              </p>
              <div className="inline-flex items-center gap-1.5 text-white font-medium text-xs">
                <span>Browse quiz library</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            <div
              onClick={handleCreateAction}
              className="group cursor-pointer bg-[#101012] hover:bg-[#151518] border border-white/[0.08] hover:border-white/20 rounded-3xl p-6 sm:p-8 transition-all shadow-xl"
            >
              <div className="w-12 h-12 rounded-2xl bg-white/[0.06] border border-white/10 text-white flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <PlusCircle className="w-6 h-6 text-neutral-200" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-neutral-200 transition-colors">
                Create Custom Quiz
              </h3>
              <p className="text-neutral-400 text-sm mb-4 leading-relaxed font-normal">
                Craft your own questions, configure response timers, double-point rounds, and export or import quizzes as JSON.
              </p>
              <div className="inline-flex items-center gap-1.5 text-white font-medium text-xs">
                <span>Open Quiz Studio</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>

      {/* Quiz Library Showcase */}
      <div id="quiz-library" className="space-y-6 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-amber-400" />
              Featured Quiz Library
            </h2>
            <p className="text-neutral-400 text-sm mt-0.5">
              Choose a quiz to launch a live room right now
            </p>
          </div>

          <button
            onClick={handleCreateAction}
            className="flex items-center gap-2 px-4 py-1.5 bg-white/[0.06] hover:bg-white/[0.12] text-white text-xs font-medium rounded-full border border-white/10 transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Create New</span>
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-[#101012] rounded-3xl animate-pulse border border-white/[0.08]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes.map((quiz) => {
              const isCustom = !quiz.id.startsWith('quiz-');

              return (
                <div
                  key={quiz.id}
                  className="bg-[#101012] border border-white/[0.08] hover:border-white/20 rounded-3xl p-6 shadow-xl flex flex-col justify-between transition-all group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <span className="w-12 h-12 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-2xl shadow-sm">
                        {quiz.coverImage || '⚡'}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full font-medium bg-white/[0.06] text-neutral-300 border border-white/10">
                          {quiz.questions?.length || 0} Questions
                        </span>

                        {isCustom && isHostAuthenticated && (
                          <button
                            onClick={(e) => handleDeleteQuiz(quiz.id, e)}
                            className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-white/[0.06] rounded-lg transition-colors"
                            title="Delete quiz"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <h4 className="text-lg font-semibold text-white mb-1.5 group-hover:text-neutral-200 transition-colors">
                      {quiz.title}
                    </h4>
                    <p className="text-neutral-400 text-xs sm:text-sm line-clamp-2 mb-4 font-normal">
                      {quiz.description || 'Fast paced multiplayer trivia!'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-4 border-t border-white/[0.06]">
                    <button
                      onClick={() => setPreviewQuiz(quiz)}
                      className="p-2.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-neutral-300 hover:text-white border border-white/10 transition-colors"
                      title="Preview Questions"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleHostAction(quiz)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-full bg-white text-black hover:bg-neutral-200 font-semibold text-xs sm:text-sm shadow-sm transition-all active:scale-[0.98]"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Host Game</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </>
      )}

      {/* How It Works Banner */}
      <div className="bg-[#101012] border border-white/[0.08] rounded-3xl p-6 sm:p-8">
        <h3 className="text-xs font-semibold text-neutral-400 mb-6 text-center uppercase tracking-wider">
          How Orbit Works
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-white/[0.08] text-white border border-white/15 flex items-center justify-center text-xs font-semibold shrink-0">
              1
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm">Host Launches Room</h4>
              <p className="text-neutral-400 text-xs mt-1 leading-relaxed font-normal">
                Host logs in, starts a room, and shares the 6-digit Game PIN or direct join link.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-white/[0.08] text-white border border-white/15 flex items-center justify-center text-xs font-semibold shrink-0">
              2
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm">Players Join Instantly</h4>
              <p className="text-neutral-400 text-xs mt-1 leading-relaxed font-normal">
                Players open the link, enter a nickname, pick a mascot, and jump right in with zero setup.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-white/[0.08] text-white border border-white/15 flex items-center justify-center text-xs font-semibold shrink-0">
              3
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm">Speed &amp; Accuracy Wins</h4>
              <p className="text-neutral-400 text-xs mt-1 leading-relaxed font-normal">
                Questions display in real time. Fast, accurate answers climb the live leaderboard.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Question Preview Modal */}
      {previewQuiz && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-[#121214] border border-white/[0.12] rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-6 border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{previewQuiz.coverImage}</span>
                <div>
                  <h3 className="text-lg font-semibold text-white">{previewQuiz.title}</h3>
                  <span className="text-xs text-neutral-400 font-medium">
                    {previewQuiz.questions?.length} Questions
                  </span>
                </div>
              </div>
              <button
                onClick={() => setPreviewQuiz(null)}
                className="text-neutral-400 hover:text-white p-2 rounded-full hover:bg-white/[0.08] transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {previewQuiz.questions?.map((q, idx) => (
                <div key={idx} className="bg-[#09090b] border border-white/[0.08] rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">Question {idx + 1}</span>
                    <span className="text-xs text-neutral-500 font-mono">{q.timeLimit}s • {q.points} pts</span>
                  </div>
                  <h4 className="text-sm font-semibold text-white mb-3">{q.question}</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {q.options?.map((opt, optIdx) => {
                      const isCorrect = isHostAuthenticated && optIdx === q.correctIndex;
                      return (
                        <div
                          key={optIdx}
                          className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                            isCorrect
                              ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-300 font-medium'
                              : 'bg-white/[0.03] border-white/[0.06] text-neutral-400'
                          }`}
                        >
                          <span className="text-neutral-500 text-xs">{KAHOOT_COLORS[optIdx]?.shape}</span>
                          <span className="truncate">{opt}</span>
                          {isCorrect && <span className="ml-auto text-emerald-400">✓</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-white/[0.08] flex justify-end gap-2.5">
              <button
                onClick={() => setPreviewQuiz(null)}
                className="px-4 py-2 bg-white/[0.06] hover:bg-white/[0.12] text-neutral-300 border border-white/10 rounded-full font-medium text-xs sm:text-sm transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const target = previewQuiz;
                  setPreviewQuiz(null);
                  handleHostAction(target);
                }}
                className="px-5 py-2 bg-white text-black hover:bg-neutral-200 font-semibold rounded-full text-xs sm:text-sm shadow-sm transition-all active:scale-[0.98]"
              >
                Host This Quiz
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
