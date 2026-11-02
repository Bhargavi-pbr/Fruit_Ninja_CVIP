# Fruit Ninja CVIP: Real-Time Hand Gesture Vision Game
### Computer Vision and Image Processing (CVIP) Final Project

An interactive, real-time Computer Vision system and physics-driven game that transforms monocular webcam hand gestures into a responsive martial-arts fruit slicing experience. Engineered with Google MediaPipe Hands (21 3D landmarks), adaptive Exponential Moving Average (EMA) jitter suppression, classical digital image processing pipelines (RGB-to-HSV skin segmentation, morphological opening/closing, spatial moments, and convex hull extremum finding), vector collision geometry, a 5-level adventure progression system, adjustable speed controls, and procedural Web Audio synthesis.

---

## 📌 Project Overview

Traditional human-computer game interaction relies on physical peripherals (mice, keyboards, or touchscreens). This CVIP project demonstrates how standard monocular webcams can achieve sub-centimeter, low-latency, touchless interaction using modern computer vision and digital signal processing techniques.

The project is structured into two interoperable suites:
1. **Interactive Full-Stack Web Application**: A client-side web application running at 60 FPS in any modern web browser with WebAssembly/WebGL acceleration, procedural audio synthesis, 8 fruit types, animated bomb sparks, glowing katana trails, live CVIP pipeline breakdown studio, and touchless gesture control.
2. **Academic Python Suite**: Standalone OpenCV + MediaPipe scripts (`fruit_ninja_cvip.py`) and Google Colab Jupyter Notebooks with identical mathematical collision geometry.

---

## 🏆 Level-Wise Adventure Progression System

The game features an adventure campaign with 5 calibrated difficulty levels:

| Level | Rank & Difficulty | Target Score | Physics & Spawning Profile | Bombs |
| :--- | :--- | :--- | :--- | :--- |
| **Level 1** | **Beginner** | **15 pts** | Slower gravity ($g=360$), floaty fruit arcs ($2.8\text{s}$ spawn intervals, 1 fruit per wave) | None (0%) |
| **Level 2** | **Easy** | **25 pts** | Gentle velocity ($g=410$), $2.4\text{s}$ spawn interval, single & pair fruits | Occasional (10%) |
| **Level 3** | **Intermediate** | **40 pts** | Moderate velocity ($g=460$), $2.0\text{s}$ spawn interval, fruit combos | Moderate (15%) |
| **Level 4** | **Advanced** | **60 pts** | Dynamic pacing ($g=520$), $1.7\text{s}$ spawn interval, rapid slicing patterns | Frequent (22%) |
| **Level 5** | **Expert (Master)** | **80 pts** | Highest difficulty ($g=580$), $1.4\text{s}$ spawn interval, triple fruit waves | Maximum (28%) |

### Level Progression & Persistence Features
- **Strict Target Unlocking**: Starts at Level 1; Level $N+1$ unlocks strictly when the current target score is satisfied.
- **Progress Tracking HUD**: In-game HUD renders a live animated progress bar, current level badge, and real-time score target ratio (`Score / Target`).
- **Level Completion Celebrations**: Displays a custom Level Completed victory overlay with star ratings, current/best scores, and a **Next Level** progression button.
- **Grand Dojo Master Victory**: Conquering Level 5 unlocks a triumphant Final Victory screen with procedural fanfare sound effects.
- **Local Storage Persistence**: Unlocked levels and high scores are automatically preserved across browser sessions via `localStorage`.
- **Level Selection Matrix**: Players can freely revisit and replay any previously unlocked level from the Level Selection screen.

---

## ⚡ Game Speed & Sensitivity Controls

### Adjustable Game Speeds
- **Slow (Default - 0.75x)**: Reduced gravity and floaty trajectories engineered specifically for comfortable, natural hand gesture control without strain or fatigue.
- **Normal (1.0x)**: Standard arcade tempo for balanced gesture tracking.
- **Fast (1.25x)**: High-speed reflexes for advanced gesture masters.

### Gesture Sensitivity Tuning
- **Low**: Higher motion threshold for casual, deliberate slashing.
- **Medium (Default)**: Balanced threshold ($v \ge 130\text{ px/s}$ on Slow) for instant slicing response.
- **High**: Ultra-responsive slicing requiring minimal hand displacement.

---

## 🎯 Verified Capabilities & Gesture Modes

