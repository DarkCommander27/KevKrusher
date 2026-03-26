// Theme and Character Skin System
const THEMES = {
  dark: {
    name: "Dark Mode",
    bg: "radial-gradient(1200px 700px at 20% 0%, #1b2a6b 0%, #0b1020 55%)",
    accent: "rgba(124, 241, 184, 1)",
    accentLight: "rgba(124, 241, 184, 0.5)",
    text: "#e9ecff",
    panel: "#121a33"
  },
  neon: {
    name: "Neon Nights",
    bg: "radial-gradient(1200px 700px at 20% 0%, #1a0033 0%, #0d0015 55%)",
    accent: "rgba(255, 0, 127, 1)",
    accentLight: "rgba(255, 0, 127, 0.5)",
    text: "#ffccff",
    panel: "#1a0033"
  },
  ocean: {
    name: "Ocean Vibes",
    bg: "radial-gradient(1200px 700px at 20% 0%, #001a4d 0%, #000d29 55%)",
    accent: "rgba(0, 200, 255, 1)",
    accentLight: "rgba(0, 200, 255, 0.5)",
    text: "#b3e5fc",
    panel: "#001a4d"
  },
  sunset: {
    name: "Sunset",
    bg: "radial-gradient(1200px 700px at 20% 0%, #4d1a00 0%, #2d0f00 55%)",
    accent: "rgba(255, 165, 0, 1)",
    accentLight: "rgba(255, 165, 0, 0.5)",
    text: "#ffe0b2",
    panel: "#4d1a00"
  },
  forest: {
    name: "Forest",
    bg: "radial-gradient(1200px 700px at 20% 0%, #1a3a1a 0%, #0d1f0d 55%)",
    accent: "rgba(100, 255, 150, 1)",
    accentLight: "rgba(100, 255, 150, 0.5)",
    text: "#c8e6c9",
    panel: "#1a3a1a"
  }
};

const CHARACTER_SKINS = {
  classic: {
    name: "Classic Kev",
    hair: "rgba(110, 25, 35, .95)",
    skin: "rgba(255, 235, 215, .98)",
    cap: "rgba(20, 30, 55, .95)",
    shirt: "rgba(124, 241, 184, .95)"
  },
  punk: {
    name: "Punk Kev",
    hair: "rgba(150, 50, 100, .95)",
    skin: "rgba(240, 230, 220, .98)",
    cap: "rgba(40, 20, 60, .95)",
    shirt: "rgba(200, 50, 100, .95)"
  },
  cyberpunk: {
    name: "Cyber Kev",
    hair: "rgba(0, 200, 255, .95)",
    skin: "rgba(220, 220, 230, .98)",
    cap: "rgba(0, 100, 150, .95)",
    shirt: "rgba(0, 255, 200, .95)"
  },
  vintage: {
    name: "Vintage Kev",
    hair: "rgba(80, 40, 20, .95)",
    skin: "rgba(255, 228, 196, .98)",
    cap: "rgba(120, 80, 40, .95)",
    shirt: "rgba(200, 150, 100, .95)"
  },
  tropical: {
    name: "Tropical Kev",
    hair: "rgba(255, 150, 0, .95)",
    skin: "rgba(255, 220, 180, .98)",
    cap: "rgba(34, 139, 34, .95)",
    shirt: "rgba(255, 100, 150, .95)"
  }
};

class ThemeManager {
  constructor() {
    this.currentTheme = localStorage.getItem('theme') || 'dark';
    this.currentSkin = localStorage.getItem('skin') || 'classic';
    this.applyTheme();
  }

  applyTheme() {
    const theme = THEMES[this.currentTheme];
    if (!theme) return;

    // Update CSS variables
    document.documentElement.style.setProperty('--bg', theme.bg);
    document.documentElement.style.setProperty('--accent', theme.accent);
    document.documentElement.style.setProperty('--text', theme.text);
    document.documentElement.style.setProperty('--panel', theme.panel);
    
    if (document.body) {
      document.body.style.background = theme.bg;
      document.body.style.color = theme.text;
    }

    localStorage.setItem('theme', this.currentTheme);
  }

  setTheme(themeName) {
    if (THEMES[themeName]) {
      this.currentTheme = themeName;
      this.applyTheme();
      return true;
    }
    return false;
  }

  setSkin(skinName) {
    if (CHARACTER_SKINS[skinName]) {
      this.currentSkin = skinName;
      localStorage.setItem('skin', this.currentSkin);
      return true;
    }
    return false;
  }

  getTheme() {
    return THEMES[this.currentTheme];
  }

  getSkin() {
    return CHARACTER_SKINS[this.currentSkin];
  }

  getAvailableThemes() {
    return Object.keys(THEMES);
  }

  getAvailableSkins() {
    return Object.keys(CHARACTER_SKINS);
  }
}

// Create global theme manager
window.themeManager = new ThemeManager();
