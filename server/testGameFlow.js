const { io: ioClient } = require('socket.io-client');

async function runTest() {
  console.log('--- Starting Kahoot Clone E2E Socket Flow Test ---');
  const SERVER_URL = 'http://localhost:3001';

  // 1. Host connects
  const hostSocket = ioClient(SERVER_URL);
  let roomPin = null;

  await new Promise((resolve) => {
    hostSocket.on('connect', () => {
      console.log('✓ Host connected to server');
      hostSocket.emit('room:create', { quizId: 'quiz-web-dev' });
    });

    hostSocket.on('room:created', (data) => {
      roomPin = data.pin;
      console.log(`✓ Room created with PIN: ${roomPin} (${data.quiz.title})`);
      resolve();
    });
  });

  // 2. Players connect and join
  const player1 = ioClient(SERVER_URL);
  const player2 = ioClient(SERVER_URL);

  await new Promise((resolve) => {
    let joinedCount = 0;

    const checkAllJoined = () => {
      joinedCount++;
      if (joinedCount === 2) resolve();
    };

    player1.on('connect', () => {
      player1.emit('room:join', { pin: roomPin, nickname: 'FlashCoder', avatar: '⚡' });
    });
    player1.on('room:joined', (d) => {
      console.log(`✓ Player 1 joined: ${d.player.nickname}`);
      checkAllJoined();
    });

    player2.on('connect', () => {
      player2.emit('room:join', { pin: roomPin, nickname: 'QuizMaster', avatar: '👑' });
    });
    player2.on('room:joined', (d) => {
      console.log(`✓ Player 2 joined: ${d.player.nickname}`);
      checkAllJoined();
    });
  });

  // 3. Host starts game
  console.log('✓ Host starting game...');
  hostSocket.emit('game:start', { pin: roomPin });

  // 4. Wait for question to become active
  await new Promise((resolve) => {
    player1.on('player:question_started', (data) => {
      console.log(`✓ Question 1 started: Time limit ${data.timeLimit}s`);
      resolve();
    });
  });

  // 5 & 6. Register listeners before submitting answers
  console.log('✓ Players answering...');
  const revealPromise = Promise.all([
    new Promise((resolve) => {
      player1.on('player:answer_reveal', (data) => {
        console.log(`✓ Player 1 reveal: Correct=${data.isCorrect}, Points=${data.pointsEarned}, TotalScore=${data.totalScore}`);
        resolve(data);
      });
    }),
    new Promise((resolve) => {
      player2.on('player:answer_reveal', (data) => {
        console.log(`✓ Player 2 reveal: Correct=${data.isCorrect}, Points=${data.pointsEarned}, TotalScore=${data.totalScore}`);
        resolve(data);
      });
    })
  ]);

  player1.emit('player:submit_answer', { pin: roomPin, answerIndex: 1 });
  player2.emit('player:submit_answer', { pin: roomPin, answerIndex: 0 });

  const [p1Reveal, p2Reveal] = await revealPromise;

  if (p1Reveal.isCorrect && !p2Reveal.isCorrect && p1Reveal.pointsEarned > 0) {
    console.log('✓ SCORING VERIFICATION PASSED: Player 1 awarded speed points, Player 2 0 points.');
  } else {
    throw new Error('Scoring verification failed!');
  }

  // 7. Cleanup
  hostSocket.disconnect();
  player1.disconnect();
  player2.disconnect();
  console.log('--- ALL MULTIPLAYER SOCKET TESTS PASSED SUCCESSFULLY! ---');
  process.exit(0);
}

runTest().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
