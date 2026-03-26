(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const scoreEl = document.getElementById("score");
  const timeEl = document.getElementById("time");
  const startBtn = document.getElementById("startBtn");
  const statusEl = document.getElementById("status");

  // Theme knobs
  const TITLE_TEXT = "KRUSH!";
  const GAME_SECONDS = 30;

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

  // Timing
  let lastFrame = performance.now();

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
  }

  // Difficulty curve: near end, spawn faster and stay shorter.
  function difficultyFactor() {
    const progress = 1 - (tLeft / GAME_SECONDS); // 0..1
    return progress;
  }

  function scheduleNextSpawn(now) {
    const d = difficultyFactor();
    const minGap = lerp(520, 240, d);
    const maxGap = lerp(1050, 520, d);
    nextSpawnAt = now + rand(minGap, maxGap);
  }

  function spawnKev(now) {
    // choose a different hole than last time if possible
    let idx = Math.floor(Math.random() * holes.length);
    if (holes.length > 1) {
      while (idx === activeIndex) idx = Math.floor(Math.random() * holes.length);
    }
    activeIndex = idx;

    const d = difficultyFactor();
    const minUp = lerp(720, 360, d);
    const maxUp = lerp(1200, 620, d);
    activeUntil = now + rand(minUp, maxUp);
  }

  function startGame() {
    running = true;
    setScore(0);
    setTime(GAME_SECONDS);

    const now = performance.now();
    activeIndex = -1;
    activeUntil = 0;
    scheduleNextSpawn(now);

    lastHitFlash = 0;
    lastMissFlash = 0;

    statusEl.textContent = "Krush Kevs!";
    startBtn.textContent = "Restart";
    startBtn.blur();
  }

  function endGame() {
    running = false;
    activeIndex = -1;
    statusEl.textContent = `Time! Final score: ${score}`;
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
        setScore(score + 1);
        lastHitFlash = now;
        // despawn immediately and schedule next
        activeIndex = -1;
        activeUntil = 0;
        scheduleNextSpawn(now);
        return;
      }
    }

    // Miss: no penalty (friendly mode)
    lastMissFlash = performance.now();
  }

  canvas.addEventListener("click", onClick);
  startBtn.addEventListener("click", startGame);

  function update(now, dt) {
    if (!running) return;

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

    // hit/miss overlays
    if (hitAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = hitAlpha;
      ctx.fillStyle = "rgba(124,241,184,.18)";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(124,241,184,.85)";
      ctx.font = "900 42px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(TITLE_TEXT, w / 2, h - 34);
      ctx.restore();
    }
    if (missAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = missAlpha;
      ctx.fillStyle = "rgba(255,107,107,.10)";
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    // game over screen
    if (!running && tLeft <= 0) {
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,.55)";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(255,255,255,.92)";
      ctx.textAlign = "center";
      ctx.font = "900 54px system-ui";
      ctx.fillText("TIME!", w / 2, h / 2 - 18);
      ctx.font = "800 26px system-ui";
      ctx.fillStyle = "rgba(255,255,255,.86)";
      ctx.fillText(`Final score: ${score}`, w / 2, h / 2 + 26);
      ctx.font = "600 16px system-ui";
      ctx.fillStyle = "rgba(255,255,255,.70)";
      ctx.fillText("Press Start to play again", w / 2, h / 2 + 56);
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
    // subtle moving glow
    const t = now / 1000;
    const gx = w * (0.5 + 0.25 * Math.sin(t * 0.7));
    const gy = h * (0.35 + 0.18 * Math.cos(t * 0.9));

    const g = ctx.createRadialGradient(gx, gy, 50, gx, gy, 560);
    g.addColorStop(0, "rgba(124,241,184,.12)");
    g.addColorStop(0.45, "rgba(124,241,184,.04)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // vignette
    const v = ctx.createRadialGradient(w/2, h/2, 220, w/2, h/2, 680);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(0,0,0,.35)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  }

  function drawHole(ctx, hole, isActive, now) {
    const { cx, cy, radius } = hole;

    ctx.save();
    ctx.translate(cx, cy);

    // base hole
    ctx.beginPath();
    ctx.ellipse(0, 10, radius * 1.35, radius * 0.95, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,.38)";
    ctx.fill();

    // rim
    ctx.beginPath();
    ctx.ellipse(0, 6, radius * 1.52, radius * 1.06, 0, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,.14)";
    ctx.lineWidth = 3;
    ctx.stroke();

    // active pulse
    if (isActive) {
      const pulse = 0.6 + 0.4 * Math.sin(now / 110);
      ctx.beginPath();
      ctx.ellipse(0, 6, radius * (1.62 + 0.05*pulse), radius * (1.12 + 0.05*pulse), 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(124,241,184,${0.35 * pulse})`;
      ctx.lineWidth = 5;
      ctx.stroke();
    }

    ctx.restore();
  }

  // Kev: auburn/burgundy hair, sunglasses, backwards cap (friendly cartoon)
  function drawKev(ctx, hole, now, upProgress) {
    const { cx, cy, radius } = hole;

    const bob = Math.sin(now / 140) * 2.0;
    const rise = easeOutBack(clamp01(upProgress));
    const yTop = cy + 18 - rise * (radius * 1.05) + bob;

    // Palette
    const hair = "rgba(110, 25, 35, .95)";      // auburn/burgundy
    const hairHi = "rgba(170, 60, 70, .35)";
    const skin = "rgba(255,235,215,.98)";
    const outline = "rgba(0,0,0,.22)";
    const shades = "rgba(10,10,12,.92)";
    const shadesHi = "rgba(255,255,255,.18)";
    const cap = "rgba(20, 30, 55, .95)";
    const capHi = "rgba(124,241,184,.22)";

    // Chibi-ish proportions (bigger head, slimmer body)
    const headR = radius * 0.66;
    const bodyW = radius * 0.52;
    const bodyH = radius * 0.92;

    // Clip to hole
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy + 10, radius * 1.34, radius * 0.94, 0, 0, Math.PI * 2);
    ctx.clip();

    // Body (shirt)
    const bodyX = cx - bodyW / 2;
    const bodyY = yTop + headR * 0.98;
    const shirt = ctx.createLinearGradient(cx, bodyY, cx, bodyY + bodyH);
    shirt.addColorStop(0, "rgba(124,241,184,.95)");
    shirt.addColorStop(1, "rgba(124,241,184,.55)");

    roundRect(ctx, bodyX, bodyY, bodyW, bodyH, 18);
    ctx.fillStyle = shirt;
    ctx.fill();
    ctx.strokeStyle = outline;
    ctx.lineWidth = 4;
    ctx.stroke();

    // Neck
    ctx.beginPath();
    ctx.roundRect(cx - headR * 0.16, yTop + headR * 0.78, headR * 0.32, headR * 0.30, 8);
    ctx.fillStyle = skin;
    ctx.fill();

    // Head
    const headY = yTop + headR;
    ctx.beginPath();
    ctx.arc(cx, headY, headR, 0, Math.PI * 2);
    ctx.fillStyle = skin;
    ctx.fill();
    ctx.strokeStyle = outline;
    ctx.lineWidth = 4;
    ctx.stroke();

    // Backwards cap
    ctx.fillStyle = cap;
    ctx.beginPath();
    ctx.arc(cx, headY - headR * 0.20, headR * 1.02, Math.PI, 0, false);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = capHi;
    ctx.beginPath();
    ctx.ellipse(cx - headR * 0.25, headY - headR * 0.55, headR * 0.45, headR * 0.22, -0.35, 0, Math.PI * 2);
    ctx.fill();

    // backwards brim nub
    ctx.fillStyle = cap;
    ctx.beginPath();
    ctx.ellipse(cx + headR * 0.92, headY - headR * 0.22, headR * 0.26, headR * 0.14, 0.25, 0, Math.PI * 2);
    ctx.fill();

    // strap line
    ctx.strokeStyle = "rgba(255,255,255,.25)";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(cx, headY - headR * 0.25, headR * 0.78, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();

    // Hair peek
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.ellipse(cx - headR * 0.25, headY - headR * 0.10, headR * 0.35, headR * 0.22, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = hairHi;
    ctx.beginPath();
    ctx.ellipse(cx - headR * 0.35, headY - headR * 0.18, headR * 0.18, headR * 0.10, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Sunglasses
    const gY = headY - headR * 0.02;
    const lensW = headR * 0.48;
    const lensH = headR * 0.22;
    const gap = headR * 0.10;

    ctx.fillStyle = shades;
    roundRect(ctx, cx - gap/2 - lensW, gY - lensH/2, lensW, lensH, 10);
    ctx.fill();
    roundRect(ctx, cx + gap/2, gY - lensH/2, lensW, lensH, 10);
    ctx.fill();
    roundRect(ctx, cx - gap/2, gY - lensH*0.12, gap, lensH*0.24, 6);
    ctx.fill();

    ctx.fillStyle = shadesHi;
    ctx.beginPath();
    ctx.ellipse(cx - gap/2 - lensW*0.65, gY - lensH*0.15, lensW*0.25, lensH*0.25, -0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + gap/2 + lensW*0.35, gY - lensH*0.15, lensW*0.25, lensH*0.25, -0.6, 0, Math.PI * 2);
    ctx.fill();

    // Smile
    ctx.strokeStyle = "rgba(0,0,0,.50)";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(cx, headY + headR * 0.20, headR * 0.26, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();

    // Goatee
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.ellipse(cx, headY + headR * 0.46, headR * 0.22, headR * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx, headY + headR * 0.58, headR * 0.12, headR * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Shirt logo
    ctx.fillStyle = "rgba(27,42,107,.95)";
    ctx.font = `900 ${Math.floor(radius * 0.22)}px system-ui`;
    ctx.textAlign = "center";
    ctx.fillText("KEV", cx, bodyY + bodyH * 0.55);

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
})();
