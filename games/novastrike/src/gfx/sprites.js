// Pixel-art sprites, defined as strings of palette keys (see palette.js).
// '.' is transparent. { mirror: true } appends the row reversed, for symmetric bosses.
import { ctx } from './canvas.js';
import { PAL } from './palette.js';

export function makeSprite(rows, opts = {}) {
  if (opts.mirror) rows = rows.map(r => r + r.split('').reverse().join(''));
  const h = rows.length, w = rows[0].length;
  const pal = Object.assign({}, PAL, opts.pal || {});
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const wc = document.createElement('canvas'); wc.width = w; wc.height = h;
  const g = c.getContext('2d'), wg = wc.getContext('2d');
  wg.fillStyle = '#fff';
  for (let y = 0; y < h; y++) {
    if (rows[y].length !== w) console.warn('sprite row width mismatch', y, rows[y]);
    for (let x = 0; x < w; x++) {
      const ch = rows[y][x];
      if (ch === '.' || ch === undefined) continue;
      g.fillStyle = pal[ch] || '#ff00ff';
      g.fillRect(x, y, 1, 1);
      wg.fillRect(x, y, 1, 1);
    }
  }
  return { c, wc, w, h };
}

export function drawSpr(s, x, y, white = false, flip = false) {
  const dx = Math.round(x - s.w / 2), dy = Math.round(y - s.h / 2);
  const img = white ? s.wc : s.c;
  if (flip) {
    ctx.save(); ctx.translate(dx + s.w, dy); ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0); ctx.restore();
  } else ctx.drawImage(img, dx, dy);
}

