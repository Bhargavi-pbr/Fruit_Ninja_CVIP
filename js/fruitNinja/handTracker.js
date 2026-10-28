/**
 * HandTracker.js - Real-Time Hand Gesture Vision Engine for Fruit Ninja CVIP
 * Integrates Google MediaPipe Hands with low-pass EMA jitter filtering, dual-blade support,
 * gesture recognition (Blade Point, Fist Shield, Open Palm, Thumbs-Up Restart), and mouse fallback.
 */

class HandTracker {
  constructor() {
    this.videoElement = null;
    this.mediaPipeHands = null;
    this.cameraInstance = null;

    // Tracking state
    this.mode = 'camera'; // 'camera' or 'mouse'
    this.isCameraRunning = false;
    this.isMediaPipeLoaded = false;
    this.lastFrameTime = performance.now();
    this.fps = 0;
    this.latencyMs = 0;

    // Smoothing parameters (Exponential Moving Average)
    this.smoothingAlpha = 0.75; // Higher = more responsive, lower = smoother

    // Blade trails (Hand 1 and Hand 2)
    this.maxTrailLength = 10;
    this.minSliceVelocity = 280; // px/sec required to register a slice cut
    this.bladeTrails = {
      primary: [],
      secondary: []
    };

    // Current smoothed blade positions
    this.bladePosition = { x: 0, y: 0, vx: 0, vy: 0, speed: 0, isSlicing: false };
    this.secondaryBladePosition = { x: 0, y: 0, vx: 0, vy: 0, speed: 0, isSlicing: false };

    // Detected gesture states
    this.activeGesture = 'None'; // 'Blade Slash', 'Fist Shield', 'Open Palm', 'Thumbs Up'
    this.handsCount = 0;
    this.rawLandmarks = [];

    // Canvas dimensions for coordinate projection
    this.canvasWidth = 1280;
    this.canvasHeight = 720;

    // Mouse simulation state
    this.mouseState = {
      x: 0,
      y: 0,
      isDown: false,
      lastX: 0,
      lastY: 0,
      lastTime: performance.now()
    };

    // Event callbacks
    this.onGestureDetected = null;
    this.onStatusChange = null;
  }

