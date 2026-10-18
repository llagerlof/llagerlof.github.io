// Boss definitions, attack patterns, and the boss state machine:
// enter -> fight (3 phases by HP) -> dying.
import { W, TAU } from '../core/config.js';
import { rand, clamp } from '../core/util.js';
import { G, P } from '../core/state.js';
import { SPR } from '../gfx/sprites.js';
import { AU } from '../audio/index.js';
import { explode, popup, addScore, clearBullets, ring } from './fx.js';
import { aimAt, eShot, eFan, eRing } from './shots.js';
import { spawn, spawnSwoop } from './enemies.js';
import { dropPup, randomPup } from './powerups.js';

// guns: muzzle offsets from the boss centre. phases: pattern names cycled per phase.
export const BOSSDEF = [
  {
    name: 'CRIMSON CRAB', spr: 'boss1', hp: 1400, hw: 14, hh: 7, minion: 'swooper',
    guns: { c: [0, 7], l: [-13, 0], r: [13, 0] },
    phases: [['aimFan', 'sideCannons'], ['ring', 'aimFan', 'minions', 'sideCannons'], ['spiral', 'sideCannons', 'ring', 'aimFan']],
  },
  {
    name: 'HIVE QUEEN', spr: 'boss2', hp: 1900, hw: 16, hh: 8, minion: 'diver',
    guns: { c: [0, 1], l: [-15, 8], r: [15, 8] },
    phases: [['spiral', 'rain', 'aimFan'], ['wave', 'minions', 'ring'], ['spiral2', 'accel', 'rain', 'minions']],
  },
  {
    name: 'VOID DREADNOUGHT', spr: 'boss3', hp: 2500, hw: 20, hh: 8, minion: 'drone',
    guns: { c: [0, 8], l: [-19, -1], r: [19, -1], bl: [-15, 9], br: [15, 9] },
    phases: [['sideCannons', 'aimFan', 'laser'], ['laser', 'ring', 'spiral', 'accel'], ['laser2', 'spiral2', 'rain', 'minions', 'aimFan']],
  },
];

// Bosses cycle every 3 stages; each loop adds an MK number and more HP/bullets.
export function bossForStage(stage) {
  const idx = (stage - 1) % 3, loop = Math.floor((stage - 1) / 3);
  return { idx, loop, def: BOSSDEF[idx], name: BOSSDEF[idx].name + (loop ? ' MK' + (loop + 1) : '') };
}

export function gunPos(b, k) {
  const o = b.def.guns[k] || b.def.guns.c;
  return { x: b.x + o[0], y: b.y + o[1] };
}

