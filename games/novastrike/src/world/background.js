// Parallax starfield and procedurally generated, dithered pixel planets.
import { W, H, TAU } from '../core/config.js';
import { rand, randi, clamp, pick, chance } from '../core/util.js';
import { G } from '../core/state.js';
import { ctx } from '../gfx/canvas.js';

const STAR_SPD = [0.25, 0.6, 1.4];
const STAR_COL = ['#2a3350', '#5a6988', '#c7dcd0'];
const stars = [];
for (let i = 0; i < 90; i++) {
  const layer = i < 50 ? 0 : i < 76 ? 1 : 2;
  stars.push({ x: rand(0, W), y: rand(0, H), layer, tw: rand(0, TAU) });
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const PLANET_PALS = [
  ['#24142e', '#4a2a55', '#8a4a86'], ['#0f2427', '#1e4a3c', '#3e7a4a'], ['#2a1420', '#6e2633', '#b0553a'],
  ['#0c1530', '#123e70', '#1f7ab8'], ['#1c2033', '#363f55', '#69788f'], ['#2a1c24', '#5a3330', '#93593f'],
];

function makePlanet(atY) {
  const r = randi(12, 30), pal = pick(PLANET_PALS), ringed = chance(0.4);
  const padd = ringed ? Math.round(r * 0.75) : 1;
  const S = r * 2 + padd * 2 + 2;
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const g = c.getContext('2d');
  const cx = S / 2, cy = S / 2, seed = rand(0, 10), tilt = rand(-0.25, 0.25);
  const ring = front => {
    g.fillStyle = pal[2];
    const rx = r + padd - 1, ry = Math.max(2, r * 0.28);
    for (let i = 0; i < 260; i++) {
      const a = (i / 260) * TAU;
      const px = Math.cos(a) * rx, py = Math.sin(a) * ry;
      if ((py > 0) !== front) continue;
      g.fillRect(Math.round(cx + px), Math.round(cy + py + px * tilt), 1, 1);
    }
  };
  if (ringed) ring(false);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const nx = (x + 0.5 - cx) / r, ny = (y + 0.5 - cy) / r, d = nx * nx + ny * ny;
      if (d > 1) continue;
      const nz = Math.sqrt(1 - d);
      const light = -nx * 0.45 - ny * 0.55 + nz * 0.6;
      const band = Math.sin(ny * 7 + seed) * 0.12 + Math.sin(ny * 19 + seed * 2) * 0.05;
      const v = (light + band + 0.35) * 2.2 + (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.5);
      g.fillStyle = pal[clamp(Math.floor(v), 0, 2)];
      g.fillRect(x, y, 1, 1);
    }
  }
  if (ringed) ring(true);
  return { c, S, x: rand(20, W - 20), y: atY !== undefined ? atY : -S, vy: rand(0.05, 0.11) };
}

let planets = [makePlanet(rand(40, 160))];
let planetT = 1800;

export function ensurePlanet() {
  if (planets.length === 0) planets.push(makePlanet(rand(-40, 60)));
}

export function updateBackground() {
  const wm = G.warp;
  for (const s of stars) {
    s.y += STAR_SPD[s.layer] * wm;
    if (s.y > H) { s.y -= H + 4; s.x = rand(0, W); }
  }
  for (const p of planets) p.y += p.vy * (1 + (wm - 1) * 0.5);
  planets = planets.filter(p => p.y < H + p.S);
  if (--planetT <= 0) {
    if (planets.length < 2) planets.push(makePlanet());
    planetT = randi(2400, 3600);
  }
}

export function drawBackground() {
  ctx.globalAlpha = 0.75;
  for (const p of planets) ctx.drawImage(p.c, Math.round(p.x - p.S / 2), Math.round(p.y - p.S / 2));
  ctx.globalAlpha = 1;
  for (const s of stars) {
    let col = STAR_COL[s.layer];
    if (s.layer === 0 && Math.sin(G.t * 0.05 + s.tw) > 0.85) col = '#5a6988';
    ctx.fillStyle = col;
    const len = G.warp > 1.5 ? Math.round(STAR_SPD[s.layer] * G.warp * 1.4) : (s.layer === 2 ? 2 : 1);
    ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, len);
  }
}
