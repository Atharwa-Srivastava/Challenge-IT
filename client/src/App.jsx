import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Navbar from './components/Navbar';
import Home from './components/Home';
import HostView from './components/HostView';
import PlayerView from './components/PlayerView';
import QuizCreator from './components/QuizCreator';

export default function App() {
  const [socket, setSocket] = useState(null);
  const [view, setView] = useState('HOME'); // 'HOME' | 'HOST' | 'PLAYER' | 'CREATOR'

  // Host specifics
  const [hostPin, setHostPin] = useState(null);
  const [hostQuizInfo, setHostQuizInfo] = useState(null);

  // Player specifics
  const [playerPin, setPlayerPin] = useState('');

  useEffect(() => {
    // Connect to backend socket server
    const newSocket = io(window.location.origin, {
      transports: ['websocket', 'polling']
    });

    setSocket(newSocket);

    newSocket.on('room:created', (data) => {
      setHostPin(data.pin);
      setHostQuizInfo(data.quiz);
      setView('HOST');
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const handleHostQuiz = (quiz) => {
    if (!socket) return;
    socket.emit('room:create', { quizId: quiz.id });
  };

  const handleJoinWithPin = (pin) => {
    setPlayerPin(pin);
    setView('PLAYER');
  };

  const handleCreateQuiz = () => {
    setView('CREATOR');
  };

  const handleSaveAndHostCustomQuiz = (quiz) => {
    if (!socket) return;
    socket.emit('room:create', { customQuiz: quiz });
  };

  const handleGoHome = () => {
    if (view === 'HOST' || view === 'PLAYER') {
      if (!confirm('Leave current game room?')) return;
    }
    setView('HOME');
    setHostPin(null);
    setPlayerPin('');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans selection:bg-purple-500 selection:text-white">
      <Navbar
        onGoHome={view !== 'HOME' ? handleGoHome : null}
        currentRole={view === 'HOST' ? 'Game Host' : view === 'PLAYER' ? 'Player' : null}
      />

      <main className="flex-1">
        {view === 'HOME' && (
          <Home
            onHostQuiz={handleHostQuiz}
            onJoinWithPin={handleJoinWithPin}
            onCreateQuiz={handleCreateQuiz}
          />
        )}

        {view === 'CREATOR' && (
          <QuizCreator
            onBack={() => setView('HOME')}
            onSaveAndHost={handleSaveAndHostCustomQuiz}
          />
        )}

        {view === 'HOST' && hostPin && (
          <HostView
            socket={socket}
            pin={hostPin}
            quizInfo={hostQuizInfo}
            onExit={() => setView('HOME')}
          />
        )}

        {view === 'PLAYER' && (
          <PlayerView
            socket={socket}
            initialPin={playerPin}
            onExit={() => setView('HOME')}
          />
        )}
      </main>

      <footer className="py-6 text-center text-xs text-slate-500 border-t border-slate-900">
        Kahoot! Clone • Full-Stack Real-Time Multiplayer Quiz System
      </footer>
    </div>
  );
}
