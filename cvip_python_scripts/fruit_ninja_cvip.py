"""
Fruit Ninja CVIP - Real-Time Hand Gesture Vision Game
Academic Computer Vision and Image Processing (CVIP) Project Suite

Key Vision & Image Processing Features:
1. Real-Time Hand Tracking: Google MediaPipe Hands (21 3D Landmarks)
2. Fingertip Kinematics: Landmark 8 (Index Finger Tip) with Exponential Moving Average (EMA) smoothing
3. Velocity-Sensitive Slicing: Only swift hand swipes (v > threshold) register as cutting actions
4. Geometric Collision Detection: 2D Line Segment to Circle Intersection
5. Particle Physics: Gravitational projectile motion, rotational angular velocity, and sliced fruit halves
"""

import cv2
import mediapipe as mp
import numpy as np
import math
import random
import time

# --- Configuration & Hyperparameters ---
FRAME_WIDTH = 1280
FRAME_HEIGHT = 720
GRAVITY = 750  # px/s^2
MIN_SLICE_VELOCITY = 260  # px/s required for a valid cut
SMOOTHING_ALPHA = 0.75  # EMA smoothing factor
MAX_TRAIL_LEN = 12

# Color Palette (BGR for OpenCV)
COLOR_BG = (18, 12, 10)
COLOR_BLADE = (254, 242, 0)      # Cyan blade in BGR: (B=254, G=242, R=0)
COLOR_BLADE_CORE = (255, 255, 255)
COLOR_TEXT = (255, 255, 255)

FRUIT_DEFS = {
    'watermelon': {'radius': 42, 'color': (32, 125, 46), 'inner_color': (75, 40, 235), 'points': 1},
    'orange':     {'radius': 35, 'color': (0, 152, 255), 'inner_color': (0, 200, 255), 'points': 1},
    'apple':      {'radius': 36, 'color': (40, 40, 215), 'inner_color': (200, 240, 255), 'points': 1},
    'banana':     {'radius': 34, 'color': (50, 220, 255), 'inner_color': (180, 240, 255), 'points': 1},
    'strawberry': {'radius': 30, 'color': (30, 30, 220), 'inner_color': (60, 60, 255), 'points': 2},
}

class Fruit:
    def __init__(self, f_type, x, y, vx, vy):
        self.type = f_type
        self.data = FRUIT_DEFS[f_type]
        self.x = x
        self.y = y
        self.vx = vx
        self.vy = vy
        self.radius = self.data['radius']
        self.color = self.data['color']
        self.inner_color = self.data['inner_color']
        self.points = self.data['points']
        self.sliced = False
        self.rotation = random.uniform(0, 360)
        self.v_rot = random.uniform(-180, 180)

    def update(self, dt):
        self.x += self.vx * dt
        self.y += self.vy * dt
        self.vy += GRAVITY * dt
        self.rotation += self.v_rot * dt

class SlicedHalf:
    def __init__(self, f_type, x, y, vx, vy, rotation, v_rot, side):
        self.type = f_type
        self.data = FRUIT_DEFS[f_type]
        self.x = x
        self.y = y
        self.vx = vx
        self.vy = vy
        self.radius = self.data['radius']
        self.color = self.data['color']
        self.inner_color = self.data['inner_color']
        self.rotation = rotation
        self.v_rot = v_rot
        self.side = side

    def update(self, dt):
        self.x += self.vx * dt
        self.y += self.vy * dt
        self.vy += GRAVITY * 1.1 * dt
        self.rotation += self.v_rot * dt

