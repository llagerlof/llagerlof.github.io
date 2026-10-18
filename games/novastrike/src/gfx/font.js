// 3x5 bitmap font. Each glyph is 15 bits, row-major.
import { ctx } from './canvas.js';

const FONT = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
  E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
  I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100',
  Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111',
  0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
  4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010',
  8: '111101111101111', 9: '111101111001110',
  ' ': '000000000000000', '.': '000000000000010', ',': '000000000010100', '!': '010010010000010',
  '?': '110001010000010', ':': '000010000010000', '-': '000000111000000', '+': '000010111010000',
  '/': '001001010100100', 'x': '000101010101000', '%': '101001010100101', '(': '010100100100010',
  ')': '010001001001010', "'": '010010000000000', '>': '100010001010100', '<': '001010100010001',
  '=': '000111000111000', '*': '000101010101000',
};

export function textWidth(str, s = 1) {
  return str.length * 4 * s - s;
}

// col may be a colour string or an array of 5 per-row colours (gradient).
// opts: { align: 'left'|'center'|'right', scale, shadow, shadowCol }
export function drawText(str, x, y, col = '#fff', o = {}) {
  const s = o.scale || 1;
  str = String(str);
  const w = textWidth(str, s);
  if (o.align === 'center') x -= Math.floor(w / 2);
  else if (o.align === 'right') x -= w;
  x = Math.round(x);
  y = Math.round(y);
  if (o.shadow !== false) drawTextRaw(str, x, y + s, o.shadowCol || '#0a0b16', s);
  drawTextRaw(str, x, y, col, s);
}

export function drawTextRaw(str, x, y, col, s = 1) {
  const grad = Array.isArray(col);
  if (!grad) ctx.fillStyle = col;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    const gl = FONT[ch] || FONT[ch.toUpperCase()];
    if (!gl) continue;
    const ox = x + i * 4 * s;
    for (let r = 0; r < 5; r++) {
      if (grad) ctx.fillStyle = col[r];
      for (let c = 0; c < 3; c++) {
        if (gl[r * 3 + c] === '1') ctx.fillRect(ox + c * s, y + r * s, s, s);
      }
    }
  }
}
