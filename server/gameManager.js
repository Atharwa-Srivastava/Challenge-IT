const { v4: uuidv4 } = require('uuid');

class GameManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map(); // pin -> room
    this.quizzes = new Map(); // quizId -> quiz
  }

  registerQuiz(quiz) {
    this.quizzes.set(quiz.id, quiz);
  }

  getQuiz(quizId) {
    return this.quizzes.get(quizId);
  }

  getAllQuizzes() {
    return Array.from(this.quizzes.values());
  }

  generatePin() {
    let pin;
    let attempts = 0;
    do {
      pin = Math.floor(100000 + Math.random() * 900000).toString();
      attempts++;
    } while (this.rooms.has(pin) && attempts < 100);
    return pin;
  }

  createRoom(hostSocketId, quiz, options = {}) {
    const pin = this.generatePin();
    const room = {
      pin,
      hostSocketId,
      quiz,
      options: {
        showAnswersOnPlayerScreen: options.showAnswersOnPlayerScreen !== false, // default true
        timeLimitMultiplier: options.timeLimitMultiplier || 1.0,
      },
      state: 'LOBBY', // 'LOBBY' | 'COUNTDOWN' | 'QUESTION' | 'ANSWER_REVEAL' | 'LEADERBOARD' | 'FINAL_PODIUM'
      currentQuestionIndex: -1,
      questionStartTime: null,
      questionTimer: null,
      remainingSeconds: 0,
      players: new Map(), // socketId -> Player
      answersForCurrentQuestion: new Map(), // socketId -> { answerIndex, timeSpent, pointsEarned, isCorrect }
      createdAt: Date.now()
    };

    this.rooms.set(pin, room);
    return room;
  }

  getRoom(pin) {
    return this.rooms.get(pin);
  }

  getRoomByHost(hostSocketId) {
    for (const room of this.rooms.values()) {
      if (room.hostSocketId === hostSocketId) return room;
    }
    return null;
  }

  getRoomByPlayer(playerSocketId) {
    for (const room of this.rooms.values()) {
      if (room.players.has(playerSocketId)) return room;
    }
    return null;
  }

  joinRoom(pin, socket, nickname, avatar = '🦊') {
    const room = this.rooms.get(pin);
    if (!room) {
      return { success: false, message: 'Game PIN not found.' };
    }

    if (room.state !== 'LOBBY') {
      return { success: false, message: 'Game has already started!' };
    }

    // Check duplicate nickname
    const existingNick = Array.from(room.players.values()).find(
      p => p.nickname.toLowerCase() === nickname.trim().toLowerCase()
    );
    if (existingNick) {
      return { success: false, message: 'That nickname is already taken in this room.' };
    }

    const player = {
      socketId: socket.id,
      nickname: nickname.trim(),
      avatar: avatar || '🎮',
      score: 0,
      streak: 0,
      lastPointsEarned: 0,
      lastAnswerCorrect: null,
      rank: 0,
      connected: true
    };

    room.players.set(socket.id, player);
    socket.join(pin);

    this.broadcastLobbyUpdate(room);
    return { success: true, player, roomPin: pin };
  }

  kickPlayer(pin, targetSocketId) {
    const room = this.rooms.get(pin);
    if (!room) return;

    if (room.players.has(targetSocketId)) {
      const player = room.players.get(targetSocketId);
      room.players.delete(targetSocketId);
      this.io.to(targetSocketId).emit('player:kicked', { message: 'You were removed from the game.' });
      this.broadcastLobbyUpdate(room);
    }
  }

  startGame(pin) {
    const room = this.rooms.get(pin);
    if (!room || room.state !== 'LOBBY') return;
    if (room.players.size === 0) {
      this.io.to(room.hostSocketId).emit('error:notice', { message: 'Need at least 1 player to start!' });
      return;
    }

    room.currentQuestionIndex = 0;
    this.startQuestionCountdown(room);
  }

  startQuestionCountdown(room) {
    room.state = 'COUNTDOWN';
    room.answersForCurrentQuestion.clear();

    const question = room.quiz.questions[room.currentQuestionIndex];
    let countdown = 3;

    // Send countdown to host (includes question preview)
    this.io.to(room.hostSocketId).emit('game:countdown', {
      countdown,
      questionNumber: room.currentQuestionIndex + 1,
      totalQuestions: room.quiz.questions.length,
      questionText: question.question
    });

    // Send countdown to players (buzzer view - no question text)
    for (const socketId of room.players.keys()) {
      this.io.to(socketId).emit('game:countdown', {
        countdown,
        questionNumber: room.currentQuestionIndex + 1,
        totalQuestions: room.quiz.questions.length
      });
    }

    const interval = setInterval(() => {
      countdown--;
      if (countdown > 0) {
        this.io.to(room.pin).emit('game:countdown_tick', { countdown });
      } else {
        clearInterval(interval);
        this.activateQuestion(room);
      }
    }, 1000);
  }

  activateQuestion(room) {
    room.state = 'QUESTION';
    const question = room.quiz.questions[room.currentQuestionIndex];
    const timeLimit = Math.round(question.timeLimit * room.options.timeLimitMultiplier);
    room.questionStartTime = Date.now();
    room.remainingSeconds = timeLimit;

    // Send question and answer texts ONLY to host screen
    this.io.to(room.hostSocketId).emit('host:question_started', {
      questionIndex: room.currentQuestionIndex,
      totalQuestions: room.quiz.questions.length,
      question: {
        id: question.id,
        question: question.question,
        options: question.options,
        timeLimit: timeLimit,
        points: question.points
      },
      playerCount: room.players.size,
      answersCount: 0
    });

    // Send buzzer controller ONLY to players (NO question text, NO option text)
    for (const [socketId, player] of room.players) {
      this.io.to(socketId).emit('player:question_started', {
        questionIndex: room.currentQuestionIndex,
        totalQuestions: room.quiz.questions.length,
        timeLimit: timeLimit,
        playerScore: player.score,
        playerStreak: player.streak
      });
    }

    // Start timer interval on server
    if (room.questionTimer) clearInterval(room.questionTimer);

    room.questionTimer = setInterval(() => {
      room.remainingSeconds--;
      this.io.to(room.pin).emit('game:timer_tick', { remainingSeconds: room.remainingSeconds });

      if (room.remainingSeconds <= 0) {
        clearInterval(room.questionTimer);
        room.questionTimer = null;
        this.revealAnswers(room);
      }
    }, 1000);
  }

  submitAnswer(pin, socketId, answerIndex) {
    const room = this.rooms.get(pin);
    if (!room || room.state !== 'QUESTION') return { success: false, message: 'Not accepting answers.' };

    const player = room.players.get(socketId);
    if (!player) return { success: false, message: 'Player not found.' };

    if (room.answersForCurrentQuestion.has(socketId)) {
      return { success: false, message: 'Answer already submitted.' };
    }

    const question = room.quiz.questions[room.currentQuestionIndex];
    const timeSpent = Math.max(0, (Date.now() - room.questionStartTime) / 1000);
    const timeLimit = Math.round(question.timeLimit * room.options.timeLimitMultiplier);
    const isCorrect = answerIndex === question.correctIndex;

    // Calculate Kahoot score
    let pointsEarned = 0;
    if (isCorrect) {
      const maxPoints = question.points || 1000;
      // Formula: (1 - ((responseTime / timeLimit) / 2)) * maxPoints
      const timeRatio = Math.min(1, Math.max(0, timeSpent / timeLimit));
      const speedScore = Math.round((1 - (timeRatio / 2)) * maxPoints);

      // Streak bonus
      let streakBonus = 0;
      if (player.streak >= 4) streakBonus = 500;
      else if (player.streak === 3) streakBonus = 300;
      else if (player.streak === 2) streakBonus = 200;
      else if (player.streak === 1) streakBonus = 100;

      pointsEarned = speedScore + streakBonus;
      player.streak += 1;
      player.score += pointsEarned;
      player.lastPointsEarned = pointsEarned;
      player.lastAnswerCorrect = true;
    } else {
      player.streak = 0;
      player.lastPointsEarned = 0;
      player.lastAnswerCorrect = false;
    }

    room.answersForCurrentQuestion.set(socketId, {
      answerIndex,
      timeSpent,
      pointsEarned,
      isCorrect
    });

    // Notify player that answer was received
    this.io.to(socketId).emit('player:answer_recorded', {
      answerIndex,
      waitingForOthers: true
    });

    // Notify host with updated answer count
    this.io.to(room.hostSocketId).emit('host:answer_received', {
      answersCount: room.answersForCurrentQuestion.size,
      totalPlayers: room.players.size
    });

    // If all players have answered, reveal answers early!
    if (room.answersForCurrentQuestion.size >= room.players.size) {
      if (room.questionTimer) {
        clearInterval(room.questionTimer);
        room.questionTimer = null;
      }
      setTimeout(() => this.revealAnswers(room), 600);
    }

    return { success: true };
  }

  revealAnswers(room) {
    if (room.state !== 'QUESTION') return;
    room.state = 'ANSWER_REVEAL';

    const question = room.quiz.questions[room.currentQuestionIndex];

    // Compute distribution of answers
    const distribution = [0, 0, 0, 0];
    for (const record of room.answersForCurrentQuestion.values()) {
      if (record.answerIndex >= 0 && record.answerIndex < 4) {
        distribution[record.answerIndex]++;
      }
    }

    // Calculate leaderboard positions
    this.updateRankings(room);

    // Host payload
    this.io.to(room.hostSocketId).emit('host:answer_reveal', {
      questionIndex: room.currentQuestionIndex,
      correctIndex: question.correctIndex,
      explanation: question.explanation || '',
      distribution,
      totalAnswers: room.answersForCurrentQuestion.size,
      totalPlayers: room.players.size
    });

    // Send each player their tailored result
    for (const [socketId, player] of room.players) {
      const record = room.answersForCurrentQuestion.get(socketId);
      const isCorrect = record ? record.isCorrect : false;
      const pointsEarned = record ? record.pointsEarned : 0;
      const chosenIndex = record ? record.answerIndex : null;

      this.io.to(socketId).emit('player:answer_reveal', {
        isCorrect,
        pointsEarned,
        totalScore: player.score,
        currentStreak: player.streak,
        correctIndex: question.correctIndex,
        chosenIndex,
        rank: player.rank,
        explanation: question.explanation || ''
      });
    }
  }

  showLeaderboard(pin) {
    const room = this.rooms.get(pin);
    if (!room) return;

    room.state = 'LEADERBOARD';
    this.updateRankings(room);

    const sortedPlayers = Array.from(room.players.values())
      .sort((a, b) => b.score - a.score);

    const topFive = sortedPlayers.slice(0, 5).map(p => ({
      nickname: p.nickname,
      avatar: p.avatar,
      score: p.score,
      streak: p.streak,
      rank: p.rank,
      lastPointsEarned: p.lastPointsEarned
    }));

    const isLastQuestion = room.currentQuestionIndex >= room.quiz.questions.length - 1;

    this.io.to(room.pin).emit('game:leaderboard', {
      topPlayers: topFive,
      currentQuestionIndex: room.currentQuestionIndex,
      totalQuestions: room.quiz.questions.length,
      isLastQuestion
    });
  }

  nextQuestion(pin) {
    const room = this.rooms.get(pin);
    if (!room) return;

    if (room.currentQuestionIndex >= room.quiz.questions.length - 1) {
      this.showFinalPodium(pin);
    } else {
      room.currentQuestionIndex++;
      this.startQuestionCountdown(room);
    }
  }

  showFinalPodium(pin) {
    const room = this.rooms.get(pin);
    if (!room) return;

    room.state = 'FINAL_PODIUM';
    this.updateRankings(room);

    const sortedPlayers = Array.from(room.players.values())
      .sort((a, b) => b.score - a.score);

    const podium = {
      first: sortedPlayers[0] ? {
        nickname: sortedPlayers[0].nickname,
        avatar: sortedPlayers[0].avatar,
        score: sortedPlayers[0].score
      } : null,
      second: sortedPlayers[1] ? {
        nickname: sortedPlayers[1].nickname,
        avatar: sortedPlayers[1].avatar,
        score: sortedPlayers[1].score
      } : null,
      third: sortedPlayers[2] ? {
        nickname: sortedPlayers[2].nickname,
        avatar: sortedPlayers[2].avatar,
        score: sortedPlayers[2].score
      } : null,
      allPlayers: sortedPlayers.map(p => ({
        nickname: p.nickname,
        avatar: p.avatar,
        score: p.score,
        rank: p.rank
      }))
    };

    this.io.to(room.pin).emit('game:final_podium', podium);
  }

  updateRankings(room) {
    const sorted = Array.from(room.players.values()).sort((a, b) => b.score - a.score);
    sorted.forEach((player, index) => {
      player.rank = index + 1;
    });
  }

  broadcastLobbyUpdate(room) {
    const playersList = Array.from(room.players.values()).map(p => ({
      socketId: p.socketId,
      nickname: p.nickname,
      avatar: p.avatar
    }));

    this.io.to(room.pin).emit('lobby:updated', {
      pin: room.pin,
      quizTitle: room.quiz.title,
      questionCount: room.quiz.questions.length,
      players: playersList,
      options: room.options
    });
  }

  handleDisconnect(socketId) {
    // Check if host disconnected
    const hostRoom = this.getRoomByHost(socketId);
    if (hostRoom) {
      if (hostRoom.questionTimer) clearInterval(hostRoom.questionTimer);
      this.io.to(hostRoom.pin).emit('game:host_left', { message: 'The host has ended or left the game.' });
      this.rooms.delete(hostRoom.pin);
      return;
    }

    // Check if player disconnected
    const playerRoom = this.getRoomByPlayer(socketId);
    if (playerRoom) {
      const player = playerRoom.players.get(socketId);
      if (playerRoom.state === 'LOBBY') {
        playerRoom.players.delete(socketId);
        this.broadcastLobbyUpdate(playerRoom);
      } else {
        // In-game: mark disconnected
        if (player) {
          player.connected = false;
        }
      }
    }
  }
}

module.exports = GameManager;
