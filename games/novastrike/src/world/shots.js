// Enemy bullet emitters. Speeds are scaled by the stage's difficulty.
import { W, H, TAU } from '../core/config.js';
import { G, P } from '../core/state.js';
import { BSPR, BRAD } from '../gfx/sprites.js';
import { clearBullets } from './fx.js';

// Enemies hold fire when off-screen, too close to the player, or between stages.
export function canFire(e) {
  return e.y > 6 && e.y < P.y - 46 && !P.dead && G.phase !== 'clear';
}

export function aimAt(x, y) {
  return Math.atan2(P.y - y, P.x - x);
}

// col: red|orange|purple|cyan|green   size: s|m|l|n (needle)
// extra: { ax, ay, max } acceleration, or { wave, wa, wf, wp } sine motion
export function eShot(x, y, ang, spd, col = 'red', size = 'm', extra) {
  if (G.bombT > 0) return null;
  const s = spd * G.diff.bspd;
  const b = { x, y, vx: Math.cos(ang) * s, vy: Math.sin(ang) * s, spr: BSPR[size][col], r: BRAD[size], t: 0 };
  if (extra) Object.assign(b, extra);
  G.ebullets.push(b);
  return b;
}

export function eFan(x, y, ang, n, spread, spd, col, size) {
  for (let i = 0; i < n; i++) eShot(x, y, ang + (i - (n - 1) / 2) * spread, spd, col, size);
}

export function eRing(x, y, n, spd, off, col, size) {
  for (let i = 0; i < n; i++) eShot(x, y, off + (i / n) * TAU, spd, col, size);
}

// Moves enemy bullets; handles hits and grazes (near misses score points).
export function updateEnemyBullets(fxOnly, hitPlayer, onGraze) {
  if (G.bombT > 0) { G.bombT--; if (G.ebullets.length) clearBullets(true); }
  for (const b of G.ebullets) {
    b.t++;
    if (b.ax !== undefined && b.vx * b.vx + b.vy * b.vy < b.max * b.max) { b.vx += b.ax; b.vy += b.ay; }
    if (b.wave) { b.x0 += b.vx; b.y += b.vy; b.x = b.x0 + Math.sin(b.t * b.wf + b.wp) * b.wa; }
    else { b.x += b.vx; b.y += b.vy; }
    if (b.y < -12 || b.y > H + 12 || b.x < -12 || b.x > W + 12) { b.dead = true; continue; }
    if (fxOnly || P.dead) continue;
    const dx = b.x - P.x, dy = b.y - P.y, d2 = dx * dx + dy * dy, rr = b.r + 1.5;
    if (d2 < rr * rr) {
      if (P.inv <= 0 && !G.god) { b.dead = true; hitPlayer(); }
    } else if (!b.grazed && d2 < (b.r + 9) ** 2) {
      b.grazed = true;
      onGraze(b, dx, dy);
    }
  }
  G.ebullets = G.ebullets.filter(b => !b.dead);
}
