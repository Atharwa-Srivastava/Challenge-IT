import React, { useEffect, useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Users, Play, Copy, Check, FastForward, Trophy,
  Flame, Award, ArrowRight, RotateCcw, AlertCircle, ShieldAlert,
  Share2, QrCode, Maximize2, Minimize2, Volume2, VolumeX, LogOut, X,
  Settings, Sliders, Shuffle, Smartphone, Clock, Search, FileText
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { KAHOOT_COLORS } from '../constants';
import { sounds } from '../utils/soundEffects';

export default function HostView({ socket, pin, quizInfo, onExit }) {
  const [gameState, setGameState] = useState('LOBBY'); // LOBBY, COUNTDOWN, QUESTION, REVEAL, LEADERBOARD, PODIUM
  const [players, setPlayers] = useState([]);
  const [copiedPin, setCopiedPin] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [showLargeQr, setShowLargeQr] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Host Game Options State
  const [options, setOptions] = useState({
    randomizeQuestions: false,
    showQuestionOnPlayers: false,
    showOptionsOnPlayers: false,
    showPodiumEveryQuestion: true,
    extraSeconds: 0,
    enableStreakBonus: true
  });
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [timeAddedNotice, setTimeAddedNotice] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [copiedRankings, setCopiedRankings] = useState(false);

  // Audio state
  const [muted, setMuted] = useState(sounds.muted);
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const playersCountRef = useRef(0);

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

  // Audio subscription & fullscreen sync
  useEffect(() => {
    const unsub = sounds.subscribe((status) => {
      setMuted(status.muted);
      setIsPlayingMusic(status.isLobbyMusicPlaying || status.isQuestionMusicPlaying);
    });

    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);

    return () => {
      unsub();
      document.removeEventListener('fullscreenchange', handleFsChange);
    };
  }, []);

  // Lobby music lifecycle
  useEffect(() => {
    if (gameState === 'LOBBY') {
      sounds.startLobbyMusic();
    } else {
      sounds.stopLobbyMusic();
    }
    return () => {
      sounds.stopLobbyMusic();
      sounds.stopQuestionMusic();
    };
  }, [gameState]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Lobby updates
    socket.on('lobby:updated', (data) => {
      const newPlayers = data.players || [];
      if (newPlayers.length > playersCountRef.current && playersCountRef.current > 0) {
        sounds.playPlayerJoin();
      }
      playersCountRef.current = newPlayers.length;
      setPlayers(newPlayers);
      setTotalPlayers(newPlayers.length);
      if (data.options) {
        setOptions(prev => ({ ...prev, ...data.options }));
      }
    });

    // Countdown before question
    socket.on('game:countdown', (data) => {
      sounds.stopLobbyMusic();
      sounds.stopQuestionMusic();
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
      sounds.startQuestionMusic(false);
    });

    // Timer tick
    socket.on('game:timer_tick', (data) => {
      setRemainingSeconds(data.remainingSeconds);
      if (data.remainingSeconds <= 5 && data.remainingSeconds > 0) {
        sounds.setQuestionUrgency(true);
        sounds.playCountdownTick(true);
      }
    });

    // Time added (+5s) notification
    socket.on('game:time_added', (data) => {
      setTimeAddedNotice(`+${data.addedSeconds}s Added!`);
      setTimeout(() => setTimeAddedNotice(null), 1500);
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
      sounds.stopQuestionMusic();
      sounds.playTimesUp();
    });

    // Leaderboard
    socket.on('game:leaderboard', (data) => {
      setGameState('LEADERBOARD');
      setLeaderboardData(data.topPlayers || []);
      setIsLastQuestion(data.isLastQuestion);
    });

    // Final podium
    socket.on('game:final_podium', (data) => {
      sounds.stopQuestionMusic();
      sounds.stopLobbyMusic();
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
      socket.off('game:time_added');
      socket.off('host:answer_received');
      socket.off('host:answer_reveal');
      socket.off('game:leaderboard');
      socket.off('game:final_podium');
    };
  }, [socket]);

  const handleUpdateOption = (key, value) => {
    const updated = { ...options, [key]: value };
    setOptions(updated);
    socket.emit('room:update_options', { pin, options: updated });
  };

  const handleCopyRankings = (allPlayers) => {
    if (!allPlayers || allPlayers.length === 0) return;
    const text = allPlayers
      .map((p, idx) => `#${idx + 1} ${p.avatar || '🎮'} ${p.nickname} - ${p.score.toLocaleString()} pts`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopiedRankings(true);
    setTimeout(() => setCopiedRankings(false), 2000);
  };

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

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
      }
    }
  };

  const handleStartGame = () => {
    if (players.length === 0) return;
    sounds.stopLobbyMusic();
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

  // Host Top Navigation Bar (Shared across all stages)
  const renderHostTopBar = () => (
    <div className="w-full max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between border border-white/[0.08] mb-5 bg-[#121214]/90 backdrop-blur-xl rounded-2xl shadow-sm">
      <div className="flex items-center gap-3">
        <span className="font-mono font-medium text-neutral-300 bg-white/[0.06] px-3 py-1 rounded-full border border-white/[0.1] text-xs">
          PIN: <span className="text-white font-bold tracking-wider">{pin}</span>
        </span>
        <span className="text-neutral-400 text-xs font-medium truncate max-w-[180px] sm:max-w-md hidden xs:inline-block">
          {quizInfo?.title || 'Orbit Game'}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* Audio Toggle Button with Animated Equalizer Bars */}
        <button
          onClick={() => sounds.toggleMute()}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all active:scale-95 ${
            muted
              ? 'bg-white/[0.06] text-neutral-400 border-white/10 hover:text-white'
              : 'bg-white/[0.08] text-white border-white/15 hover:bg-white/[0.14]'
          }`}
          title={muted ? 'Unmute game audio & music' : 'Mute game audio & music'}
        >
          {muted ? (
            <VolumeX className="w-3.5 h-3.5 text-neutral-500" />
          ) : (
            <Volume2 className="w-3.5 h-3.5 text-neutral-200" />
          )}
          <span>{muted ? 'Muted' : 'Audio ON'}</span>
          {!muted && isPlayingMusic && (
            <span className="flex items-end gap-0.5 h-3 ml-0.5">
              <span className="w-0.5 h-full bg-white/70 animate-pulse rounded-full" />
              <span className="w-0.5 h-2/3 bg-white/50 animate-pulse delay-75 rounded-full" />
              <span className="w-0.5 h-4/5 bg-white/60 animate-pulse delay-150 rounded-full" />
            </span>
          )}
        </button>

        {/* Fullscreen Button */}
        <button
          onClick={handleToggleFullscreen}
          className="p-1.5 sm:px-3 sm:py-1.5 bg-white/[0.06] hover:bg-white/[0.12] text-neutral-300 hover:text-white rounded-full border border-white/10 transition-colors text-xs font-medium flex items-center gap-1.5 active:scale-95"
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
        </button>

        {/* Exit Game */}
        {onExit && (
          <button
            onClick={() => {
              if (confirm('Are you sure you want to end this game and return to home?')) {
                sounds.stopLobbyMusic();
                sounds.stopQuestionMusic();
                onExit();
              }
            }}
            className="p-1.5 sm:px-3 sm:py-1.5 bg-white/[0.04] hover:bg-red-950/40 text-neutral-400 hover:text-red-300 rounded-full border border-white/10 hover:border-red-500/30 transition-colors text-xs font-medium flex items-center gap-1.5 active:scale-95"
            title="End Game"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">End Game</span>
          </button>
        )}
      </div>
    </div>
  );

  // 1. LOBBY VIEW
  if (gameState === 'LOBBY') {
    return (
      <div className="max-w-6xl mx-auto px-4 py-4 sm:py-6 flex flex-col items-center">
        {renderHostTopBar()}

        {/* Quiz Banner & Top Info */}
        <div className="w-full text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.06] border border-white/10 text-neutral-300 text-xs font-medium mb-3">
            <span>Quiz:</span>
            <span className="text-white font-semibold">{quizInfo?.title || 'Orbit Challenge'}</span>
            <span className="text-neutral-400">• {quizInfo?.questionsCount} Questions</span>
          </div>

          <div className="bg-[#101012] border border-white/[0.08] rounded-3xl p-6 sm:p-8 max-w-4xl mx-auto shadow-2xl relative overflow-hidden">
            <div className="text-center mb-5">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400 bg-white/[0.05] border border-white/10 px-3 py-1 rounded-full">
                Players Join In 3 Ways
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* Way 1: Game PIN & Way 2: Direct Link (7 cols) */}
              <div className="md:col-span-7 flex flex-col justify-center space-y-4 text-center md:text-left">
                {/* Way 1: Game PIN */}
                <div className="p-4 bg-white/[0.02] border border-white/[0.08] rounded-2xl">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400">
                      Game PIN
                    </span>
                    <span className="text-xs text-neutral-500 font-normal">Enter on website</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-4xl sm:text-5xl font-semibold tracking-widest text-white font-mono">
                      {pin}
                    </span>
                    <button
                      onClick={handleCopyPin}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white/[0.08] hover:bg-white/[0.14] text-white rounded-full border border-white/10 transition-all active:scale-95 text-xs font-medium"
                      title="Copy PIN"
                    >
                      {copiedPin ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedPin ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* Way 2: Direct Join Link */}
                <div className="p-4 bg-white/[0.02] border border-white/[0.08] rounded-2xl">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400">
                      Direct Join Link
                    </span>
                    <span className="text-xs text-neutral-500 font-normal">Auto-fills Game PIN</span>
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-full font-semibold text-xs sm:text-sm border transition-all active:scale-[0.98] ${
                      copiedLink
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : 'bg-white text-black hover:bg-neutral-200 border-transparent shadow-sm'
                    }`}
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Link Copied to Clipboard!' : 'Copy Direct Join Link'}</span>
                  </button>
                  <p className="text-neutral-500 font-mono text-[11px] truncate mt-1.5">
                    {inviteUrl}
                  </p>
                </div>
              </div>

              {/* Way 3: QR Code (5 cols) */}
              <div className="md:col-span-5 flex flex-col items-center justify-center p-4 bg-white/[0.02] border border-white/[0.08] rounded-2xl">
                <div className="flex items-center justify-between w-full mb-3">
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400">
                    Scan QR Code
                  </span>
                  <button
                    onClick={() => setShowLargeQr(true)}
                    className="flex items-center gap-1 text-[11px] font-medium text-neutral-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] px-2.5 py-0.5 rounded-full border border-white/10"
                    title="Zoom in QR code"
                  >
                    <Maximize2 className="w-3 h-3" /> Zoom
                  </button>
                </div>

                <div
                  onClick={() => setShowLargeQr(true)}
                  className="bg-white p-3 rounded-2xl shadow-xl cursor-pointer hover:scale-[1.02] transition-transform border border-white/10 group"
                  title="Click to expand QR Code for players"
                >
                  <QRCodeSVG
                    value={inviteUrl}
                    size={140}
                    level="M"
                    marginSize={1}
                  />
                </div>

                <span className="text-neutral-400 text-xs font-normal mt-2.5">
                  Point smartphone camera to join instantly
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Players Area */}
        <div className="w-full bg-[#101012] border border-white/[0.08] rounded-3xl p-6 shadow-xl mb-8 min-h-[220px] flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-neutral-300" />
              <span className="font-semibold text-white text-base">
                Players in Lobby ({players.length})
              </span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setShowOptionsModal(true)}
                className="flex items-center gap-2 px-3.5 py-2 bg-white/[0.06] hover:bg-white/[0.12] text-neutral-200 hover:text-white rounded-full border border-white/10 transition-all active:scale-95 text-xs font-medium"
                title="Host Game Settings"
              >
                <Sliders className="w-3.5 h-3.5 text-neutral-300" />
                <span>Game Settings</span>
                {(options.randomizeQuestions || options.showQuestionOnPlayers || options.showOptionsOnPlayers || !options.showPodiumEveryQuestion || options.extraSeconds > 0) && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                )}
              </button>

              <button
                onClick={handleStartGame}
                disabled={players.length === 0}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-sm transition-all active:scale-[0.98] ${
                  players.length > 0
                    ? 'bg-white text-black hover:bg-neutral-200 shadow-md cursor-pointer'
                    : 'bg-white/[0.06] text-neutral-500 border border-white/[0.08] cursor-not-allowed'
                }`}
              >
                <Play className="w-4 h-4 fill-current" />
                Start Game
              </button>
            </div>
          </div>

          {/* Players Grid */}
          <div className="pt-6 flex-1">
            {players.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-36 text-neutral-500">
                <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin mb-3" />
                <p className="font-normal text-xs text-neutral-400">Waiting for players to join with PIN: {pin}...</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                {players.map((p) => (
                  <div
                    key={p.socketId}
                    className="relative group bg-white/[0.03] border border-white/[0.08] hover:border-red-500/40 rounded-2xl p-2.5 flex items-center gap-2.5 transition-all shadow-sm"
                  >
                    <span className="text-xl">{p.avatar || '🎮'}</span>
                    <span className="font-medium text-white text-xs truncate flex-1">{p.nickname}</span>
                    <button
                      onClick={() => handleKickPlayer(p.socketId)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-neutral-500 hover:text-red-400 rounded-lg transition-opacity"
                      title="Kick player"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Large QR Code Modal for Big Screens / Auditoriums */}
        {showLargeQr && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
            <div className="bg-[#121214] border border-white/[0.12] rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl relative animate-subtle-fade">
              <button
                onClick={() => setShowLargeQr(false)}
                className="absolute top-4 right-4 text-neutral-400 hover:text-white p-2 rounded-full hover:bg-white/[0.08] transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.06] text-neutral-300 border border-white/[0.1] text-[11px] font-medium uppercase tracking-wider mb-3">
                <QrCode className="w-3.5 h-3.5 text-neutral-400" />
                <span>Scan to Join</span>
              </div>

              <h3 className="text-xl font-bold text-white mb-4">
                Game PIN: <span className="font-mono text-white tracking-widest">{pin}</span>
              </h3>

              <div className="p-4 bg-white rounded-2xl inline-block shadow-2xl mx-auto mb-4">
                <QRCodeSVG
                  value={inviteUrl}
                  size={240}
                  level="H"
                  marginSize={2}
                />
              </div>

              <p className="text-neutral-400 text-xs font-normal">
                Point your camera at the QR code to open the game directly.
              </p>
            </div>
          </div>
        )}

        {/* Game Settings Modal */}
        {showOptionsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-subtle-fade">
            <div className="bg-[#121214] border border-white/[0.12] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-white">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-base">Game Settings</h3>
                    <p className="text-xs text-neutral-400">Host controls and player experience</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowOptionsModal(false)}
                  className="p-2 text-neutral-400 hover:text-white rounded-full hover:bg-white/[0.08] border border-transparent transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                {/* 1. Shuffle Questions Order */}
                <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
                  <div className="flex items-start gap-3">
                    <Shuffle className="w-4 h-4 text-neutral-300 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium text-white text-sm block">Randomize Question Order</span>
                      <span className="text-xs text-neutral-400 leading-relaxed block mt-0.5">
                        Shuffle questions randomly so each game session is unique, not line-by-line.
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleUpdateOption('randomizeQuestions', !options.randomizeQuestions)}
                    className={`w-12 h-7 rounded-full p-1 transition-colors duration-200 ease-in-out shrink-0 ${
                      options.randomizeQuestions ? 'bg-white' : 'bg-white/[0.15]'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full transition-transform duration-200 ease-in-out ${
                        options.randomizeQuestions ? 'translate-x-5 bg-black' : 'translate-x-0 bg-neutral-400'
                      }`}
                    />
                  </button>
                </div>

                {/* 2. Show Question on Players Screen */}
                <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
                  <div className="flex items-start gap-3">
                    <Smartphone className="w-4 h-4 text-neutral-300 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium text-white text-sm block">Show Question on Players' Screens</span>
                      <span className="text-xs text-neutral-400 leading-relaxed block mt-0.5">
                        Display the full question prompt on player devices (convenient for large rooms).
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleUpdateOption('showQuestionOnPlayers', !options.showQuestionOnPlayers)}
                    className={`w-12 h-7 rounded-full p-1 transition-colors duration-200 ease-in-out shrink-0 ${
                      options.showQuestionOnPlayers ? 'bg-white' : 'bg-white/[0.15]'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full transition-transform duration-200 ease-in-out ${
                        options.showQuestionOnPlayers ? 'translate-x-5 bg-black' : 'translate-x-0 bg-neutral-400'
                      }`}
                    />
                  </button>
                </div>

                {/* 3. Show Answer Options Text on Players Buttons */}
                <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
                  <div className="flex items-start gap-3">
                    <FileText className="w-4 h-4 text-neutral-300 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium text-white text-sm block">Show Answer Text on Player Buttons</span>
                      <span className="text-xs text-neutral-400 leading-relaxed block mt-0.5">
                        Show answer option text directly on the buttons on player phones.
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleUpdateOption('showOptionsOnPlayers', !options.showOptionsOnPlayers)}
                    className={`w-12 h-7 rounded-full p-1 transition-colors duration-200 ease-in-out shrink-0 ${
                      options.showOptionsOnPlayers ? 'bg-white' : 'bg-white/[0.15]'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full transition-transform duration-200 ease-in-out ${
                        options.showOptionsOnPlayers ? 'translate-x-5 bg-black' : 'translate-x-0 bg-neutral-400'
                      }`}
                    />
                  </button>
                </div>

                {/* 4. Show Podium / Leaderboard After Every Question */}
                <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
                  <div className="flex items-start gap-3">
                    <Trophy className="w-4 h-4 text-neutral-300 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium text-white text-sm block">Leaderboard After Every Question</span>
                      <span className="text-xs text-neutral-400 leading-relaxed block mt-0.5">
                        Show top 5 standings after every question. Turn off to proceed directly to the next question.
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleUpdateOption('showPodiumEveryQuestion', !options.showPodiumEveryQuestion)}
                    className={`w-12 h-7 rounded-full p-1 transition-colors duration-200 ease-in-out shrink-0 ${
                      options.showPodiumEveryQuestion ? 'bg-white' : 'bg-white/[0.15]'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full transition-transform duration-200 ease-in-out ${
                        options.showPodiumEveryQuestion ? 'translate-x-5 bg-black' : 'translate-x-0 bg-neutral-400'
                      }`}
                    />
                  </button>
                </div>

                {/* 5. Extra Time Per Question (+0s, +5s, +10s, +15s) */}
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
                  <div className="flex items-center gap-3 mb-2.5">
                    <Clock className="w-4 h-4 text-neutral-300 shrink-0" />
                    <div>
                      <span className="font-medium text-white text-sm block">Extra Time Per Question</span>
                      <span className="text-xs text-neutral-400">Add bonus seconds to the standard countdown</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[0, 5, 10, 15].map((sec) => (
                      <button
                        key={sec}
                        onClick={() => handleUpdateOption('extraSeconds', sec)}
                        className={`py-2 px-3 rounded-xl font-medium text-xs border transition-all active:scale-95 ${
                          (options.extraSeconds || 0) === sec
                            ? 'bg-white text-black border-white shadow-sm'
                            : 'bg-white/[0.04] text-neutral-300 border-white/[0.08] hover:border-white/[0.2]'
                        }`}
                      >
                        {sec === 0 ? 'Normal (+0s)' : `+${sec}s`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 6. Streak Points Bonus */}
                <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
                  <div className="flex items-start gap-3">
                    <Flame className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium text-white text-sm block">Streak Bonus Points</span>
                      <span className="text-xs text-neutral-400 leading-relaxed block mt-0.5">
                        Award extra points for answering multiple questions consecutively.
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleUpdateOption('enableStreakBonus', !options.enableStreakBonus)}
                    className={`w-12 h-7 rounded-full p-1 transition-colors duration-200 ease-in-out shrink-0 ${
                      options.enableStreakBonus ? 'bg-white' : 'bg-white/[0.15]'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full transition-transform duration-200 ease-in-out ${
                        options.enableStreakBonus ? 'translate-x-5 bg-black' : 'translate-x-0 bg-neutral-400'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/[0.08] flex justify-end">
                <button
                  onClick={() => setShowOptionsModal(false)}
                  className="px-6 py-2.5 bg-white hover:bg-neutral-200 text-black font-semibold text-sm rounded-full transition-all active:scale-95 shadow-sm"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. COUNTDOWN VIEW ("Get Ready!")
  if (gameState === 'COUNTDOWN') {
    return (
      <div className="max-w-6xl mx-auto px-4 py-4 sm:py-6 flex flex-col items-center">
        {renderHostTopBar()}

        <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
          <span className="px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.1] text-neutral-300 font-medium uppercase tracking-widest text-[11px] mb-4">
            Question {questionIndex + 1} of {totalQuestions}
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight max-w-2xl mb-8">
            Ready to answer?
          </h2>
          <div className="w-32 h-32 rounded-full bg-white/[0.05] border border-white/[0.15] backdrop-blur-xl flex items-center justify-center text-6xl font-extrabold text-white shadow-2xl animate-subtle-fade">
            {countdown}
          </div>
        </div>
      </div>
    );
  }

  // 3. QUESTION VIEW
  if (gameState === 'QUESTION' && currentQuestion) {
    const isUrgent = remainingSeconds <= 5;
    const progressPercent = Math.max(0, Math.min(100, (remainingSeconds / (currentQuestion.timeLimit || 20)) * 100));

    return (
      <div className="max-w-6xl mx-auto px-4 py-4 sm:py-6 flex flex-col min-h-[85vh]">
        {renderHostTopBar()}

        {/* Header: Q Number, Central Clock, Answers Count */}
        <div className="flex items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.1] text-neutral-300 font-medium text-xs tracking-wide">
              Question {questionIndex + 1} of {totalQuestions}
            </span>
          </div>

          {/* Central Countdown Clock with +5s Host Extension Button */}
          <div className="flex items-center gap-2 relative">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center font-extrabold text-xl transition-all ${
                isUrgent
                  ? 'bg-rose-500/20 border border-rose-500/50 text-rose-300 shadow-rose-500/20 animate-pulse'
                  : 'bg-white/[0.06] border border-white/[0.12] text-white shadow-sm'
              }`}
            >
              {remainingSeconds}
            </div>

            <button
              onClick={() => socket.emit('game:add_time', { pin, seconds: 5 })}
              className="px-3 py-1.5 bg-white/[0.08] hover:bg-white/[0.14] text-white border border-white/[0.12] rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all active:scale-95"
              title="Add +5 seconds to timer"
            >
              <Clock className="w-3.5 h-3.5 text-neutral-300" />
              <span>+5s</span>
            </button>

            {timeAddedNotice && (
              <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold text-amber-300 bg-amber-950/90 px-2.5 py-0.5 rounded-full border border-amber-500/40 animate-bounce z-20 shadow-lg">
                {timeAddedNotice}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-[11px] uppercase font-medium text-neutral-400 block tracking-wider">Answers</span>
              <span className="text-lg font-bold text-white">
                {answersCount} <span className="text-neutral-500 font-normal text-xs">/ {totalPlayers}</span>
              </span>
            </div>

            <button
              onClick={() => socket.emit('player:submit_answer', { pin, answerIndex: -1 })}
              className="flex items-center gap-1 text-xs px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-neutral-400 hover:text-white rounded-xl border border-white/[0.08] transition-colors"
              title="Skip question"
            >
              <FastForward className="w-3.5 h-3.5" /> Skip
            </button>
          </div>
        </div>

        {/* Question Prompt Box with Smooth Animated Progress Bar */}
        <div className="bg-[#101012] border border-white/[0.08] rounded-3xl p-6 sm:p-10 shadow-2xl text-center mb-6 flex flex-col items-center justify-center min-h-[140px] relative overflow-hidden">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-snug tracking-tight z-10">
            {currentQuestion.question}
          </h1>

          {/* Minimalist Animated Timer Progress Bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/[0.06]">
            <div
              className={`h-full transition-all duration-1000 ease-linear ${
                isUrgent ? 'bg-rose-500' : 'bg-white'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* 4 Answer Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
          {KAHOOT_COLORS.map((col, idx) => (
            <div
              key={idx}
              className={`rounded-2xl p-6 flex items-center gap-4 border transition-all ${col.bg} ${col.border}`}
            >
              <div className="w-12 h-12 rounded-xl bg-black/40 flex items-center justify-center text-white text-2xl font-bold shrink-0">
                {col.shape}
              </div>
              <span className="text-white text-lg sm:text-xl font-semibold">
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
      <div className="max-w-5xl mx-auto px-4 py-4 sm:py-6 flex flex-col min-h-[85vh]">
        {renderHostTopBar()}

        {/* Top status */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium text-neutral-400 uppercase tracking-widest">
            Results for Question {questionIndex + 1}
          </span>
          <div className="flex items-center gap-2">
            {options.showPodiumEveryQuestion ? (
              <button
                onClick={handleProceedToLeaderboard}
                className="flex items-center gap-2 px-6 py-2.5 bg-white hover:bg-neutral-200 text-black font-semibold text-sm rounded-full transition-all active:scale-95 shadow-sm"
              >
                <span>Leaderboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleProceedToLeaderboard}
                  className="px-4 py-2 bg-white/[0.06] hover:bg-white/[0.1] text-neutral-300 hover:text-white rounded-full text-xs font-medium border border-white/[0.1] transition-colors"
                  title="View standings"
                >
                  View Standings
                </button>
                <button
                  onClick={handleNextQuestion}
                  className="flex items-center gap-2 px-6 py-2.5 bg-white hover:bg-neutral-200 text-black font-semibold text-sm rounded-full transition-all active:scale-95 shadow-sm"
                >
                  <span>{questionIndex >= totalQuestions - 1 ? 'Final Results' : 'Next Question'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Question recap */}
        <div className="bg-[#101012] border border-white/[0.08] rounded-2xl p-5 mb-6 text-center">
          <h2 className="text-lg sm:text-xl font-bold text-white">
            {currentQuestion.question}
          </h2>
          {revealData.explanation && (
            <p className="mt-2 text-xs text-neutral-300 font-normal">
              💡 {revealData.explanation}
            </p>
          )}
        </div>

        {/* Answer Distribution Bar Chart */}
        <div className="bg-[#101012] border border-white/[0.08] rounded-3xl p-6 sm:p-8 flex-1 flex flex-col justify-end">
          <div className="grid grid-cols-4 gap-4 h-64 sm:h-72 items-end">
            {KAHOOT_COLORS.map((col, idx) => {
              const count = revealData.distribution[idx] || 0;
              const isCorrect = idx === revealData.correctIndex;
              const heightPercent = Math.round((count / maxVotes) * 100);

              return (
                <div key={idx} className="flex flex-col items-center h-full justify-end gap-2">
                  <span className="font-bold text-base text-white">{count}</span>
                  <div
                    className={`w-full rounded-2xl transition-all duration-700 flex flex-col items-center justify-end p-2 relative shadow-lg ${
                      isCorrect ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-black' : 'opacity-40'
                    }`}
                    style={{
                      height: `${Math.max(18, heightPercent)}%`,
                      backgroundColor: col.colorHex
                    }}
                  >
                    <div className="w-8 h-8 rounded-lg bg-black/40 flex items-center justify-center text-white text-base font-bold mb-1">
                      {col.shape}
                    </div>
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-neutral-300 truncate max-w-[120px] text-center">
                    {currentQuestion.options[idx]}
                  </span>
                  {isCorrect && (
                    <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                      ✓ Correct
                    </span>
                  )}
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
      <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6">
        {renderHostTopBar()}

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5 tracking-tight">
              <Trophy className="w-7 h-7 text-neutral-300" />
              <span>Leaderboard</span>
            </h1>
            <p className="text-neutral-400 text-xs mt-0.5">
              Question {questionIndex + 1} of {totalQuestions}
            </p>
          </div>

          <button
            onClick={handleNextQuestion}
            className="flex items-center gap-2 px-6 py-2.5 bg-white hover:bg-neutral-200 text-black font-semibold text-sm rounded-full transition-all active:scale-95 shadow-sm"
          >
            <span>{isLastQuestion ? 'Final Results' : 'Next Question'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Leaderboard Cards */}
        <div className="space-y-2.5">
          {leaderboardData.map((player, idx) => {
            const isTop1 = idx === 0;
            const isTop2 = idx === 1;
            const isTop3 = idx === 2;

            let rankBadge = (
              <span className="w-8 h-8 rounded-xl bg-white/[0.04] text-neutral-400 flex items-center justify-center font-medium text-xs border border-white/[0.06]">
                #{idx + 1}
              </span>
            );

            if (isTop1) {
              rankBadge = (
                <span className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center font-bold text-xs border border-amber-400/30">
                  🥇
                </span>
              );
            } else if (isTop2) {
              rankBadge = (
                <span className="w-8 h-8 rounded-xl bg-white/[0.1] text-neutral-200 flex items-center justify-center font-bold text-xs border border-white/[0.15]">
                  🥈
                </span>
              );
            } else if (isTop3) {
              rankBadge = (
                <span className="w-8 h-8 rounded-xl bg-amber-700/20 text-amber-200 flex items-center justify-center font-bold text-xs border border-amber-700/30">
                  🥉
                </span>
              );
            }

            return (
              <div
                key={idx}
                className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                  isTop1
                    ? 'bg-amber-400/[0.05] border-amber-400/30'
                    : isTop2
                    ? 'bg-white/[0.03] border-white/[0.12]'
                    : isTop3
                    ? 'bg-amber-700/[0.05] border-amber-600/20'
                    : 'bg-[#101012] border-white/[0.06]'
                }`}
              >
                <div className="flex items-center gap-3">
                  {rankBadge}
                  <span className="text-2xl">{player.avatar || '🎮'}</span>
                  <div>
                    <span className="font-semibold text-white text-base block">
                      {player.nickname}
                    </span>
                    {player.streak > 1 && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 font-medium">
                        <Flame className="w-3 h-3 fill-current" /> {player.streak} Streak
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xl font-bold text-white font-mono">
                    {player.score.toLocaleString()}
                  </span>
                  {player.lastPointsEarned > 0 && (
                    <span className="block text-xs font-medium text-emerald-400">
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
      <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6 flex flex-col items-center">
        {renderHostTopBar()}

        <h1 className="text-3xl sm:text-4xl font-extrabold text-center text-white mb-2 tracking-tight">
          Final Results
        </h1>
        <p className="text-neutral-400 text-center mb-10 text-sm font-normal">
          Congratulations to our quiz champions!
        </p>

        {/* Apple Awards Frosted Pedestals */}
        <div className="w-full max-w-2xl flex items-end justify-center gap-3 sm:gap-6 min-h-[340px] mb-12">
          {/* 2nd Place (Silver) */}
          <div className="flex-1 flex flex-col items-center animate-subtle-fade">
            {second ? (
              <>
                <div className="text-4xl mb-1">{second.avatar}</div>
                <span className="font-bold text-white text-sm sm:text-base truncate max-w-[120px]">
                  {second.nickname}
                </span>
                <span className="text-xs sm:text-sm font-medium text-neutral-400 font-mono mb-3">
                  {second.score.toLocaleString()} pts
                </span>
                <div className="w-full h-36 bg-[#16161a] border border-white/[0.1] border-t-2 border-t-neutral-300 rounded-t-2xl flex flex-col items-center justify-center shadow-2xl relative overflow-hidden backdrop-blur-xl">
                  <div className="absolute inset-0 bg-gradient-to-b from-white/[0.08] to-transparent pointer-events-none" />
                  <span className="text-3xl font-extrabold text-neutral-200">2</span>
                  <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest mt-1">Silver</span>
                </div>
              </>
            ) : (
              <div className="w-full h-24 bg-white/[0.02] border border-white/[0.04] rounded-t-2xl" />
            )}
          </div>

          {/* 1st Place (Gold Champion) */}
          <div className="flex-1 flex flex-col items-center animate-subtle-fade" style={{ animationDelay: '0.1s' }}>
            {first ? (
              <>
                <div className="text-xl mb-0.5">👑</div>
                <div className="text-5xl mb-1">{first.avatar}</div>
                <span className="font-extrabold text-amber-300 text-base sm:text-lg truncate max-w-[140px]">
                  {first.nickname}
                </span>
                <span className="text-sm sm:text-base font-semibold text-amber-400 font-mono mb-3">
                  {first.score.toLocaleString()} pts
                </span>
                <div className="w-full h-48 bg-[#181614] border border-amber-400/30 border-t-2 border-t-amber-400 rounded-t-2xl flex flex-col items-center justify-center shadow-2xl relative overflow-hidden backdrop-blur-xl">
                  <div className="absolute inset-0 bg-gradient-to-b from-amber-400/[0.12] to-transparent pointer-events-none" />
                  <span className="text-4xl font-extrabold text-amber-300">1</span>
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mt-1">Champion</span>
                </div>
              </>
            ) : null}
          </div>

          {/* 3rd Place (Bronze) */}
          <div className="flex-1 flex flex-col items-center animate-subtle-fade" style={{ animationDelay: '0.2s' }}>
            {third ? (
              <>
                <div className="text-4xl mb-1">{third.avatar}</div>
                <span className="font-bold text-white text-sm sm:text-base truncate max-w-[120px]">
                  {third.nickname}
                </span>
                <span className="text-xs sm:text-sm font-medium text-neutral-400 font-mono mb-3">
                  {third.score.toLocaleString()} pts
                </span>
                <div className="w-full h-28 bg-[#161412] border border-amber-700/30 border-t-2 border-t-amber-600 rounded-t-2xl flex flex-col items-center justify-center shadow-2xl relative overflow-hidden backdrop-blur-xl">
                  <div className="absolute inset-0 bg-gradient-to-b from-amber-700/[0.1] to-transparent pointer-events-none" />
                  <span className="text-3xl font-extrabold text-amber-200/80">3</span>
                  <span className="text-[10px] font-semibold text-amber-500/80 uppercase tracking-widest mt-1">Bronze</span>
                </div>
              </>
            ) : (
              <div className="w-full h-16 bg-white/[0.02] border border-white/[0.04] rounded-t-2xl" />
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 mb-10">
          <button
            onClick={handleRestartGame}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-white hover:bg-neutral-200 text-black font-semibold text-sm shadow-sm transition-all active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Play Again</span>
          </button>
          <button
            onClick={onExit}
            className="px-6 py-2.5 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-neutral-300 hover:text-white font-medium text-sm border border-white/[0.08] transition-colors"
          >
            Exit to Home
          </button>
        </div>

        {/* Full Rankings Leaderboard Table */}
        {allPlayers && allPlayers.length > 0 && (
          <div className="w-full max-w-2xl bg-[#101012] border border-white/[0.08] rounded-3xl p-6 shadow-2xl mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08] mb-4">
              <div>
                <h3 className="text-xs uppercase font-semibold text-white tracking-wider flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-neutral-400" />
                  <span>Participant Standings ({allPlayers.length})</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">Final scores and positions for all participants</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyRankings(allPlayers)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-neutral-300 hover:text-white border border-white/[0.1] text-xs font-medium transition-all active:scale-95"
                  title="Copy rankings to clipboard"
                >
                  {copiedRankings ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedRankings ? 'Copied' : 'Copy Results'}</span>
                </button>
              </div>
            </div>

            {/* Search filter if more than 5 players */}
            {allPlayers.length > 5 && (
              <div className="relative mb-3">
                <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search player nickname..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full bg-black/60 border border-white/[0.1] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/40"
                />
              </div>
            )}

            {/* Scrollable Rankings List */}
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
              {allPlayers
                .filter(p => p.nickname.toLowerCase().includes(searchFilter.trim().toLowerCase()))
                .map((p, idx) => {
                  const rank = p.rank || idx + 1;
                  const isTop1 = rank === 1;
                  const isTop2 = rank === 2;
                  const isTop3 = rank === 3;

                  let rankIcon = (
                    <span className="w-7 h-7 rounded-lg bg-white/[0.04] text-neutral-400 font-medium text-xs flex items-center justify-center border border-white/[0.06]">
                      #{rank}
                    </span>
                  );
                  if (isTop1) {
                    rankIcon = (
                      <span className="w-7 h-7 rounded-lg bg-amber-400/20 text-amber-300 font-bold text-xs flex items-center justify-center border border-amber-400/30">
                        🥇
                      </span>
                    );
                  } else if (isTop2) {
                    rankIcon = (
                      <span className="w-7 h-7 rounded-lg bg-white/[0.1] text-neutral-200 font-bold text-xs flex items-center justify-center border border-white/[0.15]">
                        🥈
                      </span>
                    );
                  } else if (isTop3) {
                    rankIcon = (
                      <span className="w-7 h-7 rounded-lg bg-amber-700/20 text-amber-200 font-bold text-xs flex items-center justify-center border border-amber-700/30">
                        🥉
                      </span>
                    );
                  }

                  return (
                    <div
                      key={idx}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-colors ${
                        isTop1
                          ? 'bg-amber-400/[0.05] border-amber-400/30'
                          : isTop2
                          ? 'bg-white/[0.03] border-white/[0.12]'
                          : isTop3
                          ? 'bg-amber-700/[0.05] border-amber-600/20'
                          : 'bg-white/[0.015] border-white/[0.06] hover:border-white/[0.12]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {rankIcon}
                        <span className="text-2xl">{p.avatar || '🎮'}</span>
                        <div>
                          <span className="text-white font-medium text-sm block">
                            {p.nickname}
                          </span>
                          {p.streak > 1 && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 font-medium">
                              <Flame className="w-3 h-3 fill-current" /> {p.streak} Streak
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono text-white font-semibold text-sm">
                          {p.score.toLocaleString()} <span className="text-[11px] font-normal text-neutral-400">pts</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