// Each pattern returns { dur, step(boss, frame) }. Setting b.hold freezes movement.
const PAT = {
  aimFan: () => ({ dur: 100, step(b, f) {
    if (f % 25 !== 1) return;
    const g = gunPos(b, 'c');
    eFan(g.x, g.y, aimAt(g.x, g.y), 5 + b.loop * 2 + b.phase, 0.17, 1.5, 'orange', 'm');
    AU.sfx.eshot(g.x, 'l');
  } }),
  sideCannons: () => ({ dur: 120, step(b, f) {
    if (f % Math.max(5, 12 - b.loop * 2 - b.phase * 2) !== 0) return;
    for (const k of ['l', 'r']) {
      const g = gunPos(b, k);
      eShot(g.x, g.y, aimAt(g.x, g.y) + rand(-0.08, 0.08), 2.1, 'red', 'n');
    }
    AU.sfx.eshot(b.x, 'n');
  } }),
  ring: () => ({ dur: 95, step(b, f) {
    if (f % 30 !== 1) return;
    const g = gunPos(b, 'c');
    eRing(g.x, g.y, 14 + b.loop * 4 + b.phase * 2, 1.15, f * 0.013, 'purple', 'm');
    AU.sfx.eshot(g.x, 'l');
  } }),
  spiral: () => ({ dur: 150, step(b, f) {
    b.hold = true;
    if (f % 4 !== 0) return;
    const g = gunPos(b, 'c'), arms = 3 + b.phase + b.loop;
    for (let i = 0; i < arms; i++) eShot(g.x, g.y, b.ang + (i / arms) * TAU, 1.25, 'cyan', 's');
    b.ang += 0.16;
    if (f % 8 === 0) AU.sfx.eshot(g.x, 's');
  } }),
  spiral2: () => ({ dur: 170, step(b, f) {
    b.hold = true;
    if (f % 5 !== 0) return;
    const g = gunPos(b, 'c'), arms = 3 + b.loop;
    for (let i = 0; i < arms; i++) {
      eShot(g.x, g.y, b.ang + (i / arms) * TAU, 1.2, 'cyan', 's');
      eShot(g.x, g.y, -b.ang + (i / arms) * TAU, 1.2, 'purple', 's');
    }
    b.ang += 0.12;
    if (f % 10 === 0) AU.sfx.eshot(g.x, 's');
  } }),
  rain: () => ({ dur: 140, step(b, f) {
    if (f % Math.max(2, 5 - b.loop) !== 0) return;
    eShot(b.x + rand(-b.hw, b.hw), b.y + b.hh, Math.PI / 2 + rand(-0.25, 0.25), rand(1.0, 1.7), 'green', 's');
  } }),
  wave: () => ({ dur: 160, step(b, f) {
    if (f % 12 !== 0) return;
    for (let i = -2; i <= 2; i++) {
      const bb = eShot(b.x + i * 14, b.y + 6, Math.PI / 2, 1.1, 'purple', 'm', { wave: true, wa: 12, wf: 0.06, wp: f * 0.15 });
      if (bb) bb.x0 = bb.x;
    }
    AU.sfx.eshot(b.x, 'm');
  } }),
  accel: () => ({ dur: 100, step(b, f) {
    if (f !== 1 && f !== 50) return;
    const g = gunPos(b, 'c'), n = 18 + b.loop * 4, off = rand(0, TAU);
    for (let i = 0; i < n; i++) {
      const a = off + (i / n) * TAU;
      eShot(g.x, g.y, a, 0.25, 'orange', 'm', { ax: Math.cos(a) * 0.035, ay: Math.sin(a) * 0.035, max: 2.6 });
    }
    AU.sfx.eshot(g.x, 'l');
  } }),
  minions: () => ({ dur: 70, step(b, f) {
    if (f !== 1 && f !== 35) return;
    const t = b.def.minion;
    if (t === 'swooper') {
      spawnSwoop(true).minion = true;
      spawnSwoop(false).minion = true;
    } else if (t === 'diver') {
      for (const s of [-1, 1]) spawn('diver', b.x + s * 22, b.y, { ty: b.y + rand(30, 70), minion: true });
    } else {
      for (const s of [-1, 1]) spawn('drone', b.x + s * 24, b.y, { vy: 1.2, amp: 14, freq: 0.06, ph: 0, minion: true });
    }
  } }),
  laser: () => laserPat(['bl', 'br']),
  laser2: () => laserPat(['bl', 'br', 'c']),
};

// Beams telegraph for 50 frames, then fire while the boss creeps toward the player.
function laserPat(guns) {
  return { dur: 140, step(b, f) {
    b.hold = true;
    if (f === 1) {
      for (const k of guns) G.beams.push({ b, gun: k, t: 0, warn: 50, dur: 75, w: 5 + b.loop });
      AU.sfx.charge(b.x);
    }
    if (f === 51) { AU.sfx.laser(b.x); G.shake = Math.max(G.shake, 4); }
    if (f > 50 && !P.dead) b.x += clamp(P.x - b.x, -0.45 - b.loop * 0.1, 0.45 + b.loop * 0.1);
  } };
}

export function spawnBoss() {
  const { idx, loop, def, name } = bossForStage(G.stage);
  const hp = Math.round(def.hp * (1 + 0.55 * loop));
  const b = {
    isBoss: true, type: 'boss', def, idx, loop, name,
    x: W / 2, y: -30, hp, maxHp: hp, spr: SPR[def.spr], hw: def.hw, hh: def.hh,
    t: 0, mt: 0, flash: 0, st: 'enter', phase: 0, pat: null, patT: 0, patIdx: 0, cool: 60, ang: 0,
    invulnT: 0, hold: false, my: 64,
  };
  G.boss = b;
  G.enemies.push(b);
  AU.sfx.bossEnter();
}