| Gesture | Landmark Trigger | Action / Game Mechanic |
| :--- | :--- | :--- |
| **Blade Slash (Karate Chop)** | Index Finger Tip (Landmark 8) extended ($d_{8,0} > 1.15 \cdot d_{6,0}$) | Emits glowing katana blade trail; cuts intersecting fruits when velocity satisfies adaptive threshold. |
| **Fist Shield (Bomb Defusal)** | All fingertips (4, 8, 12, 16, 20) curled into palm ($d_{i,0} < 0.8 \cdot d_{i-2,0}$) | Activates protective energy field that safely defuses bombs without detonation. |
| **Open Palm (Dojo Focus)** | All 5 fingers extended spread wide | Activates slow-motion time dilation (physics slows to 35% speed). |
| **Thumbs Up (Touchless Navigation)** | Thumb pointing upward ($y_4 < y_3 < y_2$) while 4 fingers curled | Starts game, confirms next level, and restarts after game over touchlessly. |
| **Dual-Wield Katana** | Secondary hand detected (Landmark 8 of Hand 2) | Spawns a secondary crimson katana blade for simultaneous two-handed slicing! |

---

## 🚀 Key Features & Methodologies

| Feature | Description | CVIP Method / Formula |
| :--- | :--- | :--- |
| **Hand Landmark Localization** | Monocular palm detection + 21 3D joint regression running at 60 FPS. | Google MediaPipe BlazePalm + Landmark Model |
| **Adaptive Jitter Filter** | Dual-state Exponential Moving Average (EMA) low-pass smoothing. | $\alpha(d) = \operatorname{clamp}\left(\alpha_{\text{base}} + \frac{d}{d_{\text{scale}}} (\alpha_{\text{fast}} - \alpha_{\text{base}}), \alpha_{\text{base}}, \alpha_{\text{fast}}\right)$ |
| **Line-to-Circle Collision** | Exact orthogonal projection of fruit center onto blade segment clamped to $[0, 1]$. | $t = \operatorname{clamp}\left(\frac{(C - P_1) \cdot (P_2 - P_1)}{\|P_2 - P_1\|^2}, 0, 1\right), \; \|C - P(t)\| \le R + 4$ |
| **Cut Plane Half Separation** | Slices fruit into 2 tumbling halves propelled outwards along normal angle. | $\theta_{\text{cut}} = \operatorname{atan2}(\Delta y, \Delta x), \quad \vec{v}_{\text{half}} = \vec{v} \pm \vec{v}_{\text{sep}} \begin{pmatrix} -\sin\theta \\ \cos\theta \end{pmatrix}$ |
| **Classical CVIP Pipeline** | RGB-to-HSV skin color segmentation, morphological opening & closing, centroid moments. | $A \circ B = (A \ominus B) \oplus B, \quad (\bar{x}, \bar{y}) = \left(\frac{m_{10}}{m_{00}}, \frac{m_{01}}{m_{00}}\right)$ |
| **Procedural Audio Synthesizer**| Zero external asset dependencies: sword swooshes, juicy pops, bomb explosions, level-complete arpeggios, and brass victory fanfare. | Web Audio API oscillators, Biquad bandpass filters, frequency modulation, white noise sweeps |
| **Multiple Game Modes** | Level Adventure (5 Progressive Levels), Classic (3 Lives, Bombs), Arcade (60s Blitz), Zen (90s Relaxed). | Dynamic game engine state machine |

---

## 🧮 Mathematical Formulations

### 1. Line Segment to Circle Collision Geometry
Given blade swipe line segment $P_1(x_1, y_1)$ to $P_2(x_2, y_2)$ and fruit circle with center $C(x_c, y_c)$ and radius $R$:
$$\vec{d} = P_2 - P_1, \quad \vec{f} = C - P_1$$
$$t = \frac{\vec{f} \cdot \vec{d}}{\|\vec{d}\|^2} = \frac{(x_c - x_1)(x_2 - x_1) + (y_c - y_1)(y_2 - y_1)}{(x_2 - x_1)^2 + (y_2 - y_1)^2}$$
$$t_{\text{clamped}} = \max(0, \min(1, t))$$
$$P_{\text{closest}} = P_1 + t_{\text{clamped}} \vec{d}$$
$$\text{Collision registered if: } \|C - P_{\text{closest}}\|^2 \le (R + r_{\text{grace}})^2 \quad (r_{\text{grace}} = 4\text{px})$$

### 2. Adaptive Exponential Moving Average (EMA) Kinematic Smoothing
Webcam sensor noise and optical micro-vibrations create high-frequency jitter when holding the hand steady, while fast swipes require minimal lag. We employ an **adaptive EMA coefficient** based on Euclidean frame-to-frame displacement $d = \|\vec{P}_{\text{raw}}^{(t)} - \vec{P}_{\text{raw}}^{(t-1)}\|$:
$$\alpha(d) = \operatorname{clamp}\left(\alpha_{\text{base}} + \frac{d}{d_{\text{scale}}} (\alpha_{\text{fast}} - \alpha_{\text{base}}), \alpha_{\text{base}}, \alpha_{\text{fast}}\right)$$
$$\vec{P}_{\text{smooth}}^{(t)} = \alpha(d) \vec{P}_{\text{raw}}^{(t)} + (1 - \alpha(d)) \vec{P}_{\text{smooth}}^{(t-1)}$$
- **Hovering / Steady Targeting ($d \to 0$):** $\alpha \approx 0.36$, eliminating hand tremble.
- **Fast Slashing Motion ($d > 50\text{px}$):** $\alpha \to 0.85$, providing zero lag and instant hit detection.

