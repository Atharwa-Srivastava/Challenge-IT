// Web Audio API Synthesizer for Kahoot-style sound effects & live game audio
// 100% browser native, zero external audio asset dependencies, zero bandwidth overhead

class SoundManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.muted = typeof window !== 'undefined' ? localStorage.getItem('kahoot_muted') === 'true' : false;
    this.listeners = new Set();

    // Music playback state
    this.isLobbyMusicPlaying = false;
    this.isQuestionMusicPlaying = false;
    this.isQuestionUrgent = false;
    this.lobbyTimer = null;
    this.questionTimer = null;
    this.lobbyMasterGain = null;
    this.questionMasterGain = null;

    // Timing tracking
    this.lobbyStep = 0;
    this.nextLobbyTime = 0;
    this.questionStep = 0;
    this.nextQuestionTime = 0;

    // Cross-tab synchronization via localStorage storage event
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === 'kahoot_muted') {
          const shouldMute = e.newValue === 'true';
          if (this.muted !== shouldMute) {
            this.setMuted(shouldMute);
          }
        }
      });
    }
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.muted ? 0 : 1, this.ctx.currentTime);
        this.masterGain.gain.value = this.muted ? 0 : 1;
        this.masterGain.connect(this.ctx.destination);
      }
    }

    if (this.ctx) {
      if (this.muted) {
        if (this.masterGain) {
          try {
            this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
            this.masterGain.gain.value = 0;
          } catch (e) {}
        }
        if (this.ctx.state === 'running') {
          this.ctx.suspend().catch(() => {});
        }
      } else {
        if (this.masterGain) {
          try {
            this.masterGain.gain.setValueAtTime(1, this.ctx.currentTime);
            this.masterGain.gain.value = 1;
          } catch (e) {}
        }
        if (this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
      }
    }
  }

  getMasterGain() {
    this.init();
    if (!this.masterGain && this.ctx) {
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : 1, this.ctx.currentTime);
      this.masterGain.gain.value = this.muted ? 0 : 1;
      this.masterGain.connect(this.ctx.destination);
    }
    return this.masterGain;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach((fn) => {
      try {
        fn({
          muted: this.muted,
          isLobbyMusicPlaying: this.isLobbyMusicPlaying && !this.muted,
          isQuestionMusicPlaying: this.isQuestionMusicPlaying && !this.muted
        });
      } catch (e) {}
    });
  }

  setMuted(muted) {
    this.muted = !!muted;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('kahoot_muted', String(this.muted));
      } catch (e) {}
    }

    if (this.muted) {
      // 1. Clear music loop intervals immediately so no more notes are created
      if (this.lobbyTimer) {
        clearInterval(this.lobbyTimer);
        this.lobbyTimer = null;
      }
      if (this.questionTimer) {
        clearInterval(this.questionTimer);
        this.questionTimer = null;
      }

      // 2. Immediately zero out master and track gains
      if (this.ctx) {
        const t = this.ctx.currentTime;
        if (this.masterGain) {
          try {
            this.masterGain.gain.cancelScheduledValues(0);
            this.masterGain.gain.setValueAtTime(0, t);
            this.masterGain.gain.value = 0;
          } catch (e) {}
        }
        if (this.lobbyMasterGain) {
          try {
            this.lobbyMasterGain.gain.cancelScheduledValues(0);
            this.lobbyMasterGain.gain.setValueAtTime(0, t);
            this.lobbyMasterGain.gain.value = 0;
          } catch (e) {}
        }
        if (this.questionMasterGain) {
          try {
            this.questionMasterGain.gain.cancelScheduledValues(0);
            this.questionMasterGain.gain.setValueAtTime(0, t);
            this.questionMasterGain.gain.value = 0;
          } catch (e) {}
        }

        // 3. Suspend Web Audio Context to physically halt hardware audio clock
        if (this.ctx.state === 'running') {
          this.ctx.suspend().catch(() => {});
        }
      }
    } else {
      // Unmuting: restore audio context & gains
      this.init();
      if (this.ctx) {
        if (this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
        const t = this.ctx.currentTime;
        if (this.masterGain) {
          try {
            this.masterGain.gain.cancelScheduledValues(0);
            this.masterGain.gain.setValueAtTime(1, t);
            this.masterGain.gain.value = 1;
          } catch (e) {}
        }
        if (this.lobbyMasterGain && this.isLobbyMusicPlaying) {
          try {
            this.lobbyMasterGain.gain.cancelScheduledValues(0);
            this.lobbyMasterGain.gain.setValueAtTime(0.18, t);
            this.lobbyMasterGain.gain.value = 0.18;
          } catch (e) {}
        }
        if (this.questionMasterGain && this.isQuestionMusicPlaying) {
          try {
            this.questionMasterGain.gain.cancelScheduledValues(0);
            this.questionMasterGain.gain.setValueAtTime(0.15, t);
            this.questionMasterGain.gain.value = 0.15;
          } catch (e) {}
        }
      }

      // Resume music loops if state indicates they are active
      if (this.isLobbyMusicPlaying) {
        this.isLobbyMusicPlaying = false;
        this.startLobbyMusic();
      } else if (this.isQuestionMusicPlaying) {
        const wasUrgent = this.isQuestionUrgent;
        this.isQuestionMusicPlaying = false;
        this.startQuestionMusic(wasUrgent);
      }
    }

    this.notify();
    return this.muted;
  }

  toggleMute() {
    return this.setMuted(!this.muted);
  }

  // --- 1. LOBBY WAITING GROOVE MUSIC ---
  // Funky synth groove with bouncy bassline, chord stabs, and upbeat offbeats
  startLobbyMusic() {
    this.init();
    if (this.isLobbyMusicPlaying && this.lobbyTimer) return;
    this.isLobbyMusicPlaying = true;
    this.notify();

    if (!this.ctx || this.muted) return;

    this.lobbyMasterGain = this.ctx.createGain();
    this.lobbyMasterGain.gain.setValueAtTime(0.18, this.ctx.currentTime);
    this.lobbyMasterGain.gain.value = 0.18;
    this.lobbyMasterGain.connect(this.getMasterGain());

    this.lobbyStep = 0;
    this.nextLobbyTime = this.ctx.currentTime + 0.05;

    // 125 BPM -> 16th note step = 0.12s
    const stepDuration = 0.12;

    // 32-step bassline pattern in C Dorian
    const bassNotes = [
      130.81, 0, 130.81, 0, 155.56, 0, 174.61, 0, // C3, C3, Eb3, F3
      196.00, 0, 174.61, 0, 155.56, 0, 116.54, 0, // G3, F3, Eb3, Bb2
      130.81, 0, 130.81, 0, 196.00, 0, 233.08, 0, // C3, C3, G3, Bb3
      261.63, 0, 233.08, 0, 196.00, 0, 174.61, 0  // C4, Bb3, G3, F3
    ];

    // Chords on specific offbeats
    const chordSteps = {
      2: [261.63, 311.13, 392.00], // Cm
      6: [349.23, 440.00, 523.25], // F
      10: [261.63, 311.13, 392.00], // Cm
      14: [233.08, 293.66, 349.23], // Bb
      18: [261.63, 311.13, 392.00], // Cm
      22: [349.23, 440.00, 523.25], // F
      26: [392.00, 466.16, 587.33], // Gm
      30: [233.08, 293.66, 349.23]  // Bb
    };

    const schedule = () => {
      if (this.muted || !this.isLobbyMusicPlaying || !this.ctx) return;

      while (this.nextLobbyTime < this.ctx.currentTime + 0.25) {
        const step = this.lobbyStep % 32;
        const time = this.nextLobbyTime;

        // Bass synthesizer note
        const bassFreq = bassNotes[step];
        if (bassFreq > 0) {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const filter = this.ctx.createBiquadFilter();

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(bassFreq, time);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(450, time);
          filter.frequency.exponentialRampToValueAtTime(160, time + stepDuration * 0.9);

          gain.gain.setValueAtTime(0.35, time);
          gain.gain.exponentialRampToValueAtTime(0.001, time + stepDuration * 0.9);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.lobbyMasterGain);

          osc.start(time);
          osc.stop(time + stepDuration * 0.9);
        }

        // Chords (synth marimba/plucks)
        if (chordSteps[step]) {
          chordSteps[step].forEach((f) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(f, time);

            gain.gain.setValueAtTime(0.12, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + stepDuration * 1.5);

            osc.connect(gain);
            gain.connect(this.lobbyMasterGain);

            osc.start(time);
            osc.stop(time + stepDuration * 1.5);
          });
        }

        // Crisp Hi-Hat click on offbeats
        if (step % 2 === 1) {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(1200, time);
          osc.frequency.exponentialRampToValueAtTime(6000, time + 0.03);

          gain.gain.setValueAtTime(0.04, time);
          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);

          osc.connect(gain);
          gain.connect(this.lobbyMasterGain);

          osc.start(time);
          osc.stop(time + 0.03);
        }

        // Kick Drum pulse on downbeats
        if (step % 8 === 0) {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(120, time);
          osc.frequency.exponentialRampToValueAtTime(45, time + 0.08);

          gain.gain.setValueAtTime(0.3, time);
          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);

          osc.connect(gain);
          gain.connect(this.lobbyMasterGain);

          osc.start(time);
          osc.stop(time + 0.09);
        }

        this.nextLobbyTime += stepDuration;
        this.lobbyStep++;
      }
    };

    this.lobbyTimer = setInterval(schedule, 50);
  }

  stopLobbyMusic() {
    if (!this.isLobbyMusicPlaying && !this.lobbyTimer) return;
    this.isLobbyMusicPlaying = false;
    this.notify();

    if (this.lobbyTimer) {
      clearInterval(this.lobbyTimer);
      this.lobbyTimer = null;
    }

    if (this.lobbyMasterGain && this.ctx) {
      try {
        this.lobbyMasterGain.gain.setValueAtTime(0, this.ctx.currentTime);
      } catch (e) {}
    }
  }

  // --- 2. QUESTION COUNTDOWN SUSPENSE MUSIC ---
  startQuestionMusic(isUrgent = false) {
    this.init();
    if (this.isQuestionMusicPlaying && this.questionTimer) {
      this.setQuestionUrgency(isUrgent);
      return;
    }
    this.isQuestionMusicPlaying = true;
    this.isQuestionUrgent = isUrgent;
    this.notify();

    if (!this.ctx || this.muted) return;

    this.questionMasterGain = this.ctx.createGain();
    this.questionMasterGain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    this.questionMasterGain.gain.value = 0.15;
    this.questionMasterGain.connect(this.getMasterGain());

    this.questionStep = 0;
    this.nextQuestionTime = this.ctx.currentTime + 0.02;

    const schedule = () => {
      if (this.muted || !this.isQuestionMusicPlaying || !this.ctx) return;
      const stepDuration = this.isQuestionUrgent ? 0.13 : 0.25;

      while (this.nextQuestionTime < this.ctx.currentTime + 0.25) {
        const time = this.nextQuestionTime;
        const step = this.questionStep % 8;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        const baseFreq = this.isQuestionUrgent ? 330 : 220;
        const freq = step % 2 === 0 ? baseFreq : baseFreq * 1.33;

        osc.type = this.isQuestionUrgent ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(freq, time);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.7, time + 0.06);

        gain.gain.setValueAtTime(this.isQuestionUrgent ? 0.22 : 0.14, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.07);

        osc.connect(gain);
        gain.connect(this.questionMasterGain);

        osc.start(time);
        osc.stop(time + 0.07);

        this.nextQuestionTime += stepDuration;
        this.questionStep++;
      }
    };

    this.questionTimer = setInterval(schedule, 40);
  }

  setQuestionUrgency(isUrgent) {
    this.isQuestionUrgent = isUrgent;
  }

  stopQuestionMusic() {
    if (!this.isQuestionMusicPlaying && !this.questionTimer) return;
    this.isQuestionMusicPlaying = false;
    this.notify();

    if (this.questionTimer) {
      clearInterval(this.questionTimer);
      this.questionTimer = null;
    }

    if (this.questionMasterGain && this.ctx) {
      try {
        this.questionMasterGain.gain.setValueAtTime(0, this.ctx.currentTime);
      } catch (e) {}
    }
  }

  // --- 3. SOUND EFFECTS (All routed through masterGain with muted guard) ---

  // Friendly bubble-pop when player enters lobby
  playPlayerJoin() {
    if (this.muted) return;
    const master = this.getMasterGain();
    if (!this.ctx || !master || this.ctx.state === 'suspended') return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, this.ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.12); // A5

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(master);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  // Countdown tick for 3-2-1 or timer
  playCountdownTick(isUrgent = false) {
    if (this.muted) return;
    const master = this.getMasterGain();
    if (!this.ctx || !master || this.ctx.state === 'suspended') return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isUrgent ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(isUrgent ? 880 : 520, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(isUrgent ? 440 : 260, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(isUrgent ? 0.3 : 0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(master);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  // Question start chime
  playStartQuestion() {
    if (this.muted) return;
    const master = this.getMasterGain();
    if (!this.ctx || !master || this.ctx.state === 'suspended') return;

    const notes = [440, 554.37, 659.25, 880]; // A major arpeggio
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const startTime = this.ctx.currentTime + idx * 0.08;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

      osc.connect(gain);
      gain.connect(master);

      osc.start(startTime);
      osc.stop(startTime + 0.25);
    });
  }

  // Answer submit click
  playAnswerSubmit() {
    if (this.muted) return;
    const master = this.getMasterGain();
    if (!this.ctx || !master || this.ctx.state === 'suspended') return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(master);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }

  // Dramatic gong / time's up buzzer
  playTimesUp() {
    if (this.muted) return;
    const master = this.getMasterGain();
    if (!this.ctx || !master || this.ctx.state === 'suspended') return;

    const notes = [220, 277.18, 329.63, 440];
    notes.forEach((freq) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, this.ctx.currentTime + 0.5);

      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(master);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.5);
    });
  }

  // Correct answer flourish
  playCorrect() {
    if (this.muted) return;
    const master = this.getMasterGain();
    if (!this.ctx || !master || this.ctx.state === 'suspended') return;

    const chords = [
      { f: 523.25, t: 0 },    // C5
      { f: 659.25, t: 0.08 }, // E5
      { f: 783.99, t: 0.16 }, // G5
      { f: 1046.50, t: 0.24 } // C6
    ];

    chords.forEach(({ f, t }) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const st = this.ctx.currentTime + t;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, st);

      gain.gain.setValueAtTime(0.25, st);
      gain.gain.exponentialRampToValueAtTime(0.001, st + 0.35);

      osc.connect(gain);
      gain.connect(master);

      osc.start(st);
      osc.stop(st + 0.35);
    });
  }

  // Wrong answer dissonance
  playWrong() {
    if (this.muted) return;
    const master = this.getMasterGain();
    if (!this.ctx || !master || this.ctx.state === 'suspended') return;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';

    osc1.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc1.frequency.linearRampToValueAtTime(110, this.ctx.currentTime + 0.4);

    osc2.frequency.setValueAtTime(157, this.ctx.currentTime);
    osc2.frequency.linearRampToValueAtTime(114, this.ctx.currentTime + 0.4);

    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(master);

    osc1.start();
    osc2.start();
    osc1.stop(this.ctx.currentTime + 0.4);
    osc2.stop(this.ctx.currentTime + 0.4);
  }

  // Grand podium fanfare
  playPodiumFanfare() {
    if (this.muted) return;
    const master = this.getMasterGain();
    if (!this.ctx || !master || this.ctx.state === 'suspended') return;

    const fanfare = [
      { f: 523.25, dur: 0.15, dly: 0 },
      { f: 523.25, dur: 0.15, dly: 0.15 },
      { f: 523.25, dur: 0.15, dly: 0.30 },
      { f: 659.25, dur: 0.3, dly: 0.45 },
      { f: 783.99, dur: 0.3, dly: 0.75 },
      { f: 1046.50, dur: 0.8, dly: 1.05 }
    ];

    fanfare.forEach(({ f, dur, dly }) => {
      [-5, 5].forEach((detune) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const st = this.ctx.currentTime + dly;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, st);
        osc.detune.setValueAtTime(detune, st);

        gain.gain.setValueAtTime(0.22, st);
        gain.gain.exponentialRampToValueAtTime(0.001, st + dur);

        osc.connect(gain);
        gain.connect(master);

        osc.start(st);
        osc.stop(st + dur);
      });
    });
  }
}

export const sounds = new SoundManager();