function updateDying(b) {
  b.dieT++;
  b.y += 0.12;
  b.x += Math.sin(b.dieT * 0.9) * 0.6;
  if (b.dieT % 5 === 0) explode(b.x + rand(-b.hw, b.hw), b.y + rand(-b.hh, b.hh), 2, b.dieT % 15 !== 0);
  if (b.dieT % 24 === 0) { G.flash = 4; G.flashCol = '#fee761'; }
  if (b.dieT < 140) return;

  for (let i = 0; i < 6; i++) explode(b.x + rand(-b.hw, b.hw), b.y + rand(-b.hh, b.hh), 3, true);
  for (let i = 0; i < 3; i++) ring(b.x, b.y, 4, 2 + i, 40, i === 1 ? '#fee761' : '#ffffff');
  AU.sfx.bossExplode();
  G.flash = 28; G.flashCol = '#ffffff'; G.shake = 22;
  const bonus = 10000 * (b.idx + 1) * (b.loop + 1);
  addScore(bonus);
  popup(b.x, b.y, bonus, '#fee761', 120);
  dropPup(b.x - 10, b.y, 'P');
  dropPup(b.x + 10, b.y, randomPup(true));
  dropPup(b.x, b.y, 'B');
  b.dead = true;
  G.boss = null;
  G.clearInfo = { boss: bonus };
}

export function updateBoss(b) {
  if (b.st === 'enter') {
    b.y += (b.my - b.y) * 0.025;
    if (b.y > b.my - 1.5) { b.st = 'fight'; AU.sfx.roar(); G.shake = 8; }
    return;
  }
  if (b.st === 'dying') { updateDying(b); return; }

  const ph = b.hp > b.maxHp * 0.66 ? 0 : b.hp > b.maxHp * 0.33 ? 1 : 2;
  if (ph !== b.phase) {
    b.phase = ph; b.pat = null; b.cool = 70; b.invulnT = 60; b.hold = false;
    clearBullets(true);
    G.beams = [];
    G.shake = 12; G.flash = 8; G.flashCol = '#e43b44';
    AU.sfx.roar();
    if (ph === 2) AU.musicVariant('intense');
    explode(b.x, b.y, 2, true);
    popup(b.x, b.y + b.hh + 10, ph === 2 ? 'FINAL PHASE' : 'PHASE ' + (ph + 1), '#e43b44', 70);
  }
  if (b.invulnT > 0) b.invulnT--;
  if (b.phase === 2 && b.t % 7 === 0) {
    G.parts.push({ x: b.x + rand(-b.hw, b.hw), y: b.y + rand(-b.hh, b.hh), vx: rand(-0.2, 0.2), vy: 0.4, life: 40, max: 40, kind: 'smoke', sz: 2, drag: 0.98 });
  }

  if (!b.hold) {
    b.mt++;
    const tx = W / 2 + Math.sin(b.mt * 0.012 * (1 + b.phase * 0.3)) * (W / 2 - b.hw - 8);
    const ty = b.my + Math.sin(b.mt * 0.03) * 8;
    b.x += (tx - b.x) * 0.06;
    b.y += (ty - b.y) * 0.06;
  }
  b.x = clamp(b.x, b.hw + 2, W - b.hw - 2);

  if (b.pat) {
    b.patT++;
    b.pat.step(b, b.patT);
    if (b.patT >= b.pat.dur) { b.pat = null; b.hold = false; b.cool = Math.max(18, 50 - b.loop * 10 - b.phase * 8); }
  } else if (--b.cool <= 0) {
    const list = b.def.phases[b.phase];
    b.pat = PAT[list[b.patIdx++ % list.length]]();
    b.patT = 0;
  }
}

export function bossDefeated(b) {
  b.st = 'dying'; b.dieT = 0; b.pat = null;
  G.phase = 'bossDeath'; G.phaseT = 0;
  clearBullets(true);
  G.beams = [];
  AU.stopMusic(0.6);
  AU.sfx.roar();
  for (const e of G.enemies) if (!e.isBoss && !e.dead) { e.dead = true; explode(e.x, e.y, 1, true); }
}

// Boss lasers: hurt the player while active.
export function updateBeams(fxOnly, hitPlayer) {
  for (const bm of G.beams) {
    bm.t++;
    if (bm.t > bm.warn + bm.dur || bm.b.dead || bm.b.st !== 'fight') { bm.dead = true; continue; }
    if (bm.t > bm.warn && !fxOnly && !P.dead) {
      const g = gunPos(bm.b, bm.gun);
      if (Math.abs(P.x - g.x) < bm.w / 2 + 1 && P.y > g.y) hitPlayer();
      if (G.t % 3 === 0) G.parts.push({ x: g.x + rand(-2, 2), y: g.y + 2, vx: rand(-0.5, 0.5), vy: rand(-1, 0), life: 8, max: 8, kind: 'spark', col: '#2ce8f5', sz: 1, drag: 0.9 });
    }
  }
  G.beams = G.beams.filter(bm => !bm.dead);
}
