// Power-up capsules: P power, M missiles, S shield, B bomb, L extra life.
import { W, H } from '../core/config.js';
import { rand } from '../core/util.js';
import { G, P } from '../core/state.js';
import { AU } from '../audio/index.js';
import { addScore, popup, ring } from './fx.js';

export function randomPup(allowLife) {
  const r = Math.random() * 100;
  if (allowLife && r < 8) return 'L';
  if (r < 44) return 'P';
  if (r < 62) return 'M';
  if (r < 81) return 'S';
  return 'B';
}

export function dropPup(x, y, kind) {
  G.pups.push({ x, y, kind, vx: rand(-0.4, 0.4), vy: -1.3, t: 0 });
}

function applyPup(k) {
  AU.sfx.power(k);
  const say = (t, c) => popup(P.x, P.y - 12, t, c, 50);
  const bonus = n => { addScore(n); say(String(n), '#fee761'); };
  switch (k) {
    case 'P':
      if (P.power < 5) { P.power++; say(P.power === 5 ? 'MAX POWER' : 'POWER UP', '#f77622'); }
      else bonus(2000);
      break;
    case 'M':
      if (P.missiles < 2) { P.missiles++; say(P.missiles === 2 ? 'MISSILES MAX' : 'MISSILES', '#63c74d'); }
      else bonus(2000);
      break;
    case 'S':
      if (!P.shield) { P.shield = true; say('SHIELD', '#2ce8f5'); }
      else bonus(1500);
      break;
    case 'B':
      if (G.bombs < 6) { G.bombs++; say('BOMB +1', '#fee761'); }
      else bonus(1500);
      break;
    case 'L':
      G.lives++;
      AU.sfx.oneup();
      say('1UP!', '#f6757a');
      break;
  }
}

export function updatePowerups(fxOnly) {
  for (const p of G.pups) {
    p.t++;
    p.vy = Math.min(p.vy + 0.03, 0.55);
    p.x += p.vx; p.y += p.vy;
    if (p.x < 5 || p.x > W - 5) p.vx = -p.vx;
    if (!P.dead && !fxOnly) {
      const dx = P.x - p.x, dy = P.y - p.y, d = Math.hypot(dx, dy);
      if (d < 30) { p.x += (dx / d) * 1.8; p.y += (dy / d) * 1.8; } // magnet
      if (d < 9) { p.dead = true; applyPup(p.kind); ring(p.x, p.y, 3, 1.2, 12, '#ffffff'); }
    }
    if (p.y > H + 10) p.dead = true;
  }
  G.pups = G.pups.filter(p => !p.dead);
}
