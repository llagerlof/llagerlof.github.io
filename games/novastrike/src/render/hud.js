// Score bar, chain meter, boss health, lives/bombs/power indicators.
import { W, H } from '../core/config.js';
import { pad } from '../core/util.js';
import { G, P } from '../core/state.js';
import { ctx } from '../gfx/canvas.js';
import { SPR, drawSpr } from '../gfx/sprites.js';
import { drawText } from '../gfx/font.js';

function drawChain() {
  const col = G.mult >= 6 ? (G.t & 4 ? '#fee761' : '#f77622') : G.mult >= 3 ? '#f77622' : '#c7dcd0';
  drawText('x' + G.mult, 2, 12, col);
  drawText(G.chain + ' CHAIN', 12, 12, '#7f8fa6');
  ctx.fillStyle = '#3e4a5c'; ctx.fillRect(2, 19, 30, 1);
  ctx.fillStyle = col; ctx.fillRect(2, 19, Math.round((G.chainT / 120) * 30), 1);
}

function drawBossBar(b, y) {
  const x = 20, w = W - 40;
  drawText(b.name, W / 2, y, '#e43b44', { align: 'center' });
  ctx.fillStyle = '#1a1c2c'; ctx.fillRect(x - 1, y + 7, w + 2, 5);
  ctx.fillStyle = '#3e2731'; ctx.fillRect(x, y + 8, w, 3);
  const fw = Math.round(w * b.hp / b.maxHp);
  ctx.fillStyle = b.flash > 0 ? '#ffffff' : '#e43b44'; ctx.fillRect(x, y + 8, fw, 3);
  ctx.fillStyle = '#f6757a'; ctx.fillRect(x, y + 8, fw, 1);
  // phase markers
  ctx.fillStyle = '#1a1c2c';
  ctx.fillRect(x + Math.round(w * 0.33), y + 8, 1, 3);
  ctx.fillRect(x + Math.round(w * 0.66), y + 8, 1, 3);
}

export function drawHUD() {
  ctx.fillStyle = 'rgba(8,9,20,0.55)';
  ctx.fillRect(0, 0, W, 9);
  drawText(pad(G.score, 8), 2, 2, '#ffffff');
  drawText('STAGE ' + G.stage, W / 2, 2, '#7f8fa6', { align: 'center' });
  drawText('HI', W - 36, 2, '#7f8fa6', { align: 'right' });
  drawText(pad(Math.max(G.hi, G.score), 8), W - 2, 2, '#fee761', { align: 'right' });

  const chainShown = G.mult > 1 || G.chain >= 5;
  if (chainShown) drawChain();
  if (G.boss && G.boss.st !== 'enter') drawBossBar(G.boss, chainShown ? 24 : 13);

  // bottom bar: lives, power/missile pips, bombs
  ctx.fillStyle = 'rgba(8,9,20,0.55)';
  ctx.fillRect(0, H - 11, W, 11);
  const lv = Math.min(G.lives, 6);
  for (let i = 0; i < lv; i++) drawSpr(SPR.life, 6 + i * 9, H - 6);
  if (G.lives > 6) drawText('+' + (G.lives - 6), 6 + 6 * 9, H - 8, '#c7dcd0');
  const bm = Math.min(G.bombs, 6);
  for (let i = 0; i < bm; i++) drawSpr(SPR.bombI, W - 5 - i * 7, H - 6);

  const px = W / 2 - 22;
  drawText('P', px, H - 8, '#f77622');
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < P.power ? '#f77622' : '#3e4a5c';
    ctx.fillRect(px + 5 + i * 4, H - 8, 3, 5);
  }
  drawText('M', px + 28, H - 8, '#63c74d');
  for (let i = 0; i < 2; i++) {
    ctx.fillStyle = i < P.missiles ? '#63c74d' : '#3e4a5c';
    ctx.fillRect(px + 33 + i * 4, H - 8, 3, 5);
  }
  if (P.shield) { ctx.fillStyle = '#2ce8f5'; ctx.fillRect(px + 42, H - 8, 2, 5); }
}
