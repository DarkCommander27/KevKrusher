# Kev Krusher 🎮

A fast-paced whack-a-mole style game built with vanilla HTML5, CSS, and Canvas. Click popping-up Kevs to score points in 30 seconds!

## 🎯 How to Play

- **Click the Kevs** as they pop up to score points
- **No penalties** for mis-clicks (friendly mode!)
- **30-second game** that speeds up near the end
- Challenge yourself to get the highest score

## ✨ Features

- Beautiful modern dark theme with glassmorphism UI
- Smooth animations and visual feedback
- Satisfying hit effects (particles, screen shake, score popups)
- Difficulty scaling that increases challenge over time
- Responsive design for mobile and desktop
- 3×3 grid of targets with increasing spawn speeds

## 🚀 Play Online

Visit the live game: [Kev Krusher on GitHub Pages](https://DarkCommander27.github.io/KevKrusher/)

## 💻 Local Development

```bash
# Clone the repository
git clone https://github.com/DarkCommander27/KevKrusher.git
cd KevKrusher

# Start a local server
python3 -m http.server 8000

# Open in browser
# http://localhost:8000
```

Or use any HTTP server (Live Server, `npx serve`, etc.)

## 📁 Project Structure

- `index.html` - Main game page
- `game.js` - Game logic, rendering, and physics
- `style.css` - Modern styling with animations
- `README.md` - This file

## 🎨 The Character

**Kev** is a stylish character with:
- Backwards baseball cap (swag mode)
- Dark sunglasses
- Auburn/burgundy hair
- Distinctive mustache
- Goatee for extra character
- Teal/mint green shirt with "KEV" logo

## 🔧 Technical Details

- **Canvas-based graphics** for smooth animation (60 FPS)
- **Physics simulation** for particles with gravity
- **Difficulty curves** using progress-based scaling
- **Touch & mouse support** for cross-platform play
- **Responsive canvas rendering** that adapts to screen size

## 🎬 Visual Effects

- Particle burst on successful hits
- Floating "+1" score indicators
- Screen shake feedback
- Dynamic time warning colors
- Smooth UI transitions and animations
- Glassmorphic design elements

## 📊 Game Balance

- **Spawn timing**: 520-1050ms gap initially, 240-520ms near end
- **Pop-up duration**: 720-1200ms early game, 360-620ms late game
- **Difficulty ramp**: Smooth 30-second progression

## 🌟 Tips for Best Scores

- Watch the pattern of spawns
- Anticipate Kev's location
- Click in the center of targets for easier hits
- Time your clicks as Kev appears

## 📝 License

Free to use and modify!

---

Made with ❤️ using Canvas API and vanilla JavaScript
