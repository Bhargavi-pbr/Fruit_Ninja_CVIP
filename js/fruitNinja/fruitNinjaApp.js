/**
 * FruitNinjaApp.js - Master Application Controller for Fruit Ninja CVIP
 * Connects GameEngine, HandTracker, FruitRenderer, SoundEffects, and CVIP Pipeline.
 * Features:
 * - 5-Level Progression & Level Selection System
 * - Smooth & Slow Gameplay with Game Speed Toggle (Slow [Default], Normal, Fast)
 * - Hand Tracking Sensitivity Control (Low, Medium, High)
 * - Level Completed & Grandmaster Victory screens
 * - Touchless Gestures (Thumbs Up Start/Restart, Fist Shield Defuse, Open Palm Freeze)
 */

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const gameCanvas = document.getElementById('gameCanvas');
  const webcamVideo = document.getElementById('webcamVideo');
  const pipVideo = document.getElementById('pipVideo');
  const cvipCanvas = document.getElementById('cvipCanvas');

  // HUD Elements
  const hudScore = document.getElementById('hudScore');
  const hudTargetScore = document.getElementById('hudTargetScore');
  const hudHighScore = document.getElementById('hudHighScore');
  const hudLevelBox = document.getElementById('hudLevelBox');
  const hudLevelBadge = document.getElementById('hudLevelBadge');
  const hudProgressWrapper = document.getElementById('hudProgressWrapper');
  const hudProgressPercent = document.getElementById('hudProgressPercent');
  const hudProgressFill = document.getElementById('hudProgressFill');
  const hudSpeedBadge = document.getElementById('hudSpeedBadge');
  const hudSensBadge = document.getElementById('hudSensBadge');
  const hudLivesContainer = document.getElementById('hudLivesContainer');
  const hudTimerContainer = document.getElementById('hudTimerContainer');
  const hudTimer = document.getElementById('hudTimer');
  const trackingBadge = document.getElementById('trackingBadge');
  const gestureBadge = document.getElementById('gestureBadge');
  const fpsCounter = document.getElementById('fpsCounter');

  // UI Overlays & Modals
  const menuOverlay = document.getElementById('menuOverlay');
  const gameOverOverlay = document.getElementById('gameOverOverlay');
  const pauseOverlay = document.getElementById('pauseOverlay');
  const studioModal = document.getElementById('studioModal');
  const levelSelectOverlay = document.getElementById('levelSelectOverlay');
  const levelCompletedOverlay = document.getElementById('levelCompletedOverlay');
  const victoryOverlay = document.getElementById('victoryOverlay');
  const levelsGridContainer = document.getElementById('levelsGridContainer');

  // Menu Elements
  const menuProgressionStatus = document.getElementById('menuProgressionStatus');
  const btnStartGameText = document.getElementById('btnStartGameText');
  const btnStartGame = document.getElementById('btnStartGame');
  const btnOpenLevelSelect = document.getElementById('btnOpenLevelSelect');
  const btnCloseLevelSelect = document.getElementById('btnCloseLevelSelect');
  const btnRestartGame = document.getElementById('btnRestartGame');
  const btnGameOverLevelSelect = document.getElementById('btnGameOverLevelSelect');
  const btnResumeGame = document.getElementById('btnResumeGame');
  const btnPauseRestart = document.getElementById('btnPauseRestart');
  const btnQuitToMenu = document.getElementById('btnQuitToMenu');
  const btnToggleCamera = document.getElementById('btnToggleCamera');
  const btnToggleAudio = document.getElementById('btnToggleAudio');
  const btnOpenStudio = document.getElementById('btnOpenStudio');
  const btnCloseStudio = document.getElementById('btnCloseStudio');

  // Level Complete & Victory Elements
  const btnNextLevel = document.getElementById('btnNextLevel');
  const btnReplayLevel = document.getElementById('btnReplayLevel');
  const btnLevelSelectFromComplete = document.getElementById('btnLevelSelectFromComplete');
  const lvlCompleteSub = document.getElementById('lvlCompleteSub');
  const lvlCompleteScore = document.getElementById('lvlCompleteScore');
  const lvlCompleteTarget = document.getElementById('lvlCompleteTarget');
  const lvlCompleteCombos = document.getElementById('lvlCompleteCombos');

  const btnVictoryPlayAgain = document.getElementById('btnVictoryPlayAgain');
  const btnVictoryLevelSelect = document.getElementById('btnVictoryLevelSelect');
  const btnVictoryMenu = document.getElementById('btnVictoryMenu');
  const victoryScore = document.getElementById('victoryScore');
  const victoryBestScore = document.getElementById('victoryBestScore');

  // Selectors
  const modeSelectBtns = document.querySelectorAll('.mode-btn');
  const bladeThemeBtns = document.querySelectorAll('.theme-btn');
  const speedPillBtns = document.querySelectorAll('#speedPillGroup .pill-btn');
  const sensPillBtns = document.querySelectorAll('#sensPillGroup .pill-btn');

  // Stats in GameOver
  const finalScoreEl = document.getElementById('finalScore');
  const statFruitsSlicedEl = document.getElementById('statFruitsSliced');
  const statMaxComboEl = document.getElementById('statMaxCombo');
  const statAccuracyEl = document.getElementById('statAccuracy');
  const statBombsDefusedEl = document.getElementById('statBombsDefused');

  // Initialize Game Engine & Hand Tracker
  window.gameEngine.init(gameCanvas);
  hudHighScore.innerText = window.gameEngine.highScore;

  // Initialize Hand Tracker Mouse Simulator
  window.handTracker.setupMouseControls(gameCanvas);
  window.handTracker.setGameSpeed(window.gameEngine.gameSpeed);

  // Sync initial UI state from persistence
  syncSpeedButtons(window.gameEngine.gameSpeed);
  syncSensButtons(window.handTracker.sensitivity);
  updateMenuStatus();

  // Status and Telemetry Callback
  window.handTracker.onStatusChange = (statusMsg) => {
    if (trackingBadge) trackingBadge.innerText = statusMsg;
  };

  // Thumbs-Up Gesture to Start / Restart Game (100% Touchless!)
  let thumbsUpCooldown = 0;
  window.handTracker.onGestureDetected = (gesture, bladePos) => {
    if (gestureBadge) {
      gestureBadge.innerText = gesture;
      if (gesture === 'Blade Slash') {
        gestureBadge.className = 'badge badge-blade';
      } else if (gesture === 'Fist Shield') {
        gestureBadge.className = 'badge badge-shield';
      } else if (gesture === 'Open Palm') {
        gestureBadge.className = 'badge badge-freeze';
      } else if (gesture === 'Thumbs Up') {
        gestureBadge.className = 'badge badge-thumbsup';
      } else {
        gestureBadge.className = 'badge badge-idle';
      }
    }

    // Touchless Start/Restart on Thumbs Up
    const now = performance.now();
    if (gesture === 'Thumbs Up' && now > thumbsUpCooldown) {
      thumbsUpCooldown = now + 1800;
      if (window.gameEngine.state === 'MENU' || window.gameEngine.state === 'GAMEOVER') {
        hideAllOverlays();
        window.gameEngine.startLevel(window.gameEngine.currentLevel || 1);
      } else if (window.gameEngine.state === 'LEVEL_COMPLETED') {
        hideAllOverlays();
        window.gameEngine.nextLevel();
      } else if (window.gameEngine.state === 'VICTORY') {
        hideAllOverlays();
        window.gameEngine.startLevel(1);
      }
    }
  };

  function hideAllOverlays() {
    menuOverlay.classList.add('hidden');
    gameOverOverlay.classList.add('hidden');
    pauseOverlay.classList.add('hidden');
    levelSelectOverlay.classList.add('hidden');
    levelCompletedOverlay.classList.add('hidden');
    victoryOverlay.classList.add('hidden');
  }

  // Game Engine State Callback
  window.gameEngine.onStateChange = (state, reason) => {
    if (state === 'PLAYING') {
      hideAllOverlays();
    } else if (state === 'PAUSED') {
      pauseOverlay.classList.remove('hidden');
    } else if (state === 'GAMEOVER') {
      hideAllOverlays();
      finalScoreEl.innerText = window.gameEngine.score;
      statFruitsSlicedEl.innerText = window.gameEngine.totalFruitsSliced;
      statMaxComboEl.innerText = `${window.gameEngine.maxComboAchieved}x`;
      statBombsDefusedEl.innerText = window.gameEngine.totalBombsDefused;

      const accuracy = window.gameEngine.totalFruitsSpawned > 0
        ? Math.round((window.gameEngine.totalFruitsSliced / window.gameEngine.totalFruitsSpawned) * 100)
        : 100;
      statAccuracyEl.innerText = `${accuracy}%`;

      gameOverOverlay.classList.remove('hidden');
    } else if (state === 'MENU') {
      hideAllOverlays();
      menuOverlay.classList.remove('hidden');
      updateMenuStatus();
    } else if (state === 'LEVEL_COMPLETED') {
      hideAllOverlays();
      levelCompletedOverlay.classList.remove('hidden');
    } else if (state === 'VICTORY') {
      hideAllOverlays();
      victoryOverlay.classList.remove('hidden');
    }
    updateHUDMode();
  };

  // Level Completed Callback
  window.gameEngine.onLevelCompleted = (engine, curLvl, nextLvl) => {
    const cfg = engine.getCurrentLevelConfig();
    lvlCompleteSub.innerText = `Level ${curLvl} - ${cfg.name} Conquered!`;
    lvlCompleteScore.innerText = engine.score;
    lvlCompleteTarget.innerText = cfg.targetScore;
    lvlCompleteCombos.innerText = `${engine.maxComboAchieved}x`;

    if (btnNextLevel) {
      btnNextLevel.innerHTML = `<i data-lucide="chevrons-right"></i> NEXT LEVEL (${nextLvl})`;
    }
    if (window.lucide) window.lucide.createIcons();
    updateMenuStatus();
  };

  // Grand Victory Callback
  window.gameEngine.onVictory = (engine) => {
    victoryScore.innerText = engine.score;
    victoryBestScore.innerText = engine.highScore;
    updateMenuStatus();
  };

  // Score and HUD Update Callback
  window.gameEngine.onScoreUpdate = (engine) => {
    hudScore.innerText = engine.score;
    hudHighScore.innerText = engine.highScore;

    // Progress Bar and Target
    if (engine.mode === 'adventure') {
      const cfg = engine.getCurrentLevelConfig();
      hudTargetScore.style.display = 'inline';
      hudTargetScore.innerText = `/ ${cfg.targetScore}`;
      hudProgressWrapper.style.display = 'flex';

      const pct = engine.getProgressPercent();
      hudProgressPercent.innerText = `${pct}%`;
      hudProgressFill.style.width = `${pct}%`;

      hudLevelBox.style.display = 'flex';
      hudLevelBadge.innerHTML = `<i data-lucide="shield" style="width:14px; height:14px;"></i> LVL ${engine.currentLevel}: ${cfg.name.toUpperCase()}`;
    } else {
      hudTargetScore.style.display = 'none';
      hudProgressWrapper.style.display = 'none';
      hudLevelBox.style.display = 'none';
    }

    // Render Speed Badge
    if (hudSpeedBadge) {
      hudSpeedBadge.innerText = engine.gameSpeed.toUpperCase();
    }

    // Render Lives (Shurikens / Hearts)
    if (engine.mode === 'classic' || engine.mode === 'adventure') {
      hudLivesContainer.innerHTML = '';
      for (let i = 0; i < engine.maxLives; i++) {
        const star = document.createElement('span');
        star.className = i < engine.lives ? 'life-star active' : 'life-star lost';
        star.innerHTML = '★';
        hudLivesContainer.appendChild(star);
      }
    }
    if (window.lucide) window.lucide.createIcons();
  };

  function updateHUDMode() {
    if (window.gameEngine.mode === 'arcade' || window.gameEngine.mode === 'zen') {
      hudLivesContainer.style.display = 'none';
      hudTimerContainer.style.display = 'flex';
      hudProgressWrapper.style.display = 'none';
      hudLevelBox.style.display = 'none';
    } else {
      hudLivesContainer.style.display = 'flex';
      hudTimerContainer.style.display = 'none';
      if (window.gameEngine.mode === 'adventure') {
        hudProgressWrapper.style.display = 'flex';
        hudLevelBox.style.display = 'flex';
      }
    }
  }

  function updateMenuStatus() {
    const unlocked = window.gameEngine.unlockedLevel || 1;
    if (menuProgressionStatus) {
      menuProgressionStatus.innerText = `Level Progression: Level ${unlocked} of 5 Unlocked`;
    }
    if (btnStartGameText) {
      btnStartGameText.innerText = `PLAY LEVEL ${window.gameEngine.currentLevel || 1}`;
    }
  }

  // Render Level Select Cards
  function renderLevelCards() {
    if (!levelsGridContainer) return;
    levelsGridContainer.innerHTML = '';

    const unlocked = window.gameEngine.unlockedLevel || 1;
    const current = window.gameEngine.currentLevel || 1;

    window.LEVEL_CONFIGS.forEach((cfg) => {
      const isUnlocked = cfg.level <= unlocked;
      const isCurrent = cfg.level === current;
      const bestScore = window.gameEngine.getLevelBestScore(cfg.level);

      const card = document.createElement('div');
      card.className = `level-card ${isUnlocked ? 'unlocked' : 'locked'} ${isCurrent ? 'current' : ''}`;

      card.innerHTML = `
        <div class="level-number-badge">${cfg.level}</div>
        <div class="level-card-name">${cfg.name}</div>
        <div class="level-target-label">Target: ${cfg.targetScore} pts</div>
        <div class="level-best-label">Best: ${bestScore}</div>
        <div class="level-status-pill ${isUnlocked ? 'play' : 'locked'}">
          ${isUnlocked ? (isCurrent ? 'CURRENT' : 'PLAY') : 'LOCKED 🔒'}
        </div>
      `;

      if (isUnlocked) {
        card.addEventListener('click', () => {
          hideAllOverlays();
          window.gameEngine.startLevel(cfg.level);
        });
      }

      levelsGridContainer.appendChild(card);
    });
  }

  // Camera Initialization
  let cameraActive = false;
  async function activateCamera() {
    trackingBadge.innerText = 'Initializing Camera & MediaPipe...';
    const success = await window.handTracker.initCamera(webcamVideo);
    if (success) {
      cameraActive = true;
      btnToggleCamera.innerHTML = '<i data-lucide="video"></i> Camera: ON';
      btnToggleCamera.classList.add('active');
      if (pipVideo) {
        pipVideo.srcObject = webcamVideo.srcObject;
        pipVideo.parentElement.classList.remove('hidden');
      }
    } else {
      cameraActive = false;
      btnToggleCamera.innerHTML = '<i data-lucide="mouse-pointer"></i> Mode: Mouse';
      btnToggleCamera.classList.remove('active');
    }
    if (window.lucide) window.lucide.createIcons();
  }

  activateCamera().catch(() => {});

  // Camera Toggle Button
  btnToggleCamera.addEventListener('click', async () => {
    if (cameraActive) {
      window.handTracker.stopCamera();
      window.handTracker.setMode('mouse');
      cameraActive = false;
      btnToggleCamera.innerHTML = '<i data-lucide="mouse-pointer"></i> Mode: Mouse';
      btnToggleCamera.classList.remove('active');
      if (pipVideo) pipVideo.parentElement.classList.add('hidden');
    } else {
      window.handTracker.setMode('camera');
      await activateCamera();
    }
    if (window.lucide) window.lucide.createIcons();
  });

  // Audio Toggle Button
  btnToggleAudio.addEventListener('click', () => {
    const isMuted = window.soundEffects.toggleMute();
    btnToggleAudio.innerHTML = isMuted
      ? '<i data-lucide="volume-x"></i> Sound: OFF'
      : '<i data-lucide="volume-2"></i> Sound: ON';
    btnToggleAudio.classList.toggle('active', !isMuted);
    if (window.lucide) window.lucide.createIcons();
  });

  // Mode Selection Buttons
  modeSelectBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      modeSelectBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const mode = btn.getAttribute('data-mode');
      window.gameEngine.setMode(mode);
      updateHUDMode();
      updateMenuStatus();
      if (window.soundEffects) window.soundEffects.playClick();
    });
  });

  // Speed Control Buttons (Slow [Default], Normal, Fast)
  speedPillBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const speed = btn.getAttribute('data-speed');
      window.gameEngine.setGameSpeed(speed);
      syncSpeedButtons(speed);
      if (window.soundEffects) window.soundEffects.playClick();
    });
  });

  function syncSpeedButtons(speed) {
    speedPillBtns.forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-speed') === speed);
    });
    if (hudSpeedBadge) {
      hudSpeedBadge.innerText = speed.toUpperCase();
    }
  }

  // Hand Sensitivity Buttons (Low, Medium, High)
  sensPillBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const sens = btn.getAttribute('data-sens');
      window.handTracker.setSensitivity(sens);
      syncSensButtons(sens);
      if (window.soundEffects) window.soundEffects.playClick();
    });
  });

  function syncSensButtons(sens) {
    sensPillBtns.forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-sens') === sens);
    });
    if (hudSensBadge) {
      hudSensBadge.innerText = sens.toUpperCase().slice(0, 3);
    }
  }

  // Blade Theme Buttons
  bladeThemeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      bladeThemeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const theme = btn.getAttribute('data-theme');
      window.fruitRenderer.setBladeTheme(theme);
      if (window.soundEffects) window.soundEffects.playClick();
    });
  });

  // Start & Navigation Buttons
  btnStartGame.addEventListener('click', () => {
    hideAllOverlays();
    window.gameEngine.startLevel(window.gameEngine.currentLevel || 1);
  });

  btnOpenLevelSelect.addEventListener('click', () => {
    renderLevelCards();
    levelSelectOverlay.classList.remove('hidden');
    if (window.soundEffects) window.soundEffects.playClick();
  });

  btnCloseLevelSelect.addEventListener('click', () => {
    levelSelectOverlay.classList.add('hidden');
    if (window.soundEffects) window.soundEffects.playClick();
  });

  btnNextLevel.addEventListener('click', () => {
    hideAllOverlays();
    window.gameEngine.nextLevel();
  });

  btnReplayLevel.addEventListener('click', () => {
    hideAllOverlays();
    window.gameEngine.restartLevel();
  });

  btnLevelSelectFromComplete.addEventListener('click', () => {
    levelCompletedOverlay.classList.add('hidden');
    renderLevelCards();
    levelSelectOverlay.classList.remove('hidden');
  });

  btnRestartGame.addEventListener('click', () => {
    hideAllOverlays();
    window.gameEngine.restartLevel();
  });

  btnGameOverLevelSelect.addEventListener('click', () => {
    gameOverOverlay.classList.add('hidden');
    renderLevelCards();
    levelSelectOverlay.classList.remove('hidden');
  });

  btnResumeGame.addEventListener('click', () => {
    window.gameEngine.pauseGame();
  });

  btnPauseRestart.addEventListener('click', () => {
    hideAllOverlays();
    window.gameEngine.restartLevel();
  });

  btnQuitToMenu.addEventListener('click', () => {
    hideAllOverlays();
    window.gameEngine.state = 'MENU';
    if (window.gameEngine.onStateChange) window.gameEngine.onStateChange('MENU');
  });

  // Victory Overlay Buttons
  btnVictoryPlayAgain.addEventListener('click', () => {
    hideAllOverlays();
    window.gameEngine.startLevel(1);
  });

  btnVictoryLevelSelect.addEventListener('click', () => {
    victoryOverlay.classList.add('hidden');
    renderLevelCards();
    levelSelectOverlay.classList.remove('hidden');
  });

  btnVictoryMenu.addEventListener('click', () => {
    hideAllOverlays();
    window.gameEngine.state = 'MENU';
    if (window.gameEngine.onStateChange) window.gameEngine.onStateChange('MENU');
  });

  // Keyboard shortcut: Escape or 'P' to pause
  window.addEventListener('keydown', (e) => {
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
      window.gameEngine.pauseGame();
    }
  });

  // CVIP Studio Modal
  let studioInterval = null;
  btnOpenStudio.addEventListener('click', () => {
    studioModal.classList.remove('hidden');
    if (window.renderMathInElement) window.renderMathInElement(studioModal);

    // Run real-time CVIP pipeline inspector
    studioInterval = setInterval(() => {
      if (webcamVideo && webcamVideo.readyState >= 2 && window.cvipPipeline) {
        const result = window.cvipPipeline.processFrame(webcamVideo, 320, 240);
        if (result && cvipCanvas) {
          window.cvipPipeline.renderInspectionStudio(cvipCanvas, result);
        }
      }
    }, 60);
  });

  btnCloseStudio.addEventListener('click', () => {
    studioModal.classList.add('hidden');
    if (studioInterval) {
      clearInterval(studioInterval);
      studioInterval = null;
    }
  });

  // Main Render & Update Animation Loop
  function gameLoop(timestamp) {
    window.gameEngine.update(timestamp);
    window.gameEngine.render();

    // Update Telemetry
    if (fpsCounter) {
      fpsCounter.innerText = `${window.handTracker.fps || 60} FPS`;
    }
    if (hudTimer && (window.gameEngine.mode === 'arcade' || window.gameEngine.mode === 'zen')) {
      hudTimer.innerText = `${Math.ceil(window.gameEngine.timerSeconds)}s`;
    }

    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);
  updateHUDMode();
  if (window.lucide) window.lucide.createIcons();
});