export const SPR = {
  player: makeSprite([
    '......w......',
    '.....lwl.....',
    '.....lcl.....',
    '....lcbcl....',
    '....lbBbl....',
    '...glbBblg...',
    '.r.glllllg.r.',
    '.l.gllwllg.l.',
    'dlgglgwglggld',
    'dlglllllllgld',
    'dd.ddglgdd.dd',
    '....o...o....',
  ]),
  life: makeSprite([
    '...w...',
    '..lcl..',
    '.glblg.',
    'glllllg',
    'dg.o.gd',
  ]),
  bombI: makeSprite([
    '..w..',
    '.ooo.',
    'oyyyo',
    'oyyyo',
    '.ooo.',
  ]),
  pod: makeSprite([
    '.lll.',
    'lGwGl',
    'lGGGl',
    '.ldl.',
    '..o..',
  ]),
  heart: makeSprite([
    '.RR.RR.',
    'RmmRrrR',
    'RmrrrrR',
    '.RrrrR.',
    '..RrR..',
    '...R...',
  ]),
  shot: makeSprite([
    '.w.',
    'wyw',
    'wyw',
    '.y.',
    '.o.',
  ]),
  drone: makeSprite([
    'R.......R',
    'Rr.....rR',
    '.rrrrrrr.',
    'rryrrryrr',
    'rrrrrrrrr',
    '.rRrrrRr.',
    '.R.r.r.R.',
    'R.......R',
  ]),
  diver: makeSprite([
    '....p....',
    '...ppp...',
    '..pPwPp..',
    '.ppPPPpp.',
    'pp.ppp.pp',
    'p..pmp..p',
    'p...p...p',
    '....p....',
  ]),
  swooper: makeSprite([
    'c.......c',
    'cb.....bc',
    'cbb.w.bbc',
    '.cbbbbbc.',
    '..cbBbc..',
    '...cbc...',
    '....c....',
  ]),
  shooter: makeSprite([
    '..h.....h..',
    '.hGh...hGh.',
    '.hGGhhhGGh.',
    'hGGGyGyGGGh',
    'hGGGGGGGGGh',
    '.hGhGGGhGh.',
    '..h.hGh.h..',
    '.....h.....',
  ]),
  spinA: makeSprite([
    '....o....',
    '....o....',
    '...ooo...',
    '..oyyyo..',
    'oooywyooo',
    '..oyyyo..',
    '...ooo...',
    '....o....',
    '....o....',
  ]),
  spinB: makeSprite([
    'o.......o',
    '.o.....o.',
    '..ooooo..',
    '..oyyyo..',
    '..oywyo..',
    '..oyyyo..',
    '..ooooo..',
    '.o.....o.',
    'o.......o',
  ]),
  heavy: makeSprite([
    '..B.........B..',
    '.BbB.......BbB.',
    '.BbBdgggggdBbB.',
    'BbbBglllllgBbbB',
    'BbbBglrrrlgBbbB',
    'BbbBglrwrlgBbbB',
    'BbbBglrrrlgBbbB',
    '.BbBglllllgBbB.',
    '.BBBdgggggdBBB.',
    '..B..dd.dd..B..',
    '.....r...r.....',
  ]),
  rock: makeSprite([
    '...dggd...',
    '..dglllgd.',
    '.dglllggld',
    'dglgdlllgd',
    'dgllllldgd',
    'dgldllllgd',
    '.dglllgldd',
    '.ddglllgd.',
    '..ddggdd..',
    '....dd....',
  ]),
  rockS: makeSprite([
    '.dgg..',
    'dgllgd',
    'glldlg',
    'gllllg',
    'dglgd.',
    '.dd...',
  ]),
  ufo: makeSprite([
    '....ccc....',
    '...cwwwc...',
    '..ggggggg..',
    '.glylylylg.',
    'ggggggggggg',
    '..d.d.d.d..',
  ]),
  boss1: makeSprite([
    '..............dd',
    '............ddgg',
    '..........ddglll',
    '..R......dgllccc',
    '.RrR....dgllcbww',
    '.RrR...dggllcbbw',
    'RrrrR.dgglllcccc',
    'RrrrRdgglllllllg',
    'RryrRgglrrrlllgg',
    'RrrrRggrrRrrlgdd',
    'RrrrRdglrrrlggdk',
    '.RrRddgglllggddk',
    '.RrR.ddggggdddkk',
    '..R...ddgddRRRkk',
    '..R....dgd.RrrRk',
    '......dgd..RyyR.',
    '......dd....RR..',
    '......o.....oo..',
  ], { mirror: true }),
  boss2: makeSprite([
    '.....h............',
    '....hGh...........',
    '...hGGh.....hhhhhh',
    '..hGGh....hhGGGGGG',
    '..hGh...hhGGGGGGGG',
    '.hGGh..hGGGGPPPPPG',
    '.hGh..hGGGPPpppppP',
    'hGGh.hGGGPppmmmmmp',
    'hGh.hGGGPppmwwwwmm',
    'hGhhGGGGPpmwkkkkwm',
    'hGGGGGGGPpmwkkkkwm',
    '.hGGGGGGPppmwwwwmm',
    '..hhGGGGGPppmmmmmp',
    '....hhGGGGPPpppppP',
    '......hhGGGGPPPPPG',
    '....hGh.hhGGGGGGGG',
    '...hGh....hhhGGGGG',
    '..hGh.......hhhhhh',
    '..hh..............',
  ], { mirror: true }),
  boss3: makeSprite([
    '....................bb',
    '...................bcc',
    '..B...............bcww',
    '.BbB.............bBccc',
    '.BcB...........ddBbbbb',
    '.BcB.........ddggBBBBB',
    'BbcbB......ddggllgdddd',
    'BbcbBdddddggllllllgggg',
    'BbcbBgggggllllrrrlllll',
    'BbbbBlllllllllrwrlllll',
    'BBBBBgggggllllrrrlllll',
    '.ddddddgggggllllllgggg',
    '...dd.ddddgggggggggddd',
    '......B.ddddddgggddd..',
    '.....BbB...ddddddd....',
    '.....BcB.....dBBd.....',
    '.....BcB.....dBcB.....',
    '......B......dBcB.....',
    '......o.......BB......',
    '......o.......oo......',
  ], { mirror: true }),
};

// Enemy bullets: templates recoloured per colour set.
const BTPL = {
  s: ['.1.', '1w1', '.1.'],
  m: ['.111.', '12221', '12w21', '12221', '.111.'],
  l: ['..111..', '.12221.', '122w221', '12www21', '122w221', '.12221.', '..111..'],
  n: ['.1.', '121', '1w1', '1w1', '121', '.1.'],
};
export const BRAD = { s: 1.5, m: 2.2, l: 3.2, n: 1.6 };
const BCOL = {
  red:    { 1: '#e43b44', 2: '#f6757a' },
  orange: { 1: '#f77622', 2: '#fee761' },
  purple: { 1: '#a64cd9', 2: '#e3a6ff' },
  cyan:   { 1: '#0099db', 2: '#2ce8f5' },
  green:  { 1: '#3e8948', 2: '#9cf07a' },
};
export const BSPR = {};
for (const sz in BTPL) {
  BSPR[sz] = {};
  for (const col in BCOL) BSPR[sz][col] = makeSprite(BTPL[sz], { pal: BCOL[col] });
}
