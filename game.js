(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const scoreEl = document.getElementById("score");
  const timeEl = document.getElementById("time");
  const startBtn = document.getElementById("startBtn");
  const statusEl = document.getElementById("status");

  // Initialize managers from loaded modules
  // (These are created as globals in their respective files)
  const audioMgr = window.audio || { playHit: ()=>{}, playMiss: ()=>{}, playGameOver: ()=>{}, playStart: ()=>{} };
  const themeMgr = window.themeManager || { getSkin: ()=>({}) };
  const statsMgr = window.stats || { recordGameStart: ()=>{}, recordHit: ()=>{}, recordMiss: ()=>{}, recordGameEnd: ()=>{}, updatePlaytime: ()=>{}, getStats: ()=>({}), getAchievements: ()=>[], getLockedAchievements: ()=>[], resetStats: ()=>{} };
  const modeMgr = window.gameModeManager || { getMode: ()=>({name:'Time Rush', duration: 30}), getDifficulty: ()=>0, getSpawnRange: ()=>({min:520, max:1050}), getUpTimeRange: ()=>({min:720, max:1200}), setMode: (m)=>{} };

  console.log("Game.js initialized");
  console.log("audioMgr:", audioMgr);
  console.log("themeMgr:", themeMgr);
  console.log("statsMgr:", statsMgr);
  console.log("modeMgr:", modeMgr);

  // Theme knobs
  const TITLE_TEXT = "KRUSH!";
  let GAME_SECONDS = 30;

  // Game state tracking
  let gameStartTime = 0;
  let hitCountThisGame = 0;
  let missCountThisGame = 0;
  let currentGameMode = "timeRush";

  // Grid
  const ROWS = 3;
  const COLS = 3;

  // State
  let running = false;
  let score = 0;
  let tLeft = GAME_SECONDS;

  // Mole logic
  let activeIndex = -1;
  let activeUntil = 0; // timestamp ms
  let nextSpawnAt = 0;

  // For click feedback
  let lastHitFlash = 0;
  let lastMissFlash = 0;
  
  // Combo system
  let currentCombo = 0;
  let maxComboThisGame = 0;
  let comboExpires = 0;
  let hoverHole = -1; // for visual feedback on mouse hover

  // Particle & feedback systems
  let particles = [];
  let floatingTexts = [];
  let screenShakeAmount = 0;
  let screenShakeVelX = 0;
  let screenShakeVelY = 0;

  // Timing
  let lastFrame = performance.now();

  // --- Particle System ---
  class Particle {
    constructor(x, y, vx, vy, life = 600, type = 'normal') {
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      this.life = life;
      this.maxLife = life;
      this.size = 4;
      this.trailX = [];
      this.trailY = [];
      this.maxTrail = 8;
      this.type = type; // 'normal', 'spark', 'glow'
      this.rotation = Math.random() * Math.PI * 2;
      this.angularVel = (Math.random() - 0.5) * 0.2;
    }
    update(dt) {
      // Store trail
      if (this.trailX.length >= this.maxTrail) {
        this.trailX.shift();
        this.trailY.shift();
      }
      this.trailX.push(this.x);
      this.trailY.push(this.y);

      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.vy += 0.35; // gravity
      this.life -= dt;
      this.vx *= 0.99; // air resistance
      this.rotation += this.angularVel;
    }
    draw(ctx) {
      const alpha = Math.max(0, this.life / this.maxLife);
      
      ctx.save();
      
      // Draw trail
      if (this.trailX.length > 1) {
        ctx.strokeStyle = `rgba(124, 241, 184, ${alpha * 0.35})`;
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(this.trailX[0], this.trailY[0]);
        for (let i = 1; i < this.trailX.length; i++) {
          ctx.lineTo(this.trailX[i], this.trailY[i]);
        }
        ctx.stroke();
      }

      if (this.type === 'spark') {
        // Spark particles - thin glowing lines
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        ctx.strokeStyle = `rgba(124, 241, 184, ${alpha * 0.8})`;
        ctx.lineWidth = 1.5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(-3, 0);
        ctx.lineTo(3, 0);
        ctx.stroke();
        
        // Glow
        ctx.strokeStyle = `rgba(124, 241, 184, ${alpha * 0.3})`;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(-3, 0);
        ctx.lineTo(3, 0);
        ctx.stroke();
      } else if (this.type === 'glow') {
        // Larger glow particles
        const glowGradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 3);
        glowGradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.6})`);
        glowGradient.addColorStop(0.5, `rgba(124, 241, 184, ${alpha * 0.3})`);
        glowGradient.addColorStop(1, `rgba(124, 241, 184, ${alpha * 0.05})`);
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Normal particles
        const glowGradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 2);
        glowGradient.addColorStop(0, `rgba(124, 241, 184, ${alpha * 0.9})`);
        glowGradient.addColorStop(1, `rgba(124, 241, 184, ${alpha * 0.2})`);
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Core particle
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.restore();
    }
  }

  class FloatingText {
    constructor(x, y, text = "+1", isCombo = false) {
      this.x = x;
      this.y = y;
      this.text = text;
      this.life = isCombo ? 1200 : 900;
      this.maxLife = this.life;
      this.isCombo = isCombo;
      this.scale = isCombo ? 1.0 : 0.8;
      this.startScale = this.scale;
      this.wobble = Math.random() * Math.PI * 2;
    }
    update(dt) {
      this.y -= 1.2 * dt / 16; // float upward
      this.life -= dt;
      this.wobble += 0.05; // Add wobble for more life
      // Grow slightly for combos
      if (this.isCombo) {
        const progress = 1 - (this.life / this.maxLife);
        this.scale = this.startScale + progress * 0.4;
      }
    }
    draw(ctx) {
      const alpha = Math.max(0, this.life / this.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      
      if (this.isCombo) {
        // Combo text - bigger, brighter, with enhanced glow
        const wobbleX = Math.sin(this.wobble) * 3;
        const wobbleY = Math.cos(this.wobble * 0.5) * 2;
        
        ctx.translate(wobbleX, wobbleY);
        
        // Multiple glow layers for combo
        ctx.fillStyle = "rgba(255, 200, 0, 0.3)";
        ctx.font = `900 ${Math.round(36 * this.scale * 1.2)}px system-ui`;
        ctx.textAlign = "center";
        ctx.shadowColor = "rgba(255, 200, 0, 0.8)";
        ctx.shadowBlur = Math.round(20 * this.scale);
        ctx.fillText(this.text, this.x, this.y);
        
        // Main text
        ctx.fillStyle = "rgba(255, 220, 50, 1)";
        ctx.font = `900 ${Math.round(36 * this.scale)}px system-ui`;
        ctx.shadowColor = "rgba(255, 200, 0, 0.7)";
        ctx.shadowBlur = Math.round(16 * this.scale);
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.fillText(this.text, this.x, this.y);
        
        // Highlight
        ctx.globalAlpha = alpha * 0.6;
        ctx.fillStyle = "rgba(255, 255, 150, 0.8)";
        ctx.shadowBlur = Math.round(8 * this.scale);
        ctx.fillText(this.text, this.x, this.y);
      } else {
        // Normal text with subtle glow
        const wobbleX = Math.sin(this.wobble * 0.7) * 1.5;
        ctx.translate(wobbleX, 0);
        
        ctx.fillStyle = "rgba(124, 241, 184, 1)";
        ctx.font = `900 ${Math.round(28 * this.scale)}px system-ui`;
        ctx.textAlign = "center";
        ctx.shadowColor = "rgba(124, 241, 184, 0.4)";
        ctx.shadowBlur = 8;
        ctx.fillText(this.text, this.x, this.y);
        
        // Glow layer
        ctx.globalAlpha = alpha * 0.4;
        ctx.shadowBlur = 16;
        ctx.fillText(this.text, this.x, this.y);
      }
      ctx.restore();
    }
  }

  function spawnParticles(x, y, count = 15) {
    // Main burst particles
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 2.2 + Math.random() * 1.8;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed - 0.8;
      particles.push(new Particle(x, y, vx, vy, 500 + Math.random() * 200, 'normal'));
    }
    
    // Add some spark particles for extra punch
    for (let i = 0; i < Math.floor(count * 0.6); i++) {
      const angle = (i / (count * 0.6)) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 3 + Math.random() * 2;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed - 0.5;
      particles.push(new Particle(x, y, vx, vy, 400 + Math.random() * 150, 'spark'));
    }
    
    // Add glow particles
    for (let i = 0; i < Math.floor(count * 0.4); i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 1;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed - 0.3;
      particles.push(new Particle(x, y, vx, vy, 600 + Math.random() * 200, 'glow'));
    }
  }

  function spawnFloatingText(x, y, text = "+1", isCombo = false) {
    floatingTexts.push(new FloatingText(x, y, text, isCombo));
  }

  function triggerScreenShake(intensity = 2.5) {
    screenShakeAmount = intensity;
    screenShakeVelX = (Math.random() - 0.5) * intensity * 2;
    screenShakeVelY = (Math.random() - 0.5) * intensity * 2;
  }

  // Build hole positions
  function computeHoles() {
    const w = canvas.width;
    const h = canvas.height;

    const pad = 70;
    const gridW = w - pad * 2;
    const gridH = h - pad * 2;

    const cellW = gridW / COLS;
    const cellH = gridH / ROWS;

    const holes = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cx = pad + c * cellW + cellW / 2;
        const cy = pad + r * cellH + cellH / 2;
        const radius = Math.min(cellW, cellH) * 0.28;
        holes.push({ cx, cy, radius });
      }
    }
    return holes;
  }

  let holes = computeHoles();

  // Resize handling (keeps internal resolution fixed; CSS scales it)
  function resetLayout() {
    holes = computeHoles();
  }
  window.addEventListener("resize", resetLayout);

  function setScore(v) {
    score = Math.max(0, v);
    scoreEl.textContent = String(score);
  }
  function setTime(v) {
    tLeft = Math.max(0, v);
    timeEl.textContent = tLeft.toFixed(1);
    
    // Dynamic color based on time remaining
    if (running) {
      const timeRatio = tLeft / GAME_SECONDS;
      if (timeRatio < 0.2) {
        timeEl.style.color = "rgba(255, 107, 107, 1)";
      } else if (timeRatio < 0.5) {
        timeEl.style.color = "rgba(255, 193, 7, 1)";
      } else {
        timeEl.style.color = "var(--text)";
      }
    } else {
      timeEl.style.color = "var(--text)";
    }
  }

  // Difficulty curve: use game mode settings
  function difficultyFactor() {
    const progress = 1 - (tLeft / GAME_SECONDS); // 0..1
    return modeMgr.getDifficulty?.(progress) || progress;
  }

  function scheduleNextSpawn(now) {
    const d = difficultyFactor();
    const range = modeMgr.getSpawnRange?.(d) || { min: 520, max: 1050 };
    nextSpawnAt = now + rand(range.min, range.max);
  }

  function spawnKev(now) {
    // choose a different hole than last time if possible
    let idx = Math.floor(Math.random() * holes.length);
    if (holes.length > 1) {
      while (idx === activeIndex) idx = Math.floor(Math.random() * holes.length);
    }
    activeIndex = idx;

    const d = difficultyFactor();
    const range = modeMgr.getUpTimeRange?.(d) || { min: 720, max: 1200 };
    activeUntil = now + rand(range.min, range.max);
  }

  function startGame() {
    console.log("startGame called");
    running = true;
    gameStartTime = performance.now();
    hitCountThisGame = 0;
    missCountThisGame = 0;
    
    // ENSURE selected mode is set in manager before getting it
    console.log("Current selected mode:", currentGameMode);
    const modeSet = modeMgr.setMode?.(currentGameMode);
    console.log("Mode set result:", modeSet);
    
    // Now get the mode config
    const mode = modeMgr.getMode?.() || { duration: 30 };
    console.log("Current mode config:", mode);
    GAME_SECONDS = mode.duration || 30;
    console.log("Game duration:", GAME_SECONDS);
    
    setScore(0);
    setTime(GAME_SECONDS);

    const now = performance.now();
    activeIndex = -1;
    activeUntil = 0;
    scheduleNextSpawn(now);

    lastHitFlash = 0;
    lastMissFlash = 0;

    statusEl.textContent = "Krush Kevs!";
    statusEl.classList.add("playing");
    startBtn.textContent = "Restart";
    startBtn.blur();
    
    // Audio and stats
    console.log("Calling audio.playStart");
    audioMgr.playStart?.();
    console.log("Calling stats.recordGameStart");
    statsMgr.recordGameStart?.(currentGameMode);
    console.log("Game started successfully");
  }

  function endGame() {
    running = false;
    activeIndex = -1;
    statusEl.classList.remove("playing");
    statusEl.textContent = `Time! Final score: ${score}`;
    
    // Record game end
    audioMgr.playGameOver?.();
    statsMgr.recordGameEnd?.(score, currentGameMode);
  }

  function onClick(ev) {
    const rect = canvas.getBoundingClientRect();
    const mx = ((ev.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((ev.clientY - rect.top) / rect.height) * canvas.height;

    if (!running) return;

    // Did we hit the active Kev?
    if (activeIndex >= 0) {
      const hole = holes[activeIndex];
      const hit = dist(mx, my, hole.cx, hole.cy) <= hole.radius * 1.2;
      const now = performance.now();

      if (hit && now <= activeUntil) {
        // Update combo
        if (now > comboExpires) {
          currentCombo = 1;
        } else {
          currentCombo++;
        }
        comboExpires = now + 3000; // 3 seconds to keep combo alive
        maxComboThisGame = Math.max(maxComboThisGame, currentCombo);
        
        setScore(score + 1);
        hitCountThisGame++;
        lastHitFlash = now;
        
        // Feedback effects
        const hole = holes[activeIndex];
        spawnParticles(hole.cx, hole.cy, 18 + currentCombo);
        
        // Show combo feedback
        if (currentCombo > 1) {
          spawnFloatingText(hole.cx, hole.cy - 60, `${currentCombo}x`, true);
          triggerScreenShake(2.8 + currentCombo * 0.3);
        } else {
          spawnFloatingText(hole.cx, hole.cy - 60, "+1", false);
          triggerScreenShake(2.8);
        }
        
        // Audio and stats
        audioMgr.playHit?.();
        statsMgr.recordHit?.();
        
        // despawn immediately and schedule next
        activeIndex = -1;
        activeUntil = 0;
        scheduleNextSpawn(now);
        return;
      }
    }

    // Miss: no penalty (friendly mode) but breaks combo
    if (currentCombo > 0) {
      currentCombo = 0; // Break the combo
    }
    missCountThisGame++;
    lastMissFlash = performance.now();
    audioMgr.playMiss?.();
    statsMgr.recordMiss?.();
  }

  // Mouse hover tracking for visual feedback
  canvas.addEventListener("mousemove", (ev) => {
    const rect = canvas.getBoundingClientRect();
    const mx = ((ev.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((ev.clientY - rect.top) / rect.height) * canvas.height;
    
    // Find closest hole
    hoverHole = -1;
    let closestDist = Infinity;
    holes.forEach((hole, idx) => {
      const d = dist(mx, my, hole.cx, hole.cy);
      if (d < hole.radius * 1.5 && d < closestDist) {
        hoverHole = idx;
        closestDist = d;
      }
    });
  });
  
  canvas.addEventListener("mouseleave", () => {
    hoverHole = -1;
  });

  canvas.addEventListener("click", onClick);
  startBtn.addEventListener("click", startGame);

  function update(now, dt) {
    if (!running) return;

    // Update particles
    particles = particles.filter(p => {
      p.update(dt);
      return p.life > 0;
    });

    // Update floating text
    floatingTexts = floatingTexts.filter(ft => {
      ft.update(dt);
      return ft.life > 0;
    });

    // Update screen shake
    if (screenShakeAmount > 0) {
      screenShakeAmount *= 0.92;
      screenShakeVelX *= 0.88;
      screenShakeVelY *= 0.88;
    }

    // countdown
    setTime(tLeft - dt / 1000);
    if (tLeft <= 0) {
      endGame();
      return;
    }

    // despawn if time is up
    if (activeIndex >= 0 && now > activeUntil) {
      activeIndex = -1;
      activeUntil = 0;
      scheduleNextSpawn(now);
    }

    // spawn
    if (activeIndex < 0 && now >= nextSpawnAt) {
      spawnKev(now);
    }
  }

  function draw(now) {
    const w = canvas.width;
    const h = canvas.height;

    // Apply screen shake
    if (screenShakeAmount > 0) {
      ctx.save();
      screenShakeVelX += (Math.random() - 0.5) * 0.8;
      screenShakeVelY += (Math.random() - 0.5) * 0.8;
      ctx.translate(screenShakeVelX, screenShakeVelY);
    }

    // background
    ctx.clearRect(0, 0, w, h);
    drawBackground(ctx, w, h, now);

    // flashes
    const hitAlpha = flashAlpha(now, lastHitFlash, 140);
    const missAlpha = flashAlpha(now, lastMissFlash, 160);

    // board title
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "rgba(255,255,255,.86)";
    ctx.font = "900 34px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    // Title glow (shadow for depth)
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = "rgba(124,241,184,0.5)";
    ctx.shadowColor = "rgba(124,241,184,0.6)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;
    ctx.fillText("KEV KRUSHER", w / 2, 54);
    ctx.restore();
    
    // Main title
    ctx.fillText("KEV KRUSHER", w / 2, 54);
    ctx.restore();

    // holes
    holes.forEach((hole, i) => {
      drawHole(ctx, hole, i === activeIndex, now);
    });

    // active Kev
    if (activeIndex >= 0) {
      const hole = holes[activeIndex];
      const upProgress = clamp01(1 - (activeUntil - now) / 250); // quick ease at start
      drawKev(ctx, hole, now, upProgress);
    }

    // Render particles
    particles.forEach(p => p.draw(ctx));

    // Render floating text
    floatingTexts.forEach(ft => ft.draw(ctx));

    // hit/miss overlays
    if (hitAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = hitAlpha;
      ctx.fillStyle = "rgba(124,241,184,.18)";
      ctx.fillRect(0, 0, w, h);
      
      // Glow effect
      ctx.fillStyle = "rgba(124,241,184,.08)";
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(-20 - i*10, -20 - i*10, w + 40 + i*20, h + 40 + i*20);
      }
      
      ctx.fillStyle = "rgba(124,241,184,.85)";
      ctx.font = "900 48px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(124,241,184,0.8)";
      ctx.shadowBlur = 20;
      ctx.fillText(TITLE_TEXT, w / 2, h - 34);
      ctx.restore();
    }
    if (missAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = missAlpha;
      ctx.fillStyle = "rgba(255,107,107,.12)";
      ctx.fillRect(0, 0, w, h);
      
      // Subtle pulse effect
      const missScale = 1 + missAlpha * 0.05;
      ctx.translate(w/2, h/2);
      ctx.scale(missScale, missScale);
      ctx.translate(-w/2, -h/2);
      ctx.fillStyle = "rgba(255,107,107,.08)";
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    // game over screen - enhanced
    if (!running && tLeft <= 0) {
      ctx.save();
      
      // Semi-transparent overlay
      const overlayAlpha = 0.7;
      ctx.fillStyle = `rgba(0,0,0,${overlayAlpha})`;
      ctx.fillRect(0, 0, w, h);
      
      // Glow background
      const glowGrad = ctx.createRadialGradient(w/2, h/2, 100, w/2, h/2, 500);
      glowGrad.addColorStop(0, "rgba(124, 241, 184, 0.1)");
      glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, w, h);
      
      ctx.fillStyle = "rgba(255,255,255,.95)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      
      // TIME! text with glow
      ctx.font = "900 64px system-ui";
      ctx.shadowColor = "rgba(124, 241, 184, 0.5)";
      ctx.shadowBlur = 24;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.fillText("TIME!", w / 2, h / 2 - 40);
      
      // Score text
      ctx.font = "800 32px system-ui";
      ctx.fillStyle = "rgba(124,241,184,.95)";
      ctx.shadowColor = "rgba(124, 241, 184, 0.4)";
      ctx.shadowBlur = 12;
      ctx.fillText(`FINAL SCORE: ${score}`, w / 2, h / 2 + 20);
      
      // Restart hint
      ctx.font = "600 18px system-ui";
      ctx.fillStyle = "rgba(255,255,255,.65)";
      ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
      ctx.shadowBlur = 8;
      const hintAlpha = 0.5 + 0.5 * Math.sin(now / 500);
      ctx.globalAlpha = hintAlpha;
      ctx.fillText("Press Start to play again", w / 2, h / 2 + 70);
      ctx.restore();
    }

    // Restore after screen shake
    if (screenShakeAmount > 0) {
      ctx.restore();
    }
  }

  function loop(now) {
    const dt = Math.min(50, now - lastFrame);
    lastFrame = now;

    update(now, dt);
    draw(now);

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // --- Drawing helpers ---
  function drawBackground(ctx, w, h, now) {
    // Layer 1: Base radial gradient background
    const baseGrad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, 800);
    baseGrad.addColorStop(0, "rgba(25, 40, 95, 0.35)");
    baseGrad.addColorStop(0.5, "rgba(11, 16, 32, 0.85)");
    baseGrad.addColorStop(1, "rgba(5, 8, 20, 1)");
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, w, h);

    // Layer 2: Animated moving glow orb (primary)
    const t = now / 1000;
    const gx = w * (0.5 + 0.28 * Math.sin(t * 0.4));
    const gy = h * (0.4 + 0.22 * Math.cos(t * 0.5));

    const orbGradient = ctx.createRadialGradient(gx, gy, 60, gx, gy, 620);
    orbGradient.addColorStop(0, "rgba(124,241,184,.22)");
    orbGradient.addColorStop(0.3, "rgba(124,241,184,.12)");
    orbGradient.addColorStop(0.6, "rgba(124,241,184,.03)");
    orbGradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = orbGradient;
    ctx.fillRect(0, 0, w, h);

    // Layer 2.5: Second moving glow (secondary color)
    const gx1b = w * (0.45 + 0.25 * Math.sin(t * 0.35 + 2));
    const gy1b = h * (0.6 + 0.2 * Math.cos(t * 0.4 + 2));
    
    const orbGradient2 = ctx.createRadialGradient(gx1b, gy1b, 50, gx1b, gy1b, 550);
    orbGradient2.addColorStop(0, "rgba(124,241,184,.15)");
    orbGradient2.addColorStop(0.4, "rgba(124,241,184,.05)");
    orbGradient2.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = orbGradient2;
    ctx.fillRect(0, 0, w, h);

    // Layer 3: Secondary glow (purple accent)
    const gx2 = w * (0.6 + 0.2 * Math.cos(t * 0.35));
    const gy2 = h * (0.55 + 0.15 * Math.sin(t * 0.45));
    
    const accentGrad = ctx.createRadialGradient(gx2, gy2, 40, gx2, gy2, 500);
    accentGrad.addColorStop(0, "rgba(100, 80, 200, .1)");
    accentGrad.addColorStop(0.5, "rgba(100, 80, 200, .03)");
    accentGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = accentGrad;
    ctx.fillRect(0, 0, w, h);

    // Layer 4: Enhanced animated grid pattern
    const gridSize = 80;
    ctx.strokeStyle = "rgba(124, 241, 184, 0.045)";
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= w; i += gridSize) {
      const offset = Math.sin(now / 2500 + i / 100) * 4;
      ctx.beginPath();
      ctx.moveTo(i + offset, 0);
      ctx.lineTo(i + offset, h);
      ctx.stroke();
    }
    
    for (let i = 0; i <= h; i += gridSize) {
      const offset = Math.cos(now / 2500 + i / 100) * 4;
      ctx.beginPath();
      ctx.moveTo(0, i + offset);
      ctx.lineTo(w, i + offset);
      ctx.stroke();
    }

    // Layer 5: Dynamic vignette with glow intensity
    const vignetteIntensity = 0.4 + 0.12 * Math.sin(now / 3000);
    const v = ctx.createRadialGradient(w/2, h/2, 150, w/2, h/2, 700);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(0.7, `rgba(0,0,0,${vignetteIntensity * 0.35})`);
    v.addColorStop(1, `rgba(0,0,0,${vignetteIntensity})`);
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);

    // Layer 6: Corner accents (enhanced)
    const cornerAccent = ctx.createRadialGradient(0, 0, 0, 0, 0, 450);
    cornerAccent.addColorStop(0, "rgba(80, 120, 200, 0.06)");
    cornerAccent.addColorStop(1, "rgba(80, 120, 200, 0)");
    ctx.fillStyle = cornerAccent;
    ctx.fillRect(-200, -200, w + 400, h + 400);

    // Layer 7: Top-right corner accent
    const cornerAccent2 = ctx.createRadialGradient(w, 0, 0, w, 0, 450);
    cornerAccent2.addColorStop(0, "rgba(150, 100, 200, 0.04)");
    cornerAccent2.addColorStop(1, "rgba(150, 100, 200, 0)");
    ctx.fillStyle = cornerAccent2;
    ctx.fillRect(-200, -200, w + 400, h + 400);
  }

  function drawHole(ctx, hole, isActive, now) {
    const { cx, cy, radius } = hole;

    ctx.save();
    ctx.translate(cx, cy);

    // Layer 1: Deep shadow/depth
    ctx.beginPath();
    ctx.ellipse(0, 16, radius * 1.4, radius * 1.0, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,.5)";
    ctx.fill();

    // Layer 2: Inner dark hole
    ctx.beginPath();
    ctx.ellipse(0, 10.5, radius * 1.35, radius * 0.95, 0, 0, Math.PI * 2);
    const holeGrad = ctx.createRadialGradient(0, 8, 30, 0, 10, 100);
    holeGrad.addColorStop(0, "rgba(20, 20, 30, 0.8)");
    holeGrad.addColorStop(1, "rgba(0, 0, 0, 1)");
    ctx.fillStyle = holeGrad;
    ctx.fill();

    // Layer 3: Metallic rim - outer edge
    ctx.beginPath();
    ctx.ellipse(0, 6, radius * 1.55, radius * 1.1, 0, 0, Math.PI * 2);
    const rimOuter = ctx.createLinearGradient(0, -radius * 1.1, 0, radius * 1.1);
    rimOuter.addColorStop(0, "rgba(180, 180, 200, 0.6)");
    rimOuter.addColorStop(0.3, "rgba(150, 150, 170, 0.4)");
    rimOuter.addColorStop(0.7, "rgba(100, 100, 130, 0.3)");
    rimOuter.addColorStop(1, "rgba(60, 60, 90, 0.5)");
    ctx.strokeStyle = rimOuter;
    ctx.lineWidth = 5;
    ctx.stroke();

    // Layer 4: Highlight rim
    ctx.beginPath();
    ctx.ellipse(0, 4, radius * 1.52, radius * 1.06, 0, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Layer 5: Inner rim shine
    ctx.beginPath();
    ctx.ellipse(0, 8, radius * 1.32, radius * 0.92, 0, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(200, 240, 255, 0.15)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Layer 6: Active state - pulsing glow (enhanced)
    if (isActive) {
      const pulse = 0.6 + 0.4 * Math.sin(now / 90);
      const glowAlpha = pulse * 0.7;
      
      // Inner glow (bright)
      ctx.beginPath();
      ctx.ellipse(0, 6, radius * (1.62 + 0.10*pulse), radius * (1.12 + 0.10*pulse), 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(124, 241, 184, ${glowAlpha})`;
      ctx.lineWidth = 7;
      ctx.stroke();

      // Mid glow
      ctx.beginPath();
      ctx.ellipse(0, 6, radius * (1.70 + 0.12*pulse), radius * (1.18 + 0.12*pulse), 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(124, 241, 184, ${glowAlpha * 0.6})`;
      ctx.lineWidth = 6;
      ctx.stroke();

      // Outer glow (softer)
      ctx.beginPath();
      ctx.ellipse(0, 6, radius * (1.80 + 0.15*pulse), radius * (1.25 + 0.15*pulse), 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(124, 241, 184, ${glowAlpha * 0.35})`;
      ctx.lineWidth = 9;
      ctx.stroke();

      // Center glow
      const centerGlow = ctx.createRadialGradient(0, 6, 20, 0, 6, 140);
      centerGlow.addColorStop(0, `rgba(124, 241, 184, ${0.18 * pulse})`);
      centerGlow.addColorStop(1, "rgba(124, 241, 184, 0)");
      ctx.fillStyle = centerGlow;
      ctx.beginPath();
      ctx.ellipse(0, 6, radius * 1.70, radius * 1.20, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Layer 7: Inner depth gradient
    ctx.beginPath();
    ctx.ellipse(0, 10, radius * 1.15, radius * 0.85, 0, 0, Math.PI * 2);
    const depthGrad = ctx.createRadialGradient(0, 4, 10, 0, 12, 60);
    depthGrad.addColorStop(0, "rgba(100, 150, 255, 0.08)");
    depthGrad.addColorStop(1, "rgba(0, 0, 0, 0.2)");
    ctx.fillStyle = depthGrad;
    ctx.fill();

    ctx.restore();
  }

  // Kev: auburn/burgundy hair, sunglasses, backwards cap (friendly cartoon)
  // Enhanced with shading, shadows, and premium polish
  function drawKev(ctx, hole, now, upProgress) {
    const { cx, cy, radius } = hole;

    const bob = Math.sin(now / 140) * 2.0;
    const rise = easeOutBack(clamp01(upProgress));
    const yTop = cy + 18 - rise * (radius * 1.05) + bob;

    // Add subtle rotation on pop-up (spins in slightly)
    const popRotation = (1 - clamp01(upProgress)) * 0.15;
    const popScale = 0.7 + rise * 0.3;

    // Get current character skin
    const currentSkin = themeMgr.getSkin?.() || {
      hair: "rgba(110, 25, 35, .95)",
      skin: "rgba(255, 235, 215, .98)",
      cap: "rgba(20, 30, 55, .95)",
      shirt: "rgba(124, 241, 184, .95)"
    };
    
    // Log only once when Kev first appears (upProgress near 0)
    if (upProgress < 0.05 && activeIndex >= 0) {
      console.log("Kev spawned with skin:", themeMgr.currentSkin, "Data:", currentSkin);
    }

    // Enhanced palette with more depth - using skin colors
    // Helper to create color variants with different alpha
    const createColorVariant = (rgba, alpha) => {
      return rgba.replace(/[\d.]+\)$/, alpha + ')');
    };
    
    const hair = currentSkin.hair || "rgba(110, 25, 35, .95)";
    const hairHi = createColorVariant(hair, '0.4');
    const hairDark = createColorVariant(hair, '0.6');
    const hairShadow = "rgba(70, 15, 20, 0.6)";
    const skin = currentSkin.skin || "rgba(255,235,215,.98)";
    const skinShadow = "rgba(200,170,140,.3)";
    const outline = "rgba(0,0,0,.25)";
    const shades = "rgba(10,10,12,.92)";
    const shadesHi = "rgba(255,255,255,.25)";
    const shadesShadow = "rgba(0,0,0,.4)";
    const cap = currentSkin.cap || "rgba(20, 30, 55, .95)";
    const capHi = "rgba(124,241,184,.28)";
    const capShadow = "rgba(10, 15, 30, .8)";

    // Chibi proportions
    const headR = radius * 0.66;
    const bodyW = radius * 0.52;
    const bodyH = radius * 0.92;

    // Clip to hole
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy + 10, radius * 1.34, radius * 0.94, 0, 0, Math.PI * 2);
    ctx.clip();

    // Character aura glow (especially strong when first appearing)
    const appearAlpha = Math.max(0, 1 - upProgress * 1.5);
    if (appearAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = appearAlpha * 0.3;
      const auraGrad = ctx.createRadialGradient(cx, yTop + headR, 40, cx, yTop + headR, 200);
      auraGrad.addColorStop(0, "rgba(124, 241, 184, 0.4)");
      auraGrad.addColorStop(1, "rgba(124, 241, 184, 0)");
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(cx, yTop + headR, 150, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Apply pop-up animation
    ctx.save();
    ctx.translate(cx, yTop + headR);
    ctx.scale(popScale, popScale);
    ctx.rotate(popRotation);
    ctx.translate(-cx, -(yTop + headR));

    // Shadow beneath character (depth)
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.ellipse(cx, yTop + headR * 2.1, bodyW * 0.8, bodyH * 0.15, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fill();
    ctx.restore();

    // Body (shirt) - enhanced
    const bodyX = cx - bodyW / 2;
    const bodyY = yTop + headR * 0.98;
    const shirtBase = currentSkin.shirt || "rgba(124, 241, 184, .95)";
    const shirt = ctx.createLinearGradient(cx, bodyY, cx, bodyY + bodyH);
    
    // Create shirt gradient from base color by adjusting the opacity
    // Extract the base color without alpha, then add different alphas
    const shirtNoAlpha = shirtBase.substring(0, shirtBase.lastIndexOf(","));
    const shirtLight = shirtNoAlpha + ", 0.98)";
    const shirtMid = shirtNoAlpha + ", 0.85)";
    const shirtDark = shirtNoAlpha + ", 0.75)";
    
    shirt.addColorStop(0, shirtLight);
    shirt.addColorStop(0.5, shirtMid);
    shirt.addColorStop(1, shirtDark);

    roundRect(ctx, bodyX, bodyY, bodyW, bodyH, 18);
    ctx.fillStyle = shirt;
    ctx.fill();
    
    // Body shadow
    ctx.lineWidth = 5;
    ctx.strokeStyle = "rgba(0,0,0,.15)";
    ctx.stroke();
    
    // Body outline
    ctx.lineWidth = 4;
    ctx.strokeStyle = outline;
    ctx.stroke();

    // Body shine/highlight
    ctx.save();
    ctx.globalAlpha = 0.3;
    const bodyShine = ctx.createLinearGradient(bodyX, bodyY, bodyX + bodyW * 0.3, bodyY + bodyH * 0.3);
    bodyShine.addColorStop(0, "rgba(255,255,255,0.6)");
    bodyShine.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = bodyShine;
    roundRect(ctx, bodyX + 8, bodyY + 8, bodyW * 0.4, bodyH * 0.4, 12);
    ctx.fill();
    ctx.restore();

    // Neck
    ctx.beginPath();
    ctx.roundRect(cx - headR * 0.16, yTop + headR * 0.78, headR * 0.32, headR * 0.30, 8);
    ctx.fillStyle = skin;
    ctx.fill();
    ctx.strokeStyle = outline;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Head - with shading
    const headY = yTop + headR;
    ctx.beginPath();
    ctx.arc(cx, headY, headR, 0, Math.PI * 2);
    ctx.fillStyle = skin;
    ctx.fill();
    
    // Head shading (left side darker)
    ctx.save();
    ctx.globalAlpha = 0.15;
    const headShade = ctx.createLinearGradient(cx - headR, headY, cx + headR, headY);
    headShade.addColorStop(0, "rgba(0,0,0,0.4)");
    headShade.addColorStop(0.5, "rgba(0,0,0,0)");
    headShade.addColorStop(1, "rgba(100,150,200,0.2)");
    ctx.fillStyle = headShade;
    ctx.beginPath();
    ctx.arc(cx, headY, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Head outline
    ctx.strokeStyle = outline;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, headY, headR, 0, Math.PI * 2);
    ctx.stroke();

    // Backwards cap - enhanced
    ctx.fillStyle = cap;
    ctx.beginPath();
    ctx.arc(cx, headY - headR * 0.20, headR * 1.02, Math.PI, 0, false);
    ctx.closePath();
    ctx.fill();

    // Cap shadow
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = capShadow;
    ctx.beginPath();
    ctx.arc(cx, headY - headR * 0.20, headR * 1.02, 0, Math.PI);
    ctx.fill();
    ctx.restore();

    // Cap highlight
    ctx.fillStyle = capHi;
    ctx.beginPath();
    ctx.ellipse(cx - headR * 0.25, headY - headR * 0.55, headR * 0.48, headR * 0.24, -0.35, 0, Math.PI * 2);
    ctx.fill();

    // Cap highlight shine
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.beginPath();
    ctx.ellipse(cx - headR * 0.10, headY - headR * 0.60, headR * 0.25, headR * 0.15, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Cap brim nub
    ctx.fillStyle = cap;
    ctx.beginPath();
    ctx.ellipse(cx + headR * 0.92, headY - headR * 0.22, headR * 0.26, headR * 0.14, 0.25, 0, Math.PI * 2);
    ctx.fill();

    // Strap line
    ctx.strokeStyle = "rgba(255,255,255,.3)";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(cx, headY - headR * 0.25, headR * 0.78, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();

    // Hair peek - enhanced
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.ellipse(cx - headR * 0.25, headY - headR * 0.10, headR * 0.35, headR * 0.22, -0.2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = hairHi;
    ctx.beginPath();
    ctx.ellipse(cx - headR * 0.35, headY - headR * 0.18, headR * 0.18, headR * 0.10, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Hair shadow
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = hairShadow;
    ctx.beginPath();
    ctx.ellipse(cx - headR * 0.15, headY - headR * 0.05, headR * 0.22, headR * 0.18, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Sunglasses - premium style
    const gY = headY - headR * 0.02;
    const lensW = headR * 0.48;
    const lensH = headR * 0.22;
    const gap = headR * 0.10;

    // Glasses shadow
    ctx.save();
    ctx.globalAlpha = 0.2;
    roundRect(ctx, cx - gap/2 - lensW - 2, gY - lensH/2 + 2, lensW + 2, lensH + 2, 10);
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fill();
    roundRect(ctx, cx + gap/2 - 2, gY - lensH/2 + 2, lensW + 2, lensH + 2, 10);
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fill();
    ctx.restore();

    // Left lens
    ctx.fillStyle = shades;
    roundRect(ctx, cx - gap/2 - lensW, gY - lensH/2, lensW, lensH, 10);
    ctx.fill();
    
    // Right lens
    roundRect(ctx, cx + gap/2, gY - lensH/2, lensW, lensH, 10);
    ctx.fill();
    
    // Bridge
    roundRect(ctx, cx - gap/2, gY - lensH*0.12, gap, lensH*0.24, 6);
    ctx.fill();

    // Glasses outline/frame
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(50,50,60,0.8)";
    roundRect(ctx, cx - gap/2 - lensW, gY - lensH/2, lensW, lensH, 10);
    ctx.stroke();
    roundRect(ctx, cx + gap/2, gY - lensH/2, lensW, lensH, 10);
    ctx.stroke();

    // Lens shine - enhanced
    ctx.fillStyle = shadesHi;
    ctx.beginPath();
    ctx.ellipse(cx - gap/2 - lensW*0.65, gY - lensH*0.15, lensW*0.28, lensH*0.28, -0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + gap/2 + lensW*0.35, gY - lensH*0.15, lensW*0.28, lensH*0.28, -0.6, 0, Math.PI * 2);
    ctx.fill();

    // Lens reflection glow
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = "rgba(124,241,184,0.3)";
    ctx.beginPath();
    ctx.ellipse(cx - gap/2 - lensW*0.4, gY - lensH*0.35, lensW*0.22, lensH*0.20, -0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + gap/2 + lensW*0.60, gY - lensH*0.35, lensW*0.22, lensH*0.20, -0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Mustache - premium styling
    ctx.fillStyle = hair;
    // Left curl
    ctx.beginPath();
    ctx.ellipse(cx - headR * 0.35, headY + headR * 0.085, headR * 0.30, headR * 0.13, -0.3, 0, Math.PI * 2);
    ctx.fill();
    // Right curl
    ctx.beginPath();
    ctx.ellipse(cx + headR * 0.35, headY + headR * 0.085, headR * 0.30, headR * 0.13, 0.3, 0, Math.PI * 2);
    ctx.fill();
    // Center
    ctx.fillStyle = "rgba(80, 15, 25, .9)";
    ctx.beginPath();
    ctx.ellipse(cx, headY + headR * 0.065, headR * 0.20, headR * 0.085, 0, 0, Math.PI * 2);
    ctx.fill();

    // Mustache shine
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = hairHi;
    ctx.beginPath();
    ctx.ellipse(cx - headR * 0.30, headY + headR * 0.055, headR * 0.18, headR * 0.08, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + headR * 0.30, headY + headR * 0.055, headR * 0.18, headR * 0.08, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Smile
    ctx.strokeStyle = "rgba(0,0,0,.6)";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(cx, headY + headR * 0.22, headR * 0.26, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();

    // Smile highlight
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, headY + headR * 0.22, headR * 0.26, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    ctx.restore();

    // Goatee - refined positioning
    ctx.fillStyle = hair;
    // Upper goatee
    ctx.beginPath();
    ctx.ellipse(cx, headY + headR * 0.405, headR * 0.21, headR * 0.125, 0, 0, Math.PI * 2);
    ctx.fill();
    // Lower point
    ctx.beginPath();
    ctx.ellipse(cx, headY + headR * 0.54, headR * 0.14, headR * 0.17, 0, 0, Math.PI * 2);
    ctx.fill();

    // Goatee highlight
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = hairHi;
    ctx.beginPath();
    ctx.ellipse(cx - headR * 0.09, headY + headR * 0.38, headR * 0.11, headR * 0.09, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Goatee shadow
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = hairShadow;
    ctx.beginPath();
    ctx.ellipse(cx + headR * 0.06, headY + headR * 0.42, headR * 0.12, headR * 0.10, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Shirt logo - KEV
    const logoShine = ctx.createLinearGradient(cx, bodyY + bodyH * 0.45, cx, bodyY + bodyH * 0.65);
    logoShine.addColorStop(0, "rgba(40, 60, 150, 1)");
    logoShine.addColorStop(0.5, "rgba(27, 42, 107, .95)");
    logoShine.addColorStop(1, "rgba(20, 30, 80, .9)");
    ctx.fillStyle = logoShine;
    ctx.font = `900 ${Math.floor(radius * 0.24)}px system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("KEV", cx, bodyY + bodyH * 0.55);

    // Logo shadow
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillText("KEV", cx + 1, bodyY + bodyH * 0.56);
    ctx.restore();

    ctx.restore();
    ctx.restore();
  }

  // helper: rounded rectangle (works in all modern browsers)
  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  // --- Math / utils ---
  function rand(a, b) { return a + Math.random() * (b - a); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp01(x) { return Math.max(0, Math.min(1, x)); }
  function dist(x1,y1,x2,y2){ const dx=x1-x2, dy=y1-y2; return Math.hypot(dx,dy); }

  function flashAlpha(now, t0, durationMs) {
    if (!t0) return 0;
    const dt = now - t0;
    if (dt < 0 || dt > durationMs) return 0;
    const p = 1 - dt / durationMs;
    return p * p; // ease out
  }

  function easeOutBack(x) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  }

  // Initial idle screen
  setScore(0);
  setTime(GAME_SECONDS);
  statusEl.textContent = "Press Start to begin.";

  // ========== UI Control Setup ==========
  
  // Mode buttons
  document.querySelectorAll(".mode-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      console.log("Mode button clicked:", e.target.dataset.mode);
      if (running) {
        console.log("Game already running, ignoring mode change");
        return; // Don't allow mid-game changes
      }
      currentGameMode = e.target.dataset.mode;
      console.log("Setting currentGameMode to:", currentGameMode);
      // Don't call setMode here - do it in startGame() to ensure proper state
      document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
      e.target.classList.add("active");
      console.log("Mode button marked active, ready to start");
    });
  });

  // Skin buttons
  document.querySelectorAll(".skin-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const skinName = e.target.dataset.skin;
      console.log("=== SKIN CHANGE ===");
      console.log("Clicked skin:", skinName);
      console.log("Before setSkin - themeMgr.currentSkin:", themeMgr.currentSkin);
      
      const setResult = themeMgr.setSkin?.(skinName);
      console.log("setSkin result:", setResult);
      console.log("After setSkin - themeMgr.currentSkin:", themeMgr.currentSkin);
      
      const skinData = themeMgr.getSkin?.();
      console.log("getSkin() returned:", skinData);
      console.log("===================");
      
      document.querySelectorAll(".skin-btn").forEach(b => b.classList.remove("active"));
      e.target.classList.add("active");
    });
  });

  // Theme buttons
  document.querySelectorAll(".theme-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const themeName = e.target.dataset.theme;
      console.log("=== THEME CHANGE ===");
      console.log("Clicked theme:", themeName);
      console.log("Before setTheme - themeMgr.currentTheme:", themeMgr.currentTheme);
      
      const setResult = themeMgr.setTheme?.(themeName);
      console.log("setTheme result:", setResult);
      console.log("After setTheme - themeMgr.currentTheme:", themeMgr.currentTheme);
      
      const themeData = themeMgr.getTheme?.();
      console.log("getTheme() returned:", themeData);
      console.log("====================");
      
      document.querySelectorAll(".theme-btn").forEach(b => b.classList.remove("active"));
      e.target.classList.add("active");
    });
  });

  // Settings modal
  const settingsModal = document.getElementById("settingsModal");
  const achievementsModal = document.getElementById("achievementsModal");
  const settingsBtn = document.getElementById("settingsBtn");
  const achievementsBtn = document.getElementById("achievementsBtn");
  const closeButtons = document.querySelectorAll(".close-btn");

  settingsBtn.addEventListener("click", () => settingsModal.style.display = "flex");
  achievementsBtn.addEventListener("click", () => {
    achievementsModal.style.display = "flex";
    updateAchievementsDisplay();
  });

  closeButtons.forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.target.closest(".modal").style.display = "none";
    });
  });

  window.addEventListener("click", (e) => {
    if (e.target === settingsModal) settingsModal.style.display = "none";
    if (e.target === achievementsModal) achievementsModal.style.display = "none";
  });

  // Settings controls
  const soundToggle = document.getElementById("soundToggle");
  const musicToggle = document.getElementById("musicToggle");
  const volumeSlider = document.getElementById("volumeSlider");
  const volumeValue = document.getElementById("volumeValue");
  const resetStatsBtn = document.getElementById("resetStatsBtn");
  const exportStatsBtn = document.getElementById("exportStatsBtn");

  soundToggle.addEventListener("change", (e) => {
    audioMgr.toggleSound?.(e.target.checked);
  });

  musicToggle.addEventListener("change", (e) => {
    audioMgr.toggleMusic?.(e.target.checked);
  });

  volumeSlider.addEventListener("input", (e) => {
    const vol = parseInt(e.target.value) / 100;
    audioMgr.setVolume?.(vol);
    volumeValue.textContent = e.target.value;
  });

  resetStatsBtn.addEventListener("click", () => {
    if (confirm("Reset all stats and achievements? This cannot be undone.")) {
      statsMgr.resetStats?.();
      updateStatsDisplay();
      alert("Stats reset!");
    }
  });

  exportStatsBtn.addEventListener("click", () => {
    const statsJson = JSON.stringify(statsMgr.getStats?.() || {}, null, 2);
    const blob = new Blob([statsJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kev-krusher-stats.json";
    a.click();
    URL.revokeObjectURL(url);
  });

  // Update stats display periodically
  function updateStatsDisplay() {
    const gameStats = statsMgr.getStats?.() || {};
    document.getElementById("statHighScore").textContent = gameStats.highScore || 0;
    document.getElementById("statHits").textContent = gameStats.totalHits || 0;
    const accuracy = gameStats.totalHits + gameStats.totalMisses > 0 
      ? Math.round((gameStats.totalHits / (gameStats.totalHits + gameStats.totalMisses)) * 100)
      : 0;
    document.getElementById("statAccuracy").textContent = accuracy + "%";
    const hours = Math.floor((gameStats.totalPlaytime || 0) / 3600);
    document.getElementById("statPlaytime").textContent = hours + "h";
  }

  // Update achievements modal display
  function updateAchievementsDisplay() {
    const achievements = statsMgr.getAchievements?.() || [];
    const lockedAchievements = statsMgr.getLockedAchievements?.() || [];
    const grid = document.getElementById("achievementsGrid");
    grid.innerHTML = "";
    
    achievements.forEach(ach => {
      const badge = document.createElement("div");
      badge.className = "achievement-badge unlocked";
      badge.title = ach.name;
      badge.innerHTML = `<div class="ach-icon">✓</div><div class="ach-name">${ach.name}</div><div class="ach-desc">${ach.description}</div>`;
      grid.appendChild(badge);
    });
    
    lockedAchievements.forEach(ach => {
      const badge = document.createElement("div");
      badge.className = "achievement-badge locked";
      badge.title = ach.name;
      badge.innerHTML = `<div class="ach-icon">?</div><div class="ach-name">${ach.name}</div><div class="ach-desc">${ach.description}</div>`;
      grid.appendChild(badge);
    });

    const unlockedCount = achievements.length;
    achievementsBtn.textContent = `🏆 Achievements (${unlockedCount}/8)`;
  }

  // Update stats display on game end
  const originalEndGame = endGame;
  endGame = function() {
    originalEndGame.call(this);
    updateStatsDisplay();
  };

  // Initialize displays
  updateStatsDisplay();
  updateAchievementsDisplay();
  
  // Set default active buttons and modes
  document.querySelectorAll('[data-mode="timeRush"]').forEach(b => b.classList.add("active"));
  document.querySelectorAll('[data-theme="dark"]').forEach(b => b.classList.add("active"));
  document.querySelectorAll('[data-skin="classic"]').forEach(b => b.classList.add("active"));
  
  // Initialize managers with defaults
  modeMgr.setMode?.("timeRush");
  themeMgr.setTheme?.("dark");
  themeMgr.setSkin?.("classic");
  console.log("Defaults initialized");
  
  console.log("UI Setup Complete");
  console.log("Mode buttons:", document.querySelectorAll(".mode-btn").length);
  console.log("Theme buttons:", document.querySelectorAll(".theme-btn").length);
  console.log("Skin buttons:", document.querySelectorAll(".skin-btn").length);
  
  // Periodically update playtime
  setInterval(() => {
    if (running) {
      statsMgr.updatePlaytime?.(0.1);
    }
    updateStatsDisplay();
  }, 100);
})();
