// Stats and Achievements System
const ACHIEVEMENTS = {
  firstWin: {
    id: 'firstWin',
    name: 'First Krush',
    description: 'Score 1 point',
    condition: (stats) => stats.totalHits >= 1,
    reward: 10
  },
  tenHits: {
    id: 'tenHits',
    name: 'Combo Master',
    description: 'Land 10 hits in one game',
    condition: (stats) => stats.maxHitsSingle >= 10,
    reward: 50
  },
  twentyHits: {
    id: 'twentyHits',
    name: 'Crushing Spree',
    description: 'Land 20 hits in one game',
    condition: (stats) => stats.maxHitsSingle >= 20,
    reward: 100
  },
  fiftyHits: {
    id: 'fiftyHits',
    name: 'Kev Annihilator',
    description: 'Land 50 hits in one game',
    condition: (stats) => stats.maxHitsSingle >= 50,
    reward: 250
  },
  hundredHits: {
    id: 'hundredHits',
    name: 'Legend',
    description: 'Land 100 hits in one game',
    condition: (stats) => stats.maxHitsSingle >= 100,
    reward: 500
  },
  playtime: {
    id: 'playtime',
    name: 'Dedicated Player',
    description: 'Play for 1 hour total',
    condition: (stats) => stats.totalPlaytime >= 3600,
    reward: 75
  },
  multipleModes: {
    id: 'multipleModes',
    name: 'Jack of All Trades',
    description: 'Play all game modes',
    condition: (stats) => stats.modesPlayed.size >= 4,
    reward: 100
  },
  perfectStreak: {
    id: 'perfectStreak',
    name: 'Perfect Focus',
    description: 'No misses in one game',
    condition: (stats) => stats.maxCombo >= 5 && stats.lastGameAccuracy === 100,
    reward: 150
  }
};

class StatsManager {
  constructor() {
    this.stats = this.loadStats();
    this.achievements = new Set(JSON.parse(localStorage.getItem('achievements') || '[]'));
    this.currentSessionScore = 0;
    this.currentSessionHits = 0;
    this.currentSessionMisses = 0;
  }

  loadStats() {
    const defaults = {
      totalGames: 0,
      totalHits: 0,
      totalMisses: 0,
      maxHitsSingle: 0,
      totalPlaytime: 0,
      highScore: 0,
      modesPlayed: new Set(),
      maxCombo: 0,
      lastGameAccuracy: 0,
      totalPoints: 0
    };

    try {
      const saved = JSON.parse(localStorage.getItem('stats'));
      if (saved) {
        saved.modesPlayed = new Set(saved.modesPlayed || []);
        return { ...defaults, ...saved };
      }
    } catch (e) {
      console.error('Error loading stats:', e);
    }

    return defaults;
  }

  saveStats() {
    const toSave = {
      ...this.stats,
      modesPlayed: Array.from(this.stats.modesPlayed)
    };
    localStorage.setItem('stats', JSON.stringify(toSave));
  }

  recordGameStart() {
    this.currentSessionScore = 0;
    this.currentSessionHits = 0;
    this.currentSessionMisses = 0;
  }

  recordHit() {
    this.currentSessionHits++;
    this.stats.totalHits++;
  }

  recordMiss() {
    this.currentSessionMisses++;
    this.stats.totalMisses++;
  }

  recordGameEnd(score, mode) {
    this.stats.totalGames++;
    this.currentSessionScore = score;

    if (score > this.stats.highScore) {
      this.stats.highScore = score;
    }

    if (this.currentSessionHits > this.stats.maxHitsSingle) {
      this.stats.maxHitsSingle = this.currentSessionHits;
    }

    this.stats.modesPlayed.add(mode);

    const accuracy = this.currentSessionHits + this.currentSessionMisses > 0
      ? (this.currentSessionHits / (this.currentSessionHits + this.currentSessionMisses)) * 100
      : 0;
    this.stats.lastGameAccuracy = accuracy;

    this.stats.totalPoints += score * 10;
    this.checkAchievements();
    this.saveStats();
  }

  updatePlaytime(seconds) {
    this.stats.totalPlaytime += seconds;
    this.checkAchievements();
    this.saveStats();
  }

  checkAchievements() {
    Object.values(ACHIEVEMENTS).forEach(achievement => {
      if (!this.achievements.has(achievement.id) && achievement.condition(this.stats)) {
        this.unlockAchievement(achievement.id);
      }
    });
  }

  unlockAchievement(id) {
    if (!this.achievements.has(id)) {
      this.achievements.add(id);
      const achievement = ACHIEVEMENTS[id];
      if (achievement) {
        this.stats.totalPoints += achievement.reward;
        console.log(`🏆 Achievement Unlocked: ${achievement.name}!`);
      }
      this.saveStats();
    }
  }

  getStats() {
    return {
      totalGames: this.stats.totalGames,
      totalHits: this.stats.totalHits,
      totalMisses: this.stats.totalMisses,
      highScore: this.stats.highScore,
      totalPlaytime: this.stats.totalPlaytime,
      totalPoints: this.stats.totalPoints,
      accuracy: this.stats.totalHits + this.stats.totalMisses > 0
        ? (this.stats.totalHits / (this.stats.totalHits + this.stats.totalMisses) * 100).toFixed(1)
        : 0
    };
  }

  getAchievements() {
    return Array.from(this.achievements).map(id => ACHIEVEMENTS[id]).filter(a => a);
  }

  getLockedAchievements() {
    return Object.values(ACHIEVEMENTS).filter(a => !this.achievements.has(a.id));
  }

  resetStats() {
    if (confirm('Reset all stats and achievements? This cannot be undone!')) {
      localStorage.removeItem('stats');
      localStorage.removeItem('achievements');
      this.stats = this.loadStats();
      this.achievements = new Set();
      return true;
    }
    return false;
  }

  exportStats() {
    return JSON.stringify({
      stats: { ...this.stats, modesPlayed: Array.from(this.stats.modesPlayed) },
      achievements: Array.from(this.achievements)
    }, null, 2);
  }
}

// Create global stats manager
window.stats = new StatsManager();
