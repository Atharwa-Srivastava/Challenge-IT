const sampleQuizzes = [
  {
    id: 'quiz-web-dev',
    title: '🌐 Web Development & Tech Trivia',
    description: 'Test your knowledge on JavaScript, CSS, HTML, and browser tech!',
    coverImage: '💻',
    questions: [
      {
        id: 'q1',
        question: 'Which HTML5 element is used for standalone self-contained content?',
        options: ['<section>', '<article>', '<aside>', '<div>'],
        correctIndex: 1,
        timeLimit: 20,
        points: 1000,
        explanation: '<article> represents an independent piece of content, like a blog post or news story.'
      },
      {
        id: 'q2',
        question: 'What is the output of `typeof NaN` in JavaScript?',
        options: ['"undefined"', '"nan"', '"number"', '"object"'],
        correctIndex: 2,
        timeLimit: 15,
        points: 1000,
        explanation: 'In JavaScript, NaN stands for "Not a Number", but its type is technically "number"!'
      },
      {
        id: 'q3',
        question: 'Which CSS property creates a 3D context for transformed child elements?',
        options: ['perspective', 'transform-style: preserve-3d', 'backface-visibility', 'z-index'],
        correctIndex: 1,
        timeLimit: 20,
        points: 1000,
        explanation: 'transform-style: preserve-3d allows child elements to maintain their 3D position.'
      },
      {
        id: 'q4',
        question: 'What HTTP status code represents "Teapot"?',
        options: ['418', '404', '420', '503'],
        correctIndex: 0,
        timeLimit: 15,
        points: 1000,
        explanation: 'HTTP 418 "I\'m a teapot" was defined in 1998 as an April Fools\' joke in RFC 2324.'
      },
      {
        id: 'q5',
        question: 'Which of the following data structures operates on a FIFO basis?',
        options: ['Stack', 'Heap', 'Queue', 'Binary Tree'],
        correctIndex: 2,
        timeLimit: 15,
        points: 1000,
        explanation: 'Queue operates First In, First Out (FIFO), while a Stack is LIFO.'
      }
    ]
  },
  {
    id: 'quiz-general-knowledge',
    title: '🌍 Ultimate Brain Challenge',
    description: 'A whirlwind tour of geography, science, history, and pop culture!',
    coverImage: '🧠',
    questions: [
      {
        id: 'gk1',
        question: 'What is the rarest blood type in humans?',
        options: ['O Negative', 'AB Negative', 'B Positive', 'A Negative'],
        correctIndex: 1,
        timeLimit: 20,
        points: 1000,
        explanation: 'AB Negative is the rarest blood type, found in less than 1% of the world population.'
      },
      {
        id: 'gk2',
        question: 'How many hearts does an octopus have?',
        options: ['1', '2', '3', '4'],
        correctIndex: 2,
        timeLimit: 15,
        points: 1000,
        explanation: 'Octopuses have 3 hearts! Two pump blood to the gills, while one pumps it to the rest of the body.'
      },
      {
        id: 'gk3',
        question: 'Which planet has the shortest day in our Solar System?',
        options: ['Mercury', 'Jupiter', 'Earth', 'Mars'],
        correctIndex: 1,
        timeLimit: 20,
        points: 1000,
        explanation: 'Jupiter rotates once roughly every 9 hours and 55 minutes, giving it the shortest day.'
      },
      {
        id: 'gk4',
        question: 'What year did the Apollo 11 mission land on the Moon?',
        options: ['1965', '1969', '1971', '1973'],
        correctIndex: 1,
        timeLimit: 20,
        points: 1000,
        explanation: 'Neil Armstrong and Buzz Aldrin landed the Apollo 11 lunar module on July 20, 1969.'
      },
      {
        id: 'gk5',
        question: 'Which country invented French Fries?',
        options: ['France', 'United States', 'Belgium', 'Switzerland'],
        correctIndex: 2,
        timeLimit: 15,
        points: 1000,
        explanation: 'Historians agree that fries originated in Belgium, where villagers fried fish and later potatoes.'
      }
    ]
  },
  {
    id: 'quiz-gaming',
    title: '🎮 Legendary Video Game Trivia',
    description: 'From retro classics to modern blockbusters, test your gaming IQ!',
    coverImage: '👾',
    questions: [
      {
        id: 'gm1',
        question: 'What was Mario\'s original name in the 1981 arcade game Donkey Kong?',
        options: ['Luigi', 'Jumpman', 'Plumber Boy', 'Mr. Video'],
        correctIndex: 1,
        timeLimit: 15,
        points: 1000,
        explanation: 'Before he was named Mario, Shigeru Miyamoto called him "Jumpman".'
      },
      {
        id: 'gm2',
        question: 'What was the first commercial home video game console?',
        options: ['Atari 2600', 'Magnavox Odyssey', 'NES', 'Commodore 64'],
        correctIndex: 1,
        timeLimit: 20,
        points: 1000,
        explanation: 'The Magnavox Odyssey was released in 1972, preceding the Atari 2600.'
      },
      {
        id: 'gm3',
        question: 'In Minecraft, what material is required to activate a Nether Portal?',
        options: ['Flint and Steel on Obsidian', 'Redstone Torch on Obsidian', 'Eye of Ender on End Stone', 'Lava on Netherrack'],
        correctIndex: 0,
        timeLimit: 15,
        points: 1000,
        explanation: 'You build a frame of Obsidian and light it with Flint and Steel (or a fire charge).'
      },
      {
        id: 'gm4',
        question: 'Which company developed the Unreal Engine?',
        options: ['Valve', 'id Software', 'Epic Games', 'Unity Technologies'],
        correctIndex: 2,
        timeLimit: 15,
        points: 1000,
        explanation: 'Epic Games first unveiled Unreal Engine in 1998 with their shooter "Unreal".'
      }
    ]
  }
];

module.exports = { sampleQuizzes };
