// Full-screen overlays: title, stage intro, boss warning, stage clear, pause, game over.
import { W, H } from '../core/config.js';
import { pad } from '../core/util.js';
import { G } from '../core/state.js';
import { ctx } from '../gfx/canvas.js';
import { SPR, drawSpr } from '../gfx/sprites.js';
import { drawText } from '../gfx/font.js';
import { GRAD_GOLD, GRAD_CYAN, GRAD_RED } from '../gfx/palette.js';
import { AU } from '../audio/index.js';
import { bossForStage } from '../world/bosses.js';
import { drawFlames } from './world.js';

const blink = (rate, t = G.t) => (t >> rate) & 1;

function drawStageIntro() {
  const a = G.introT;
  if (a <= 10 || (a > 120 && blink(2, a))) return;
  drawText('STAGE ' + G.stage, W / 2, 120, GRAD_GOLD, { align: 'center', scale: 3 });
  const sub = G.stage === 1 ? 'GET READY!' : 'SECTOR ' + pad(G.stage * 7 + 3, 3) + ' - INCOMING';
  drawText(sub, W / 2, 145, '#c7dcd0', { align: 'center' });
}

function drawWarning() {
  const t = G.phaseT;
  ctx.fillStyle = 'rgba(158,40,53,' + (0.15 + 0.1 * Math.sin(t * 0.2)) + ')';
  ctx.fillRect(0, 0, W, H);
  for (const yy of [112, 160]) {
    ctx.fillStyle = '#9e2835'; ctx.fillRect(0, yy, W, 8);
    ctx.fillStyle = '#fee761';
    const off = (yy === 112 ? t : -t) % 10;
    for (let x = -10 + off; x < W + 10; x += 10) {
      for (let k = 0; k < 8; k++) ctx.fillRect(Math.round(x + k * 0.5), yy + k, 4, 1);
    }
  }
  if (blink(3, t)) drawText('WARNING', W / 2, 127, GRAD_RED, { align: 'center', scale: 3 });
  drawText('BOSS APPROACHING', W / 2, 146, '#f6757a', { align: 'center' });
  drawText(bossForStage(G.stage).name, W / 2, 176, '#ffffff', { align: 'center' });
}

function drawClear() {
  const t = G.phaseT, ci = G.clearInfo;
  const row = (label, value, y, col) => {
    drawText(label, 30, y, '#c7dcd0');
    drawText(String(value), W - 30, y, col, { align: 'right' });
  };
  if (t > 5) {
    drawText('STAGE ' + G.stage, W / 2, 96, GRAD_GOLD, { align: 'center', scale: 2 });
    drawText('CLEAR!', W / 2, 110, GRAD_GOLD, { align: 'center', scale: 2 });
  }
  if (t > 40) row('BOSS BONUS', ci.boss, 136, '#fee761');
  if (t > 70) row('NO MISS BONUS', ci.nomiss, 146, ci.nomiss ? '#fee761' : '#3e4a5c');
  if (t > 100) row('GRAZE', G.graze, 156, '#2ce8f5');
  if (t > 160 && blink(4, t)) drawText('PREPARE FOR WARP', W / 2, 180, '#7f8fa6', { align: 'center' });
}

function drawPause() {
  ctx.fillStyle = 'rgba(5,6,13,0.7)';
  ctx.fillRect(0, 0, W, H);
  drawText('PAUSED', W / 2, 120, GRAD_CYAN, { align: 'center', scale: 3 });
  drawText('P / ESC  RESUME', W / 2, 150, '#c7dcd0', { align: 'center' });
  drawText('M  SOUND ' + (AU.muted ? 'OFF' : 'ON'), W / 2, 160, '#c7dcd0', { align: 'center' });
  drawText('N  MUSIC ' + (AU.musicOn ? 'ON' : 'OFF'), W / 2, 170, '#c7dcd0', { align: 'center' });
}

