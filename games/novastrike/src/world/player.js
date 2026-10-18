// Player ship: movement, weapons, bombs, getting hit, respawning.
import { W, H } from '../core/config.js';
import { clamp } from '../core/util.js';
import { G, P } from '../core/state.js';
import { inp, ptr, anchorPointer } from '../input.js';
import { AU } from '../audio/index.js';
import { explode, ring, clearBullets } from './fx.js';
import { damage, nearestEnemy } from './enemies.js';
import { dropPup } from './powerups.js';
import { gunPos } from './bosses.js';
import { gameOver } from '../game.js';

// Shot spread per power level: [x offset, angle in degrees].
const SHOTS = [
  null,
  [[0, 0]],
  [[-3, 0], [3, 0]],
  [[-3, 0], [3, 0], [-5, -8], [5, 8]],
  [[-4, 0], [0, 0], [4, 0], [-5, -8], [5, 8]],
  [[-4, 0], [0, 0], [4, 0], [-5, -7], [5, 7], [-6, -16], [6, 16]],
];

// Attract-mode pilot: line up under a target, flee from nearby bullets and beams.
function aiMove() {
  let tx = W / 2;
  const tgt = nearestEnemy(P.x, P.y - 80);
  if (tgt) tx = tgt.x;
  let fx = (tx - P.x) * 0.06, fy = (H - 46 - P.y) * 0.05;
  for (const b of G.ebullets) {
    const dx = P.x - b.x, dy = P.y - b.y, d2 = dx * dx + dy * dy;
    if (d2 < 1600 && dy > -12) { const f = 60 / (d2 + 20); fx += dx * f; fy += dy * f * 0.6; }
  }
  for (const bm of G.beams) {
    const g = gunPos(bm.b, bm.gun);
    if (Math.abs(P.x - g.x) < 18) fx += (P.x >= g.x ? 1 : -1) * 2;
  }
  if (P.x < 16) fx += 0.5;
  if (P.x > W - 16) fx -= 0.5;
  return { dx: clamp(fx, -1, 1), dy: clamp(fy, -1, 1) };
}

function move() {
  let dx = 0, dy = 0;
  if (G.demo) {
    ({ dx, dy } = aiMove());
  } else {
    if (inp.left) dx -= 1;
    if (inp.right) dx += 1;
    if (inp.up) dy -= 1;
    if (inp.down) dy += 1;
    if (dx && dy) { dx *= 0.7071; dy *= 0.7071; }
  }
  const sp = inp.focus && !G.demo ? 1.0 : 2.0;
  if (ptr.active && !G.demo) {
    const tx = ptr.shipX + (ptr.cx - ptr.sx) * 1.3, ty = ptr.shipY + (ptr.cy - ptr.sy) * 1.3;
    const mx = clamp(tx - P.x, -3.5, 3.5), my = clamp(ty - P.y, -3.5, 3.5);
    P.x += mx; P.y += my; P.vx = mx;
  } else {
    P.x += dx * sp; P.y += dy * sp; P.vx = dx;
  }
  const cx = clamp(P.x, 6, W - 6), cy = clamp(P.y, 22, H - 14);
  if (ptr.active && (cx !== P.x || cy !== P.y)) { ptr.shipX += cx - P.x; ptr.shipY += cy - P.y; }
  P.x = cx; P.y = cy;

  // Option pods trail behind the ship.
  P.pods[0].x += (P.x - 11 - P.pods[0].x) * 0.3; P.pods[0].y += (P.y + 4 - P.pods[0].y) * 0.3;
  P.pods[1].x += (P.x + 11 - P.pods[1].x) * 0.3; P.pods[1].y += (P.y + 4 - P.pods[1].y) * 0.3;
}

function shoot() {
  if (P.fireT > 0) P.fireT--;
  const firing = inp.fire || ptr.active || G.demo;
  if (firing && P.fireT <= 0 && G.phase !== 'clear') {
    for (const [ox, deg] of SHOTS[P.power]) {
      const a = (deg * Math.PI) / 180;
      G.bullets.push({ x: P.x + ox, y: P.y - 7, vx: Math.sin(a) * 6, vy: -Math.cos(a) * 6, dmg: 1, life: 80 });
    }
    G.parts.push({ x: P.x, y: P.y - 8, vx: 0, vy: 0, life: 2, max: 2, kind: 'spark', col: '#ffffff', sz: 2, drag: 1 });
    P.fireT = 6;
    AU.sfx.shoot(P.x);
  }
  if (P.missiles > 0 && --P.missT <= 0) {
    if (nearestEnemy(P.x, P.y)) {
      P.pods.forEach((pod, i) => {
        G.bullets.push({ x: pod.x, y: pod.y - 2, a: -Math.PI / 2 + (i ? 0.5 : -0.5), sp: 1, vx: 0, vy: 0, dmg: 3, life: 140, mis: true });
      });
      AU.sfx.missile(P.x);
    }
    P.missT = P.missiles === 1 ? 45 : 24;
  }
}

