// Keyboard, gamepad and pointer (touch/mouse) input, merged into one `inp` state.
import { W, H } from './core/config.js';
import { G, P } from './core/state.js';
import { cv } from './gfx/canvas.js';
import { AU } from './audio/index.js';

const KEYMAP = {
  left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'], up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'],
  fire: ['Space', 'KeyZ', 'KeyJ'], bomb: ['KeyX', 'KeyK'], focus: ['ShiftLeft', 'ShiftRight'],
  pause: ['KeyP', 'Escape'], start: ['Enter', 'Space', 'KeyZ'], mute: ['KeyM'], music: ['KeyN'],
};

const keys = {};
const prev = {};

// Held actions (inp.left, inp.fire, ...) plus edge-triggered *P flags (inp.startP, ...).
export const inp = {};
// Set by any key/tap/button this frame; the game clears it after reading.
export const activity = { any: false };
// Pointer drag state. The ship follows the drag relative to where it started.
export const ptr = { active: false, id: null, sx: 0, sy: 0, cx: 0, cy: 0, shipX: 0, shipY: 0, tap: false, bomb: false };

export function anchorPointer() {
  ptr.sx = ptr.cx; ptr.sy = ptr.cy;
  ptr.shipX = P.x; ptr.shipY = P.y;
}

addEventListener('keydown', e => {
  AU.init();
  keys[e.code] = true;
  activity.any = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

function toGame(e) {
  const r = cv.getBoundingClientRect();
  return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
}

cv.addEventListener('pointerdown', e => {
  AU.init();
  activity.any = true;
  const p = toGame(e);
  ptr.tap = true;
  // Tapping the bomb icons, or touching with a second finger, drops a bomb.
  if (p.x > W - 44 && p.y > H - 16 && G.state === 'play') ptr.bomb = true;
  if (ptr.active) { ptr.bomb = true; return; }
  ptr.active = true;
  ptr.id = e.pointerId;
  ptr.cx = p.x; ptr.cy = p.y;
  anchorPointer();
  try { cv.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
});
cv.addEventListener('pointermove', e => {
  if (!ptr.active || e.pointerId !== ptr.id) return;
  const p = toGame(e);
  ptr.cx = p.x; ptr.cy = p.y;
});
const ptrEnd = e => { if (e.pointerId === ptr.id) { ptr.active = false; ptr.id = null; } };
cv.addEventListener('pointerup', ptrEnd);
cv.addEventListener('pointercancel', ptrEnd);
cv.addEventListener('contextmenu', e => e.preventDefault());

export function pollInput() {
  for (const a in KEYMAP) {
    prev[a] = inp[a];
    inp[a] = KEYMAP[a].some(k => keys[k]);
  }
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const gp of pads) {
    if (!gp) continue;
    const bt = i => !!(gp.buttons[i] && gp.buttons[i].pressed);
    const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
    inp.left = inp.left || ax < -0.35 || bt(14);
    inp.right = inp.right || ax > 0.35 || bt(15);
    inp.up = inp.up || ay < -0.35 || bt(12);
    inp.down = inp.down || ay > 0.35 || bt(13);
    inp.fire = inp.fire || bt(0) || bt(7);
    inp.bomb = inp.bomb || bt(1) || bt(2);
    inp.focus = inp.focus || bt(4) || bt(5) || bt(6);
    inp.start = inp.start || bt(9) || bt(0);
    inp.pause = inp.pause || bt(9);
    if (gp.buttons.some(b => b.pressed)) { activity.any = true; AU.init(); }
  }
  inp.startP = (inp.start && !prev.start) || ptr.tap;
  inp.bombP = (inp.bomb && !prev.bomb) || ptr.bomb;
  inp.pauseP = inp.pause && !prev.pause;
  inp.muteP = inp.mute && !prev.mute;
  inp.musicP = inp.music && !prev.music;
  ptr.tap = false;
  ptr.bomb = false;
}
