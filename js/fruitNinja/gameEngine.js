/**
 * GameEngine.js - Core Gameplay, Physics, Collision Geometry, Combos and Scoring for Fruit Ninja CVIP
 */

class GameEngine {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.width = 1280;
    this.height = 720;

    // Game state: 'MENU', 'PLAYING', 'PAUSED', 'GAMEOVER'
    this.state = 'MENU';
    this.mode = 'classic'; // 'classic', 'arcade', 'zen', 'cvip_studio'

    // Scores and stats
    this.score = 0;
    this.highScore = 0;
    this.lives = 3;
    this.maxLives = 3;
    this.timerSeconds = 60; // For Arcade (60s) or Zen (90s)
    this.gameStartTime = 0;
    this.lastTime = performance.now();

    // Slicing and Combo tracking
    this.currentComboCount = 0;
    this.lastSliceTime = 0;
    this.comboWindowMs = 320; // Time window to chain combo slices
    this.totalFruitsSpawned = 0;
    this.totalFruitsSliced = 0;
    this.totalBombsDefused = 0;
    this.maxComboAchieved = 0;

    // Active physics entities
    this.fruits = [];
    this.halves = [];
    this.bombs = [];
    this.splatters = [];
    this.particles = [];
    this.floatingTexts = [];

    // Screen Shake effect
    this.shakeDuration = 0;
    this.shakeIntensity = 0;

    // Freeze / Time Dilation effect (Frenzy Fruit)
    this.freezeDuration = 0;
    this.freezeFactor = 1.0;

    // Wave spawning timers
    this.nextWaveTime = 0;
    this.spawnIntervalMin = 1.4;
    this.spawnIntervalMax = 2.8;

    // Gravity (px/s^2)
    this.gravity = 780;

    // High Score Storage Key
    this.storageKey = 'fruit_ninja_cvip_highscore';
    this.loadHighScore();

