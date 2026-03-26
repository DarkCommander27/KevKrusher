// Game Modes System
const GAME_MODES = {
  timeRush: {
    name: 'Time Rush',
    description: 'Classic 30-second game. Faster spawning near the end.',
    duration: 30,
    difficulty: (progress) => progress, // 0 to 1
    spawnRange: (progress) => ({
      min: 520 - progress * 280,
      max: 1050 - progress * 530
    }),
    upTimeRange: (progress) => ({
      min: 720 - progress * 360,
      max: 1200 - progress * 580
    }),
    icon: '⏱️'
  },
  
  survival: {
    name: 'Survival Mode',
    description: 'Never-ending! Survive as long as you can. Gets harder every 30 points.',
    duration: 999, // essentially infinite
    difficulty: (score) => Math.min(1, (score % 30) / 30), // Repeating difficulty curve
    spawnRange: (difficulty) => ({
      min: Math.max(100, 500 - difficulty * 400),
      max: Math.max(250, 900 - difficulty * 700)
    }),
    upTimeRange: (difficulty) => ({
      min: Math.max(200, 600 - difficulty * 400),
      max: Math.max(300, 1000 - difficulty * 500)
    }),
    icon: '🧟'
  },
  
  zen: {
    name: 'Zen Mode',
    description: 'Relaxed gameplay. No time pressure. Just you and Kev.',
    duration: 0, // No timer
    difficulty: () => 0.3, // Fixed low difficulty
    spawnRange: () => ({ min: 800, max: 1200 }),
    upTimeRange: () => ({ min: 1000, max: 1400 }),
    icon: '🧘'
  },
  
  challenge: {
    name: 'Challenge Mode',
    description: 'Intense! Super fast spawning. 20 seconds to score as much as possible.',
    duration: 20,
    difficulty: (progress) => progress * 1.5, // Faster scaling
    spawnRange: (progress) => ({
      min: 300 - progress * 250,
      max: 700 - progress * 600
    }),
    upTimeRange: (progress) => ({
      min: 400 - progress * 350,
      max: 800 - progress * 600
    }),
    icon: '⚡'
  },
  
  endurance: {
    name: 'Endurance',
    description: '2 minutes of constant action. Can you handle it?',
    duration: 120,
    difficulty: (progress) => progress * 0.8, // Slower scaling for longer game
    spawnRange: (progress) => ({
      min: 600 - progress * 400,
      max: 1200 - progress * 800
    }),
    upTimeRange: (progress) => ({
      min: 800 - progress * 450,
      max: 1400 - progress * 900
    }),
    icon: '💪'
  }
};

class GameModeManager {
  constructor() {
    this.currentMode = localStorage.getItem('lastMode') || 'timeRush';
    this.modeConfig = GAME_MODES[this.currentMode];
  }

  setMode(modeName) {
    if (GAME_MODES[modeName]) {
      this.currentMode = modeName;
      this.modeConfig = GAME_MODES[modeName];
      localStorage.setItem('lastMode', modeName);
      return true;
    }
    return false;
  }

  getMode() {
    console.log("getMode() called, returning:", this.currentMode, this.modeConfig);
    return this.modeConfig;
  }

  getModeName() {
    return this.modeConfig.name;
  }

  getDuration() {
    return this.modeConfig.duration;
  }

  getDifficulty(progress) {
    return this.modeConfig.difficulty(progress);
  }

  getSpawnRange(difficulty) {
    return this.modeConfig.spawnRange(difficulty);
  }

  getUpTimeRange(difficulty) {
    return this.modeConfig.upTimeRange(difficulty);
  }

  getAvailableModes() {
    return Object.keys(GAME_MODES);
  }

  getModeConfig(modeName) {
    return GAME_MODES[modeName];
  }

  getAllModes() {
    return GAME_MODES;
  }
}

// Create global game mode manager
window.gameModeManager = new GameModeManager();
