import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Users, Play, Copy, Check, FastForward, Trophy,
  Flame, Award, ArrowRight, RotateCcw, AlertCircle, ShieldAlert, Share2, QrCode, Maximize2, X
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { KAHOOT_COLORS } from '../constants';
import { sounds } from '../utils/soundEffects';

export default function HostView({ socket, pin, quizInfo, onExit }) {
  const [gameState, setGameState] = useState('LOBBY'); // LOBBY, COUNTDOWN, QUESTION, REVEAL, LEADERBOARD, PODIUM
  const [players, setPlayers] = useState([]);
  const [copiedPin, setCopiedPin] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [showLargeQr, setShowLargeQr] = useState(false);

  // Question state
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(quizInfo?.questionsCount || 5);
  const [remainingSeconds, setRemainingSeconds] = useState(20);
  const [answersCount, setAnswersCount] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);

  // Reveal state
  const [revealData, setRevealData] = useState(null);

  // Leaderboard state
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [isLastQuestion, setIsLastQuestion] = useState(false);

  // Podium state
  const [podiumData, setPodiumData] = useState(null);

  useEffect(() => {
    if (!socket) return;

    // Lobby updates
    socket.on('lobby:updated', (data) => {
      setPlayers(data.players || []);
      setTotalPlayers(data.players?.length || 0);
    });

    // Countdown before question
    socket.on('game:countdown', (data) => {
      setGameState('COUNTDOWN');
      setCountdown(data.countdown);
      setQuestionIndex(data.questionNumber - 1);
      setTotalQuestions(data.totalQuestions);
      sounds.playCountdownTick(false);
    });

    socket.on('game:countdown_tick', (data) => {
      setCountdown(data.countdown);
      sounds.playCountdownTick(false);
    });

    // Question start
    socket.on('host:question_started', (data) => {
      setGameState('QUESTION');
      setCurrentQuestion(data.question);
      setQuestionIndex(data.questionIndex);
      setTotalQuestions(data.totalQuestions);
      setRemainingSeconds(data.question.timeLimit);
      setAnswersCount(0);
      setTotalPlayers(data.playerCount);
      sounds.playStartQuestion();
    });

    // Timer tick
    socket.on('game:timer_tick', (data) => {
      setRemainingSeconds(data.remainingSeconds);
      if (data.remainingSeconds <= 5 && data.remainingSeconds > 0) {
        sounds.playCountdownTick(true);
      }
    });

    // Real-time answer updates
    socket.on('host:answer_received', (data) => {
      setAnswersCount(data.answersCount);
      setTotalPlayers(data.totalPlayers);
    });

    // Answer reveal
    socket.on('host:answer_reveal', (data) => {
      setGameState('REVEAL');
      setRevealData(data);
    });

    // Leaderboard
    socket.on('game:leaderboard', (data) => {
      setGameState('LEADERBOARD');
      setLeaderboardData(data.topPlayers || []);
      setIsLastQuestion(data.isLastQuestion);
    });

    // Final podium
    socket.on('game:final_podium', (data) => {
      setGameState('PODIUM');
      setPodiumData(data);
      sounds.playPodiumFanfare();

      // Launch confetti
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.6 }
      });
      setTimeout(() => {
        confetti({
          particleCount: 100,
          angle: 60,
          spread: 55,
          origin: { x: 0 }
        });
        confetti({
          particleCount: 100,
          angle: 120,
          spread: 55,
          origin: { x: 1 }
        });
      }, 400);
    });

    return () => {
      socket.off('lobby:updated');
      socket.off('game:countdown');
      socket.off('game:countdown_tick');
      socket.off('host:question_started');
      socket.off('game:timer_tick');
      socket.off('host:answer_received');
      socket.off('host:answer_reveal');
      socket.off('game:leaderboard');
      socket.off('game:final_podium');
    };
  }, [socket]);

  const [copiedLink, setCopiedLink] = useState(false);
  const inviteUrl = typeof window !== 'undefined' ? `${window.location.origin}/?pin=${pin}` : '';

  const handleCopyLink = () => {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopyPin = () => {
    navigator.clipboard.writeText(pin);
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2000);
  };

  const handleStartGame = () => {
    if (players.length === 0) return;
    socket.emit('game:start', { pin });
  };

  const handleKickPlayer = (socketId) => {
    socket.emit('room:kick_player', { pin, targetSocketId: socketId });
  };

  const handleProceedToLeaderboard = () => {
    socket.emit('game:show_leaderboard', { pin });
  };

  const handleNextQuestion = () => {
    socket.emit('game:next_question', { pin });
  };

  const handleRestartGame = () => {
    socket.emit('game:restart', { pin });
    setGameState('LOBBY');
  };

  // 1. LOBBY VIEW
  if (gameState === 'LOBBY') {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col items-center">
        {/* Quiz Banner & Top Info */}
        <div className="w-full text-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-900/50 border border-purple-700/60 text-purple-300 text-sm font-semibold mb-3">
            <span>Quiz:</span>
            <span className="text-white font-bold">{quizInfo?.title || 'Kahoot Challenge'}</span>
            <span className="text-purple-400">• {quizInfo?.questionsCount} Questions</span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-4xl mx-auto shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500" />
            
            <div className="text-center mb-4">
              <span className="text-xs uppercase tracking-widest font-extrabold text-purple-400 bg-purple-950/80 px-3 py-1 rounded-full border border-purple-800">
                3 Ways for Players to Join Live
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* Way 1: Game PIN & Way 2: Direct Link (7 cols) */}
              <div className="md:col-span-7 flex flex-col justify-center space-y-4 text-center md:text-left">
                {/* Way 1: Game PIN */}
                <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs uppercase tracking-wider font-extrabold text-slate-400 flex items-center gap-1.5">
                      <span>1️⃣</span> Game PIN
                    </span>
                    <span className="text-xs text-slate-500">Enter PIN on website</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-4xl sm:text-5xl font-black tracking-widest text-white font-mono drop-shadow">
                      {pin}
                    </span>
                    <button
                      onClick={handleCopyPin}
                      className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-all active:scale-95 text-xs font-bold"
                      title="Copy PIN"
                    >
                      {copiedPin ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedPin ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* Way 2: Direct Join Link */}
                <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs uppercase tracking-wider font-extrabold text-slate-400 flex items-center gap-1.5">
                      <span>2️⃣</span> Direct Group Link
                    </span>
                    <span className="text-xs text-slate-500">Auto-fills PIN</span>
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm border transition-all active:scale-95 shadow-lg ${
                      copiedLink
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border-purple-500 shadow-purple-600/30'
                    }`}
                  >
                    {copiedLink ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                    <span>{copiedLink ? 'Link Copied to Clipboard!' : 'Copy Direct Join Link'}</span>
                  </button>
                  <p className="text-slate-500 font-mono text-[11px] truncate mt-1.5">
                    {inviteUrl}
                  </p>
                </div>
              </div>

              {/* Way 3: QR Code (5 cols) */}
              <div className="md:col-span-5 flex flex-col items-center justify-center p-5 bg-slate-950/90 border border-slate-800 rounded-2xl text-center">
                <div className="flex items-center justify-between w-full mb-3 px-1">
                  <span className="text-xs uppercase tracking-wider font-extrabold text-purple-400 flex items-center gap-1.5">
                    <QrCode className="w-4 h-4" /> 3️⃣ Scan QR Code
                  </span>
                  <button
                    onClick={() => setShowLargeQr(true)}
                    className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-colors"
                    title="Enlarge QR Code"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>

                <div
                  onClick={() => setShowLargeQr(true)}
                  className="p-3 bg-white rounded-2xl shadow-xl hover:scale-105 transition-transform cursor-pointer group relative"
                  title="Click to expand QR Code"
                >
                  <QRCodeSVG
                    value={inviteUrl}
                    size={140}
                    level="H"
                    marginSize={1}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity flex items-center justify-center text-white text-xs font-bold">
                    <Maximize2 className="w-5 h-5 drop-shadow" />
                  </div>
                </div>

                <span className="text-slate-400 text-xs font-semibold mt-2.5">
                  Point smartphone camera to join instantly
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Players Area */}
        <div className="w-full bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl mb-8 min-h-[220px] flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-400" />
              <span className="font-bold text-white text-lg">
                Waiting for Players ({players.length})
              </span>
            </div>

            <button
              onClick={handleStartGame}
              disabled={players.length === 0}
              className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-black text-lg transition-all shadow-xl ${
                players.length > 0
                  ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:opacity-95 text-white active:scale-95 shadow-purple-600/30'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              <Play className="w-5 h-5 fill-current" />
              Start Game
            </button>
          </div>

          {/* Players Grid */}
          <div className="pt-6 flex-1">
            {players.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-36 text-slate-500">
                <div className="w-12 h-12 rounded-full border-4 border-slate-700 border-t-purple-500 animate-spin mb-3" />
                <p className="font-medium text-sm">Waiting for players to join with PIN: {pin}...</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {players.map((p) => (
                  <div
                    key={p.socketId}
                    className="relative group bg-slate-800/80 border border-slate-700 hover:border-red-500/80 rounded-2xl p-3 flex items-center gap-2.5 transition-all shadow-md animate-bounce-in"
                  >
                    <span className="text-2xl">{p.avatar || '🎮'}</span>
                    <span className="font-bold text-white text-sm truncate flex-1">{p.nickname}</span>
                    <button
                      onClick={() => handleKickPlayer(p.socketId)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:bg-red-950 rounded-lg transition-opacity"
                      title="Kick player"
                    >
                      <ShieldAlert className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Large QR Code Modal for Big Screens / Auditoriums */}
        {showLargeQr && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl relative animate-bounce-in">
              <button
                onClick={() => setShowLargeQr(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950 text-purple-300 border border-purple-800 text-xs font-bold uppercase tracking-wider mb-2">
                <QrCode className="w-3.5 h-3.5" />
                <span>Scan to Join Live</span>
              </div>

              <h3 className="text-2xl font-black text-white mb-4">
                Game PIN: <span className="font-mono text-purple-400 tracking-wider">{pin}</span>
              </h3>

              <div className="p-4 bg-white rounded-3xl inline-block shadow-2xl mx-auto mb-4">
                <QRCodeSVG
                  value={inviteUrl}
                  size={240}
                  level="H"
                  marginSize={2}
                />
              </div>

              <p className="text-slate-300 text-xs sm:text-sm font-medium">
                Point your phone camera at the QR code to open the game directly!
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. COUNTDOWN VIEW ("Get Ready!")
  if (gameState === 'COUNTDOWN') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
        <span className="text-purple-400 font-extrabold uppercase tracking-widest text-lg mb-2">
          Question {questionIndex + 1} of {totalQuestions}
        </span>
        <h2 className="text-3xl sm:text-4xl font-black text-white max-w-2xl mb-8">
          Ready to answer?
        </h2>
        <div className="w-36 h-36 rounded-full bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center text-7xl font-black text-white shadow-2xl shadow-purple-600/50 animate-bounce-in">
          {countdown}
        </div>
      </div>
    );
  }

  // 3. QUESTION VIEW
  if (gameState === 'QUESTION' && currentQuestion) {
    const isUrgent = remainingSeconds <= 5;
    return (
      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col min-h-[80vh]">
        {/* Top Header: Q Number, Timer, Answers Count */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="px-4 py-1.5 rounded-xl bg-purple-950 border border-purple-800 text-purple-300 font-bold text-sm">
              Question {questionIndex + 1} of {totalQuestions}
            </span>
          </div>

          {/* Central Countdown Clock */}
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl transition-all shadow-xl ${
              isUrgent
                ? 'bg-red-600 text-white animate-pulse shadow-red-600/50'
                : 'bg-slate-800 border-2 border-purple-500 text-white shadow-purple-500/20'
            }`}
          >
            {remainingSeconds}
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-xs uppercase font-bold text-slate-400 block">Answers</span>
              <span className="text-xl font-black text-white">
                {answersCount} <span className="text-slate-500 font-semibold text-sm">/ {totalPlayers}</span>
              </span>
            </div>

            <button
              onClick={() => socket.emit('player:submit_answer', { pin, answerIndex: -1 })}
              className="flex items-center gap-1 text-xs px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700"
              title="Skip question"
            >
              <FastForward className="w-3.5 h-3.5" /> Skip
            </button>
          </div>
        </div>

        {/* Big Question Prompt Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl text-center mb-8 flex items-center justify-center min-h-[140px]">
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white leading-snug">
            {currentQuestion.question}
          </h1>
        </div>

        {/* 4 Colored Answer Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
          {KAHOOT_COLORS.map((col, idx) => (
            <div
              key={idx}
              className={`rounded-2xl p-6 flex items-center gap-4 shadow-xl transition-all ${col.bg} border ${col.border}`}
            >
              <div className="w-12 h-12 rounded-xl bg-black/25 flex items-center justify-center text-white text-2xl font-black shrink-0">
                {col.shape}
              </div>
              <span className="text-white text-xl sm:text-2xl font-bold">
                {currentQuestion.options[idx]}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 4. ANSWER REVEAL VIEW (Bar Chart + Correct Highlight)
  if (gameState === 'REVEAL' && revealData && currentQuestion) {
    const maxVotes = Math.max(1, ...revealData.distribution);

    return (
      <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col min-h-[80vh]">
        {/* Top status */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">
            Results for Question {questionIndex + 1}
          </span>
          <button
            onClick={handleProceedToLeaderboard}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-2xl shadow-lg shadow-purple-600/30 transition-all active:scale-95"
          >
            <span>Next</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {/* Question recap */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-6 text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            {currentQuestion.question}
          </h2>
          {revealData.explanation && (
            <p className="mt-2 text-sm text-purple-300 font-medium">
              💡 {revealData.explanation}
            </p>
          )}
        </div>

        {/* Answer Distribution Bar Chart */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 flex-1 flex flex-col justify-end">
          <div className="grid grid-cols-4 gap-4 h-64 sm:h-72 items-end">
            {KAHOOT_COLORS.map((col, idx) => {
              const count = revealData.distribution[idx] || 0;
              const isCorrect = idx === revealData.correctIndex;
              const heightPercent = Math.round((count / maxVotes) * 100);

              return (
                <div key={idx} className="flex flex-col items-center h-full justify-end gap-2">
                  <span className="font-black text-lg text-white">{count}</span>
                  <div
                    className={`w-full rounded-2xl transition-all duration-700 flex flex-col items-center justify-end p-2 relative shadow-lg ${
                      isCorrect ? 'ring-4 ring-emerald-400 ring-offset-2 ring-offset-slate-900' : 'opacity-60'
                    }`}
                    style={{
                      height: `${Math.max(18, heightPercent)}%`,
                      backgroundColor: col.colorHex
                    }}
                  >
                    {isCorrect && (
                      <div className="w-6 h-6 rounded-full bg-white text-emerald-600 flex items-center justify-center font-black text-xs mb-1 shadow">
                        ✓
                      </div>
                    )}
                    <span className="text-white text-xl font-bold">{col.shape}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Answer Legend / Labels */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-4 border-t border-slate-800">
            {KAHOOT_COLORS.map((col, idx) => {
              const isCorrect = idx === revealData.correctIndex;
              return (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border text-sm flex items-center gap-2 ${
                    isCorrect
                      ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200 font-bold'
                      : 'bg-slate-800/50 border-slate-700/50 text-slate-400'
                  }`}
                >
                  <span className="text-base">{col.shape}</span>
                  <span className="truncate">{currentQuestion.options[idx]}</span>
                  {isCorrect && <span className="ml-auto text-emerald-400 font-black">✓</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // 5. LEADERBOARD VIEW
  if (gameState === 'LEADERBOARD') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-2">
              <Trophy className="w-8 h-8 text-amber-400" />
              Leaderboard
            </h1>
            <p className="text-slate-400 text-sm">
              Question {questionIndex + 1} of {totalQuestions}
            </p>
          </div>

          <button
            onClick={handleNextQuestion}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-extrabold rounded-2xl shadow-lg shadow-purple-600/30 transition-all active:scale-95"
          >
            <span>{isLastQuestion ? 'Final Results' : 'Next Question'}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {/* Leaderboard Cards */}
        <div className="space-y-3">
          {leaderboardData.map((player, idx) => {
            const isTop1 = idx === 0;
            const isTop2 = idx === 1;
            const isTop3 = idx === 2;

            let rankBadge = (
              <span className="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-sm">
                #{idx + 1}
              </span>
            );

            if (isTop1) {
              rankBadge = (
                <span className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-base shadow-lg shadow-amber-400/30">
                  🥇
                </span>
              );
            } else if (isTop2) {
              rankBadge = (
                <span className="w-9 h-9 rounded-xl bg-slate-300 text-slate-950 flex items-center justify-center font-black text-base shadow">
                  🥈
                </span>
              );
            } else if (isTop3) {
              rankBadge = (
                <span className="w-9 h-9 rounded-xl bg-amber-700 text-amber-100 flex items-center justify-center font-black text-base shadow">
                  🥉
                </span>
              );
            }

            return (
              <div
                key={idx}
                className={`p-4 rounded-2xl border transition-all flex items-center justify-between shadow-lg ${
                  isTop1
                    ? 'bg-gradient-to-r from-amber-500/10 via-purple-900/20 to-slate-900 border-amber-500/40 ring-1 ring-amber-400/20'
                    : 'bg-slate-900/80 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  {rankBadge}
                  <span className="text-2xl">{player.avatar || '🎮'}</span>
                  <div>
                    <span className="font-extrabold text-white text-lg block">
                      {player.nickname}
                    </span>
                    {player.streak > 1 && (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-400 font-bold">
                        <Flame className="w-3.5 h-3.5 fill-current" /> {player.streak} Streak!
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-2xl font-black text-white font-mono">
                    {player.score.toLocaleString()}
                  </span>
                  {player.lastPointsEarned > 0 && (
                    <span className="block text-xs font-bold text-emerald-400">
                      +{player.lastPointsEarned} pts
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 6. FINAL PODIUM VIEW
  if (gameState === 'PODIUM' && podiumData) {
    const { first, second, third, allPlayers } = podiumData;

    return (
      <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col items-center">
        <h1 className="text-4xl sm:text-5xl font-black text-center text-white mb-2 tracking-tight">
          🏆 Final Podium
        </h1>
        <p className="text-slate-400 text-center mb-8 font-medium">
          Congratulations to our quiz champions!
        </p>

        {/* 3D Olympic-Style Podium Steps */}
        <div className="w-full max-w-2xl flex items-end justify-center gap-3 sm:gap-6 min-h-[340px] mb-12">
          {/* 2nd Place (Silver) */}
          <div className="flex-1 flex flex-col items-center animate-float">
            {second ? (
              <>
                <div className="text-4xl mb-1">{second.avatar}</div>
                <span className="font-black text-white text-base sm:text-lg truncate max-w-[120px]">
                  {second.nickname}
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-300 font-mono mb-2">
                  {second.score.toLocaleString()} pts
                </span>
                <div className="w-full h-36 bg-gradient-to-t from-slate-700 to-slate-500 rounded-t-2xl flex flex-col items-center justify-center shadow-xl border-t-2 border-slate-300">
                  <span className="text-3xl font-black text-slate-200">2</span>
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Silver</span>
                </div>
              </>
            ) : (
              <div className="w-full h-24 bg-slate-800/40 rounded-t-2xl" />
            )}
          </div>

          {/* 1st Place (Gold Champion) */}
          <div className="flex-1 flex flex-col items-center animate-float" style={{ animationDelay: '0.4s' }}>
            {first ? (
              <>
                <div className="text-2xl animate-bounce">👑</div>
                <div className="text-5xl mb-1">{first.avatar}</div>
                <span className="font-black text-amber-300 text-lg sm:text-xl truncate max-w-[140px]">
                  {first.nickname}
                </span>
                <span className="text-sm sm:text-base font-extrabold text-amber-400 font-mono mb-2">
                  {first.score.toLocaleString()} pts
                </span>
                <div className="w-full h-48 bg-gradient-to-t from-amber-600 via-amber-500 to-yellow-400 rounded-t-3xl flex flex-col items-center justify-center shadow-2xl border-t-4 border-yellow-200">
                  <span className="text-5xl font-black text-slate-950">1</span>
                  <span className="text-xs font-black text-slate-900 uppercase tracking-widest">Champion</span>
                </div>
              </>
            ) : null}
          </div>

          {/* 3rd Place (Bronze) */}
          <div className="flex-1 flex flex-col items-center animate-float" style={{ animationDelay: '0.8s' }}>
            {third ? (
              <>
                <div className="text-4xl mb-1">{third.avatar}</div>
                <span className="font-black text-white text-base sm:text-lg truncate max-w-[120px]">
                  {third.nickname}
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-300 font-mono mb-2">
                  {third.score.toLocaleString()} pts
                </span>
                <div className="w-full h-28 bg-gradient-to-t from-amber-900 to-amber-700 rounded-t-2xl flex flex-col items-center justify-center shadow-xl border-t-2 border-amber-600">
                  <span className="text-3xl font-black text-amber-200">3</span>
                  <span className="text-xs font-bold text-amber-200 uppercase tracking-widest">Bronze</span>
                </div>
              </>
            ) : (
              <div className="w-full h-16 bg-slate-800/40 rounded-t-2xl" />
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={handleRestartGame}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-extrabold shadow-lg shadow-purple-600/30 transition-all active:scale-95"
          >
            <RotateCcw className="w-5 h-5" />
            Play Again
          </button>
          <button
            onClick={onExit}
            className="px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold border border-slate-700 transition-colors"
          >
            Exit to Home
          </button>
        </div>

        {/* Full Rankings Recap */}
        {allPlayers && allPlayers.length > 3 && (
          <div className="w-full max-w-xl bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <h3 className="text-sm uppercase font-bold text-slate-400 mb-3 tracking-wider">
              All Participants
            </h3>
            <div className="space-y-2">
              {allPlayers.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-800/60 last:border-none">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-bold w-6">#{idx + 1}</span>
                    <span>{p.avatar}</span>
                    <span className="text-white font-semibold">{p.nickname}</span>
                  </div>
                  <span className="font-mono text-purple-300 font-bold">{p.score.toLocaleString()} pts</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
