import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  CheckCircle2, XCircle, Flame, Trophy, Award, Clock,
  ArrowRight, Sparkles, Loader2
} from 'lucide-react';
import { KAHOOT_COLORS, AVATARS } from '../constants';
import { sounds } from '../utils/soundEffects';

export default function PlayerView({ socket, initialPin, onExit }) {
  const [stage, setStage] = useState('JOIN'); // JOIN, LOBBY, COUNTDOWN, QUESTION, SUBMITTED, REVEAL, LEADERBOARD, PODIUM
  const [pin, setPin] = useState(initialPin || '');
  const [nickname, setNickname] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [joinError, setJoinError] = useState('');

  // Player info from server
  const [playerData, setPlayerData] = useState(null);
  const [roomInfo, setRoomInfo] = useState(null);

  // Question state
  const [questionData, setQuestionData] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(20);
  const [countdown, setCountdown] = useState(3);

  // Reveal state
  const [revealResult, setRevealResult] = useState(null);

  // Podium state
  const [podiumData, setPodiumData] = useState(null);

  useEffect(() => {
    if (!socket) return;

    // Join responses
    socket.on('room:joined', (data) => {
      setPlayerData(data.player);
      setRoomInfo({ title: data.quizTitle, count: data.questionCount });
      setStage('LOBBY');
      setJoinError('');
    });

    socket.on('room:join_error', (data) => {
      setJoinError(data.message || 'Failed to join game.');
    });

    socket.on('player:kicked', () => {
      alert('You have been kicked by the host.');
      onExit();
    });

    // Countdown before question
    socket.on('game:countdown', (data) => {
      setStage('COUNTDOWN');
      setCountdown(data.countdown);
      setSelectedAnswer(null);
      setRevealResult(null);
      sounds.playCountdownTick(false);
    });

    socket.on('game:countdown_tick', (data) => {
      setCountdown(data.countdown);
      sounds.playCountdownTick(false);
    });

    // Question start
    socket.on('player:question_started', (data) => {
      setStage('QUESTION');
      setQuestionData(data);
      setSelectedAnswer(null);
      setRemainingSeconds(data.timeLimit);
      sounds.playStartQuestion();
    });

    // Timer tick
    socket.on('game:timer_tick', (data) => {
      setRemainingSeconds(data.remainingSeconds);
      if (data.remainingSeconds <= 5 && data.remainingSeconds > 0) {
        sounds.playCountdownTick(true);
      }
    });

    // Answer recorded confirmation
    socket.on('player:answer_recorded', () => {
      setStage('SUBMITTED');
      sounds.playAnswerSubmit();
    });

    // Answer reveal result
    socket.on('player:answer_reveal', (data) => {
      setStage('REVEAL');
      setRevealResult(data);
      if (data.isCorrect) {
        sounds.playCorrect();
      } else {
        sounds.playWrong();
      }
    });

    // Leaderboard
    socket.on('game:leaderboard', (data) => {
      setStage('LEADERBOARD');
    });

    // Final podium
    socket.on('game:final_podium', (data) => {
      setStage('PODIUM');
      setPodiumData(data);
      sounds.playPodiumFanfare();

      // Confetti for player
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    });

    // Host left
    socket.on('game:host_left', (data) => {
      alert(data.message || 'The host ended the game.');
      onExit();
    });

    return () => {
      socket.off('room:joined');
      socket.off('room:join_error');
      socket.off('player:kicked');
      socket.off('game:countdown');
      socket.off('game:countdown_tick');
      socket.off('player:question_started');
      socket.off('game:timer_tick');
      socket.off('player:answer_recorded');
      socket.off('player:answer_reveal');
      socket.off('game:leaderboard');
      socket.off('game:final_podium');
      socket.off('game:host_left');
    };
  }, [socket, onExit]);

  const handleJoin = (e) => {
    e.preventDefault();
    if (!pin.trim() || !nickname.trim()) {
      setJoinError('Please enter both Game PIN and Nickname.');
      return;
    }
    setJoinError('');
    socket.emit('room:join', {
      pin: pin.trim(),
      nickname: nickname.trim(),
      avatar: selectedAvatar
    });
  };

  const handleSelectAnswer = (idx) => {
    if (stage !== 'QUESTION' || selectedAnswer !== null) return;
    setSelectedAnswer(idx);
    socket.emit('player:submit_answer', { pin, answerIndex: idx });
  };

  // 1. JOIN SCREEN
  if (stage === 'JOIN') {
    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-black text-white">Join Game</h1>
            <p className="text-slate-400 text-sm mt-1">Enter your game PIN and pick an avatar</p>
          </div>

          {joinError && (
            <div className="mb-4 p-3 bg-red-950/70 border border-red-500/50 rounded-xl text-red-300 text-sm">
              {joinError}
            </div>
          )}

          {initialPin && (
            <div className="mb-4 p-3 bg-purple-950/70 border border-purple-600/50 rounded-2xl text-purple-300 text-xs sm:text-sm flex items-center justify-between shadow-inner">
              <span className="font-semibold">Direct Invite Link Applied</span>
              <span className="font-mono font-black text-white px-2.5 py-0.5 bg-purple-900 border border-purple-700 rounded-lg">
                PIN: {pin}
              </span>
            </div>
          )}

          <form onSubmit={handleJoin} className="space-y-4">
            {!initialPin && (
              <div>
                <label className="block text-xs uppercase tracking-wider font-bold text-slate-400 mb-1">
                  Game PIN
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="6-digit PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-center text-2xl font-black tracking-widest text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>
            )}

            <div>
              <label className="block text-xs uppercase tracking-wider font-bold text-slate-400 mb-1">
                Nickname
              </label>
              <input
                type="text"
                maxLength={15}
                placeholder="Enter your nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-white font-bold placeholder-slate-600 focus:outline-none focus:border-purple-500 text-center"
              />
            </div>

            {/* Avatar Picker */}
            <div>
              <label className="block text-xs uppercase tracking-wider font-bold text-slate-400 mb-2">
                Pick Your Mascot
              </label>
              <div className="grid grid-cols-6 gap-2 bg-slate-950/80 p-2.5 rounded-2xl border border-slate-800">
                {AVATARS.map((av, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedAvatar(av)}
                    className={`h-11 rounded-xl text-xl flex items-center justify-center transition-all ${
                      selectedAvatar === av
                        ? 'bg-purple-600 ring-2 ring-purple-400 scale-110 shadow-lg'
                        : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-4 bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:opacity-95 text-white font-black text-lg rounded-2xl shadow-xl shadow-purple-600/30 transition-all active:scale-95"
            >
              Enter Game
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. LOBBY WAITING SCREEN
  if (stage === 'LOBBY') {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <div className="w-24 h-24 rounded-full bg-purple-950/80 border-2 border-purple-500/50 flex items-center justify-center text-5xl mx-auto mb-4 animate-bounce">
            {selectedAvatar}
          </div>

          <h1 className="text-3xl font-black text-white mb-1">
            You're in, {nickname}!
          </h1>
          <p className="text-slate-400 text-sm mb-6">
            Look up at the host screen. Do you see your nickname?
          </p>

          <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl mb-6">
            <span className="text-xs uppercase tracking-wider font-bold text-slate-500 block mb-1">
              Playing Quiz
            </span>
            <span className="font-extrabold text-white text-base">
              {roomInfo?.title || 'Kahoot Quiz'}
            </span>
          </div>

          <div className="flex items-center justify-center gap-2 text-purple-400 font-semibold text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Waiting for host to start...</span>
          </div>
        </div>
      </div>
    );
  }

  // 3. COUNTDOWN SCREEN
  if (stage === 'COUNTDOWN') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
        <span className="text-purple-400 font-extrabold uppercase tracking-widest text-sm mb-2">
          Get Ready!
        </span>
        <h2 className="text-2xl sm:text-3xl font-black text-white mb-6">
          Look up at the host screen! 📺
        </h2>
        <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center text-6xl font-black text-white shadow-2xl shadow-purple-600/50 animate-bounce-in">
          {countdown}
        </div>
      </div>
    );
  }

  // 4. QUESTION SCREEN (4 BIG TOUCH BUTTONS - BUZZER CONTROLLER ONLY)
  if (stage === 'QUESTION' && questionData) {
    const isUrgent = remainingSeconds <= 5;

    return (
      <div className="max-w-2xl mx-auto px-4 py-4 flex flex-col min-h-[85vh]">
        {/* Top Status Bar */}
        <div className="flex items-center justify-between gap-2 mb-3 bg-slate-900/80 border border-slate-800 rounded-2xl px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xl">{selectedAvatar}</span>
            <span className="font-bold text-white text-sm">{nickname}</span>
          </div>

          {/* Timer Clock */}
          <div
            className={`px-3 py-1 rounded-xl font-black text-sm flex items-center gap-1.5 ${
              isUrgent ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-800 text-purple-300'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{remainingSeconds}s</span>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-400 block font-semibold">Score</span>
            <span className="font-mono font-bold text-white text-sm">
              {questionData.playerScore?.toLocaleString() || 0}
            </span>
          </div>
        </div>

        {/* Host Screen Prompt Notice */}
        <div className="bg-purple-950/40 border border-purple-800/60 rounded-2xl py-2.5 px-4 mb-3 text-center">
          <p className="text-purple-300 font-extrabold text-xs sm:text-sm tracking-wide">
            📺 Question is on the host screen! Tap your answer below:
          </p>
        </div>

        {/* 4 Colored Buttons (Shapes Only) */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 flex-1">
          {KAHOOT_COLORS.map((col, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectAnswer(idx)}
              className={`rounded-3xl p-6 sm:p-10 flex items-center justify-center shadow-2xl transition-all transform active:scale-95 cursor-pointer ${col.bg} border-2 ${col.border}`}
            >
              <span className="text-6xl sm:text-8xl text-white font-black drop-shadow-md select-none">
                {col.shape}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // 5. ANSWER SUBMITTED WAITING SCREEN
  if (stage === 'SUBMITTED') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl">
          <div className="w-20 h-20 rounded-full bg-purple-900/40 border border-purple-500/40 flex items-center justify-center text-4xl mx-auto mb-4 animate-pulse">
            🤞
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Answer Locked In!</h2>
          <p className="text-slate-400 text-sm mb-6">
            Fingers crossed! Waiting for other players...
          </p>

          <div className="flex items-center justify-center gap-2 text-purple-400 text-xs font-semibold">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Time remaining: {remainingSeconds}s</span>
          </div>
        </div>
      </div>
    );
  }

  // 6. ANSWER REVEAL RESULT SCREEN
  if (stage === 'REVEAL' && revealResult) {
    const { isCorrect, pointsEarned, totalScore, currentStreak, explanation, rank } = revealResult;

    return (
      <div className="max-w-md mx-auto px-4 py-8 text-center min-h-[80vh] flex flex-col justify-center">
        <div
          className={`rounded-3xl p-8 shadow-2xl border-2 transition-all ${
            isCorrect
              ? 'bg-emerald-950/80 border-emerald-500 text-white'
              : 'bg-red-950/80 border-red-500 text-white'
          }`}
        >
          {/* Result Icon */}
          <div className="flex justify-center mb-3">
            {isCorrect ? (
              <div className="w-20 h-20 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/40 animate-bounce-in">
                <CheckCircle2 className="w-12 h-12" />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-600/40 animate-bounce-in">
                <XCircle className="w-12 h-12" />
              </div>
            )}
          </div>

          <h2 className="text-3xl font-black mb-1">
            {isCorrect ? 'Genius!' : 'Incorrect!'}
          </h2>
          <p className="text-slate-300 text-sm mb-4">
            {isCorrect ? `+${pointsEarned.toLocaleString()} points earned` : 'Better luck on the next one!'}
          </p>

          {/* Streak Indicator */}
          {currentStreak > 1 && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500 text-slate-950 font-black text-xs mb-4 shadow">
              <Flame className="w-4 h-4 fill-current" />
              <span>{currentStreak} Streak Bonus!</span>
            </div>
          )}

          {/* Explanation if any */}
          {explanation && (
            <div className="bg-black/30 rounded-2xl p-3 mb-6 text-xs text-slate-200 text-left">
              <span className="font-bold text-purple-300 block mb-0.5">💡 Fun Fact:</span>
              {explanation}
            </div>
          )}

          {/* Stats Bar */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/10">
            <div className="bg-black/20 rounded-2xl p-3">
              <span className="text-xs uppercase font-bold text-slate-400 block">Total Score</span>
              <span className="text-2xl font-black font-mono">{totalScore?.toLocaleString() || 0}</span>
            </div>
            <div className="bg-black/20 rounded-2xl p-3">
              <span className="text-xs uppercase font-bold text-slate-400 block">Current Rank</span>
              <span className="text-2xl font-black font-mono">#{rank || '-'}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 7. LEADERBOARD WAITING SCREEN
  if (stage === 'LEADERBOARD') {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <Trophy className="w-16 h-16 text-amber-400 mx-auto mb-4 animate-bounce" />
          <h2 className="text-2xl font-black text-white mb-2">Check the Leaderboard!</h2>
          <p className="text-slate-400 text-sm mb-6">
            Look at the host screen to see where everyone placed.
          </p>

          <div className="flex items-center justify-center gap-2 text-purple-400 text-xs font-semibold">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Waiting for next question...</span>
          </div>
        </div>
      </div>
    );
  }

  // 8. FINAL PODIUM VIEW
  if (stage === 'PODIUM' && podiumData) {
    const playerRankInfo = podiumData.allPlayers?.find(p => p.nickname === nickname);

    return (
      <div className="max-w-md mx-auto px-4 py-8 text-center min-h-[80vh] flex flex-col justify-center">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <div className="text-6xl mb-3 animate-bounce">
            {playerRankInfo?.rank === 1 ? '🥇' : playerRankInfo?.rank === 2 ? '🥈' : playerRankInfo?.rank === 3 ? '🥉' : '🎖️'}
          </div>

          <h1 className="text-3xl font-black text-white mb-1">
            Game Over!
          </h1>
          <p className="text-slate-400 text-sm mb-6">
            You placed <strong className="text-purple-400">#{playerRankInfo?.rank || 1}</strong> with{' '}
            <strong className="text-white font-mono">{playerRankInfo?.score?.toLocaleString() || 0} pts</strong>!
          </p>

          <button
            onClick={onExit}
            className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black text-base rounded-2xl shadow-lg shadow-purple-600/30 transition-all active:scale-95"
          >
            Play Again
          </button>
        </div>
      </div>
    );
  }

  return null;
}
