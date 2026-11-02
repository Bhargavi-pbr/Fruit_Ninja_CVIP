/**
 * GameEngine.js - Core Gameplay, Physics, Collision Geometry, Level Progression and Scoring
 * Enhanced for Fruit Ninja CVIP with:
 * 1. Smooth & Slow natural fruit kinematics
 * 2. 5-Level progression system (Beginner to Expert) with score targets
 * 3. Level unlocking & persistent progress in localStorage
 * 4. Game Speed settings (Slow [Default], Normal, Fast)
 * 5. Level Completed and Grand Victory states
 */

const LEVEL_CONFIGS = [
  {
    level: 1,
    name: 'Beginner',
    targetScore: 15,
    speedMultiplier: 0.72,
    gravity: 360,
    spawnIntervalMin: 2.4,
    spawnIntervalMax: 3.5,
    fruitsPerWaveMin: 1,
    fruitsPerWaveMax: 2,
    bombProbability: 0.0, // No bombs for beginner
    description: 'Slow fruit movement and gentle parabolic arcs. Master the basic katana slice!'
  },
  {
    level: 2,
    name: 'Easy',
    targetScore: 25,
    speedMultiplier: 0.84,
    gravity: 410,
    spawnIntervalMin: 1.9,
    spawnIntervalMax: 2.8,
    fruitsPerWaveMin: 1,
    fruitsPerWaveMax: 3,
    bombProbability: 0.12, // Occasional bomb
    description: 'Slightly faster fruits with occasional bombs. Watch your blade accuracy!'
  },
  {
    level: 3,
    name: 'Intermediate',
    targetScore: 40,
    speedMultiplier: 0.96,
    gravity: 460,
    spawnIntervalMin: 1.5,
    spawnIntervalMax: 2.4,
    fruitsPerWaveMin: 2,
    fruitsPerWaveMax: 3,
    bombProbability: 0.22,
    description: 'Moderate speed with multi-fruit waves and strategic bomb hazards.'
  },
  {
    level: 4,
    name: 'Advanced',
    targetScore: 60,
    speedMultiplier: 1.10,
    gravity: 520,
    spawnIntervalMin: 1.2,
    spawnIntervalMax: 2.0,
    fruitsPerWaveMin: 2,
    fruitsPerWaveMax: 4,
    bombProbability: 0.32,
    description: 'Faster waves requiring swift reactions and fist-shield defusals.'
  },
  {
    level: 5,
    name: 'Expert',
    targetScore: 80,
    speedMultiplier: 1.25,
    gravity: 580,
    spawnIntervalMin: 1.0,
    spawnIntervalMax: 1.7,
    fruitsPerWaveMin: 3,
    fruitsPerWaveMax: 5,
    bombProbability: 0.40,
    description: 'Grandmaster ninja trial! Intense multi-fruit storms and demanding scoring.'
  }
];

const SPEED_FACTORS = {
  slow: 0.75,   // Default setting: slow and smooth
  normal: 1.0,
  fast: 1.25
};

class GameEngine {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.width = 1280;
    this.height = 720;

    // Game state: 'MENU', 'PLAYING', 'PAUSED', 'LEVEL_COMPLETED', 'VICTORY', 'GAMEOVER'
    this.state = 'MENU';
    this.mode = 'adventure'; // 'adventure' (5 Levels), 'classic', 'arcade', 'zen'

    // Level progression
    this.currentLevel = 1;
    this.unlockedLevel = 1;
    this.targetScore = LEVEL_CONFIGS[0].targetScore;
    this.gameSpeed = 'slow'; // 'slow', 'normal', 'fast' (Slow is default!)

    // Scores and stats
    this.score = 0;
    this.highScore = 0;
    this.lives = 3;
    this.maxLives = 3;
    this.timerSeconds = 60; // For Arcade / Zen
    this.gameStartTime = 0;
    this.lastTime = performance.now();

    // Slicing and Combo tracking
    this.currentComboCount = 0;
    this.lastSliceTime = 0;
    this.comboWindowMs = 380; // Generous window to chain combo slices
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
    this.spawnIntervalMin = 2.0;
    this.spawnIntervalMax = 3.2;

    // Base gravity (px/s^2)
    this.gravity = 380;

    // Storage Keys
    this.storageKey = 'fruit_ninja_cvip_highscore';
    this.unlockedStorageKey = 'fruit_ninja_unlocked_level';
    this.levelScoresStorageKey = 'fruit_ninja_level_scores';
    this.speedStorageKey = 'fruit_ninja_game_speed';

