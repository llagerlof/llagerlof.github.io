import { W, H } from '../core/config.js';
import { rand } from '../core/util.js';
import { G } from '../core/state.js';
import { ctx } from '../gfx/canvas.js';
import { drawBackground } from '../world/background.js';
import { drawWorld, drawParticles } from './world.js';
import { drawHUD } from './hud.js';
import { drawOverlays, drawTitle } from './screens.js';

export function render() {
  ctx.fillStyle = G.bg;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  if (G.shake > 0.5) ctx.translate(Math.round(rand(-1, 1) * G.shake * 0.5), Math.round(rand(-1, 1) * G.shake * 0.5));
  drawBackground();
  if (G.state === 'title') drawParticles();
  else drawWorld();
  ctx.restore();

  if (G.state === 'title') drawTitle();
  else { drawHUD(); drawOverlays(); }

  if (G.flash > 0) {
    ctx.globalAlpha = Math.min(1, G.flash / 20) * 0.75;
    ctx.fillStyle = G.flashCol;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }
}
