/**
 * FruitNinjaApp.js - Master Application Controller for Fruit Ninja CVIP
 * Connects GameEngine, HandTracker, FruitRenderer, SoundEffects, and CVIP Pipeline.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const gameCanvas = document.getElementById('gameCanvas');
  const webcamVideo = document.getElementById('webcamVideo');
  const pipVideo = document.getElementById('pipVideo');
  const cvipCanvas = document.getElementById('cvipCanvas');

  // HUD Elements
  const hudScore = document.getElementById('hudScore');
  const hudHighScore = document.getElementById('hudHighScore');
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

  // Buttons
  const btnStartGame = document.getElementById('btnStartGame');
  const btnRestartGame = document.getElementById('btnRestartGame');
  const btnResumeGame = document.getElementById('btnResumeGame');
  const btnQuitToMenu = document.getElementById('btnQuitToMenu');
  const btnToggleCamera = document.getElementById('btnToggleCamera');
  const btnToggleAudio = document.getElementById('btnToggleAudio');
  const btnOpenStudio = document.getElementById('btnOpenStudio');
  const btnCloseStudio = document.getElementById('btnCloseStudio');
  const modeSelectBtns = document.querySelectorAll('.mode-btn');
  const bladeThemeBtns = document.querySelectorAll('.theme-btn');

  // Stats in GameOver
  const finalScoreEl = document.getElementById('finalScore');
  const finalHighScoreEl = document.getElementById('finalHighScore');
  const statFruitsSlicedEl = document.getElementById('statFruitsSliced');
  const statMaxComboEl = document.getElementById('statMaxCombo');
  const statAccuracyEl = document.getElementById('statAccuracy');
  const statBombsDefusedEl = document.getElementById('statBombsDefused');

  // Initialize Game Engine
  window.gameEngine.init(gameCanvas);
  hudHighScore.innerText = window.gameEngine.highScore;

  // Initialize Hand Tracker Mouse Simulator
  window.handTracker.setupMouseControls(gameCanvas);

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
        window.gameEngine.startNewGame();
        menuOverlay.classList.add('hidden');
        gameOverOverlay.classList.add('hidden');
      }
    }
  };

  // Game Engine State Callback
  window.gameEngine.onStateChange = (state, reason) => {
    if (state === 'PLAYING') {
      menuOverlay.classList.add('hidden');
      gameOverOverlay.classList.add('hidden');
      pauseOverlay.classList.add('hidden');
    } else if (state === 'PAUSED') {
      pauseOverlay.classList.remove('hidden');
    } else if (state === 'GAMEOVER') {
      finalScoreEl.innerText = window.gameEngine.score;
      finalHighScoreEl.innerText = window.gameEngine.highScore;
      statFruitsSlicedEl.innerText = window.gameEngine.totalFruitsSliced;
      statMaxComboEl.innerText = `${window.gameEngine.maxComboAchieved}x`;
      statBombsDefusedEl.innerText = window.gameEngine.totalBombsDefused;

      const accuracy = window.gameEngine.totalFruitsSpawned > 0
        ? Math.round((window.gameEngine.totalFruitsSliced / window.gameEngine.totalFruitsSpawned) * 100)
        : 100;
      statAccuracyEl.innerText = `${accuracy}%`;

      gameOverOverlay.classList.remove('hidden');
    } else if (state === 'MENU') {
      menuOverlay.classList.remove('hidden');
      gameOverOverlay.classList.add('hidden');
      pauseOverlay.classList.add('hidden');
    }
    updateHUDMode();
  };

  // Score and Lives Update Callback
  window.gameEngine.onScoreUpdate = (engine) => {
    hudScore.innerText = engine.score;
    hudHighScore.innerText = engine.highScore;

    // Render Lives (Shurikens / Hearts)
    if (engine.mode === 'classic') {
      hudLivesContainer.innerHTML = '';
      for (let i = 0; i < engine.maxLives; i++) {
        const star = document.createElement('span');
        star.className = i < engine.lives ? 'life-star active' : 'life-star lost';
        star.innerHTML = '★';
        hudLivesContainer.appendChild(star);
      }
    }
  };

  function updateHUDMode() {
    if (window.gameEngine.mode === 'classic') {
      hudLivesContainer.style.display = 'flex';
      hudTimerContainer.style.display = 'none';
    } else {
      hudLivesContainer.style.display = 'none';
      hudTimerContainer.style.display = 'flex';
    }
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

  // Attempt auto-activation of camera (non-blocking)
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
      if (window.soundEffects) window.soundEffects.playClick();
    });
  });

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

  // Start & Restart Buttons
  btnStartGame.addEventListener('click', () => {
    window.gameEngine.startNewGame();
  });

  btnRestartGame.addEventListener('click', () => {
    window.gameEngine.startNewGame();
  });

  btnResumeGame.addEventListener('click', () => {
    window.gameEngine.pauseGame();
  });

  btnQuitToMenu.addEventListener('click', () => {
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
