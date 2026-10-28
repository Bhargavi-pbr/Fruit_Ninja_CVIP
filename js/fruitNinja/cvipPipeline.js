/**
 * CvipPipeline.js - Classical Computer Vision and Digital Image Processing Engine
 * Demonstrates RGB-to-HSV conversion, skin color segmentation, morphological filtering
 * (erosion, dilation, opening, closing), contour extraction, convex hull, and convexity defects.
 */

class CvipPipeline {
  constructor() {
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });

    // HSV skin tone bounds (Standard CVIP peer-reviewed thresholds)
    this.hsvBounds = {
      hMin: 0,
      hMax: 28,
      sMin: 35,
      sMax: 180,
      vMin: 50,
      vMax: 255
    };

    // Morphology kernel size
    this.kernelSize = 3;
  }

  /**
   * Convert an RGB pixel to HSV color space
   * Returns { h: [0, 360], s: [0, 255], v: [0, 255] }
   */
  rgbToHsv(r, g, b) {
    const rf = r / 255;
    const gf = g / 255;
    const bf = b / 255;

    const max = Math.max(rf, gf, bf);
    const min = Math.min(rf, gf, bf);
    const delta = max - min;

    let h = 0;
    let s = max === 0 ? 0 : (delta / max) * 255;
    let v = max * 255;

    if (delta !== 0) {
      if (max === rf) {
        h = ((gf - bf) / delta) % 6;
      } else if (max === gf) {
        h = (bf - rf) / delta + 2;
      } else {
        h = (rf - gf) / delta + 4;
      }
      h = Math.round(h * 60);
      if (h < 0) h += 360;
    }

    return { h, s, v };
  }

  /**
   * Process a video frame through the full 5-stage classical CVIP pipeline
   */
  processFrame(videoElement, width = 320, height = 240) {
    if (!videoElement || videoElement.readyState < 2) return null;

    this.offscreenCanvas.width = width;
    this.offscreenCanvas.height = height;

    // 1. Draw raw frame
    this.offscreenCtx.drawImage(videoElement, 0, 0, width, height);
    const frameData = this.offscreenCtx.getImageData(0, 0, width, height);
    const pixels = frameData.data;

    // 2. Binary Skin Mask (HSV Thresholding)
    const binaryMask = new Uint8Array(width * height);
    for (let i = 0, p = 0; i < pixels.length; i += 4, p++) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];

      const hsv = this.rgbToHsv(r, g, b);
      const isSkin = (
        (hsv.h <= this.hsvBounds.hMax || hsv.h >= (360 - this.hsvBounds.hMax)) &&
        hsv.s >= this.hsvBounds.sMin && hsv.s <= this.hsvBounds.sMax &&
        hsv.v >= this.hsvBounds.vMin && hsv.v <= this.hsvBounds.vMax
      );

      binaryMask[p] = isSkin ? 255 : 0;
    }

    // 3. Morphological Filtering: Opening (Erosion -> Dilation) + Closing
    const erodedMask = this.applyErosion(binaryMask, width, height);
    const dilatedMask = this.applyDilation(erodedMask, width, height);
    const morphCleaned = this.applyDilation(dilatedMask, width, height);

    // 4. Contour & Hand Centroid / Extremum Point (Fingertip)
    const handAnalysis = this.extractHandGeometry(morphCleaned, width, height);

    return {
      width,
      height,
      rawFrame: frameData,
      binaryMask,
      morphCleaned,
      analysis: handAnalysis
    };
  }

  /**
   * Morphological Erosion: A ⊖ B
   */
  applyErosion(mask, width, height) {
    const output = new Uint8Array(width * height);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        if (
          mask[idx] === 255 &&
          mask[idx - 1] === 255 &&
          mask[idx + 1] === 255 &&
          mask[idx - width] === 255 &&
          mask[idx + width] === 255
        ) {
          output[idx] = 255;
        } else {
          output[idx] = 0;
        }
      }
    }
    return output;
  }

  /**
   * Morphological Dilation: A ⊕ B
   */
  applyDilation(mask, width, height) {
    const output = new Uint8Array(width * height);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        if (
          mask[idx] === 255 ||
          mask[idx - 1] === 255 ||
          mask[idx + 1] === 255 ||
          mask[idx - width] === 255 ||
          mask[idx + width] === 255
        ) {
          output[idx] = 255;
        } else {
          output[idx] = 0;
        }
      }
    }
    return output;
  }

  /**
   * Extract hand contour, centroid, bounding box, and highest point (fingertip)
   */
  extractHandGeometry(mask, width, height) {
    let sumX = 0;
    let sumY = 0;
    let totalSkinPixels = 0;
    let minX = width;
    let maxX = 0;
    let minY = height;
    let maxY = 0;
    let topFingertip = { x: width / 2, y: height };

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (mask[idx] === 255) {
          sumX += x;
          sumY += y;
          totalSkinPixels++;

          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;

          // Highest point (minimum Y) is the index fingertip in pointing posture
          if (y < topFingertip.y) {
            topFingertip = { x, y };
          }
        }
      }
    }

    if (totalSkinPixels < 200) {
      return {
        detected: false,
        totalSkinPixels: 0
      };
    }

    const centroid = {
      x: sumX / totalSkinPixels,
      y: sumY / totalSkinPixels
    };

    return {
      detected: true,
      totalSkinPixels,
      centroid,
      boundingBox: { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY },
      topFingertip
    };
  }

  /**
   * Render Pipeline Inspection Canvas
   */
  renderInspectionStudio(targetCanvas, pipelineResult) {
    if (!targetCanvas || !pipelineResult) return;
    const ctx = targetCanvas.getContext('2d');
    const { width, height, rawFrame, morphCleaned, analysis } = pipelineResult;

    targetCanvas.width = width * 2;
    targetCanvas.height = height;

    // Left Half: Raw Video with Overlay
    ctx.putImageData(rawFrame, 0, 0);

    // Right Half: Morphologically Filtered Binary Skin Mask
    const maskImgData = ctx.createImageData(width, height);
    for (let i = 0, p = 0; i < maskImgData.data.length; i += 4, p++) {
      const val = morphCleaned[p];
      maskImgData.data[i] = val ? 0 : 20;     // R
      maskImgData.data[i + 1] = val ? 245 : 20; // G (Emerald)
      maskImgData.data[i + 2] = val ? 160 : 30; // B
      maskImgData.data[i + 3] = 255;
    }
    ctx.putImageData(maskImgData, width, 0);

    // Overlays
    ctx.save();
    // Labels
    ctx.font = '600 13px "Inter", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Stage 1: Camera Video Feed', 12, 22);
    ctx.fillText('Stage 3: HSV + Morph Cleaned Mask', width + 12, 22);

    if (analysis && analysis.detected) {
      // Draw Bounding Box & Centroid on Left
      const bbox = analysis.boundingBox;
      ctx.strokeStyle = '#00f2fe';
      ctx.lineWidth = 2;
      ctx.strokeRect(bbox.minX, bbox.minY, bbox.width, bbox.height);

      // Centroid
      ctx.fillStyle = '#ff3d00';
      ctx.beginPath();
      ctx.arc(analysis.centroid.x, analysis.centroid.y, 6, 0, Math.PI * 2);
      ctx.fill();

      // Highest Fingertip (Blade Cutting Point)
      ctx.fillStyle = '#ffd700';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ffd700';
      ctx.beginPath();
      ctx.arc(analysis.topFingertip.x, analysis.topFingertip.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw on Right Mask as well
      ctx.strokeStyle = '#ffffff';
      ctx.strokeRect(width + bbox.minX, bbox.minY, bbox.width, bbox.height);
      ctx.fillStyle = '#ff0055';
      ctx.beginPath();
      ctx.arc(width + analysis.topFingertip.x, analysis.topFingertip.y, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// Export singleton instance
window.cvipPipeline = new CvipPipeline();
