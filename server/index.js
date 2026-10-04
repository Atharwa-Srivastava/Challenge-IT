const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { sampleQuizzes } = require('./sampleQuizzes');
const GameManager = require('./gameManager');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const gameManager = new GameManager(io);

// Load sample quizzes into GameManager
sampleQuizzes.forEach(quiz => gameManager.registerQuiz(quiz));

const HOST_CREDENTIALS = {
  username: 'Atharwa_sri',
  password: 'Atharwa@Aug'
};

const isHostAuthorized = (req) => {
  const authHeader = req.headers['authorization'] || req.headers['x-host-auth'];
  if (authHeader && authHeader.includes('Atharwa_sri') && authHeader.includes('Atharwa@Aug')) {
    return true;
  }
  const { username, password } = req.query;
  if (username === HOST_CREDENTIALS.username && password === HOST_CREDENTIALS.password) {
    return true;
  }
  if (req.body && req.body.auth && req.body.auth.username === HOST_CREDENTIALS.username && req.body.auth.password === HOST_CREDENTIALS.password) {
    return true;
  }
  return false;
};

// REST Endpoints (Host Protected)
app.get('/api/quizzes', (req, res) => {
  if (!isHostAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized: Host login required to access quizzes.' });
  }
  res.json(gameManager.getAllQuizzes());
});

app.get('/api/quizzes/:id', (req, res) => {
  if (!isHostAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized: Host login required.' });
  }
  const quiz = gameManager.getQuiz(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
  res.json(quiz);
});

app.post('/api/quizzes', (req, res) => {
  if (!isHostAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized: Host login required.' });
  }
  const { title, description, coverImage, questions } = req.body;
  if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: 'Invalid quiz payload: title and questions required.' });
  }

  const newQuiz = {
    id: 'custom-' + Date.now(),
    title,
    description: description || 'Custom User Quiz',
    coverImage: coverImage || '✨',
    questions: questions.map((q, idx) => ({
      id: q.id || `cq-${idx + 1}`,
      question: q.question,
      options: q.options || [],
      correctIndex: Number(q.correctIndex) || 0,
      timeLimit: Number(q.timeLimit) || 20,
      points: Number(q.points) || 1000,
      explanation: q.explanation || ''
    }))
  };

  gameManager.registerQuiz(newQuiz);
  res.status(201).json(newQuiz);
});

app.delete('/api/quizzes/:id', (req, res) => {
  if (!isHostAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized: Host login required.' });
  }
  const { id } = req.params;
  if (id.startsWith('quiz-')) {
    return res.status(403).json({ error: 'Cannot delete default sample quiz.' });
  }
  gameManager.quizzes.delete(id);
  res.json({ success: true, message: 'Quiz deleted.' });
});

// Host authentication endpoint
app.post('/api/host/login', (req, res) => {
  const { username, password } = req.body;
  if (username === HOST_CREDENTIALS.username && password === HOST_CREDENTIALS.password) {
    return res.json({ success: true, username: HOST_CREDENTIALS.username });
  }
  return res.status(401).json({ success: false, message: 'Invalid host username or password' });
});

// Socket.IO Handling
io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  // Host creates room
  socket.on('room:create', ({ quizId, customQuiz, options, auth }) => {
    // Enforce host credentials
    if (!auth || auth.username !== HOST_CREDENTIALS.username || auth.password !== HOST_CREDENTIALS.password) {
      return socket.emit('error:notice', { message: 'Unauthorized: Host credentials required.' });
    }

    let quiz = customQuiz;
    if (!quiz && quizId) {
      quiz = gameManager.getQuiz(quizId);
    }
    if (!quiz) {
      return socket.emit('error:notice', { message: 'Quiz could not be found.' });
    }

    const room = gameManager.createRoom(socket.id, quiz, options || {});
    socket.join(room.pin);

    socket.emit('room:created', {
      pin: room.pin,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        questionsCount: quiz.questions.length
      },
      options: room.options
    });
    console.log(`[Room Created] PIN: ${room.pin} by Host: ${socket.id}`);
  });

  // Player joins room
  socket.on('room:join', ({ pin, nickname, avatar }) => {
    const result = gameManager.joinRoom(pin, socket, nickname, avatar);
    if (!result.success) {
      return socket.emit('room:join_error', { message: result.message });
    }

    const room = gameManager.getRoom(pin);
    socket.emit('room:joined', {
      pin,
      player: result.player,
      quizTitle: room.quiz.title,
      questionCount: room.quiz.questions.length
    });
    console.log(`[Player Joined] ${nickname} in PIN: ${pin}`);
  });

  // Host kicks a player
  socket.on('room:kick_player', ({ pin, targetSocketId }) => {
    const room = gameManager.getRoom(pin);
    if (room && room.hostSocketId === socket.id) {
      gameManager.kickPlayer(pin, targetSocketId);
    }
  });

  // Host starts the game
  socket.on('game:start', ({ pin }) => {
    const room = gameManager.getRoom(pin);
    if (room && room.hostSocketId === socket.id) {
      gameManager.startGame(pin);
    }
  });

  // Player submits answer
  socket.on('player:submit_answer', ({ pin, answerIndex }) => {
    gameManager.submitAnswer(pin, socket.id, answerIndex);
  });

  // Host proceeds to leaderboard
  socket.on('game:show_leaderboard', ({ pin }) => {
    const room = gameManager.getRoom(pin);
    if (room && room.hostSocketId === socket.id) {
      gameManager.showLeaderboard(pin);
    }
  });

  // Host proceeds to next question
  socket.on('game:next_question', ({ pin }) => {
    const room = gameManager.getRoom(pin);
    if (room && room.hostSocketId === socket.id) {
      gameManager.nextQuestion(pin);
    }
  });

  // Host restarts game
  socket.on('game:restart', ({ pin }) => {
    const room = gameManager.getRoom(pin);
    if (room && room.hostSocketId === socket.id) {
      room.state = 'LOBBY';
      room.currentQuestionIndex = -1;
      room.answersForCurrentQuestion.clear();
      room.players.forEach(p => {
        p.score = 0;
        p.streak = 0;
        p.lastPointsEarned = 0;
        p.lastAnswerCorrect = null;
        p.rank = 0;
      });
      gameManager.broadcastLobbyUpdate(room);
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`[Socket] Disconnected: ${socket.id}`);
    gameManager.handleDisconnect(socket.id);
  });
});

const path = require('path');
const fs = require('fs');

// Static serving for built client
const distPathCandidates = [
  path.join(__dirname, '../client/dist'),
  path.join(process.cwd(), 'client/dist'),
  path.join(process.cwd(), 'dist')
];

const activeDistPath = distPathCandidates.find(p => fs.existsSync(path.join(p, 'index.html')));

if (activeDistPath) {
  console.log(`[Static] Serving client from ${activeDistPath}`);
  app.use(express.static(activeDistPath));
  app.use((req, res) => {
    res.sendFile(path.join(activeDistPath, 'index.html'));
  });
} else {
  console.warn('[Static] Warning: client/dist/index.html not found in any candidate paths!');
  app.use((req, res) => {
    res.status(503).send(`
      <div style="font-family:system-ui;text-align:center;padding:50px;background:#0f172a;color:#fff;min-height:100vh;">
        <h1 style="color:#c084fc;">Kahoot Server is Live!</h1>
        <p>Client build is missing. Run <code>npm run build</code> to generate client/dist.</p>
      </div>
    `);
  });
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Kahoot Clone Server running on http://localhost:${PORT}`);
});