export function updatePlayer() {
  if (P.dead > 0) {
    if (--P.dead === 0) {
      if (G.lives > 0) { G.lives--; respawn(); }
      else gameOver();
    }
    return;
  }
  move();
  if (P.inv > 0) P.inv--;
  shoot();
  const demoPanic = G.demo && P.inv <= 0 && G.ebullets.some(b => (b.x - P.x) ** 2 + (b.y - P.y) ** 2 < 64);
  if (inp.bombP || demoPanic) useBomb();
}

// Player shots and homing missiles.
export function updatePlayerBullets() {
  for (const b of G.bullets) {
    if (b.mis) {
      if (!b.tgt || b.tgt.dead || (b.tgt.isBoss && b.tgt.st !== 'fight')) b.tgt = nearestEnemy(b.x, b.y);
      if (b.tgt) {
        let da = Math.atan2(b.tgt.y - b.y, b.tgt.x - b.x) - b.a;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        b.a += clamp(da, -0.13, 0.13);
      }
      b.sp = Math.min(b.sp + 0.15, 4.2);
      b.vx = Math.cos(b.a) * b.sp;
      b.vy = Math.sin(b.a) * b.sp;
      if (G.t % 2 === 0) G.parts.push({ x: b.x, y: b.y, vx: 0, vy: 0.2, life: 14, max: 14, kind: 'smoke', sz: 1, drag: 1 });
    }
    b.x += b.vx; b.y += b.vy;
    if (--b.life <= 0 || b.y < -8 || b.y > H + 8 || b.x < -8 || b.x > W + 8) { b.dead = true; continue; }
    for (const e of G.enemies) {
      if (e.dead || e.y < -4) continue;
      if (Math.abs(b.x - e.x) < e.hw + 1 && Math.abs(b.y - e.y) < e.hh + 2) {
        damage(e, b.dmg, b.x, b.y);
        b.dead = true;
        break;
      }
    }
  }
  G.bullets = G.bullets.filter(b => !b.dead);
}

export function useBomb() {
  if (G.bombs <= 0 || P.dead || G.bombT > 0) return;
  G.bombs--;
  G.bombT = 45;
  P.inv = Math.max(P.inv, 100);
  G.flash = 22; G.flashCol = '#ffffff'; G.shake = 14;
  AU.sfx.bomb(P.x);
  clearBullets(true);
  for (let i = 0; i < 4; i++) ring(P.x, P.y, 4 + i * 6, 4 + i, 40, i % 2 ? '#fee761' : '#ffffff');
  for (const e of G.enemies) {
    if (e.dead || e.y < -4) continue;
    damage(e, e.isBoss ? 50 : 40, e.x, e.y);
  }
}

export function hitPlayer() {
  if (P.inv > 0 || P.dead || G.god) return;
  if (P.shield) {
    P.shield = false;
    P.inv = 90;
    AU.sfx.shieldBreak(P.x);
    ring(P.x, P.y, 8, 3, 20, '#2ce8f5');
    G.ebullets = G.ebullets.filter(b => (b.x - P.x) ** 2 + (b.y - P.y) ** 2 > 48 * 48);
    return;
  }
  explode(P.x, P.y, 3, true);
  for (let i = 0; i < 2; i++) ring(P.x, P.y, 3, 2.5 + i * 1.5, 30, '#2ce8f5');
  AU.sfx.die(P.x);
  G.shake = 18; G.flash = 10; G.flashCol = '#e43b44';
  G.stageDeaths++;
  if (P.power > 1) dropPup(P.x, P.y - 10, 'P');
  P.power = Math.max(1, P.power - 1);
  P.missiles = Math.max(0, P.missiles - 1);
  P.dead = 110;
  G.chain = 0;
  G.mult = 1;
  G.beams = G.beams.filter(bm => bm.t <= bm.warn); // spare the respawn
}

function respawn() {
  P.x = W / 2; P.y = H - 30; P.inv = 160;
  P.pods.forEach(p => { p.x = P.x; p.y = P.y; });
  G.bombs = Math.max(G.bombs, 2);
  clearBullets(false);
  if (ptr.active) anchorPointer();
}
