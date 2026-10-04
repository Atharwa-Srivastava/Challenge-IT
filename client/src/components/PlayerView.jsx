import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  CheckCircle2, XCircle, Flame, Trophy, Award, Clock,
  ArrowRight, Sparkles, Loader2, Volume2, VolumeX, ChevronDown, ChevronUp
} from 'lucide-react';
import { KAHOOT_COLORS, AVATARS } from '../constants';
import { sounds } from '../utils/soundEffects';

export default function PlayerView({ socket, initialPin, onExit }) {
  const [stage, setStage] = useState('JOIN'); // JOIN, LOBBY, COUNTDOWN, QUESTION, SUBMITTED, REVEAL, LEADERBOARD, PODIUM
  const [pin, setPin] = useState(initialPin || '');
  const [nickname, setNickname] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [joinError, setJoinError] = useState('');
  const [muted, setMuted] = useState(sounds.muted);
  const [timeAddedNotice, setTimeAddedNotice] = useState(null);
  const [showAllScores, setShowAllScores] = useState(false);

  useEffect(() => {
    const unsub = sounds.subscribe((status) => {
      setMuted(status.muted);
    });
    return () => unsub();
  }, []);

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

    // Time added by host
    socket.on('game:time_added', (data) => {
      setTimeAddedNotice(`+${data.addedSeconds}s Added!`);
      setTimeout(() => setTimeAddedNotice(null), 1500);
    });

    // Answer recorded confirmation
    socket.on('player:answer_recorded', () => {
      setStage('SUBMITTED');
      sounds.playAnswerSubmit();
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(40);
      }
    });

    // Answer reveal result
    socket.on('player:answer_reveal', (data) => {
      setStage('REVEAL');
      setRevealResult(data);
      if (data.isCorrect) {
        sounds.playCorrect();
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([60, 50, 100]);
        }
      } else {
        sounds.playWrong();
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(200);
        }
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
      socket.off('game:time_added');
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
        <div className="bg-neutral-950 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-black text-white">Join Game</h1>
            <p className="text-neutral-400 text-sm mt-1">Enter your game PIN and pick an avatar</p>
          </div>

          {joinError && (
            <div className="mb-4 p-3 bg-red-950/70 border border-red-500/50 rounded-xl text-red-300 text-sm">
              {joinError}
            </div>
          )}

          {initialPin && (
            <div className="mb-4 p-3 bg-white/[0.04] border border-white/[0.1] rounded-2xl text-neutral-300 text-xs sm:text-sm flex items-center justify-between">
              <span className="font-medium">Direct Invite Link Applied</span>
              <span className="font-mono font-bold text-white px-2.5 py-0.5 bg-white/[0.08] border border-white/[0.12] rounded-full">
                PIN: {pin}
              </span>
            </div>
          )}

          <form onSubmit={handleJoin} className="space-y-4">
            {!initialPin && (
              <div>
                <label className="block text-xs uppercase tracking-wider font-bold text-neutral-400 mb-1">
                  Game PIN
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Game PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-white/[0.04] border border-white/15 rounded-full px-4 py-3 text-center text-xl font-semibold tracking-widest text-white placeholder-neutral-600 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20 font-mono"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-neutral-400 mb-1.5">
                Nickname
              </label>
              <input
                type="text"
                maxLength={15}
                placeholder="Choose a nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/15 rounded-full px-4 py-2.5 text-white font-medium placeholder-neutral-600 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20 text-center text-sm transition-colors"
              />
            </div>

            {/* Avatar Picker */}
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-neutral-400 mb-2">
                Choose Mascot
              </label>
              <div className="grid grid-cols-6 gap-2 bg-white/[0.02] p-2.5 rounded-2xl border border-white/[0.08]">
                {AVATARS.map((av, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedAvatar(av)}
                    className={`h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                      selectedAvatar === av
                        ? 'bg-white/15 border border-white/30 scale-105 shadow-sm'
                        : 'hover:bg-white/[0.06] text-neutral-400'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-3 bg-white text-black hover:bg-neutral-200 font-semibold text-sm rounded-full shadow-sm transition-all active:scale-[0.98] cursor-pointer"
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
        <div className="bg-[#121214] border border-white/[0.12] rounded-3xl p-8 shadow-2xl relative">
          <div className="flex justify-end mb-2">
            <button
              onClick={() => sounds.toggleMute()}
              className="px-2.5 py-1 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-neutral-300 border border-white/10 text-xs flex items-center gap-1.5 transition-colors active:scale-95"
              title={muted ? 'Unmute Sound' : 'Mute Sound'}
            >
              {muted ? <VolumeX className="w-3.5 h-3.5 text-neutral-500" /> : <Volume2 className="w-3.5 h-3.5 text-neutral-300" />}
              <span>{muted ? 'Muted' : 'Sound ON'}</span>
            </button>
          </div>

          <div className="w-20 h-20 rounded-full bg-white/[0.06] border border-white/15 flex items-center justify-center text-4xl mx-auto mb-4 backdrop-blur-xl shadow-lg">
            {selectedAvatar}
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-white mb-1">
            You're in, {nickname}
          </h1>
          <p className="text-neutral-400 text-xs sm:text-sm mb-6 font-normal">
            Look up at the host screen. Your name will appear in the lobby.
          </p>

          <div className="p-3.5 bg-white/[0.03] border border-white/[0.08] rounded-2xl mb-6">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-neutral-500 block mb-0.5">
              Playing Quiz
            </span>
            <span className="font-semibold text-white text-sm">
              {roomInfo?.title || 'Orbit Quiz'}
            </span>
          </div>

          <div className="flex items-center justify-center gap-2 text-neutral-400 font-medium text-xs">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Waiting for host to start the game...</span>
          </div>
        </div>
      </div>
    );
  }

  // 3. COUNTDOWN SCREEN
  if (stage === 'COUNTDOWN') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
        <span className="text-neutral-400 font-medium uppercase tracking-widest text-xs mb-2">
          Get Ready
        </span>
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-white mb-6">
          Look up at the host screen
        </h2>
        <div className="w-28 h-28 rounded-full bg-white/[0.06] border border-white/15 backdrop-blur-2xl flex items-center justify-center text-5xl font-bold tracking-tight text-white shadow-2xl">
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
        <div className="flex items-center justify-between gap-2 mb-3 bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xl">{selectedAvatar}</span>
            <span className="font-bold text-white text-sm">{nickname}</span>
          </div>

          {/* Timer Clock with +5s notification */}
          <div className="relative">
            <div
              className={`px-3 py-1 rounded-full font-bold text-xs flex items-center gap-1.5 ${
                isUrgent ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse' : 'bg-white/[0.06] text-white border border-white/[0.1]'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-neutral-300" />
              <span>{remainingSeconds}s</span>
            </div>
            {timeAddedNotice && (
              <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold text-amber-300 bg-amber-950/90 px-2 py-0.5 rounded-full border border-amber-500/40 animate-bounce">
                {timeAddedNotice}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => sounds.toggleMute()}
              className="p-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-neutral-300 border border-white/[0.1] transition-colors active:scale-95"
              title={muted ? 'Unmute Sound' : 'Mute Sound'}
            >
              {muted ? <VolumeX className="w-3.5 h-3.5 text-neutral-400" /> : <Volume2 className="w-3.5 h-3.5 text-white" />}
            </button>
            <div className="text-right">
              <span className="text-[11px] text-neutral-400 block font-normal">Score</span>
              <span className="font-mono font-bold text-white text-xs">
                {questionData.playerScore?.toLocaleString() || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Question Prompt or Host Screen Notice */}
        {questionData.questionText ? (
          <div className="bg-[#101012] border border-white/[0.08] rounded-3xl p-5 sm:p-6 mb-3 text-center shadow-xl relative overflow-hidden">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400 block mb-1">
              Question {questionData.questionIndex + 1} of {questionData.totalQuestions}
            </span>
            <h2 className="text-base sm:text-xl font-semibold text-white leading-snug">
              {questionData.questionText}
            </h2>
          </div>
        ) : (
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl py-2.5 px-4 mb-3 text-center">
            <p className="text-neutral-300 font-medium text-xs sm:text-sm tracking-wide">
              Question is on the host screen. Tap your answer:
            </p>
          </div>
        )}

        {/* 4 Colored Buttons (Adaptive: Shapes or Shapes + Option Text) */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 flex-1">
          {KAHOOT_COLORS.map((col, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectAnswer(idx)}
              className={`rounded-3xl p-4 sm:p-6 flex flex-col items-center justify-center gap-2 sm:gap-3 shadow-xl transition-all transform active:scale-95 cursor-pointer ${col.bg} border ${col.border}`}
            >
              <span className={`${questionData.options ? 'text-3xl sm:text-4xl' : 'text-5xl sm:text-7xl'} font-bold ${col.accentText} select-none drop-shadow-sm`}>
                {col.shape}
              </span>
              {questionData.options && questionData.options[idx] && (
                <span className="text-white font-medium text-xs sm:text-base text-center leading-tight break-words line-clamp-3 select-none">
                  {questionData.options[idx]}
                </span>
              )}
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
        <div className="bg-[#121214] border border-white/[0.12] rounded-3xl p-8 max-w-sm w-full shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-white/[0.06] border border-white/15 flex items-center justify-center text-3xl mx-auto mb-4 backdrop-blur-xl">
            🤞
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-white mb-2">Answer Locked In</h2>
          <p className="text-neutral-400 text-xs sm:text-sm mb-6 font-normal">
            Waiting for other players to answer...
          </p>

          <div className="flex items-center justify-center gap-2 text-neutral-400 text-xs font-medium">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
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
          className={`rounded-3xl p-8 shadow-2xl border transition-all ${
            isCorrect
              ? 'bg-[#0e1711] border-emerald-500/30 text-white'
              : 'bg-[#180f12] border-rose-500/30 text-white'
          }`}
        >
          {/* Result Icon */}
          <div className="flex justify-center mb-4">
            {isCorrect ? (
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-md animate-bounce-in">
                <CheckCircle2 className="w-8 h-8" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shadow-md animate-bounce-in">
                <XCircle className="w-8 h-8" />
              </div>
            )}
          </div>

          <h2 className="text-2xl font-semibold tracking-tight mb-1">
            {isCorrect ? 'Correct!' : 'Incorrect'}
          </h2>
          <p className="text-neutral-400 text-xs sm:text-sm mb-5 font-normal">
            {isCorrect ? `+${pointsEarned.toLocaleString()} points earned` : 'Better luck on the next question.'}
          </p>

          {/* Streak Indicator */}
          {currentStreak > 1 && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-semibold text-xs mb-4">
              <Flame className="w-3.5 h-3.5 fill-current" />
              <span>{currentStreak} Streak Bonus</span>
            </div>
          )}

          {/* Explanation if any */}
          {explanation && (
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-3.5 mb-6 text-xs text-neutral-300 text-left leading-relaxed">
              <span className="font-semibold text-neutral-200 block mb-0.5">Note:</span>
              {explanation}
            </div>
          )}

          {/* Stats Bar */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/[0.08]">
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-3">
              <span className="text-[10px] uppercase font-semibold text-neutral-500 block">Total Score</span>
              <span className="text-xl font-semibold font-mono text-white">{totalScore?.toLocaleString() || 0}</span>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-3">
              <span className="text-[10px] uppercase font-semibold text-neutral-500 block">Current Rank</span>
              <span className="text-xl font-semibold font-mono text-white">#{rank || '-'}</span>
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
        <div className="bg-[#121214] border border-white/[0.12] rounded-3xl p-8 shadow-2xl">
          <Trophy className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold tracking-tight text-white mb-2">Check the Leaderboard</h2>
          <p className="text-neutral-400 text-xs sm:text-sm mb-6 font-normal">
            Look at the host screen to see the live standings.
          </p>

          <div className="flex items-center justify-center gap-2 text-neutral-400 text-xs font-medium">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
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
        <div className="bg-[#121214] border border-white/[0.12] rounded-3xl p-8 shadow-2xl">
          <div className="text-5xl mb-3">
            {playerRankInfo?.rank === 1 ? '🥇' : playerRankInfo?.rank === 2 ? '🥈' : playerRankInfo?.rank === 3 ? '🥉' : '🎖️'}
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-white mb-1">
            Game Over
          </h1>
          <p className="text-neutral-400 text-xs sm:text-sm mb-6 font-normal">
            You placed <strong className="text-white font-semibold">#{playerRankInfo?.rank || 1}</strong> with{' '}
            <strong className="text-white font-mono">{playerRankInfo?.score?.toLocaleString() || 0} pts</strong>.
          </p>

          {/* Expandable All Players Leaderboard */}
          {podiumData.allPlayers && podiumData.allPlayers.length > 0 && (
            <div className="mt-6 mb-6 pt-4 border-t border-white/[0.08] text-left">
              <button
                onClick={() => setShowAllScores(!showAllScores)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] rounded-xl border border-white/10 text-xs font-medium text-neutral-300 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-neutral-400" />
                  <span>All Player Rankings ({podiumData.allPlayers.length})</span>
                </span>
                {showAllScores ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showAllScores && (
                <div className="space-y-1.5 mt-3 max-h-52 overflow-y-auto pr-1">
                  {podiumData.allPlayers.map((p, idx) => {
                    const rank = p.rank || idx + 1;
                    const isMe = p.nickname === nickname;
                    return (
                      <div
                        key={idx}
                        className={`flex items-center justify-between p-2.5 rounded-xl text-xs border ${
                          isMe
                            ? 'bg-white/[0.1] border-white/20'
                            : 'bg-white/[0.02] border-white/[0.06]'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-medium text-neutral-400 w-6">
                            {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                          </span>
                          <span>{p.avatar || '🎮'}</span>
                          <span className={`font-medium truncate ${isMe ? 'text-white' : 'text-neutral-300'}`}>
                            {p.nickname} {isMe && '(You)'}
                          </span>
                        </div>
                        <span className="font-mono text-neutral-300 shrink-0 ml-2">
                          {p.score.toLocaleString()} pts
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <button
            onClick={onExit}
            className="w-full py-3 bg-white text-black hover:bg-neutral-200 font-semibold text-sm rounded-full shadow-sm transition-all active:scale-[0.98]"
          >
            Play Again
          </button>
        </div>
      </div>
    );
  }

  return null;
}