    // Event callbacks
    this.onStateChange = null;
    this.onScoreUpdate = null;
  }

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement ? this.canvas.parentElement.getBoundingClientRect() : { width: 1280, height: 720 };
    const dpr = window.devicePixelRatio || 1;

    // Internal resolution
    this.width = Math.max(800, Math.min(1920, Math.round(rect.width)));
    this.height = Math.max(500, Math.min(1080, Math.round(rect.height || (this.width * 9 / 16))));

    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.ctx.scale(dpr, dpr);

    if (window.handTracker) {
      window.handTracker.setCanvasDimensions(this.width, this.height);
    }
  }

  loadHighScore() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        this.highScore = parseInt(saved, 10) || 0;
      }
    } catch (e) {
      this.highScore = 0;
    }
  }

  saveHighScore() {
    if (this.score > this.highScore) {
      this.highScore = this.score;
      try {
        localStorage.setItem(this.storageKey, this.highScore.toString());
      } catch (e) {}
    }
  }

  setMode(mode) {
    this.mode = mode;
    if (mode === 'classic') {
      this.lives = 3;
      this.maxLives = 3;
    } else if (mode === 'arcade') {
      this.timerSeconds = 60;
    } else if (mode === 'zen') {
      this.timerSeconds = 90;
    }
  }

  startNewGame(mode = this.mode) {
    this.setMode(mode);
    this.score = 0;
    this.lives = this.maxLives;
    this.currentComboCount = 0;
    this.totalFruitsSpawned = 0;
    this.totalFruitsSliced = 0;
    this.totalBombsDefused = 0;
    this.maxComboAchieved = 0;

    this.fruits = [];
    this.halves = [];
    this.bombs = [];
    this.particles = [];
    this.floatingTexts = [];
    this.freezeDuration = 0;
    this.freezeFactor = 1.0;

    this.gameStartTime = performance.now();
    this.lastTime = performance.now();
    this.nextWaveTime = performance.now() + 800;

    this.state = 'PLAYING';
    if (this.onStateChange) this.onStateChange(this.state);
    if (this.onScoreUpdate) this.onScoreUpdate(this);
    if (window.soundEffects) window.soundEffects.playClick();
  }

  pauseGame() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      if (this.onStateChange) this.onStateChange(this.state);
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      this.lastTime = performance.now();
      if (this.onStateChange) this.onStateChange(this.state);
    }
  }

  gameOver(reason = 'bombed') {
    this.state = 'GAMEOVER';
    this.saveHighScore();
    if (window.soundEffects) {
      window.soundEffects.playGameOver();
    }
    if (this.onStateChange) this.onStateChange(this.state, reason);
  }

  /**
   * Main game loop called via requestAnimationFrame
   */
  update(timestamp) {
    const rawDt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    // Handle Freeze / Time Dilation effect
    if (this.freezeDuration > 0) {
      this.freezeDuration -= rawDt;
      this.freezeFactor = 0.35; // 35% speed
    } else {
      this.freezeFactor = 1.0;
    }

    const dt = rawDt * this.freezeFactor;

    if (this.state === 'PLAYING') {
      // Countdown for Arcade / Zen
      if (this.mode === 'arcade' || this.mode === 'zen') {
        this.timerSeconds -= rawDt;
        if (this.timerSeconds <= 0) {
          this.timerSeconds = 0;
          this.gameOver('timeup');
          return;
        }
      }

      // Check combo timeout
      if (this.currentComboCount > 0 && timestamp - this.lastSliceTime > this.comboWindowMs) {
        this.finalizeCombo();
      }

      // Spawn waves
      if (timestamp >= this.nextWaveTime) {
        this.spawnFruitWave();
        const nextDelay = (this.spawnIntervalMin + Math.random() * (this.spawnIntervalMax - this.spawnIntervalMin)) * 1000;
        this.nextWaveTime = timestamp + nextDelay;
      }

      // Process Slicing Collisions with Blade
      this.processSlicing();

      // Update entities
      this.updateFruits(dt);
      this.updateHalves(dt);
      this.updateBombs(dt);
    }

    // Update particles, floating texts, splatters regardless of state
    this.updateParticles(rawDt);
    this.updateFloatingTexts(rawDt);
    this.updateSplatters(rawDt);

    // Screen Shake decay
    if (this.shakeDuration > 0) {
      this.shakeDuration -= rawDt;
    }
  }

  /**
   * Spawn a wave of fruits and occasional bombs
   */
  spawnFruitWave() {
    const count = 1 + Math.floor(Math.random() * (this.score > 30 ? 4 : 3));
    const fruitTypes = ['watermelon', 'apple', 'orange', 'banana', 'strawberry', 'coconut', 'pineapple'];

    for (let i = 0; i < count; i++) {
      const type = (Math.random() < 0.07 && this.mode !== 'zen') ? 'frenzy' :
                   fruitTypes[Math.floor(Math.random() * fruitTypes.length)];

      const spawnX = this.width * 0.15 + Math.random() * (this.width * 0.7);
      const spawnY = this.height + 40;

      // Parabolic trajectory directed towards screen center
      const targetX = this.width * 0.2 + Math.random() * (this.width * 0.6);
      const apexY = this.height * 0.18 + Math.random() * (this.height * 0.35);

      // Kinematic equation: v0y = -sqrt(2 * g * h)
      const flightHeight = spawnY - apexY;
      const vy0 = -Math.sqrt(2 * this.gravity * flightHeight);
      const timeToApex = -vy0 / this.gravity;
      const vx0 = (targetX - spawnX) / (timeToApex * (1.1 + Math.random() * 0.4));

      this.fruits.push({
        type: type,
        x: spawnX,
        y: spawnY,
        vx: vx0,
        vy: vy0,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 6,
        radius: type === 'watermelon' ? 44 : type === 'pineapple' ? 40 : 34,
        sliced: false
      });
      this.totalFruitsSpawned++;
    }

    // Spawn Bomb in Classic and Arcade mode (not Zen)
    if (this.mode !== 'zen' && Math.random() < (this.mode === 'arcade' ? 0.4 : 0.28)) {
      const bSpawnX = this.width * 0.2 + Math.random() * (this.width * 0.6);
      const bSpawnY = this.height + 40;
      const bApexY = this.height * 0.25 + Math.random() * (this.height * 0.3);
      const bFlightHeight = bSpawnY - bApexY;
      const bVy0 = -Math.sqrt(2 * this.gravity * bFlightHeight);
      const bVx0 = (Math.random() - 0.5) * 160;

      this.bombs.push({
        x: bSpawnX,
        y: bSpawnY,
        vx: bVx0,
        vy: bVy0,
        rotation: 0,
        vRot: (Math.random() - 0.5) * 4,
        radius: 36,
        exploded: false
      });
    }
  }

  /**
   * Core CVIP Geometry: Line Segment to Circle Intersection
   * Tests if blade swipe line segment (P1 to P2) cuts through fruit circle (C, R)
   */
  checkLineCircleIntersection(x1, y1, x2, y2, cx, cy, r) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;

    if (lenSq === 0) {
      // Point check
      return Math.hypot(x1 - cx, y1 - cy) <= r;
    }

    // Project circle center onto segment line parameter t
    const t = Math.max(0, Math.min(1, ((cx - x1) * dx + (cy - y1) * dy) / lenSq));
    const closestX = x1 + t * dx;
    const closestY = y1 + t * dy;

    const distSq = (cx - closestX) * (cx - closestX) + (cy - closestY) * (cy - closestY);
    return distSq <= r * r;
  }

  /**
   * Process Slicing collisions for both Primary and Secondary Katana Blades
   */
  processSlicing() {
    if (!window.handTracker) return;

    const blades = [
      {
        pos: window.handTracker.bladePosition,
        trail: window.handTracker.bladeTrails.primary,
        theme: 'cyan'
      },
      {
        pos: window.handTracker.secondaryBladePosition,
        trail: window.handTracker.bladeTrails.secondary,
        theme: 'crimson'
      }
    ];

    const activeGesture = window.handTracker.activeGesture;

    for (let b = 0; b < blades.length; b++) {
      const blade = blades[b];
      const trail = blade.trail;

      if (!blade.pos.isSlicing || trail.length < 2) continue;

      // Play blade swoosh sound
      if (window.soundEffects) {
        window.soundEffects.playSwoosh();
      }

      // Check the latest segment of the blade swipe
      const p1 = trail[trail.length - 2];
      const p2 = trail[trail.length - 1];

      // 1. Check Fruit Slices
      for (let i = this.fruits.length - 1; i >= 0; i--) {
        const fruit = this.fruits[i];
        if (fruit.sliced) continue;

        if (this.checkLineCircleIntersection(p1.x, p1.y, p2.x, p2.y, fruit.x, fruit.y, fruit.radius)) {
          this.sliceFruit(fruit, i, p1, p2);
        }
      }

      // 2. Check Bomb Collisions
      for (let j = this.bombs.length - 1; j >= 0; j--) {
        const bomb = this.bombs[j];
        if (bomb.exploded) continue;

        if (this.checkLineCircleIntersection(p1.x, p1.y, p2.x, p2.y, bomb.x, bomb.y, bomb.radius)) {
          // If Fist Shield is active, defuse safely without exploding!
          if (activeGesture === 'Fist Shield') {
            this.defuseBomb(bomb, j);
          } else {
            this.detonateBomb(bomb, j);
          }
        }
      }
    }
  }

  /**
   * Slice a fruit into two halves, stamp splatters, and award points
   */
  sliceFruit(fruit, index, p1, p2) {
    fruit.sliced = true;
    this.totalFruitsSliced++;

    // Compute slice cut angle
    const sliceAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    const normalAngle = sliceAngle + Math.PI / 2;

    // Normal separation velocity
    const sepSpeed = 190;
    const sepVx = Math.cos(normalAngle) * sepSpeed;
    const sepVy = Math.sin(normalAngle) * sepSpeed;

    // Left Half
    this.halves.push({
      type: fruit.type,
      x: fruit.x - sepVx * 0.05,
      y: fruit.y - sepVy * 0.05,
      vx: fruit.vx - sepVx,
      vy: fruit.vy - sepVy,
      rotation: sliceAngle,
      vRot: -3.5 - Math.random() * 2,
      radius: fruit.radius,
      side: 'left'
    });

    // Right Half
    this.halves.push({
      type: fruit.type,
      x: fruit.x + sepVx * 0.05,
      y: fruit.y + sepVy * 0.05,
      vx: fruit.vx + sepVx,
      vy: fruit.vy + sepVy,
      rotation: sliceAngle,
      vRot: 3.5 + Math.random() * 2,
      radius: fruit.radius,
      side: 'right'
    });

    // Juice Splatter Colors
    const juiceColorMap = {
      watermelon: 'rgba(235, 40, 75, 0.45)',
      apple: 'rgba(255, 235, 120, 0.4)',
      orange: 'rgba(255, 152, 0, 0.45)',
      banana: 'rgba(255, 235, 59, 0.4)',
      strawberry: 'rgba(213, 0, 0, 0.45)',
      coconut: 'rgba(255, 255, 255, 0.45)',
      pineapple: 'rgba(255, 213, 79, 0.45)',
      frenzy: 'rgba(0, 242, 254, 0.6)'
    };
    const jColor = juiceColorMap[fruit.type] || 'rgba(255, 152, 0, 0.4)';

    // Stamp Splatter on Dojo wall
    const droplets = [];
    for (let d = 0; d < 10; d++) {
      const dAngle = Math.random() * Math.PI * 2;
      const dDist = 15 + Math.random() * 45;
      droplets.push({
        dx: Math.cos(dAngle) * dDist,
        dy: Math.sin(dAngle) * dDist,
        r: 3 + Math.random() * 5
      });
    }
    this.splatters.push({
      x: fruit.x,
      y: fruit.y,
      color: jColor,
      radius: 28 + Math.random() * 14,
      droplets: droplets,
      alpha: 1.0,
      decay: 0.035
    });

    // Burst Juice Particles
    for (let p = 0; p < 18; p++) {
      const pAngle = normalAngle + (Math.random() - 0.5) * 1.5;
      const pSpeed = 100 + Math.random() * 250;
      this.particles.push({
        x: fruit.x,
        y: fruit.y,
        vx: Math.cos(pAngle) * pSpeed * (Math.random() > 0.5 ? 1 : -1),
        vy: Math.sin(pAngle) * pSpeed * (Math.random() > 0.5 ? 1 : -1),
        size: 3 + Math.random() * 4,
        color: jColor,
        alpha: 1.0,
        decay: 1.8 + Math.random() * 1.2
      });
    }

    // Sound effect
    if (window.soundEffects) {
      window.soundEffects.playSlice(fruit.type);
    }

    // Special Frenzy Dragonfruit: Triggers 5s Freeze / Slow Motion
    if (fruit.type === 'frenzy') {
      this.freezeDuration = 5.0;
      if (window.soundEffects) window.soundEffects.playFreeze();
      this.spawnFloatingText('FREEZE TIME!', fruit.x, fruit.y - 30, '#00f2fe', '#ffffff', 36);
    }

    // Critical Slice check (8% chance, +10 points)
    const isCritical = Math.random() < 0.08 && fruit.type !== 'frenzy';
    const pointsAwarded = isCritical ? 10 : 1;
    this.score += pointsAwarded;

    if (isCritical) {
      this.spawnFloatingText('CRITICAL! +10', fruit.x, fruit.y - 20, '#ff3d00', '#ffd700', 34);
    }

    // Track combos
    this.currentComboCount++;
    this.lastSliceTime = performance.now();

    // Remove intact fruit
    this.fruits.splice(index, 1);

    if (this.onScoreUpdate) this.onScoreUpdate(this);
  }

  /**
   * Finalize Combo when slicing streak ends
   */
  finalizeCombo() {
    if (this.currentComboCount >= 3) {
      const comboBonus = this.currentComboCount;
      this.score += comboBonus;
      if (this.currentComboCount > this.maxComboAchieved) {
        this.maxComboAchieved = this.currentComboCount;
      }

      const comboText = `${this.currentComboCount}-FRUIT COMBO! +${comboBonus}`;
      const glow = this.currentComboCount >= 5 ? '#ff1744' : '#ff9100';
      this.spawnFloatingText(comboText, this.width / 2, this.height * 0.35, glow, '#ffffff', 42);

      if (window.soundEffects) {
        window.soundEffects.playCombo(this.currentComboCount);
      }

      if (this.onScoreUpdate) this.onScoreUpdate(this);
    }
    this.currentComboCount = 0;
  }

  /**
   * Safely Defuse Bomb using "Fist Shield" Gesture
   */
  defuseBomb(bomb, index) {
    bomb.exploded = true;
    this.totalBombsDefused++;
    this.bombs.splice(index, 1);

    // Green protective shockwave
    for (let p = 0; p < 25; p++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 80 + Math.random() * 200;
      this.particles.push({
        x: bomb.x,
        y: bomb.y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        size: 4 + Math.random() * 4,
        color: '#00f5a0',
        alpha: 1.0,
        decay: 1.5,
        glow: true
      });
    }

    this.spawnFloatingText('SHIELD DEFUSE!', bomb.x, bomb.y - 30, '#00f5a0', '#ffffff', 32);
    if (window.soundEffects) window.soundEffects.playCombo(4);
  }

  /**
   * Catastrophic Bomb Detonation
   */
  detonateBomb(bomb, index) {
    bomb.exploded = true;
    this.bombs.splice(index, 1);

    // Trigger Screen Shake
    this.shakeDuration = 0.65;
    this.shakeIntensity = 18;

    // Explosion particles
    for (let p = 0; p < 45; p++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 120 + Math.random() * 400;
      this.particles.push({
        x: bomb.x,
        y: bomb.y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        size: 5 + Math.random() * 7,
        color: Math.random() > 0.5 ? '#ff3d00' : '#ffeb3b',
        alpha: 1.0,
        decay: 1.8,
        glow: true
      });
    }

    if (window.soundEffects) {
      window.soundEffects.playBombExplosion();
    }

    if (this.mode === 'classic') {
      this.lives = 0;
      this.gameOver('bombed');
    } else if (this.mode === 'arcade') {
      this.score = Math.max(0, this.score - 10);
      this.spawnFloatingText('BOMB! -10', bomb.x, bomb.y - 30, '#ff1744', '#ffffff', 38);
      if (this.onScoreUpdate) this.onScoreUpdate(this);
    }
  }

  /**
   * Update Intact Fruits Kinematics
   */
  updateFruits(dt) {
    for (let i = this.fruits.length - 1; i >= 0; i--) {
      const f = this.fruits[i];
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.vy += this.gravity * dt;
      f.rotation += f.vRot * dt;

      // Missed fruit (fell below bottom)
      if (f.y > this.height + 60 && f.vy > 0) {
        this.fruits.splice(i, 1);

        if (this.mode === 'classic') {
          this.lives--;
          if (window.soundEffects) window.soundEffects.playMiss();
          this.spawnFloatingText('MISS!', Math.max(50, Math.min(this.width - 50, f.x)), this.height - 40, '#ff1744', '#ffffff', 28);
          if (this.onScoreUpdate) this.onScoreUpdate(this);

          if (this.lives <= 0) {
            this.gameOver('lives');
          }
        }
      }
    }
  }

  /**
   * Update Sliced Halves Kinematics
   */
  updateHalves(dt) {
    for (let i = this.halves.length - 1; i >= 0; i--) {
      const h = this.halves[i];
      h.x += h.vx * dt;
      h.y += h.vy * dt;
      h.vy += this.gravity * 1.1 * dt; // Halves drop slightly faster
      h.rotation += h.vRot * dt;

      if (h.y > this.height + 80) {
        this.halves.splice(i, 1);
      }
    }
  }

  /**
   * Update Bombs Kinematics
   */
  updateBombs(dt) {
    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const b = this.bombs[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.vy += this.gravity * dt;
      b.rotation += b.vRot * dt;

      if (b.y > this.height + 60 && b.vy > 0) {
        this.bombs.splice(i, 1);
      }
    }
  }

  /**
   * Update Particle Decay
   */
  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 320 * dt; // Particle gravity
      p.alpha -= p.decay * dt;

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  /**
   * Update Splatters Opacity Decay
   */
  updateSplatters(dt) {
    for (let i = this.splatters.length - 1; i >= 0; i--) {
      const s = this.splatters[i];
      s.alpha -= s.decay * dt;
      if (s.alpha <= 0) {
        this.splatters.splice(i, 1);
      }
    }
  }

  /**
   * Update Bouncy Floating Text
   */
  updateFloatingTexts(dt) {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const t = this.floatingTexts[i];
      t.y += t.vy * dt;
      t.alpha -= t.decay * dt;
      t.scale = Math.min(1.2, t.scale + dt * 0.8);

      if (t.alpha <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  spawnFloatingText(text, x, y, glowColor = '#ff9800', fillColor = '#ffd700', fontSize = 32) {
    this.floatingTexts.push({
      text: text,
      x: x,
      y: y,
      vy: -55,
      alpha: 1.0,
      scale: 0.85,
      decay: 0.9,
      glowColor: glowColor,
      fillColor: fillColor,
      fontSize: fontSize
    });
  }

  /**
   * Master Render Frame
   */
  render() {
    if (!this.ctx || !window.fruitRenderer) return;

    this.ctx.save();

    // Apply Screen Shake if active
    if (this.shakeDuration > 0) {
      const sx = (Math.random() - 0.5) * this.shakeIntensity;
      const sy = (Math.random() - 0.5) * this.shakeIntensity;
      this.ctx.translate(sx, sy);
    }

    // 1. Dojo Wooden Background
    window.fruitRenderer.renderBackground(this.ctx, this.width, this.height);

    // 2. Persistent Juice Splatters
    window.fruitRenderer.renderSplatters(this.ctx, this.splatters);

    // 3. Intact Fruits
    for (let i = 0; i < this.fruits.length; i++) {
      window.fruitRenderer.renderFruit(this.ctx, this.fruits[i]);
    }

    // 4. Sliced Fruit Halves
    for (let j = 0; j < this.halves.length; j++) {
      window.fruitRenderer.renderHalf(this.ctx, this.halves[j]);
    }

    // 5. Bombs
    for (let k = 0; k < this.bombs.length; k++) {
      window.fruitRenderer.renderBomb(this.ctx, this.bombs[k]);
    }

    // 6. Particles
    window.fruitRenderer.renderParticles(this.ctx, this.particles);

    // 7. Katana Blade Trails
    if (window.handTracker) {
      window.fruitRenderer.renderBladeTrail(this.ctx, window.handTracker.bladeTrails.primary, 'cyan');
      window.fruitRenderer.renderBladeTrail(this.ctx, window.handTracker.bladeTrails.secondary, 'crimson');
    }

    // 8. Floating Texts (Combos & Scores)
    window.fruitRenderer.renderFloatingTexts(this.ctx, this.floatingTexts);

    // 9. Freeze / Time Dilation Screen Vignette
    if (this.freezeDuration > 0) {
      window.fruitRenderer.renderFreezeOverlay(this.ctx, this.width, this.height, this.freezeDuration / 5.0);
    }

    this.ctx.restore();
  }
}

// Export singleton instance
window.gameEngine = new GameEngine();
