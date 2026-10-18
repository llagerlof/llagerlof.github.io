// Top-level game flow: title -> play <-> paused -> gameover, plus the per-frame update.
import { params } from './core/config.js';
import { G, BGS, resetPlayer } from './core/state.js';
import { store } from './core/util.js';
import { inp, ptr, activity, pollInput, anchorPointer } from './input.js';
import { AU } from './audio/index.js';
import { updateBackground } from './world/background.js';
import { updateFx, addScore } from './world/fx.js';
import { updateEnemyBullets } from './world/shots.js';
import { updateEnemies } from './world/enemies.js';
import { updateBeams } from './world/bosses.js';
import { updatePowerups } from './world/powerups.js';
import { updatePlayer, updatePlayerBullets, hitPlayer } from './world/player.js';
import { startStage, updateDirector } from './world/director.js';

function clearWorld() {
  AU.stopLoops();
  Object.assign(G, { bullets: [], ebullets: [], enemies: [], pups: [], beams: [], boss: null });
}

export function startGame(demo = false) {
  clearWorld();
  Object.assign(G, {
    state: 'play', demo, score: 0, lives: 3, bombs: 3, chain: 0, chainT: 0, mult: 1, nextLife: 50000,
    pops: [], rings: [], waveId: 0, dropMeter: 0, flash: 0, shake: 0, bombT: 0, newHi: false, graze: 0,
    demoT: 0, clearInfo: null,
  });
  const p = resetPlayer();
  if (demo) { p.power = 3; p.missiles = 1; }
  if (ptr.active) anchorPointer();
  startStage(Math.max(1, parseInt(params.get('stage'), 10) || 1));
  if (!demo) AU.sfx.start();
}

export function gameOver() {
  if (G.demo) { toTitle(); return; }
  G.state = 'gameover';
  G.goT = 0;
  if (G.score > G.hi) { G.hi = G.score; G.newHi = true; store('nova_hi', String(G.hi)); }
  AU.stopLoops();
  AU.playMusic('gameover');
}

export function toTitle() {
  clearWorld();
  Object.assign(G, { state: 'title', titleT: 0, demo: false, bg: BGS[0], warp: 1 });
  AU.playMusic('title');
}

export function setPaused(p) {
  if (p === (G.state === 'paused')) return;
  G.state = p ? 'paused' : 'play';
  AU.setPaused(p);
  AU.sfx.pause(p);
}

function onGraze(b, dx, dy) {
  G.graze++;
  addScore(20);
  G.parts.push({ x: b.x, y: b.y, vx: dx * 0.05, vy: dy * 0.05, life: 8, max: 8, kind: 'spark', col: '#c7dcd0', sz: 1, drag: 0.9 });
  AU.sfx.graze(b.x);
}

// fxOnly: keep the world animating without the player or stage progression (game over screen).
function updatePlay(fxOnly) {
  if (!fxOnly) { updateDirector(); updatePlayer(); }
  updatePlayerBullets();
  updateEnemies(fxOnly, hitPlayer);
  updateEnemyBullets(fxOnly, hitPlayer, onGraze);
  updateBeams(fxOnly, hitPlayer);
  updatePowerups(fxOnly);
  updateFx();
  if (G.chainT > 0 && --G.chainT === 0) { G.chain = 0; G.mult = 1; }
}

export function update() {
  pollInput();
  if (inp.muteP) AU.toggleMute();
  if (inp.musicP) AU.toggleMusic();
  G.t++;
  updateBackground();
  if (G.shake > 0) { G.shake *= 0.9; if (G.shake < 0.3) G.shake = 0; }
  if (G.flash > 0) G.flash--;

  switch (G.state) {
    case 'title':
      G.titleT++;
      updateFx();
      if (inp.startP) startGame(false);
      else if (G.titleT > 60 * 14 || params.has('autoplay')) startGame(true);
      break;
    case 'play':
      if (G.demo && !params.has('autoplay')) {
        G.demoT++;
        if (activity.any || G.demoT > 60 * 45) { toTitle(); break; }
      }
      if (inp.pauseP && !G.demo) { setPaused(true); break; }
      updatePlay(false);
      break;
    case 'paused':
      if (inp.pauseP || inp.startP) setPaused(false);
      break;
    case 'gameover':
      G.goT++;
      updatePlay(true);
      if (G.goT > 90 && inp.startP) toTitle();
      break;
  }
  activity.any = false;
}
