/**
 * FruitRenderer.js - High-Performance Procedural Graphics Engine for Fruit Ninja CVIP
 * Renders dojo wooden background, 8 fruit types, sliced halves, bomb sparks, katana trails, splatters, and combos.
 */

class FruitRenderer {
  constructor() {
    this.bladeColors = {
      cyan: { core: '#ffffff', glow: '#00f2fe', trail: 'rgba(0, 242, 254, ' },
      crimson: { core: '#ffffff', glow: '#ff0844', trail: 'rgba(255, 8, 68, ' },
      emerald: { core: '#ffffff', glow: '#00f5a0', trail: 'rgba(0, 245, 160, ' },
      gold: { core: '#ffffff', glow: '#ffb300', trail: 'rgba(255, 179, 0, ' },
      purple: { core: '#ffffff', glow: '#b224ef', trail: 'rgba(178, 36, 239, ' }
    };
    this.currentBladeTheme = 'cyan';
    this.woodPatternCanvas = null;
    this.initWoodPattern();
  }

  setBladeTheme(theme) {
    if (this.bladeColors[theme]) {
      this.currentBladeTheme = theme;
    }
  }

  /**
   * Pre-render high-res wooden dojo planks for ultra-fast background drawing
   */
  initWoodPattern() {
    const pCanvas = document.createElement('canvas');
    pCanvas.width = 400;
    pCanvas.height = 400;
    const pctx = pCanvas.getContext('2d');

    // Warm deep mahogany / oak wood gradient
    const grad = pctx.createLinearGradient(0, 0, 400, 400);
    grad.addColorStop(0, '#2b170c');
    grad.addColorStop(0.5, '#3b2012');
    grad.addColorStop(1, '#241209');
    pctx.fillStyle = grad;
    pctx.fillRect(0, 0, 400, 400);

    // Horizontal wooden plank seams
    const plankHeight = 80;
    pctx.lineWidth = 2;
    for (let y = 0; y < 400; y += plankHeight) {
      // Dark seam
      pctx.strokeStyle = 'rgba(12, 6, 3, 0.9)';
      pctx.beginPath();
      pctx.moveTo(0, y);
      pctx.lineTo(400, y);
      pctx.stroke();

      // Top wood highlight
      pctx.strokeStyle = 'rgba(92, 53, 30, 0.4)';
      pctx.beginPath();
      pctx.moveTo(0, y + 2);
      pctx.lineTo(400, y + 2);
      pctx.stroke();

      // Faint wood grains
      for (let g = 0; g < 4; g++) {
        const gy = y + 15 + g * 16;
        pctx.strokeStyle = 'rgba(18, 9, 4, 0.15)';
        pctx.beginPath();
        pctx.moveTo(0, gy);
        pctx.bezierCurveTo(100, gy + Math.sin(g) * 6, 300, gy - Math.sin(g) * 6, 400, gy);
        pctx.stroke();
      }
    }

    this.woodPatternCanvas = pCanvas;
  }

  /**
   * Render Dojo Background with ambient lighting and Japanese motif
   */
  renderBackground(ctx, width, height) {
    // 1. Tiled wood background
    if (this.woodPatternCanvas) {
      const pattern = ctx.createPattern(this.woodPatternCanvas, 'repeat');
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.fillStyle = '#2a150b';
      ctx.fillRect(0, 0, width, height);
    }

    // 2. Warm ambient radial spotlight in center
    const radial = ctx.createRadialGradient(width / 2, height / 2, 80, width / 2, height / 2, Math.max(width, height) * 0.7);
    radial.addColorStop(0, 'rgba(255, 195, 120, 0.08)');
    radial.addColorStop(0.5, 'rgba(40, 20, 10, 0.4)');
    radial.addColorStop(1, 'rgba(10, 5, 2, 0.85)');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, width, height);

