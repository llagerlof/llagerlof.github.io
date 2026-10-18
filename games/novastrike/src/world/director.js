// Stage flow: intro -> waves -> boss warning -> boss -> boss death -> clear -> next stage.
import { W, params } from '../core/config.js';
import { rand, chance } from '../core/util.js';
import { G, BGS, diffFor, dens } from '../core/state.js';
import { AU } from '../audio/index.js';
import { ensurePlanet } from './background.js';
import { addScore } from './fx.js';
import { spawn, spawnSwoop } from './enemies.js';
import { spawnBoss } from './bosses.js';

// A wave's make() returns timed spawn events: [{ t: frame, fn }].
const ev = (t, fn) => ({ t, fn });
function seq(n, gap, fn, start = 0) {
  const a = [];
  for (let i = 0; i < n; i++) a.push(ev(start + i * gap, () => fn(i)));
  return a;
}

// min: first stage the wave can appear in. w: pick weight.
const WAVES = [
  { name: 'droneRow', min: 1, w: 3, make() {
    const n = Math.round(5 * dens());
    return seq(n, 8, i => spawn('drone', 20 + (W - 40) * (n > 1 ? i / (n - 1) : 0.5), -10, { vy: 0.8 + G.stage * 0.05, amp: 10, freq: 0.05, ph: i * 0.6 }));
  } },
  { name: 'droneSnake', min: 1, w: 3, make() {
    const x = rand(45, W - 45), n = Math.round(7 * dens());
    return seq(n, 12, () => spawn('drone', x, -10, { vy: 1.0, amp: 32, freq: 0.04, ph: 0 }));
  } },
  { name: 'swoop', min: 1, w: 3, make() {
    const left = chance(0.5), both = G.stage >= 3 && chance(0.5), n = Math.round(6 * dens());
    let e = seq(n, 10, () => spawnSwoop(left));
    if (both) e = e.concat(seq(n, 10, () => spawnSwoop(!left), 5));
    return e;
  } },
  { name: 'divers', min: 1, w: 2, make() {
    const n = Math.round(3 * dens()) + 1;
    return seq(n, 20, () => spawn('diver', rand(20, W - 20), -10, { ty: rand(40, 110) }));
  } },
  { name: 'shooters', min: 2, w: 2, make() {
    const n = Math.min(4, 1 + Math.round(1.2 * dens()));
    return seq(n, 30, i => spawn('shooter', 30 + (W - 60) * ((i + 0.5) / n), -12, { ty: rand(40, 90), hold: 240 }));
  } },
  { name: 'spinner', min: 2, w: 2, make() {
    const n = G.stage >= 5 ? 2 : 1;
    const e = seq(n, 60, i => spawn('spinner', n === 1 ? W / 2 : (i ? W * 0.72 : W * 0.28), -12, { ty: 70 }));
    return e.concat(seq(Math.round(4 * dens()), 14, i => spawn('drone', i % 2 ? 30 : W - 30, -10, { vy: 1.1, amp: 8, freq: 0.08, ph: 0 }), 40));
  } },
  { name: 'heavy', min: 3, w: 1.5, make() {
    return [ev(0, () => spawn('heavy', W / 2, -14, { ty: 60, x0: W / 2 }))]
      .concat(seq(Math.round(4 * dens()), 30, i => spawnSwoop(i % 2 === 0), 60));
  } },
  { name: 'rocks', min: 2, w: 1.5, make() {
    return seq(Math.round(7 * dens()), 18, () => {
      const big = chance(0.5);
      spawn(big ? 'rock' : 'rockS', rand(10, W - 10), -12, { vx: rand(-0.4, 0.4), vy: rand(0.7, 1.4), flip: chance(0.5) });
    });
  } },
  { name: 'mix', min: 4, w: 2, make() {
    return seq(3, 25, () => spawn('diver', rand(20, W - 20), -10, { ty: rand(40, 100) }))
      .concat(seq(2, 40, i => spawn('shooter', i ? W * 0.7 : W * 0.3, -12, { ty: 50, hold: 200 }), 20));
  } },
];