  setCanvasDimensions(width, height) {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  /**
   * Initialize MediaPipe Hands and Camera
   */
  async initCamera(videoElement) {
    this.videoElement = videoElement;

    // Check if MediaPipe Hands is loaded globally via CDN
    if (typeof window.Hands === 'undefined') {
      console.warn('[HandTracker] MediaPipe Hands not found in window. Loading fallback or waiting...');
      this.notifyStatus('MediaPipe library loading...');
      return false;
    }

    try {
      this.mediaPipeHands = new window.Hands({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
      });

      this.mediaPipeHands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1, // 0 = Lite, 1 = Full
        minDetectionConfidence: 0.65,
        minTrackingConfidence: 0.65
      });

      this.mediaPipeHands.onResults((results) => this.processMediaPipeResults(results));

      // Setup Camera Utility
      if (typeof window.Camera !== 'undefined') {
        this.cameraInstance = new window.Camera(this.videoElement, {
          onFrame: async () => {
            if (this.isCameraRunning && this.videoElement) {
              const start = performance.now();
              await this.mediaPipeHands.send({ image: this.videoElement });
              this.latencyMs = Math.round(performance.now() - start);
            }
          },
          width: 640,
          height: 480
        });

        await this.cameraInstance.start();
        this.isCameraRunning = true;
        this.isMediaPipeLoaded = true;
        this.notifyStatus('Hand tracking camera connected & active');
        return true;
      } else {
        // Fallback to standard getUserMedia loop
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' }
        });
        this.videoElement.srcObject = stream;
        await this.videoElement.play();
        this.isCameraRunning = true;
        this.isMediaPipeLoaded = true;
        this.startManualCameraLoop();
        this.notifyStatus('Webcam stream started');
        return true;
      }
    } catch (err) {
      console.error('[HandTracker] Camera initialization failed:', err);
      this.isCameraRunning = false;
      this.notifyStatus('Camera access denied or unavailable. Switched to Mouse mode.');
      this.mode = 'mouse';
      return false;
    }
  }

  startManualCameraLoop() {
    const loop = async () => {
      if (!this.isCameraRunning) return;
      if (this.videoElement && this.videoElement.readyState >= 2) {
        const start = performance.now();
        await this.mediaPipeHands.send({ image: this.videoElement });
        this.latencyMs = Math.round(performance.now() - start);
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  stopCamera() {
    this.isCameraRunning = false;
    if (this.cameraInstance && this.cameraInstance.stop) {
      this.cameraInstance.stop();
    }
    if (this.videoElement && this.videoElement.srcObject) {
      const tracks = this.videoElement.srcObject.getTracks();
      tracks.forEach(t => t.stop());
      this.videoElement.srcObject = null;
    }
  }

  /**
   * Process results emitted by MediaPipe Hands
   */
  processMediaPipeResults(results) {
    const now = performance.now();
    const dt = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;
    if (dt > 0) {
      this.fps = Math.round(1 / dt);
    }

    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      this.handsCount = 0;
      this.rawLandmarks = [];
      this.activeGesture = 'None';
      this.bladePosition.isSlicing = false;
      this.secondaryBladePosition.isSlicing = false;
      // Decay blade trails
      if (this.bladeTrails.primary.length > 0) this.bladeTrails.primary.shift();
      if (this.bladeTrails.secondary.length > 0) this.bladeTrails.secondary.shift();
      return;
    }

    this.handsCount = results.multiHandLandmarks.length;
    this.rawLandmarks = results.multiHandLandmarks;

    // --- Process Primary Hand (Hand 0) ---
    const hand0 = results.multiHandLandmarks[0];
    this.processSingleHand(hand0, 'primary', dt);

    // --- Process Secondary Hand (Hand 1) if present ---
    if (results.multiHandLandmarks.length > 1) {
      const hand1 = results.multiHandLandmarks[1];
      this.processSingleHand(hand1, 'secondary', dt);
    } else {
      this.secondaryBladePosition.isSlicing = false;
      if (this.bladeTrails.secondary.length > 0) this.bladeTrails.secondary.shift();
    }

    // Classify gesture for primary hand
    this.activeGesture = this.classifyGesture(hand0);
    if (this.onGestureDetected) {
      this.onGestureDetected(this.activeGesture, this.bladePosition);
    }
  }

  /**
   * Process single hand landmarks into screen coordinate blade trajectory
   */
  processSingleHand(landmarks, handKey, dt) {
    // Landmark 8 is Index Finger Tip
    const indexTip = landmarks[8];

    // Mirror X coordinate horizontally for intuitive mirror feedback (1 - x)
    const targetX = (1 - indexTip.x) * this.canvasWidth;
    const targetY = indexTip.y * this.canvasHeight;

    const blade = handKey === 'primary' ? this.bladePosition : this.secondaryBladePosition;
    const trail = this.bladeTrails[handKey];

    // Initialize position on first detection
    if (trail.length === 0) {
      blade.x = targetX;
      blade.y = targetY;
    } else {
      // Exponential Moving Average (EMA) smoothing: prevents jitter while retaining instantaneous response
      blade.x = this.smoothingAlpha * targetX + (1 - this.smoothingAlpha) * blade.x;
      blade.y = this.smoothingAlpha * targetY + (1 - this.smoothingAlpha) * blade.y;
    }

    // Velocity computation
    if (dt > 0.001) {
      const lastPoint = trail[trail.length - 1] || { x: blade.x, y: blade.y };
      const dx = blade.x - lastPoint.x;
      const dy = blade.y - lastPoint.y;
      blade.vx = dx / dt;
      blade.vy = dy / dt;
      blade.speed = Math.sqrt(blade.vx * blade.vx + blade.vy * blade.vy);
    }

    // Slicing condition: Speed exceeds velocity threshold
    blade.isSlicing = blade.speed >= this.minSliceVelocity;

    // Append to trail history
    trail.push({ x: blade.x, y: blade.y, time: performance.now() });
    if (trail.length > this.maxTrailLength) {
      trail.shift();
    }
  }

  /**
   * CVIP Gesture Classification Engine
   * Classifies hand state into: 'Blade Slash', 'Fist Shield', 'Open Palm', 'Thumbs Up'
   */
  classifyGesture(lm) {
    if (!lm || lm.length < 21) return 'None';

    const wrist = lm[0];
    const thumbTip = lm[4];
    const indexTip = lm[8];
    const indexPip = lm[6];
    const middleTip = lm[12];
    const middlePip = lm[10];
    const ringTip = lm[16];
    const ringPip = lm[14];
    const pinkyTip = lm[20];
    const pinkyPip = lm[18];

    // Helper: 2D Euclidean distance
    const dist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);

    const isIndexExtended = dist(indexTip, wrist) > dist(indexPip, wrist) * 1.15;
    const isMiddleExtended = dist(middleTip, wrist) > dist(middlePip, wrist) * 1.15;
    const isRingExtended = dist(ringTip, wrist) > dist(ringPip, wrist) * 1.15;
    const isPinkyExtended = dist(pinkyTip, wrist) > dist(pinkyPip, wrist) * 1.15;

    // 1. Fist Shield Gesture: All 4 non-thumb fingertips are curled into palm
    if (!isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended) {
      // Check if thumb is also curled or up
      const isThumbCurled = dist(thumbTip, wrist) < dist(lm[2], wrist) * 1.4;
      if (isThumbCurled) {
        return 'Fist Shield';
      } else if (thumbTip.y < lm[3].y && thumbTip.y < lm[2].y) {
        // 2. Thumbs Up: Thumb pointing upward while 4 fingers curled
        return 'Thumbs Up';
      }
    }

    // 3. Open Palm / Dojo Focus: All fingers extended wide
    if (isIndexExtended && isMiddleExtended && isRingExtended && isPinkyExtended) {
      return 'Open Palm';
    }

    // 4. Blade Slash: Index finger extended (katana cutting point)
    if (isIndexExtended) {
      return 'Blade Slash';
    }

    return 'Tracking';
  }

  /**
   * Setup Mouse / Touchpad Simulator Fallback
   */
  setupMouseControls(canvasElement) {
    const handleMove = (e) => {
      if (this.mode !== 'mouse' && this.isCameraRunning) return;

      const rect = canvasElement.getBoundingClientRect();
      const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
      const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);

      const targetX = ((clientX - rect.left) / rect.width) * this.canvasWidth;
      const targetY = ((clientY - rect.top) / rect.height) * this.canvasHeight;

      const now = performance.now();
      const dt = (now - this.mouseState.lastTime) / 1000;
      this.mouseState.lastTime = now;

      // Update position
      this.bladePosition.x = targetX;
      this.bladePosition.y = targetY;

      if (dt > 0.001) {
        const dx = targetX - this.mouseState.lastX;
        const dy = targetY - this.mouseState.lastY;
        this.bladePosition.vx = dx / dt;
        this.bladePosition.vy = dy / dt;
        this.bladePosition.speed = Math.hypot(this.bladePosition.vx, this.bladePosition.vy);
      }

      this.mouseState.lastX = targetX;
      this.mouseState.lastY = targetY;

      // When dragging or moving swiftly, blade is slicing
      this.bladePosition.isSlicing = this.bladePosition.speed >= (this.minSliceVelocity * 0.7);

      this.bladeTrails.primary.push({ x: targetX, y: targetY, time: now });
      if (this.bladeTrails.primary.length > this.maxTrailLength) {
        this.bladeTrails.primary.shift();
      }

      this.activeGesture = 'Blade Slash';
      this.handsCount = 1;
    };

    canvasElement.addEventListener('mousemove', handleMove);
    canvasElement.addEventListener('touchmove', handleMove, { passive: true });

    canvasElement.addEventListener('mousedown', () => {
      this.mouseState.isDown = true;
    });
    canvasElement.addEventListener('mouseup', () => {
      this.mouseState.isDown = false;
    });

    // Cleanup trail on mouse leave
    canvasElement.addEventListener('mouseleave', () => {
      this.bladeTrails.primary = [];
      this.bladePosition.isSlicing = false;
    });
  }

  setMode(mode) {
    this.mode = mode;
    this.bladeTrails.primary = [];
    this.bladeTrails.secondary = [];
    this.notifyStatus(mode === 'camera' ? 'Camera tracking enabled' : 'Mouse simulator enabled');
  }

  notifyStatus(msg) {
    if (this.onStatusChange) {
      this.onStatusChange(msg);
    }
  }
}

// Export singleton instance
window.handTracker = new HandTracker();
