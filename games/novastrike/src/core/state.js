// Shared mutable game state. `G` holds the world; `P` is the player ship
// (an ES live binding, so replace it only through resetPlayer()).
import { W, H, params } from './config.js';
import { store } from './util.js';

export const BGS = ['#0b0d1e', '#130a1f', '#06151a', '#170b10', '#0a0f22'];

export function diffFor(stage) {
  const s = stage - 1;
  return {
    hp: 1 + 0.22 * s,
    bspd: Math.min(1.75, 1 + 0.07 * s),
    fire: Math.min(2.6, 1 + 0.16 * s),
    density: Math.min(2.2, 1 + 0.11 * s),
  };
}

export const G = {
  state: 'title', t: 0, titleT: 0, demo: false, god: params.has('god'),
  hi: parseInt(store('nova_hi'), 10) || 30000,
  score: 0, lives: 3, bombs: 3, chain: 0, chainT: 0, mult: 1, nextLife: 50000,
  stage: 1, phase: 'intro', phaseT: 0, introT: 0, waveQueue: [], curWave: null, waveGap: 0, waveId: 0,
  bullets: [], ebullets: [], enemies: [], parts: [], pups: [], pops: [], rings: [], beams: [],
  boss: null, shake: 0, flash: 0, flashCol: '#fff', bombT: 0, warp: 1, bg: BGS[0],
  dropMeter: 0, stageDeaths: 0, graze: 0, clearInfo: null, goT: 0, newHi: false, demoT: 0,
  diff: diffFor(1),
};

export const dens = () => G.diff.density;

export function newPlayer() {
  return {
    x: W / 2, y: H - 40, dead: 0, inv: 120, power: 1, missiles: 0, shield: false, fireT: 0, missT: 30,
    vx: 0, pods: [{ x: W / 2, y: H - 40 }, { x: W / 2, y: H - 40 }],
  };
}

export let P = newPlayer();

export function resetPlayer() {
  P = newPlayer();
  return P;
}
