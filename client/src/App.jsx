import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Navbar from './components/Navbar';
import Home from './components/Home';
import HostView from './components/HostView';
import PlayerView from './components/PlayerView';
import QuizCreator from './components/QuizCreator';
import HostLoginModal from './components/HostLoginModal';
import { getStoredHostAuth } from './utils/auth';

export default function App() {
  const [socket, setSocket] = useState(null);
  const [view, setView] = useState('HOME'); // 'HOME' | 'HOST' | 'PLAYER' | 'CREATOR'

  // Host Authentication
  const [isHostAuthenticated, setIsHostAuthenticated] = useState(() => {
    return localStorage.getItem('kahoot_host_auth') === 'true';
  });
  const [hostCredentials, setHostCredentials] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('kahoot_host_creds') || 'null');
    } catch {
      return null;
    }
  });
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Host specifics
  const [hostPin, setHostPin] = useState(null);
  const [hostQuizInfo, setHostQuizInfo] = useState(null);

  // Player specifics
  const [playerPin, setPlayerPin] = useState('');

  // Check URL query parameters for direct invite links (e.g. ?pin=123456)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const pinFromUrl = urlParams.get('pin') || urlParams.get('join');
    if (pinFromUrl && pinFromUrl.trim().length >= 4) {
      setPlayerPin(pinFromUrl.trim());
      setView('PLAYER');
    }
  }, []);

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

    newSocket.on('error:notice', (data) => {
      alert(data.message || 'An error occurred.');
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const handleLoginSuccess = (creds) => {
    setIsHostAuthenticated(true);
    setHostCredentials(creds);
    localStorage.setItem('kahoot_host_auth', 'true');
    localStorage.setItem('kahoot_host_creds', JSON.stringify(creds));
  };

  const handleHostLogout = () => {
    setIsHostAuthenticated(false);
    setHostCredentials(null);
    localStorage.removeItem('kahoot_host_auth');
    localStorage.removeItem('kahoot_host_creds');
    if (view === 'HOST' || view === 'CREATOR') {
      setView('HOME');
    }
  };

  const getEffectiveAuth = () => {
    return hostCredentials || getStoredHostAuth();
  };

  const handleHostQuiz = (quiz) => {
    if (!isHostAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    if (!socket) return;
    socket.emit('room:create', {
      quizId: quiz.id,
      auth: getEffectiveAuth()
    });
  };

  const handleJoinWithPin = (pin) => {
    setPlayerPin(pin);
    setView('PLAYER');
  };

  const handleCreateQuiz = () => {
    if (!isHostAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    setView('CREATOR');
  };

  const handleSaveAndHostCustomQuiz = (quiz) => {
    if (!isHostAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    if (!socket) return;
    socket.emit('room:create', {
      customQuiz: quiz,
      auth: getEffectiveAuth()
    });
  };

  const handleGoHome = () => {
    if (view === 'HOST' || view === 'PLAYER') {
      if (!confirm('Leave current game room?')) return;
    }
    setView('HOME');
    setHostPin(null);
    setPlayerPin('');
  };

  const activeHostUsername = hostCredentials?.username || (isHostAuthenticated ? getStoredHostAuth().username : 'Host');

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-purple-600 selection:text-white">
      <Navbar
        onGoHome={view !== 'HOME' ? handleGoHome : null}
        currentRole={view === 'HOST' ? 'Game Host' : view === 'PLAYER' ? 'Player' : null}
        isHostAuthenticated={isHostAuthenticated}
        hostUsername={activeHostUsername}
        onOpenHostLogin={() => setShowLoginModal(true)}
        onHostLogout={handleHostLogout}
      />

      <main className="flex-1 bg-black">
        {view === 'HOME' && (
          <Home
            onHostQuiz={handleHostQuiz}
            onJoinWithPin={handleJoinWithPin}
            onCreateQuiz={handleCreateQuiz}
            isHostAuthenticated={isHostAuthenticated}
            hostUsername={activeHostUsername}
            onOpenHostLogin={() => setShowLoginModal(true)}
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

      <HostLoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      <footer className="py-6 text-center text-xs text-neutral-500 border-t border-neutral-900 bg-black">
        Orbit • Interactive Real-Time Multiplayer Quiz &amp; Trivia Platform
      </footer>
    </div>
  );
}
