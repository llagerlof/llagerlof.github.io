// Particles, shockwave rings, score popups, and scoring helpers.
import { TAU } from '../core/config.js';
import { rand, chance } from '../core/util.js';
import { G, P } from '../core/state.js';
import { AU } from '../audio/index.js';

// size: 1 small, 2 medium, 3 large
export function explode(x, y, size = 1, silent = false) {
  const n = 6 + size * 9;
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), s = rand(0.2, 1.4) * (0.6 + size * 0.45);
    const life = rand(14, 28) * (0.7 + size * 0.3);
    G.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life, kind: 'fire', sz: chance(0.3) ? 2 : 1, drag: 0.93 });
  }
  for (let i = 0; i < size * 3; i++) {
    const life = rand(30, 50);
    G.parts.push({ x: x + rand(-3, 3), y: y + rand(-3, 3), vx: rand(-0.3, 0.3), vy: rand(-0.3, 0.3) + 0.2, life, max: life, kind: 'smoke', sz: 2, drag: 0.97 });
  }
  G.rings.push({ x, y, r: 2, vr: 0.9 + size * 0.5, life: 10 + size * 4, max: 10 + size * 4, col: size >= 3 ? '#ffffff' : '#fee761' });
  G.shake = Math.max(G.shake, size * 1.6);
  if (!silent) AU.sfx.explode(size, x);
}

export function spark(x, y, col = '#fee761', n = 3) {
  for (let i = 0; i < n; i++) {
    const a = rand(-Math.PI, 0), s = rand(0.5, 1.8);
    G.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(6, 12), max: 12, kind: 'spark', col, sz: 1, drag: 0.88 });
  }
}

export function ring(x, y, r, vr, life, col) {
  G.rings.push({ x, y, r, vr, life, max: life, col });
}

export function popup(x, y, text, col = '#fff', life = 45) {
  G.pops.push({ x, y, text: String(text), col, t: 0, life });
}

export function addScore(n) {
  G.score += n;
  if (G.demo || G.score < G.nextLife) return;
  G.nextLife += 70000;
  G.lives++;
  AU.sfx.oneup();
  popup(P.x, P.y - 14, '1UP!', '#f6757a', 80);
}

// Turns every enemy bullet into points (bombs, boss phase changes, boss deaths).
export function clearBullets(points = true) {
  if (points && G.ebullets.length) {
    for (const b of G.ebullets) {
      G.parts.push({ x: b.x, y: b.y, vx: 0, vy: -0.6, life: 16, max: 16, kind: 'spark', col: '#fee761', sz: 1, drag: 1 });
      addScore(10);
    }
    AU.sfx.cancel();
  }
  G.ebullets = [];
}

export function updateFx() {
  for (const p of G.parts) {
    p.x += p.vx; p.y += p.vy;
    p.vx *= p.drag; p.vy *= p.drag;
    if (p.kind === 'fire') p.vy += 0.01;
    p.life--;
  }
  G.parts = G.parts.filter(p => p.life > 0);
  if (G.parts.length > 900) G.parts.splice(0, G.parts.length - 900);
  for (const r of G.rings) { r.r += r.vr; r.vr *= 0.94; r.life--; }
  G.rings = G.rings.filter(r => r.life > 0);
  for (const p of G.pops) { p.t++; p.y -= 0.4; }
  G.pops = G.pops.filter(p => p.t < p.life);
}