class FruitNinjaCVIP:
    def __init__(self):
        # MediaPipe Hands
        self.mp_hands = mp.solutions.hands
        self.hands = self.mp_hands.Hands(
            max_num_hands=1,
            min_detection_confidence=0.65,
            min_tracking_confidence=0.65
        )

        # Game State
        self.score = 0
        self.lives = 3
        self.game_over = False
        self.combo_count = 0
        self.last_slice_time = 0

        # Entities
        self.fruits = []
        self.halves = []
        self.splatters = []
        self.trail = []

        # Smoothed blade tip
        self.smooth_x = FRAME_WIDTH // 2
        self.smooth_y = FRAME_HEIGHT // 2
        self.speed = 0

        # Spawning Timers
        self.last_spawn_time = time.time()
        self.spawn_interval = 1.8

    def spawn_fruit(self):
        f_type = random.choice(list(FRUIT_DEFS.keys()))
        spawn_x = random.randint(int(FRAME_WIDTH * 0.15), int(FRAME_WIDTH * 0.85))
        spawn_y = FRAME_HEIGHT + 30

        target_x = random.randint(int(FRAME_WIDTH * 0.25), int(FRAME_WIDTH * 0.75))
        apex_y = random.randint(int(FRAME_HEIGHT * 0.18), int(FRAME_HEIGHT * 0.38))

        flight_height = spawn_y - apex_y
        vy0 = -math.sqrt(2 * GRAVITY * flight_height)
        time_to_apex = -vy0 / GRAVITY
        vx0 = (target_x - spawn_x) / (time_to_apex * random.uniform(1.05, 1.35))

        self.fruits.append(Fruit(f_type, spawn_x, spawn_y, vx0, vy0))

    @staticmethod
    def check_line_circle(x1, y1, x2, y2, cx, cy, r):
        dx = x2 - x1
        dy = y2 - y1
        len_sq = dx * dx + dy * dy
        if len_sq == 0:
            return math.hypot(x1 - cx, y1 - cy) <= r

        t = max(0.0, min(1.0, ((cx - x1) * dx + (cy - y1) * dy) / len_sq))
        closest_x = x1 + t * dx
        closest_y = y1 + t * dy
        dist_sq = (cx - closest_x) ** 2 + (cy - closest_y) ** 2
        return dist_sq <= r * r

    def slice_fruit(self, fruit, p1, p2):
        fruit.sliced = True
        self.score += fruit.points

        # Slice angle
        slice_angle = math.atan2(p2[1] - p1[1], p2[0] - p1[0])
        normal_angle = slice_angle + math.pi / 2
        sep_speed = 180

        sep_vx = math.cos(normal_angle) * sep_speed
        sep_vy = math.sin(normal_angle) * sep_speed

        # Two halves
        self.halves.append(SlicedHalf(fruit.type, fruit.x - sep_vx*0.05, fruit.y - sep_vy*0.05,
                                      fruit.vx - sep_vx, fruit.vy - sep_vy, slice_angle, -4.0, 'left'))
        self.halves.append(SlicedHalf(fruit.type, fruit.x + sep_vx*0.05, fruit.y + sep_vy*0.05,
                                      fruit.vx + sep_vx, fruit.vy + sep_vy, slice_angle, 4.0, 'right'))

        # Background splatter
        self.splatters.append({'x': int(fruit.x), 'y': int(fruit.y), 'color': fruit.inner_color, 'r': fruit.radius, 'alpha': 1.0})

        # Track combo
        now = time.time()
        if now - self.last_slice_time < 0.35:
            self.combo_count += 1
            if self.combo_count >= 3:
                self.score += self.combo_count  # combo bonus points
        else:
            self.combo_count = 1
        self.last_slice_time = now

    def run(self):
        cap = cv2.VideoCapture(0)
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, FRAME_WIDTH)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, FRAME_HEIGHT)

        if not cap.isOpened():
            print("[ERROR] Cannot access webcam. Please verify camera connection.")
            return

        last_time = time.time()
        fps_counter = 60

        print("=======================================================")
        print("    FRUIT NINJA CVIP: REAL-TIME HAND GESTURE SYSTEM    ")
        print("=======================================================")
        print("Controls:")
        print(" - Point Index Finger & swipe swiftly to slice fruits!")
        print(" - Press 'R' to restart game")
        print(" - Press 'Q' or ESC to quit")
        print("=======================================================")

        while cap.isOpened():
            now = time.time()
            dt = min(now - last_time, 0.1)
            last_time = now
            if dt > 0:
                fps_counter = int(1.0 / dt)

            ret, frame = cap.read()
            if not ret:
                break

            # Mirror frame horizontally for intuitive interaction
            frame = cv2.flip(frame, 1)
            h, w, _ = frame.shape

            # Darken camera frame slightly for game contrast
            canvas = cv2.addWeighted(frame, 0.35, np.full_like(frame, COLOR_BG), 0.65, 0)

            # --- Hand Gesture Tracking ---
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = self.hands.process(rgb)

            is_slicing = False
            if results.multi_hand_landmarks:
                for hand_landmarks in results.multi_hand_landmarks:
                    # Landmark 8: Index Finger Tip
                    lm8 = hand_landmarks.landmark[8]
                    raw_x = int(lm8.x * w)
                    raw_y = int(lm8.y * h)

                    # EMA Low-pass Smoothing
                    self.smooth_x = int(SMOOTHING_ALPHA * raw_x + (1 - SMOOTHING_ALPHA) * self.smooth_x)
                    self.smooth_y = int(SMOOTHING_ALPHA * raw_y + (1 - SMOOTHING_ALPHA) * self.smooth_y)

                    # Velocity Calculation
                    if len(self.trail) > 0:
                        prev_x, prev_y = self.trail[-1]
                        dist = math.hypot(self.smooth_x - prev_x, self.smooth_y - prev_y)
                        self.speed = dist / max(dt, 0.001)
                    is_slicing = self.speed >= MIN_SLICE_VELOCITY

                    # Append to trail
                    self.trail.append((self.smooth_x, self.smooth_y))
                    if len(self.trail) > MAX_TRAIL_LEN:
                        self.trail.pop(0)

                    # Draw hand skeleton overlay
                    mp.solutions.drawing_utils.draw_landmarks(
                        canvas, hand_landmarks, self.mp_hands.HAND_CONNECTIONS,
                        mp.solutions.drawing_utils.DrawingSpec(color=(0, 242, 254), thickness=2, circle_radius=3),
                        mp.solutions.drawing_utils.DrawingSpec(color=(255, 8, 68), thickness=2)
                    )
            else:
                if len(self.trail) > 0:
                    self.trail.pop(0)
                is_slicing = False

            # --- Gameplay Update ---
            if not self.game_over:
                # Wave Spawner
                if now - self.last_spawn_time > self.spawn_interval:
                    self.spawn_fruit()
                    self.last_spawn_time = now

                # Slicing Collision Check
                if is_slicing and len(self.trail) >= 2:
                    p1 = self.trail[-2]
                    p2 = self.trail[-1]
                    for fruit in self.fruits:
                        if not fruit.sliced and self.check_line_circle(p1[0], p1[1], p2[0], p2[1], fruit.x, fruit.y, fruit.radius):
                            self.slice_fruit(fruit, p1, p2)

                # Update Fruits
                for fruit in self.fruits[:]:
                    fruit.update(dt)
                    if fruit.y > h + 50 and fruit.vy > 0:
                        self.fruits.remove(fruit)
                        if not fruit.sliced:
                            self.lives -= 1
                            if self.lives <= 0:
                                self.game_over = True
                    elif fruit.sliced:
                        self.fruits.remove(fruit)

                # Update Halves
                for half in self.halves[:]:
                    half.update(dt)
                    if half.y > h + 60:
                        self.halves.remove(half)

            # --- Render Splatters ---
            for s in self.splatters[:]:
                cv2.circle(canvas, (s['x'], s['y']), int(s['r'] * 0.9), s['color'], -1)
                s['alpha'] -= dt * 0.1
                if s['alpha'] <= 0:
                    self.splatters.remove(s)

            # --- Render Intact Fruits ---
            for fruit in self.fruits:
                # Outer fruit body
                cv2.circle(canvas, (int(fruit.x), int(fruit.y)), fruit.radius, fruit.color, -1)
                # Gloss highlight
                cv2.circle(canvas, (int(fruit.x - fruit.radius * 0.3), int(fruit.y - fruit.radius * 0.3)),
                           int(fruit.radius * 0.25), (255, 255, 255), -1)

            # --- Render Sliced Halves ---
            for half in self.halves:
                cv2.circle(canvas, (int(half.x), int(half.y)), int(half.radius * 0.8), half.color, -1)
                cv2.circle(canvas, (int(half.x), int(half.y)), int(half.radius * 0.5), half.inner_color, -1)

            # --- Render Glowing Katana Blade Trail ---
            for i in range(1, len(self.trail)):
                pt1 = self.trail[i - 1]
                pt2 = self.trail[i]
                factor = i / len(self.trail)
                thickness = max(1, int(factor * 8))
                cv2.line(canvas, pt1, pt2, COLOR_BLADE, thickness)
                cv2.line(canvas, pt1, pt2, COLOR_BLADE_CORE, max(1, thickness // 2))

            # --- Render HUD Overlays ---
            cv2.putText(canvas, f"SCORE: {self.score}", (30, 60), cv2.FONT_HERSHEY_DUPLEX, 1.2, (0, 220, 255), 2)
            cv2.putText(canvas, f"LIVES: {'* ' * self.lives}", (30, 110), cv2.FONT_HERSHEY_DUPLEX, 1.0, (68, 8, 255), 2)
            cv2.putText(canvas, f"FPS: {fps_counter}", (w - 180, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 245, 160), 2)

            if is_slicing:
                cv2.putText(canvas, "BLADE: SLICING", (30, h - 30), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (0, 255, 255), 2)

            if self.combo_count >= 3:
                cv2.putText(canvas, f"COMBO x{self.combo_count}!", (w // 2 - 120, h // 2),
                            cv2.FONT_HERSHEY_DUPLEX, 1.4, (0, 165, 255), 3)

            if self.game_over:
                cv2.putText(canvas, "GAME OVER", (w // 2 - 180, h // 2 - 40),
                            cv2.FONT_HERSHEY_DUPLEX, 2.0, (68, 8, 255), 4)
                cv2.putText(canvas, "Press 'R' to Restart", (w // 2 - 140, h // 2 + 30),
                            cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 255), 2)

            cv2.imshow("Fruit Ninja CVIP - Hand Gesture System", canvas)

            key = cv2.waitKey(1) & 0xFF
            if key == 27 or key == ord('q'):
                break
            elif key == ord('r') or key == ord('R'):
                self.score = 0
                self.lives = 3
                self.game_over = False
                self.fruits.clear()
                self.halves.clear()

        cap.release()
        cv2.destroyAllWindows()

if __name__ == "__main__":
    game = FruitNinjaCVIP()
    game.run()
