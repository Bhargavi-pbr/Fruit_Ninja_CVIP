# Fruit Ninja CVIP: Real-Time Hand Gesture Vision Game
### Computer Vision and Image Processing (CVIP) Final Project

An interactive, real-time Computer Vision system and physics-driven game that transforms monocular webcam hand gestures into a responsive martial-arts fruit slicing experience. Engineered with Google MediaPipe Hands (21 3D landmarks), classical digital image processing pipelines (RGB-to-HSV skin segmentation, morphological opening/closing, spatial moments, and convex hull extremum finding), vector collision geometry, and procedural Web Audio synthesis.

---

## 📌 Project Overview

Traditional human-computer game interaction relies on physical peripherals (mice, keyboards, or touchscreens). This CVIP project demonstrates how standard monocular webcams can achieve sub-centimeter, low-latency, touchless interaction using modern computer vision and digital signal processing techniques.

The project is structured into two interoperable suites:
1. **Interactive Full-Stack Web Application**: A client-side web application running at 60 FPS in any modern web browser with WebAssembly/WebGL acceleration, procedural audio synthesis, 8 fruit types, animated bomb sparks, glowing katana trails, live CVIP pipeline breakdown studio, and touchless gesture control.
2. **Academic Python Suite**: Standalone OpenCV + MediaPipe scripts (`fruit_ninja_cvip.py`) and Google Colab Jupyter Notebooks with identical mathematical collision geometry.

---

## 🎯 Verified Capabilities & Gesture Modes

| Gesture | Landmark Trigger | Action / Game Mechanic |
| :--- | :--- | :--- |
| **Blade Slash (Karate Chop)** | Index Finger Tip (Landmark 8) extended ($d_{8,0} > 1.15 \cdot d_{6,0}$) | Emits glowing katana blade trail; cuts intersecting fruits when velocity $v \ge 280\text{ px/s}$. |
| **Fist Shield (Bomb Defusal)** | All fingertips (4, 8, 12, 16, 20) curled into palm ($d_{i,0} < 0.8 \cdot d_{i-2,0}$) | Activates protective energy field that safely defuses bombs without detonation. |
| **Open Palm (Dojo Focus)** | All 5 fingers extended spread wide | Activates slow-motion time dilation (physics slows to 35% speed). |
| **Thumbs Up (Touchless Start)** | Thumb pointing upward ($y_4 < y_3 < y_2$) while 4 fingers curled | Starts / restarts game touchlessly without keyboard or mouse input. |
| **Dual-Wield Katana** | Secondary hand detected (Landmark 8 of Hand 2) | Spawns a secondary crimson katana blade for simultaneous two-handed slicing! |

---

## 🚀 Key Features & Methodologies

| Feature | Description | CVIP Method / Formula |
| :--- | :--- | :--- |
| **Hand Landmark Localization** | Monocular palm detection + 21 3D joint regression running at 60 FPS. | Google MediaPipe BlazePalm + Landmark Model |
| **Jitter Suppression Filter** | Exponential Moving Average (EMA) low-pass smoothing on $(x, y)$ coordinates. | $\vec{P}_{\text{smooth}}^{(t)} = \alpha \vec{P}_{\text{raw}}^{(t)} + (1 - \alpha) \vec{P}_{\text{smooth}}^{(t-1)}, \quad \alpha = 0.75$ |
| **Line-to-Circle Collision** | Exact orthogonal projection of fruit center onto blade segment clamped to $[0, 1]$. | $t = \operatorname{clamp}\left(\frac{(C - P_1) \cdot (P_2 - P_1)}{\|P_2 - P_1\|^2}, 0, 1\right), \; \|C - P(t)\| \le R$ |
| **Cut Plane Half Separation** | Slices fruit into 2 tumbling halves propelled outwards along normal angle. | $\theta_{\text{cut}} = \operatorname{atan2}(\Delta y, \Delta x), \quad \vec{v}_{\text{half}} = \vec{v} \pm \vec{v}_{\text{sep}} \begin{pmatrix} -\sin\theta \\ \cos\theta \end{pmatrix}$ |
| **Classical CVIP Pipeline** | RGB-to-HSV skin color segmentation, morphological opening & closing, centroid moments. | $A \circ B = (A \ominus B) \oplus B, \quad (\bar{x}, \bar{y}) = \left(\frac{m_{10}}{m_{00}}, \frac{m_{01}}{m_{00}}\right)$ |
| **Procedural Audio Synthesizer**| Zero external asset dependencies: sword swooshes, juicy pops, bomb explosions via Web Audio API. | Filtered white noise sweeps, Biquad bandpass filters, frequency-modulated oscillators |
| **Multiple Game Modes** | Classic (3 Lives, Bomb Game Over), Arcade (60s Blitz), Zen (90s Relaxed). | Dynamic game engine state machine |