    // 3. Subtle Japanese Dojo Kanji / Martial Watermark in the background
    ctx.save();
    ctx.font = '900 120px "Inter", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
    ctx.fillText('刃 FRUIT NINJA CVIP 斬', width / 2, height / 2);
    ctx.restore();
  }

  /**
   * Render persistent juice splatters stamped on the wooden wall
   */
  renderSplatters(ctx, splatters) {
    for (let i = 0; i < splatters.length; i++) {
      const s = splatters[i];
      if (s.alpha <= 0.01) continue;

      ctx.save();
      ctx.globalAlpha = Math.max(0, s.alpha);

      // Central juice puddle
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fill();

      // Radiating juice spray drops
      if (s.droplets) {
        for (let j = 0; j < s.droplets.length; j++) {
          const d = s.droplets[j];
          ctx.beginPath();
          ctx.arc(s.x + d.dx, s.y + d.dy, d.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    }
  }

  /**
   * Render an intact Fruit
   */
  renderFruit(ctx, fruit) {
    ctx.save();
    ctx.translate(fruit.x, fruit.y);
    ctx.rotate(fruit.rotation);

    const r = fruit.radius;

    switch (fruit.type) {
      case 'watermelon':
        this.drawWatermelon(ctx, r);
        break;
      case 'apple':
        this.drawApple(ctx, r);
        break;
      case 'orange':
        this.drawOrange(ctx, r);
        break;
      case 'banana':
        this.drawBanana(ctx, r);
        break;
      case 'strawberry':
        this.drawStrawberry(ctx, r);
        break;
      case 'coconut':
        this.drawCoconut(ctx, r);
        break;
      case 'pineapple':
        this.drawPineapple(ctx, r);
        break;
      case 'frenzy':
        this.drawFrenzyFruit(ctx, r);
        break;
      default:
        this.drawWatermelon(ctx, r);
    }

    ctx.restore();
  }

  /**
   * Render Sliced Fruit Halves tumbling apart
   */
  renderHalf(ctx, half) {
    ctx.save();
    ctx.translate(half.x, half.y);
    ctx.rotate(half.rotation);

    const r = half.radius;
    const isLeft = half.side === 'left';

    ctx.beginPath();
    if (isLeft) {
      ctx.arc(0, 0, r, Math.PI * 0.5, Math.PI * 1.5);
    } else {
      ctx.arc(0, 0, r, -Math.PI * 0.5, Math.PI * 0.5);
    }
    ctx.closePath();
    ctx.clip();

    // Draw intact fruit within half clip
    switch (half.type) {
      case 'watermelon': this.drawWatermelon(ctx, r); break;
      case 'apple': this.drawApple(ctx, r); break;
      case 'orange': this.drawOrange(ctx, r); break;
      case 'banana': this.drawBanana(ctx, r); break;
      case 'strawberry': this.drawStrawberry(ctx, r); break;
      case 'coconut': this.drawCoconut(ctx, r); break;
      case 'pineapple': this.drawPineapple(ctx, r); break;
      case 'frenzy': this.drawFrenzyFruit(ctx, r); break;
      default: this.drawWatermelon(ctx, r);
    }

    // Draw pulp cut face edge
    ctx.lineWidth = 3;
    ctx.strokeStyle = half.type === 'watermelon' ? '#ff3b5c' :
                      half.type === 'orange' ? '#ff9800' :
                      half.type === 'apple' ? '#fff9c4' :
                      half.type === 'coconut' ? '#ffffff' : '#ffd54f';
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(0, r);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Procedural Fruit 1: Watermelon
   */
  drawWatermelon(ctx, r) {
    // Outer green striped rind
    const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
    grad.addColorStop(0, '#2e7d32');
    grad.addColorStop(0.7, '#1b5e20');
    grad.addColorStop(1, '#0d3810');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Darker green wavy rind stripes
    ctx.strokeStyle = 'rgba(10, 45, 12, 0.7)';
    ctx.lineWidth = 6;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
      ctx.beginPath();
      ctx.arc(0, 0, r - 3, a - 0.2, a + 0.2);
      ctx.stroke();
    }

    // Gloss shine
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.4, -r * 0.4, r * 0.35, r * 0.18, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Procedural Fruit 2: Apple
   */
  drawApple(ctx, r) {
    // Glossy Red Apple Body
    const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.1, 0, 0, r);
    grad.addColorStop(0, '#ff4b5c');
    grad.addColorStop(0.6, '#d31027');
    grad.addColorStop(1, '#7a0513');
    ctx.fillStyle = grad;

    ctx.beginPath();
    // Heart-like apple silhouette
    ctx.moveTo(0, -r * 0.6);
    ctx.bezierCurveTo(r * 0.8, -r * 1.0, r * 1.2, r * 0.5, 0, r * 0.95);
    ctx.bezierCurveTo(-r * 1.2, r * 0.5, -r * 0.8, -r * 1.0, 0, -r * 0.6);
    ctx.fill();

    // Little Stem
    ctx.strokeStyle = '#4e342e';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.6);
    ctx.quadraticCurveTo(r * 0.2, -r * 0.9, r * 0.3, -r * 1.1);
    ctx.stroke();

    // Green Leaf
    ctx.fillStyle = '#4caf50';
    ctx.beginPath();
    ctx.ellipse(r * 0.3, -r * 0.95, r * 0.3, r * 0.14, Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();

    // Highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.4, -r * 0.4, r * 0.3, r * 0.15, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Procedural Fruit 3: Orange
   */
  drawOrange(ctx, r) {
    // Vibrant Orange Body
    const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
    grad.addColorStop(0, '#ffb74d');
    grad.addColorStop(0.7, '#ff9800');
    grad.addColorStop(1, '#e65100');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Orange peel texture dots
    ctx.fillStyle = 'rgba(230, 81, 0, 0.4)';
    for (let i = 0; i < 16; i++) {
      const angle = (i * 137.5) * (Math.PI / 180);
      const dist = (r * 0.7) * Math.sqrt((i + 1) / 16);
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * dist, Math.sin(angle) * dist, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Gloss
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.4, -r * 0.4, r * 0.3, r * 0.15, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Procedural Fruit 4: Banana
   */
  drawBanana(ctx, r) {
    // Curved yellow crescent
    ctx.fillStyle = '#ffeb3b';
    ctx.strokeStyle = '#fbc02d';
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(-r * 0.9, -r * 0.5);
    ctx.quadraticCurveTo(0, r * 0.9, r * 0.9, -r * 0.5);
    ctx.quadraticCurveTo(0, r * 0.4, -r * 0.9, -r * 0.5);
    ctx.fill();
    ctx.stroke();

    // Banana tips (green/brown)
    ctx.fillStyle = '#7cb342';
    ctx.beginPath();
    ctx.arc(-r * 0.88, -r * 0.48, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#5d4037';
    ctx.beginPath();
    ctx.arc(r * 0.88, -r * 0.48, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Procedural Fruit 5: Strawberry
   */
  drawStrawberry(ctx, r) {
    // Ruby red heart shape
    const grad = ctx.createRadialGradient(-r * 0.2, -r * 0.3, r * 0.1, 0, 0, r);
    grad.addColorStop(0, '#ff5252');
    grad.addColorStop(0.7, '#d50000');
    grad.addColorStop(1, '#8e0000');
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.moveTo(0, r * 0.9);
    ctx.bezierCurveTo(r * 0.9, r * 0.4, r * 0.9, -r * 0.7, 0, -r * 0.6);
    ctx.bezierCurveTo(-r * 0.9, -r * 0.7, -r * 0.9, r * 0.4, 0, r * 0.9);
    ctx.fill();

    // Yellow Seed specks
    ctx.fillStyle = '#fff59d';
    for (let i = 0; i < 12; i++) {
      const angle = i * 2.4;
      const dist = (r * 0.55) * Math.sqrt((i + 1) / 12);
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * dist, Math.sin(angle) * dist, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Green Calyx Crown
    ctx.fillStyle = '#43a047';
    for (let a = -Math.PI * 0.4; a <= Math.PI * 0.4; a += Math.PI * 0.25) {
      ctx.beginPath();
      ctx.ellipse(Math.sin(a) * r * 0.3, -r * 0.65, r * 0.2, r * 0.08, a, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * Procedural Fruit 6: Coconut
   */
  drawCoconut(ctx, r) {
    // Hairy brown textured shell
    const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
    grad.addColorStop(0, '#795548');
    grad.addColorStop(0.7, '#4e342e');
    grad.addColorStop(1, '#271711');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Shell texture marks
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, r - 4, i * 1.0, i * 1.0 + 0.4);
      ctx.stroke();
    }
  }

  /**
   * Procedural Fruit 7: Pineapple
   */
  drawPineapple(ctx, r) {
    // Golden oval body
    const grad = ctx.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.1, 0, 0, r);
    grad.addColorStop(0, '#ffd54f');
    grad.addColorStop(0.7, '#f57f17');
    grad.addColorStop(1, '#bf360c');
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.ellipse(0, r * 0.1, r * 0.75, r * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Crosshatch diamond pattern
    ctx.strokeStyle = 'rgba(191, 54, 12, 0.4)';
    ctx.lineWidth = 2;
    for (let y = -r * 0.5; y <= r * 0.7; y += r * 0.3) {
      ctx.beginPath();
      ctx.moveTo(-r * 0.6, y);
      ctx.lineTo(r * 0.6, y + r * 0.3);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(r * 0.6, y);
      ctx.lineTo(-r * 0.6, y + r * 0.3);
      ctx.stroke();
    }

    // Spiky Green Crown
    ctx.fillStyle = '#2e7d32';
    for (let a = -Math.PI * 0.35; a <= Math.PI * 0.35; a += Math.PI * 0.18) {
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.7);
      ctx.lineTo(Math.sin(a) * r * 0.6, -r * 1.3);
      ctx.lineTo(Math.sin(a) * r * 0.2, -r * 0.7);
      ctx.fill();
    }
  }

  /**
   * Procedural Fruit 8: Special Frenzy Dragonfruit (Golden/Cyan Cosmic Fruit)
   */
  drawFrenzyFruit(ctx, r) {
    const time = Date.now() * 0.005;

    // Glowing cosmic aura
    ctx.shadowBlur = 25;
    ctx.shadowColor = '#00f2fe';

    const grad = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.5, '#4facfe');
    grad.addColorStop(1, '#00f2fe');
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0; // reset

    // Orbiting sparkle stars
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 4; i++) {
      const angle = time + (i * Math.PI / 2);
      const sx = Math.cos(angle) * (r * 1.25);
      const sy = Math.sin(angle) * (r * 1.25);
      ctx.beginPath();
      ctx.arc(sx, sy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * Render Bomb 💣 with Animated Burning Fuse and Smoke
   */
  renderBomb(ctx, bomb) {
    ctx.save();
    ctx.translate(bomb.x, bomb.y);
    ctx.rotate(bomb.rotation);

    const r = bomb.radius;

    // 1. Dark Metallic Sphere Body
    const grad = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.05, 0, 0, r);
    grad.addColorStop(0, '#555555');
    grad.addColorStop(0.4, '#222222');
    grad.addColorStop(1, '#080808');
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // 2. Brass Neck Cap
    ctx.fillStyle = '#b78103';
    ctx.fillRect(-r * 0.25, -r * 1.15, r * 0.5, r * 0.25);

    // 3. Curved Twine Fuse
    ctx.strokeStyle = '#d7ccc8';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.15);
    ctx.quadraticCurveTo(r * 0.4, -r * 1.45, r * 0.35, -r * 1.7);
    ctx.stroke();

    // 4. Burning Spark at Fuse Tip
    const sparkX = r * 0.35;
    const sparkY = -r * 1.7;

    // Glowing core
    ctx.shadowBlur = 18;
    ctx.shadowColor = '#ff3d00';
    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath();
    ctx.arc(sparkX, sparkY, 4 + Math.random() * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Emitted Spark Particles
    for (let i = 0; i < 4; i++) {
      const spAng = Math.random() * Math.PI * 2;
      const spDist = 6 + Math.random() * 14;
      ctx.fillStyle = Math.random() > 0.5 ? '#ff9100' : '#ff1744';
      ctx.beginPath();
      ctx.arc(sparkX + Math.cos(spAng) * spDist, sparkY + Math.sin(spAng) * spDist, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Render Ultra-Smooth Glowing Katana Blade Trail
   */
  renderBladeTrail(ctx, points, colorTheme = null) {
    if (!points || points.length < 2) return;

    const theme = this.bladeColors[colorTheme || this.currentBladeTheme] || this.bladeColors.cyan;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Outer Glow Layer
    ctx.shadowBlur = 16;
    ctx.shadowColor = theme.glow;

    for (let i = 1; i < points.length; i++) {
      const p1 = points[i - 1];
      const p2 = points[i];
      const factor = i / points.length; // 0 at tail, 1 at tip
      const alpha = factor * 0.85;
      const width = 2 + factor * 11; // 2px at tail -> 13px at tip

      ctx.strokeStyle = `${theme.trail}${alpha})`;
      ctx.lineWidth = width;

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    // Inner White-Hot Blade Core
    ctx.shadowBlur = 6;
    ctx.shadowColor = '#ffffff';
    for (let i = 1; i < points.length; i++) {
      const p1 = points[i - 1];
      const p2 = points[i];
      const factor = i / points.length;
      const width = 1 + factor * 4.5;

      ctx.strokeStyle = `rgba(255, 255, 255, ${factor * 0.95})`;
      ctx.lineWidth = width;

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    // Sparkling Katana Star Particle at Tip
    const tip = points[points.length - 1];
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 20;
    ctx.shadowColor = theme.glow;
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * Render Particle System (sparkles, bomb explosion fragments, juice drops)
   */
  renderParticles(ctx, particles) {
    ctx.save();
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (p.alpha <= 0.01) continue;

      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;

      if (p.glow) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /**
   * Render Bouncy Floating Combo and Score Text
   */
  renderFloatingTexts(ctx, floatingTexts) {
    ctx.save();
    for (let i = 0; i < floatingTexts.length; i++) {
      const t = floatingTexts[i];
      if (t.alpha <= 0.01) continue;

      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.scale(t.scale, t.scale);
      ctx.globalAlpha = Math.max(0, t.alpha);

      ctx.font = `900 ${t.fontSize || 32}px "Inter", "Segoe UI", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Glow shadow
      ctx.shadowBlur = 15;
      ctx.shadowColor = t.glowColor || '#ff9800';

      // Outline
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 5;
      ctx.strokeText(t.text, 0, 0);

      // Gradient Fill
      ctx.fillStyle = t.fillColor || '#ffd700';
      ctx.fillText(t.text, 0, 0);

      ctx.restore();
    }
    ctx.restore();
  }

  /**
   * Render Frost Freeze screen vignette when Frenzy Fruit is active
   */
  renderFreezeOverlay(ctx, width, height, intensity) {
    if (intensity <= 0) return;

    ctx.save();
    ctx.globalAlpha = Math.min(0.65, intensity);

    const grad = ctx.createRadialGradient(width / 2, height / 2, width * 0.25, width / 2, height / 2, width * 0.7);
    grad.addColorStop(0, 'rgba(0, 242, 254, 0)');
    grad.addColorStop(0.7, 'rgba(0, 242, 254, 0.2)');
    grad.addColorStop(1, 'rgba(0, 180, 255, 0.6)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    ctx.restore();
  }
}

// Export singleton instance
window.fruitRenderer = new FruitRenderer();