### 3. Velocity Thresholding
Blade velocity is evaluated dynamically over smoothed positions:
$$v = \frac{\sqrt{(x^{(t)} - x^{(t-1)})^2 + (y^{(t)} - y^{(t-1)})^2}}{\Delta t}$$
The minimum required slicing velocity is dynamically adapted based on the selected game speed:
- Slow Speed: $v_{\text{min}} = 130\text{ px/s}$
- Normal Speed: $v_{\text{min}} = 165\text{ px/s}$
- Fast Speed: $v_{\text{min}} = 210\text{ px/s}$

### 4. Classical Skin Color Segmentation (HSV)
RGB space is converted to Hue-Saturation-Value:
$$V = \max(R, G, B), \quad S = \frac{V - \min(R, G, B)}{V}$$
$$H = 60^\circ \times \begin{cases} \frac{G - B}{V - \min(R,G,B)} \pmod 6 & \text{if } V = R \\ \frac{B - R}{V - \min(R,G,B)} + 2 & \text{if } V = G \\ \frac{R - G}{V - \min(R,G,B)} + 4 & \text{if } V = B \end{cases}$$
Skin pixels satisfy: $H \in [0^\circ, 28^\circ] \cup [335^\circ, 360^\circ], \; S \in [35, 180], \; V \in [50, 255]$.

---

## 📂 Project Structure

```
Fruit_Ninja_CVIP/
├── index.html                     # Main interactive Fruit Ninja Hand Gesture Web App
├── css/
│   └── fruitNinja.css             # Dark Dojo styling, neon blade trails, level HUD & modal overlays
├── js/
│   └── fruitNinja/                # Core Fruit Ninja Game & Vision Modules
│       ├── fruitNinjaApp.js       # Master UI controller, level modal routing & gesture loops
│       ├── gameEngine.js          # 5-Level physics, speed scaling, wave spawner, collision & combos
│       ├── fruitRenderer.js       # Procedural fruits, halves, splatters, sparks, trails
│       ├── handTracker.js         # MediaPipe Hands integration, adaptive EMA filter & gestures
│       ├── cvipPipeline.js        # Classical HSV segmentation, morphology & convex hull
│       └── soundEffects.js        # Web Audio API procedural sound synthesizer & level melodies
├── cvip_python_scripts/           # Academic Python Suite
│   ├── fruit_ninja_cvip.py        # Standalone OpenCV + MediaPipe live game script
│   ├── Fruit_Ninja_Gesture_Colab.ipynb # Google Colab Jupyter Notebook
│   └── requirements.txt           # Python dependencies (opencv-python, mediapipe, numpy)
├── server.js                      # Local zero-dependency HTTP server
├── start_game.bat                 # 1-Click Windows Launcher (Fruit Ninja)
├── start_game.ps1                 # 1-Click PowerShell Launcher (Fruit Ninja)
└── README.md                      # Academic Project Documentation
```

---

## 🎮 How to Play

1. **Launch the Game:**
   - Double-click `start_game.bat` (or run `npm start` / `node server.js`).
   - Open your browser at `http://localhost:3000`.
2. **Allow Camera Access:**
   - When prompted, grant webcam permission so MediaPipe Hands can track your hand.
   - *(Note: If no camera is available, the game seamlessly switches to Mouse/Touch mode!)*
3. **Control Gestures:**
   - **☝️ Point Index Finger:** Slash across the screen to slice fruits.
   - **✊ Clench Fist:** Defuse bombs safely without losing a life!
   - **🖐️ Open Palm:** Trigger slow-motion freeze time.
   - **👍 Thumbs Up:** Touchless Game Start / Next Level / Retry navigation!
4. **Select Settings & Levels:**
   - Choose your preferred Game Speed (**Slow** is recommended for easiest hand control).
   - Adjust Hand Tracking Sensitivity (**Medium** default).
   - Progress through Levels 1 to 5 to achieve the ultimate Dojo Master Victory!

---

## 🧪 Running the Python Script Locally

```bash
cd cvip_python_scripts
pip install -r requirements.txt
python fruit_ninja_cvip.py
```
