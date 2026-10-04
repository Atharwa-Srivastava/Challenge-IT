import React, { useState, useEffect } from 'react';
import { Play, PlusCircle, Sparkles, Users, HelpCircle, ArrowRight, Eye, Trash2, Smartphone, Monitor } from 'lucide-react';
import { KAHOOT_COLORS } from '../constants';

export default function Home({
  onHostQuiz,
  onJoinWithPin,
  onCreateQuiz,
  isHostAuthenticated,
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
          'x-host-auth': 'Atharwa_sri:Atharwa@Aug'
        }
      });
      if (res.ok) {
        const data = await res.json();
        setQuizzes(data);
      }
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
      const res = await fetch(`/api/quizzes/${quizId}`, {
        method: 'DELETE',
        headers: { 'x-host-auth': 'Atharwa_sri:Atharwa@Aug' }
      });
      if (res.ok) {
        setQuizzes(quizzes.filter(q => q.id !== quizId));
      }
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
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-900/50 via-slate-900 to-slate-950 border border-purple-500/30 p-8 sm:p-12 shadow-2xl">
        {/* Floating background decorative shapes */}
        <div className="absolute top-4 right-8 text-red-500/20 text-7xl font-black select-none pointer-events-none animate-pulse">
          ▲
        </div>
        <div className="absolute bottom-6 right-24 text-blue-500/20 text-6xl font-black select-none pointer-events-none animate-float">
          ◆
        </div>
        <div className="absolute top-1/2 right-48 text-amber-500/20 text-5xl font-black select-none pointer-events-none">
          ●
        </div>

        <div className="max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 text-xs font-bold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" /> Real-time Interactive Trivia
          </div>
          <h1 className="text-4xl sm:text-6xl font-black text-white leading-tight mb-4">
            Play, Compete &amp; Master Trivia <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">Live!</span>
          </h1>
          <p className="text-slate-300 text-base sm:text-lg mb-8 leading-relaxed">
            Enter your Game PIN below to join the live room, compete on speed and accuracy, and claim the podium!
          </p>

          {/* Quick Join PIN input */}
          <form onSubmit={handleQuickJoin} className="flex flex-col sm:flex-row gap-3 max-w-md">
            <input
              type="text"
              maxLength={6}
              placeholder="Enter Game PIN..."
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
              className="flex-1 bg-slate-950/90 border border-slate-700 rounded-2xl px-5 py-3.5 text-white font-black text-lg placeholder-slate-500 focus:outline-none focus:border-purple-500 tracking-wider text-center sm:text-left"
            />
            <button
              type="submit"
              disabled={pinInput.trim().length < 4}
              className={`px-8 py-3.5 rounded-2xl font-black text-base transition-all shadow-lg ${
                pinInput.trim().length >= 4
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-purple-600/30 active:scale-95'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
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
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold uppercase tracking-wider text-purple-400 bg-purple-950/80 px-3 py-1 rounded-full border border-purple-800">
                Host Control Center
              </span>
              <span className="text-slate-400 text-xs sm:text-sm">
                (Visible only to Atharwa)
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
          className="group cursor-pointer bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-purple-500/60 rounded-3xl p-6 sm:p-8 transition-all shadow-xl hover:shadow-purple-500/10"
        >
          <div className="w-14 h-14 rounded-2xl bg-purple-600/20 border border-purple-500/40 text-purple-300 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Monitor className="w-7 h-7" />
          </div>
          <h3 className="text-2xl font-black text-white mb-2 group-hover:text-purple-300 transition-colors">
            Host a Live Game
          </h3>
          <p className="text-slate-400 text-sm mb-4 leading-relaxed">
            Pick from our pre-made trivia collections or run your own customized quiz. You control the pace, timer, and leaderboard!
          </p>
          <div className="inline-flex items-center gap-1.5 text-purple-400 font-bold text-sm">
            <span>Browse quiz library</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        <div
          onClick={handleCreateAction}
          className="group cursor-pointer bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-pink-500/60 rounded-3xl p-6 sm:p-8 transition-all shadow-xl hover:shadow-pink-500/10"
        >
          <div className="w-14 h-14 rounded-2xl bg-pink-600/20 border border-pink-500/40 text-pink-300 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <PlusCircle className="w-7 h-7" />
          </div>
          <h3 className="text-2xl font-black text-white mb-2 group-hover:text-pink-300 transition-colors">
            Create Custom Quiz
          </h3>
          <p className="text-slate-400 text-sm mb-4 leading-relaxed">
            Craft your own questions, configure response timers, double-point rounds, and export or import quizzes as JSON.
          </p>
          <div className="inline-flex items-center gap-1.5 text-pink-400 font-bold text-sm">
            <span>Open Quiz Studio</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
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
            <p className="text-slate-400 text-sm mt-0.5">
              Choose a quiz to launch a live room right now
            </p>
          </div>

          <button
            onClick={handleCreateAction}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold rounded-xl border border-slate-700 transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New</span>
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-slate-900/50 rounded-3xl animate-pulse border border-slate-800" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes.map((quiz) => {
              const isCustom = !quiz.id.startsWith('quiz-');

              return (
                <div
                  key={quiz.id}
                  className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-3xl p-6 shadow-xl flex flex-col justify-between transition-all hover:-translate-y-1 hover:shadow-2xl group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <span className="text-4xl p-2 rounded-2xl bg-slate-800/80 border border-slate-700/60 shadow">
                        {quiz.coverImage || '⚡'}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-purple-950/80 text-purple-300 border border-purple-800">
                          {quiz.questions?.length || 0} Questions
                        </span>

                        {isCustom && isHostAuthenticated && (
                          <button
                            onClick={(e) => handleDeleteQuiz(quiz.id, e)}
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition-colors"
                            title="Delete quiz"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <h4 className="text-xl font-extrabold text-white mb-1.5 group-hover:text-purple-300 transition-colors">
                      {quiz.title}
                    </h4>
                    <p className="text-slate-400 text-sm line-clamp-2 mb-4">
                      {quiz.description || 'Fast paced multiplayer trivia!'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-4 border-t border-slate-800/80">
                    <button
                      onClick={() => setPreviewQuiz(quiz)}
                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      title="Preview Questions"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleHostAction(quiz)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-sm shadow-lg shadow-purple-600/30 transition-all active:scale-95"
                    >
                      <Play className="w-4 h-4 fill-current" />
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
      <div className="bg-slate-900/50 border border-slate-800/80 rounded-3xl p-6 sm:p-8">
        <h3 className="text-lg font-bold text-white mb-6 text-center uppercase tracking-wider text-slate-300">
          How to Play Kahoot! Clone
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-red-500/20 text-red-400 border border-red-500/40 flex items-center justify-center font-black shrink-0">
              1
            </div>
            <div>
              <h4 className="font-bold text-white text-base">Host Launches Room</h4>
              <p className="text-slate-400 text-sm mt-1">
                Host logs in, starts a room, and shares the PIN or direct invite link.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/40 flex items-center justify-center font-black shrink-0">
              2
            </div>
            <div>
              <h4 className="font-bold text-white text-base">Players Join Instantly</h4>
              <p className="text-slate-400 text-sm mt-1">
                Players open the link, enter their nickname, pick an emoji, and jump in without any login required!
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-black shrink-0">
              3
            </div>
            <div>
              <h4 className="font-bold text-white text-base">Speed &amp; Accuracy Wins</h4>
              <p className="text-slate-400 text-sm mt-1">
                Questions display on host screen, players tap 4 shapes to climb the podium!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Question Preview Modal */}
      {previewQuiz && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{previewQuiz.coverImage}</span>
                <div>
                  <h3 className="text-xl font-bold text-white">{previewQuiz.title}</h3>
                  <span className="text-xs text-purple-400 font-semibold">
                    {previewQuiz.questions?.length} Questions
                  </span>
                </div>
              </div>
              <button
                onClick={() => setPreviewQuiz(null)}
                className="text-slate-400 hover:text-white p-2"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {previewQuiz.questions?.map((q, idx) => (
                <div key={idx} className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-purple-400 uppercase">Question {idx + 1}</span>
                    <span className="text-xs text-slate-500">{q.timeLimit}s • {q.points} pts</span>
                  </div>
                  <h4 className="text-base font-semibold text-white mb-3">{q.question}</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {q.options?.map((opt, optIdx) => {
                      const isCorrect = isHostAuthenticated && optIdx === q.correctIndex;
                      return (
                        <div
                          key={optIdx}
                          className={`p-2 rounded-xl border flex items-center gap-2 ${
                            isCorrect
                              ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 font-bold'
                              : 'bg-slate-900 border-slate-800 text-slate-400'
                          }`}
                        >
                          <span>{KAHOOT_COLORS[optIdx]?.shape}</span>
                          <span className="truncate">{opt}</span>
                          {isCorrect && <span className="ml-auto">✓</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-800 flex justify-end gap-3">
              <button
                onClick={() => setPreviewQuiz(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold text-sm"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const target = previewQuiz;
                  setPreviewQuiz(null);
                  handleHostAction(target);
                }}
                className="px-5 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl text-sm shadow"
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