function drawGameOver() {
  ctx.fillStyle = 'rgba(5,6,13,' + Math.min(0.7, G.goT / 60) + ')';
  ctx.fillRect(0, 0, W, H);
  drawText('GAME', W / 2, 100, GRAD_RED, { align: 'center', scale: 4 });
  drawText('OVER', W / 2, 124, GRAD_RED, { align: 'center', scale: 4 });
  if (G.goT > 30) {
    drawText('SCORE', W / 2, 160, '#7f8fa6', { align: 'center' });
    drawText(pad(G.score, 8), W / 2, 168, '#ffffff', { align: 'center', scale: 2 });
    drawText('REACHED STAGE ' + G.stage, W / 2, 186, '#c7dcd0', { align: 'center' });
  }
  if (G.newHi && G.goT > 50 && blink(3)) drawText('NEW HIGH SCORE!', W / 2, 200, GRAD_GOLD, { align: 'center' });
  if (G.goT > 90 && blink(4)) drawText('PRESS ENTER', W / 2, 230, '#fee761', { align: 'center' });
}

export function drawOverlays() {
  if (G.state === 'play' || G.state === 'paused') {
    if (G.introT < 150 && G.phase !== 'clear') drawStageIntro();
    if (G.phase === 'warning') drawWarning();
    if (G.phase === 'clear' && G.clearInfo) drawClear();
    if (G.demo && blink(5)) drawText('DEMO - PRESS ANY KEY', W / 2, H - 22, '#fee761', { align: 'center' });
  }
  if (G.state === 'paused') drawPause();
  if (G.state === 'gameover') drawGameOver();
}

const ROSTER = [['drone', 100], ['swooper', 120], ['diver', 150], ['shooter', 300], ['spinA', 600], ['heavy', 1500]];
const CONTROLS = [
  ['ARROWS/WASD', 'MOVE'], ['Z / SPACE', 'FIRE'], ['X', 'BOMB'], ['SHIFT', 'FOCUS'], ['P', 'PAUSE'], ['M / N', 'SOUND / MUSIC'],
];

export function drawTitle() {
  const t = G.titleT;
  const bob = Math.sin(t * 0.05) * 2;
  drawText('NOVA', W / 2, 40 + bob, GRAD_GOLD, { align: 'center', scale: 6, shadowCol: '#3e2731' });
  drawText('STRIKE', W / 2, 78 + bob, GRAD_CYAN, { align: 'center', scale: 4, shadowCol: '#122040' });
  drawText('- PIXEL SPACE SHOOTER -', W / 2, 104, '#7f8fa6', { align: 'center' });

  const s = SPR.player;
  const sx = W / 2 + Math.sin(t * 0.03) * 20, sy = 136 + Math.sin(t * 0.07) * 3;
  const dx = Math.round(sx - s.w / 2), dy = Math.round(sy - s.h / 2);
  drawFlames(dx, dy, s, false);
  ctx.drawImage(s.c, dx, dy);

  if (blink(4, t)) drawText('PRESS ENTER OR TAP', W / 2, 164, '#fee761', { align: 'center' });

  ROSTER.forEach(([k, pts], i) => {
    const x = 24 + (i % 3) * 58, y = 186 + Math.floor(i / 3) * 18;
    drawSpr(SPR[k], x, y);
    drawText(String(pts), x + 10, y - 2, '#7f8fa6');
  });

  CONTROLS.forEach(([a, b], i) => {
    drawText(a, W / 2 - 4, 225 + i * 9, '#c7dcd0', { align: 'right' });
    drawText(b, W / 2 + 4, 225 + i * 9, '#7f8fa6');
  });
  drawText('TOUCH: DRAG TO MOVE, 2ND FINGER BOMBS', W / 2, 284, '#3e4a5c', { align: 'center' });
  drawText('HI ' + pad(G.hi, 8), W / 2, 298, '#fee761', { align: 'center' });
  const audio = AU.muted ? 'SOUND OFF' : AU.musicOn ? '' : 'MUSIC OFF';
  if (audio) drawText(audio, W / 2, 310, '#3e4a5c', { align: 'center' });
}