const WAVE_UFO = { name: 'ufo', make() {
  const l = chance(0.5);
  return [ev(0, () => spawn('ufo', l ? -14 : W + 14, rand(30, 55), { vx: l ? 0.65 : -0.65 }))]
    .concat(seq(Math.round(4 * dens()), 16, i => spawn('drone', rand(20, W - 20), -10, { vy: 1, amp: 12, freq: 0.06, ph: i }), 30));
} };

function weightedPick(pool) {
  let tot = 0;
  for (const w of pool) tot += w.w;
  let r = Math.random() * tot;
  for (const w of pool) { r -= w.w; if (r <= 0) return w; }
  return pool[pool.length - 1];
}

function buildStage(n) {
  const count = 12 + Math.min(n, 6);
  const pool = WAVES.filter(w => n >= w.min);
  const list = [];
  let lastName = '';
  for (let i = 0; i < count; i++) {
    let w;
    do { w = weightedPick(pool); } while (w.name === lastName && pool.length > 1);
    lastName = w.name;
    list.push(w);
  }
  if (n === 1) { list[0] = WAVES[0]; list[1] = WAVES[2]; }
  list.splice(Math.floor(count * 0.66), 0, WAVE_UFO);
  list.splice(Math.floor(count * 0.33), 0, WAVE_UFO);
  return list;
}

export const stageSong = n => ['stage1', 'stage2', 'stage3'][(n - 1) % 3];

export function startStage(n) {
  G.stage = n;
  G.diff = diffFor(n);
  G.waveQueue = params.has('boss') ? [] : buildStage(n);
  G.curWave = null;
  G.waveGap = 0;
  G.phase = 'intro';
  G.phaseT = 0;
  G.introT = 0;
  G.stageDeaths = 0;
  G.bg = BGS[(n - 1) % BGS.length];
  AU.playMusic(stageSong(n));
  ensurePlanet();
}

function updateWaves() {
  if (!G.curWave) {
    if (G.waveGap > 0) { G.waveGap--; return; }
    if (G.waveQueue.length) {
      const w = G.waveQueue.shift();
      G.curWave = { id: ++G.waveId, t: 0, doneT: 0, events: null };
      G.curWave.events = w.make();
    } else if (G.enemies.length === 0) {
      G.phase = 'warning';
      G.phaseT = 0;
      AU.stopMusic(0.4);
      AU.sfx.warn();
    }
    return;
  }
  const w = G.curWave;
  w.t++;
  while (w.events.length && w.events[0].t <= w.t) w.events.shift().fn();
  if (w.events.length) return;
  w.doneT++;
  let alive = 0;
  for (const e of G.enemies) if (e.wave === w.id && !e.dead && e.type !== 'ufo') alive++;
  if (alive <= 1 || w.doneT > 420) { G.curWave = null; G.waveGap = 35; }
}

export function updateDirector() {
  G.phaseT++;
  G.introT++;
  switch (G.phase) {
    case 'intro':
      if (G.phaseT >= 100) { G.phase = 'waves'; G.phaseT = 0; }
      break;
    case 'waves':
      updateWaves();
      break;
    case 'warning':
      if (G.phaseT >= 180) { spawnBoss(); G.phase = 'boss'; G.phaseT = 0; AU.playMusic('boss'); }
      break;
    case 'bossDeath':
      if (!G.boss && G.phaseT > 230) {
        G.phase = 'clear';
        G.phaseT = 0;
        const info = G.clearInfo || { boss: 0 };
        info.nomiss = G.stageDeaths === 0 ? 5000 * G.stage : 0;
        addScore(info.nomiss);
        G.clearInfo = info;
        AU.playMusic('clear');
      }
      break;
    case 'clear':
      if (G.phaseT > 230) G.warp = Math.min(9, G.warp + 0.15);
      if (G.phaseT >= 320) startStage(G.stage + 1);
      break;
  }
  if (G.phase !== 'clear' && G.warp > 1) G.warp = Math.max(1, G.warp - 0.12);
}
