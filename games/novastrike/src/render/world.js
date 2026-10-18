// Draws everything that lives in the playfield.
import { H } from '../core/config.js';
import { G, P } from '../core/state.js';
import { ctx, pxRing } from '../gfx/canvas.js';
import { SPR, drawSpr } from '../gfx/sprites.js';
import { drawText, drawTextRaw } from '../gfx/font.js';
import { FIRE } from '../gfx/palette.js';
import { inp } from '../input.js';
import { gunPos } from '../world/bosses.js';

// Engine flames under a ship sprite drawn at (dx, dy).
export function drawFlames(dx, dy, s, boost) {
  const fl = 2 + ((G.t >> 1) & 1) + (boost ? 1 : 0);
  for (const ex of [dx + 4, dx + 8]) {
    ctx.fillStyle = '#fee761'; ctx.fillRect(ex, dy + s.h, 1, fl);
    ctx.fillStyle = '#f77622'; ctx.fillRect(ex, dy + s.h + fl, 1, 1 + ((G.t >> 2) & 1));
  }
}

function drawPlayer() {
  if (P.dead) return;
  if (P.inv > 0 && (P.inv >> 2) % 2 === 1 && G.bombT <= 0) return; // invulnerability blink
  const s = SPR.player;
  const dx = Math.round(P.x - s.w / 2), dy = Math.round(P.y - s.h / 2);
  drawFlames(dx, dy, s, inp.up);
  if (P.missiles > 0) for (const pod of P.pods) drawSpr(SPR.pod, pod.x, pod.y);
  ctx.drawImage(s.c, dx, dy);
  // Light up a wingtip when strafing.
  ctx.fillStyle = '#ffffff';
  if (P.vx < -0.3) ctx.fillRect(dx + 1, dy + 7, 1, 1);
  if (P.vx > 0.3) ctx.fillRect(dx + 11, dy + 7, 1, 1);
  if (P.shield) pxRing(P.x, P.y + 1, 10 + Math.sin(G.t * 0.2) * 0.6, (G.t >> 3) & 1 ? '#2ce8f5' : '#0099db');
  if (inp.focus || G.god) {
    ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(P.x) - 1, Math.round(P.y) - 1, 3, 3);
    ctx.fillStyle = '#e43b44'; ctx.fillRect(Math.round(P.x), Math.round(P.y), 1, 1);
  }
}

const PUPCOL = {
  P: ['#9e2835', '#e43b44', '#f77622'], M: ['#265c42', '#3e8948', '#63c74d'],
  S: ['#124e89', '#0099db', '#2ce8f5'], B: ['#9e2835', '#f77622', '#fee761'],
};

function drawPup(p) {
  if (p.kind === 'L') { drawSpr(SPR.heart, p.x, p.y + Math.sin(p.t * 0.15)); return; }
  const c = PUPCOL[p.kind], x = Math.round(p.x) - 4, y = Math.round(p.y) - 4;
  ctx.fillStyle = c[0]; ctx.fillRect(x + 1, y, 7, 9); ctx.fillRect(x, y + 1, 9, 7);
  ctx.fillStyle = (p.t >> 3) & 1 ? c[2] : c[1]; ctx.fillRect(x + 1, y + 1, 7, 7);
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(x + 2, y + 1, 4, 1);
  drawTextRaw(p.kind, x + 3, y + 2, '#ffffff', 1);
}

function drawEnemy(e) {
  const white = e.flash > 0 && (!e.isBoss || (G.t & 1));
  drawSpr(e.spr, e.x, e.y, white, e.flip);
  if (!e.isBoss && e.maxHp >= 10 && e.hp < e.maxHp) {
    const w = 12, x = Math.round(e.x - w / 2), y = Math.round(e.y - e.hh - 5);
    ctx.fillStyle = '#1a1c2c'; ctx.fillRect(x, y, w, 2);
    ctx.fillStyle = '#e43b44'; ctx.fillRect(x, y, Math.ceil(w * e.hp / e.maxHp), 2);
  }
  if (e.isBoss && e.st === 'fight') {
    ctx.fillStyle = '#f77622';
    ctx.fillRect(Math.round(e.x - 2), Math.round(e.y + e.spr.h / 2), 4, 1 + ((G.t >> 1) & 1));
    if (e.invulnT > 0 && (G.t >> 2) & 1) pxRing(e.x, e.y, e.hw + 6, '#e43b44');
  }
}

function drawBeam(bm) {
  const g = gunPos(bm.b, bm.gun), x = Math.round(g.x), y = Math.round(g.y);
  if (bm.t <= bm.warn) {
    if ((bm.t >> 2) & 1) { ctx.fillStyle = '#e43b44'; ctx.fillRect(x, y, 1, H - y); }
    pxRing(x, y + 1, 5 - (bm.t / bm.warn) * 4, '#2ce8f5');
    return;
  }
  const k = bm.t - bm.warn, grow = Math.min(1, k / 6), fade = Math.min(1, (bm.dur - k) / 8);
  const w = Math.max(1, Math.round(bm.w * grow * fade + ((G.t & 1) ? 1 : 0)));
  ctx.fillStyle = '#0099db'; ctx.fillRect(x - Math.floor(w / 2) - 1, y, w + 2, H - y);
  ctx.fillStyle = '#2ce8f5'; ctx.fillRect(x - Math.floor(w / 2), y, w, H - y);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(x - Math.floor(w / 4), y, Math.max(1, Math.floor(w / 2)), H - y);
}

function drawParticle(p) {
  let col;
  if (p.kind === 'fire') col = FIRE[Math.min(FIRE.length - 1, Math.floor((1 - p.life / p.max) * FIRE.length))];
  else if (p.kind === 'smoke') col = p.life > p.max * 0.5 ? '#3e4a5c' : '#262b44';
  else col = p.col;
  ctx.fillStyle = col;
  ctx.fillRect(Math.round(p.x), Math.round(p.y), p.sz, p.sz);
}

export function drawParticles() {
  for (const p of G.parts) drawParticle(p);
}

export function drawWorld() {
  for (const p of G.pups) drawPup(p);
  for (const e of G.enemies) drawEnemy(e);
  for (const b of G.bullets) {
    if (b.mis) {
      ctx.fillStyle = '#f77622'; ctx.fillRect(Math.round(b.x - b.vx * 0.6), Math.round(b.y - b.vy * 0.6), 1, 1);
      ctx.fillStyle = '#c7dcd0'; ctx.fillRect(Math.round(b.x) - 1, Math.round(b.y) - 1, 2, 2);
    } else drawSpr(SPR.shot, b.x, b.y);
  }
  drawPlayer();
  for (const bm of G.beams) drawBeam(bm);
  drawParticles();
  for (const r of G.rings) {
    if (r.life < r.max * 0.3 && (G.t & 1)) continue;
    pxRing(r.x, r.y, r.r, r.col);
  }
  // Enemy bullets on top of everything so they're always readable.
  for (const b of G.ebullets) drawSpr(b.spr, b.x, b.y);
  for (const p of G.pops) {
    if (p.t > p.life * 0.7 && (p.t >> 1) & 1) continue;
    drawText(p.text, p.x, p.y, p.col, { align: 'center' });
  }
}