    this.loadPersistence();

    // Event callbacks
    this.onStateChange = null;
    this.onScoreUpdate = null;
    this.onLevelCompleted = null;
    this.onVictory = null;
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
      window.handTracker.setGameSpeed(this.gameSpeed);
    }
  }

  loadPersistence() {
    try {
      const savedHigh = localStorage.getItem(this.storageKey);
      if (savedHigh) this.highScore = parseInt(savedHigh, 10) || 0;

      const savedUnlocked = localStorage.getItem(this.unlockedStorageKey);
      if (savedUnlocked) {
        this.unlockedLevel = Math.max(1, Math.min(5, parseInt(savedUnlocked, 10) || 1));
      }

      const savedSpeed = localStorage.getItem(this.speedStorageKey);
      if (savedSpeed && SPEED_FACTORS[savedSpeed]) {
        this.gameSpeed = savedSpeed;
      } else {
        this.gameSpeed = 'slow'; // Default
      }
    } catch (e) {
      this.highScore = 0;
      this.unlockedLevel = 1;
      this.gameSpeed = 'slow';
    }
  }

  savePersistence() {
    try {
      if (this.score > this.highScore) {
        this.highScore = this.score;
        localStorage.setItem(this.storageKey, this.highScore.toString());
      }
      localStorage.setItem(this.unlockedStorageKey, this.unlockedLevel.toString());
      localStorage.setItem(this.speedStorageKey, this.gameSpeed);

      // Save level best score
      if (this.mode === 'adventure') {
        const scores = this.getLevelScoresMap();
        if ((scores[this.currentLevel] || 0) < this.score) {
          scores[this.currentLevel] = this.score;
          localStorage.setItem(this.levelScoresStorageKey, JSON.stringify(scores));
        }
      }
    } catch (e) {}
  }

  getLevelScoresMap() {
    try {
      const raw = localStorage.getItem(this.levelScoresStorageKey);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  getLevelBestScore(lvl) {
    const scores = this.getLevelScoresMap();
    return scores[lvl] || 0;
  }

  setGameSpeed(speed) {
    if (SPEED_FACTORS[speed]) {
      this.gameSpeed = speed;
      try {
        localStorage.setItem(this.speedStorageKey, speed);
      } catch (e) {}
      if (window.handTracker) {
        window.handTracker.setGameSpeed(speed);
      }
      this.applyCurrentLevelPhysics();
      if (this.onScoreUpdate) this.onScoreUpdate(this);
    }
  }

  getCurrentLevelConfig() {
    const idx = Math.max(0, Math.min(LEVEL_CONFIGS.length - 1, this.currentLevel - 1));
    return LEVEL_CONFIGS[idx];
  }

  applyCurrentLevelPhysics() {
    const cfg = this.getCurrentLevelConfig();
    const speedMultiplier = SPEED_FACTORS[this.gameSpeed] || 0.75;

    // Apply combined gravity and spawn rates
    this.gravity = cfg.gravity * speedMultiplier;
    this.spawnIntervalMin = cfg.spawnIntervalMin / speedMultiplier;
    this.spawnIntervalMax = cfg.spawnIntervalMax / speedMultiplier;
    this.targetScore = cfg.targetScore;
  }

  setMode(mode) {
    this.mode = mode;
    if (mode === 'classic' || mode === 'adventure') {
      this.lives = 3;
      this.maxLives = 3;
    } else if (mode === 'arcade') {
      this.timerSeconds = 60;
    } else if (mode === 'zen') {
      this.timerSeconds = 90;
    }
  }

  /**
   * Start or restart gameplay at a specific level
   */
  startLevel(levelNumber = this.currentLevel) {
    this.mode = 'adventure';
    this.currentLevel = Math.max(1, Math.min(5, levelNumber));
    this.applyCurrentLevelPhysics();

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
    this.nextWaveTime = performance.now() + 900;

    this.state = 'PLAYING';
    if (this.onStateChange) this.onStateChange(this.state);
    if (this.onScoreUpdate) this.onScoreUpdate(this);
    if (window.soundEffects) window.soundEffects.playClick();
  }

  startNewGame(mode = this.mode) {
    if (mode === 'adventure') {
      this.startLevel(this.currentLevel || 1);
    } else {
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
      this.nextWaveTime = performance.now() + 900;

      this.state = 'PLAYING';
      if (this.onStateChange) this.onStateChange(this.state);
      if (this.onScoreUpdate) this.onScoreUpdate(this);
      if (window.soundEffects) window.soundEffects.playClick();
    }
  }

  nextLevel() {
    if (this.currentLevel < 5) {
      this.startLevel(this.currentLevel + 1);
    } else {
      this.startLevel(1);
    }
  }

  restartLevel() {
    this.startLevel(this.currentLevel);
  }

  completeLevel() {
    this.savePersistence();

    // Check if next level needs to be unlocked
    if (this.currentLevel >= this.unlockedLevel && this.currentLevel < 5) {
      this.unlockedLevel = this.currentLevel + 1;
      try {
        localStorage.setItem(this.unlockedStorageKey, this.unlockedLevel.toString());
      } catch (e) {}
    }

    if (this.currentLevel === 5) {
      // Completed all 5 levels -> Final Grand Victory!
      this.state = 'VICTORY';
      if (window.soundEffects) window.soundEffects.playVictory();
      if (this.onVictory) this.onVictory(this);
      if (this.onStateChange) this.onStateChange(this.state);
    } else {
      // Completed current level
      this.state = 'LEVEL_COMPLETED';
      if (window.soundEffects) window.soundEffects.playLevelComplete();
      if (this.onLevelCompleted) this.onLevelCompleted(this, this.currentLevel, this.currentLevel + 1);
      if (this.onStateChange) this.onStateChange(this.state);
    }
  }

  getProgressPercent() {
    if (!this.targetScore || this.targetScore <= 0) return 0;
    return Math.min(100, Math.round((this.score / this.targetScore) * 100));
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
    this.savePersistence();
    if (window.soundEffects) {
      window.soundEffects.playGameOver();
    }
    if (this.onStateChange) this.onStateChange(this.state, reason);
  }

  /**
   * Main game loop called via requestAnimationFrame
   */
  update(timestamp) {
    // Clamp delta time to avoid large physics steps
    const rawDt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
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
   * Spawn a wave of fruits and occasional bombs based on current level & speed
   */
  spawnFruitWave() {
    const cfg = this.getCurrentLevelConfig();
    const minFruits = cfg.fruitsPerWaveMin;
    const maxFruits = cfg.fruitsPerWaveMax;
    const count = minFruits + Math.floor(Math.random() * (maxFruits - minFruits + 1));

    const fruitTypes = ['watermelon', 'apple', 'orange', 'banana', 'strawberry', 'coconut', 'pineapple'];

    for (let i = 0; i < count; i++) {
      const type = (Math.random() < 0.08 && this.mode !== 'zen') ? 'frenzy' :
                   fruitTypes[Math.floor(Math.random() * fruitTypes.length)];

      // Position fruits evenly across screen width
      const margin = this.width * 0.16;
      const spawnX = margin + Math.random() * (this.width - 2 * margin);
      const spawnY = this.height + 40;

      // Parabolic apex in upper-middle of screen for smooth viewing
      const targetX = this.width * 0.22 + Math.random() * (this.width * 0.56);
      const apexY = this.height * 0.22 + Math.random() * (this.height * 0.26);

      // Kinematic equation: v0y = -sqrt(2 * g * h)
      const flightHeight = spawnY - apexY;
      const vy0 = -Math.sqrt(2 * this.gravity * flightHeight);
      const timeToApex = -vy0 / this.gravity;
      const vx0 = (targetX - spawnX) / (timeToApex * (1.1 + Math.random() * 0.35));

      this.fruits.push({
        type: type,
        x: spawnX,
        y: spawnY,
        vx: vx0,
        vy: vy0,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 3.2, // Gentle natural rotation
        radius: type === 'watermelon' ? 44 : type === 'pineapple' ? 40 : 34,
        sliced: false
      });
      this.totalFruitsSpawned++;
    }

    // Spawn Bomb according to level probability (not in Zen mode)
    if (this.mode !== 'zen' && Math.random() < cfg.bombProbability) {
      const bSpawnX = this.width * 0.22 + Math.random() * (this.width * 0.56);
      const bSpawnY = this.height + 40;
      const bApexY = this.height * 0.26 + Math.random() * (this.height * 0.24);
      const bFlightHeight = bSpawnY - bApexY;
      const bVy0 = -Math.sqrt(2 * this.gravity * bFlightHeight);
      const bVx0 = (Math.random() - 0.5) * 120;

      this.bombs.push({
        x: bSpawnX,
        y: bSpawnY,
        vx: bVx0,
        vy: bVy0,
        rotation: 0,
        vRot: (Math.random() - 0.5) * 2.5,
        radius: 36,
        exploded: false
      });
    }
  }

  /**
   * Core CVIP Geometry: Line Segment to Circle Intersection
   * Tests if blade swipe line segment (P1 to P2) cuts through fruit circle (C, R)
   * With a slight +4px hitbox tolerance for smooth and forgiving hand slicing
   */
  checkLineCircleIntersection(x1, y1, x2, y2, cx, cy, r) {
    const effectiveRadius = r + 4; // Friendly hitbox margin
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;

    if (lenSq === 0) {
      return Math.hypot(x1 - cx, y1 - cy) <= effectiveRadius;
    }

    // Project circle center onto segment line parameter t
    const t = Math.max(0, Math.min(1, ((cx - x1) * dx + (cy - y1) * dy) / lenSq));
    const closestX = x1 + t * dx;
    const closestY = y1 + t * dy;

    const distSq = (cx - closestX) * (cx - closestX) + (cy - closestY) * (cy - closestY);
    return distSq <= effectiveRadius * effectiveRadius;
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
    const sepSpeed = 160;
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
      vRot: -2.8 - Math.random() * 1.5,
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
      vRot: 2.8 + Math.random() * 1.5,
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
    for (let d = 0; d < 8; d++) {
      const dAngle = Math.random() * Math.PI * 2;
      const dDist = 12 + Math.random() * 38;
      droplets.push({
        dx: Math.cos(dAngle) * dDist,
        dy: Math.sin(dAngle) * dDist,
        r: 3 + Math.random() * 4
      });
    }
    this.splatters.push({
      x: fruit.x,
      y: fruit.y,
      color: jColor,
      radius: 26 + Math.random() * 12,
      droplets: droplets,
      alpha: 1.0,
      decay: 0.035
    });

    // Burst Juice Particles
    for (let p = 0; p < 14; p++) {
      const pAngle = normalAngle + (Math.random() - 0.5) * 1.5;
      const pSpeed = 80 + Math.random() * 200;
      this.particles.push({
        x: fruit.x,
        y: fruit.y,
        vx: Math.cos(pAngle) * pSpeed * (Math.random() > 0.5 ? 1 : -1),
        vy: Math.sin(pAngle) * pSpeed * (Math.random() > 0.5 ? 1 : -1),
        size: 3 + Math.random() * 3.5,
        color: jColor,
        alpha: 1.0,
        decay: 1.6 + Math.random() * 1.0
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

    // Check Level Progression (Adventure Mode)
    if (this.mode === 'adventure' && this.state === 'PLAYING') {
      if (this.score >= this.targetScore) {
        this.completeLevel();
      }
    }
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

      // Check level target after combo bonus
      if (this.mode === 'adventure' && this.state === 'PLAYING') {
        if (this.score >= this.targetScore) {
          this.completeLevel();
        }
      }
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
    for (let p = 0; p < 22; p++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 70 + Math.random() * 180;
      this.particles.push({
        x: bomb.x,
        y: bomb.y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        size: 3.5 + Math.random() * 3.5,
        color: '#00f5a0',
        alpha: 1.0,
        decay: 1.4,
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
    for (let p = 0; p < 40; p++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 100 + Math.random() * 350;
      this.particles.push({
        x: bomb.x,
        y: bomb.y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        size: 4 + Math.random() * 6,
        color: Math.random() > 0.5 ? '#ff3d00' : '#ffeb3b',
        alpha: 1.0,
        decay: 1.6,
        glow: true
      });
    }

    if (window.soundEffects) {
      window.soundEffects.playBombExplosion();
    }

    if (this.mode === 'classic' || this.mode === 'adventure') {
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

        if (this.mode === 'classic' || this.mode === 'adventure') {
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
      h.vy += this.gravity * 1.08 * dt; // Halves drop slightly faster
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
      p.vy += 260 * dt; // Particle gravity
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
      vy: -50,
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

// Export singleton instance and level configurations
window.LEVEL_CONFIGS = LEVEL_CONFIGS;
window.gameEngine = new GameEngine();
