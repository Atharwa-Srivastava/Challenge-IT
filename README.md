# ⚡ Kahoot! Clone - Real-Time Multiplayer Quiz Platform

A modern, high-energy, full-stack Kahoot clone built with **React 19**, **Vite**, **Tailwind CSS v4**, **Node.js**, **Express**, **Socket.io**, and **Web Audio API** sound synthesis.

---

## 🚀 Features

- **🎮 Real-Time Multiplayer Gameplay**:
  - Host creates a room with an automatic 6-digit **Game PIN**.
  - Players join from separate browser tabs or mobile devices with their nickname and custom emoji mascot.
  - Live lobby displaying connected players, avatar badges, and host kick controls.

- **⏱️ Kahoot-Accurate Scoring & Speed Mechanics**:
  - Score based on speed and accuracy: answering instantly awards up to 1,000 points (or 2,000 double points), decaying over time limit.
  - Streak multipliers for consecutive correct answers (🔥 2x, 3x, 4x, 5x+ streak bonuses).
  - Synchronized server-side countdown timers to prevent desync or client cheating.

- **📊 Live Answer Reveal & Bar Charts**:
  - Real-time animated distribution bar chart showing how many players chose each shape/color (▲ Red, ◆ Blue, ● Yellow, ■ Green).
  - Instant player feedback: Green checkmark for correct with points breakdown; red X for incorrect.
  - Fun facts / educational explanations displayed on answer reveal.

- **🏆 Dynamic Scoreboard & 3D Olympic Podium**:
  - Top 5 leaderboard between questions with ranking badges (🥇, 🥈, 🥉) and streak flame animations.
  - Grand finale Olympic-style 3D podium for 1st, 2nd, and 3rd place with celebration music and confetti showers (`canvas-confetti`).
  - Full player ranking recap table.

- **🛠️ Quiz Builder Studio**:
  - Built-in ready-to-play trivia packs (*Web Development & Tech Trivia*, *Ultimate Brain Challenge*, *Legendary Video Game Trivia*).
  - Interactive quiz creator to design your own questions, options, time limits, and points.
  - **Import / Export as JSON** to easily share or back up quizzes.

- **🔊 100% Native Web Audio API Sound Effects**:
  - No external MP3 files needed! Pure synthesized audio: countdown clock tick, urgency alert (< 5s), answer submit click, correct fanfare chord, wrong buzzer, and podium fanfare.
  - Full mute/unmute toggle in the navbar.

- **📱 Fully Responsive Design**:
  - Big screen host view optimized for projectors, TV screens, or streaming screenshare.
  - Mobile touch-friendly buzzer pad buttons for player screens.

---

## 🛠️ Tech Stack

- **Frontend**:
  - React 19
  - Vite 8
  - Tailwind CSS v4 (`@tailwindcss/vite`)
  - Socket.io Client
  - Lucide React Icons
  - Canvas Confetti
  - Native Web Audio API Synthesizer

- **Backend**:
  - Node.js & Express 5
  - Socket.io 4
  - UUID & CORS
  - Comprehensive Automated Integration Test Suite

---

## 🏃 Quick Start

### 1. Run Production Server (Both Client & Backend on Port 3001)

```bash
npm start
```
Open **[http://localhost:3001](http://localhost:3001)** in your browser!

### 2. Run Development Mode (Hot Reloading)

```bash
npm run dev
```
- Client running on `http://localhost:5173`
- Backend running on `http://localhost:3001` (proxied automatically)

### 3. Run Automated Integration Tests

```bash
npm test
```
Tests end-to-end room creation, player joining, real-time timer synchronization, speed-based scoring, answer reveals, and disconnect cleanups.

---

## 🕹️ How to Play Locally

1. Open **[http://localhost:3001](http://localhost:3001)** in your browser.
2. Click **"Host Game"** on any of the featured quizzes (e.g. *Web Development & Tech Trivia*).
3. A 6-digit Game PIN will appear on the host screen (e.g. `123456`).
4. In another tab or on your phone (connected to same network via your machine's local IP), go to `http://localhost:3001`.
5. Enter the Game PIN, your nickname, pick a mascot emoji, and click **"Enter Game"**.
6. On the host screen, click **"Start Game"** and enjoy the live quiz!
