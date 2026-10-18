import { W, H, TAU } from '../core/config.js';

export const cv = document.getElementById('game');
export const ctx = cv.getContext('2d');
cv.width = W;
cv.height = H;
ctx.imageSmoothingEnabled = false;

// Pixel-exact circle outline (canvas arcs would be anti-aliased).
export function pxRing(x, y, r, col) {
  ctx.fillStyle = col;
  const n = Math.max(12, Math.floor(r * 5));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r), 1, 1);
  }
}
