// Web Audio API Sound System - No external files needed!
class AudioManager {
  constructor() {
    this.audioContext = null;
    this.masterVolume = 0.5;
    this.soundEnabled = true;
    this.musicEnabled = true;
    this.currentMusic = null;
    this.initAudioContext();
  }

  initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  // Resume audio context on user interaction (required by browsers)
  resume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  // Play hit sound effect
  playHit() {
    if (!this.soundEnabled) return;
    this.playTone(800, 0.1, 0.05);
    this.playTone(1200, 0.1, 0.05, 0.035);
  }

  // Play miss sound effect
  playMiss() {
    if (!this.soundEnabled) return;
    this.playTone(300, 0.08, 0.15);
    this.playTone(200, 0.06, 0.15, 0.05);
  }

  // Play spawn sound (Kev pops up)
  playSpawn() {
    if (!this.soundEnabled) return;
    this.playTone(600, 0.06, 0.08);
  }

  // Play game over sound
  playGameOver() {
    if (!this.soundEnabled) return;
    this.playTone(400, 0.15, 0.3);
    this.playTone(600, 0.12, 0.3, 0.1);
    this.playTone(800, 0.1, 0.3, 0.2);
  }

  // Play start sound
  playStart() {
    if (!this.soundEnabled) return;
    this.playTone(1000, 0.1, 0.1);
    this.playTone(1200, 0.08, 0.1, 0.07);
  }

  // Generic tone generator
  playTone(frequency, volume = 0.5, duration = 0.1, startTime = 0) {
    if (!this.audioContext || !this.soundEnabled) return;
    
    const ctx = this.audioContext;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.frequency.value = frequency;
    osc.type = 'sine';
    
    gain.gain.setValueAtTime(volume * this.masterVolume, ctx.currentTime + startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + startTime + duration);
    
    osc.start(ctx.currentTime + startTime);
    osc.stop(ctx.currentTime + startTime + duration);
  }

  // Play background music loop
  playBackgroundMusic() {
    if (!this.musicEnabled || this.currentMusic) return;
    
    // Simple procedural music - repeating pattern
    this.musicPattern();
  }

  musicPattern() {
    if (!this.musicEnabled) return;
    
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    
    // Simple looping melody
    const notes = [220, 247, 277, 220, 293, 247, 220, 277]; // A major scale
    const noteDuration = 0.3;
    
    notes.forEach((freq, i) => {
      const startTime = i * noteDuration;
      this.playBackgroundTone(freq, 0.15, noteDuration, startTime);
    });
    
    // Loop every 2.4 seconds
    setTimeout(() => this.musicPattern(), 2400);
  }

  playBackgroundTone(frequency, volume, duration, startTime) {
    if (!this.audioContext) return;
    
    const ctx = this.audioContext;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.frequency.value = frequency;
    osc.type = 'triangle';
    
    const vol = volume * this.masterVolume * 0.3; // Keep background quiet
    gain.gain.setValueAtTime(vol, ctx.currentTime + startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + startTime + duration - 0.05);
    
    osc.start(ctx.currentTime + startTime);
    osc.stop(ctx.currentTime + startTime + duration);
  }

  setVolume(level) {
    this.masterVolume = Math.max(0, Math.min(1, level));
  }

  toggleSound(enabled) {
    if (enabled !== undefined) {
      this.soundEnabled = enabled;
    } else {
      this.soundEnabled = !this.soundEnabled;
    }
    return this.soundEnabled;
  }

  toggleMusic(enabled) {
    if (enabled !== undefined) {
      this.musicEnabled = enabled;
    } else {
      this.musicEnabled = !this.musicEnabled;
    }
    return this.musicEnabled;
  }
}

// Create global audio manager
window.audio = new AudioManager();