---

## 🧮 Mathematical Formulations

### 1. Line Segment to Circle Collision Geometry
Given blade swipe line segment $P_1(x_1, y_1)$ to $P_2(x_2, y_2)$ and fruit circle with center $C(x_c, y_c)$ and radius $R$:
$$\vec{d} = P_2 - P_1, \quad \vec{f} = C - P_1$$
$$t = \frac{\vec{f} \cdot \vec{d}}{\|\vec{d}\|^2} = \frac{(x_c - x_1)(x_2 - x_1) + (y_c - y_1)(y_2 - y_1)}{(x_2 - x_1)^2 + (y_2 - y_1)^2}$$
$$t_{\text{clamped}} = \max(0, \min(1, t))$$
$$P_{\text{closest}} = P_1 + t_{\text{clamped}} \vec{d}$$
$$\text{Collision registered if: } \|C - P_{\text{closest}}\|^2 \le R^2$$

### 2. Exponential Moving Average (EMA) Kinematic Smoothing
Webcam sensor noise and rapid lighting variations create high-frequency jitter. An EMA filter is applied to the index fingertip:
$$X_{\text{smooth}}^{(t)} = \alpha X_{\text{raw}}^{(t)} + (1 - \alpha) X_{\text{smooth}}^{(t-1)}$$
$$Y_{\text{smooth}}^{(t)} = \alpha Y_{\text{raw}}^{(t)} + (1 - \alpha) Y_{\text{smooth}}^{(t-1)}$$
With $\alpha = 0.75$, the output gives 75% weight to the latest camera reading and 25% to history, eliminating trembling while preserving sub-millisecond response.

### 3. Velocity Thresholding
Blade velocity is evaluated dynamically:
$$v = \frac{\sqrt{(x^{(t)} - x^{(t-1)})^2 + (y^{(t)} - y^{(t-1)})^2}}{\Delta t}$$
Only slices with $v \ge 280\text{ px/s}$ are authorized to trigger cuts.

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
│   └── fruitNinja.css             # Dark Dojo styling, neon blade trails & glass HUD
├── js/
│   └── fruitNinja/                # Core Fruit Ninja Game & Vision Modules
│       ├── fruitNinjaApp.js       # Master UI controller, HUD & camera loop
│       ├── gameEngine.js          # Physics, wave spawner, collision & combo logic
│       ├── fruitRenderer.js       # Procedural fruits, halves, splatters, sparks, trails
│       ├── handTracker.js         # MediaPipe Hands integration, EMA filter & gestures
│       ├── cvipPipeline.js        # Classical HSV segmentation, morphology & convex hull
│       └── soundEffects.js        # Web Audio API procedural sound synthesizer
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
   - **👍 Thumbs Up:** Touchless Game Start / Restart!

---

## 🧪 Running the Python Script Locally

```bash
cd cvip_python_scripts
pip install -r requirements.txt
python fruit_ninja_cvip.py
```
