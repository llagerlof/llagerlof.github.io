// Regular enemy types: stats, movement/attack behaviours, damage and death.
import { W, H } from '../core/config.js';
import { rand, randi, chance } from '../core/util.js';
import { G, P } from '../core/state.js';
import { SPR } from '../gfx/sprites.js';
import { AU } from '../audio/index.js';
import { explode, spark, popup, addScore } from './fx.js';
import { canFire, aimAt, eShot, eFan } from './shots.js';
import { dropPup, randomPup } from './powerups.js';
import { bossDefeated, updateBoss } from './bosses.js';

// hp/score are base values; hp scales with stage difficulty. hw/hh: hitbox half-size.
export const ET = {
  drone:   { spr: 'drone',   hp: 2,  score: 100,  hw: 4, hh: 4, drop: 0.025 },
  diver:   { spr: 'diver',   hp: 4,  score: 150,  hw: 4, hh: 4, drop: 0.04 },
  swooper: { spr: 'swooper', hp: 2,  score: 120,  hw: 4, hh: 3, drop: 0.025 },
  shooter: { spr: 'shooter', hp: 10, score: 300,  hw: 5, hh: 4, drop: 0.12 },
  spinner: { spr: 'spinA',   hp: 24, score: 600,  hw: 4, hh: 4, drop: 0.3 },
  heavy:   { spr: 'heavy',   hp: 70, score: 1500, hw: 7, hh: 5, drop: 1 },
  rock:    { spr: 'rock',    hp: 10, score: 80,   hw: 5, hh: 5, drop: 0.02 },
  rockS:   { spr: 'rockS',   hp: 3,  score: 40,   hw: 3, hh: 3, drop: 0.01 },
  ufo:     { spr: 'ufo',     hp: 30, score: 2500, hw: 5, hh: 3, drop: 0 },
};

export function spawn(type, x, y, props) {
  const T = ET[type];
  const e = {
    type, x, y, vx: 0, vy: 0, t: 0, st: 0,
    hp: Math.max(1, Math.round(T.hp * G.diff.hp)), hw: T.hw, hh: T.hh, spr: SPR[T.spr],
    flash: 0, fireT: rand(40, 120) / G.diff.fire, wave: G.curWave ? G.curWave.id : 0,
  };
  Object.assign(e, props || {});
  e.maxHp = e.hp;
  if (e.x0 === undefined) e.x0 = e.x;
  if (e.y0 === undefined) e.y0 = e.y;
  if (type === 'ufo') e.hum = AU.ufoHum();
  G.enemies.push(e);
  return e;
}

function bez(p, t) {
  const u = 1 - t;
  return {
    x: u * u * u * p[0].x + 3 * u * u * t * p[1].x + 3 * u * t * t * p[2].x + t * t * t * p[3].x,
    y: u * u * u * p[0].y + 3 * u * u * t * p[1].y + 3 * u * t * t * p[2].y + t * t * t * p[3].y,
  };
}

// Swoopers enter from one side and loop across the screen along a bezier curve.
export function spawnSwoop(left) {
  const path = left
    ? [{ x: -10, y: 40 }, { x: W * 0.95, y: 10 }, { x: W * 0.95, y: 210 }, { x: W * 0.25, y: 150 }]
    : [{ x: W + 10, y: 40 }, { x: W * 0.05, y: 10 }, { x: W * 0.05, y: 210 }, { x: W * 0.75, y: 150 }];
  return spawn('swooper', path[0].x, path[0].y, { path, pt: 0, spd: 0.0075 * (1 + 0.04 * (G.stage - 1)), exitVx: left ? -0.9 : 0.9 });
}

// Per-type update functions, called once per frame.
export const BEH = {
  drone(e) {
    e.y += e.vy;
    e.x = e.x0 + Math.sin(e.t * e.freq + e.ph) * e.amp;
    if (G.stage >= 2 && --e.fireT <= 0) {
      e.fireT = rand(140, 260) / G.diff.fire;
      if (canFire(e) && chance(0.55)) eShot(e.x, e.y + 3, aimAt(e.x, e.y), 1.3, 'red', 's');
    }
  },
  diver(e) {
    if (e.st === 0) {
      e.y += (e.ty - e.y) * 0.045;
      if (Math.abs(e.ty - e.y) < 1.5) { e.st = 1; e.k = 0; }
    } else if (e.st === 1) {
      e.k++;
      e.x += Math.sin(e.k * 0.35) * 0.6;
      if (e.k > 36) {
        e.st = 2;
        const a = aimAt(e.x, e.y), sp = 2.2 * Math.min(G.diff.bspd, 1.5);
        e.vx = Math.cos(a) * sp; e.vy = Math.sin(a) * sp;
        if (G.stage >= 3 && canFire(e)) { eShot(e.x, e.y, a, 1.5, 'purple', 's'); AU.sfx.eshot(e.x, 's'); }
      }
    } else {
      e.x += e.vx; e.y += e.vy; e.vy += 0.03;
    }
  },
  swooper(e) {
    e.pt += e.spd;
    if (e.pt <= 1) { const p = bez(e.path, e.pt); e.x = p.x; e.y = p.y; }
    else { e.y += 2.2; e.x += e.exitVx; }
    if (!e.shot && e.pt > 0.5) {
      e.shot = true;
      if (canFire(e) && chance(0.25 + 0.06 * G.stage)) eShot(e.x, e.y, aimAt(e.x, e.y), 1.4, 'cyan', 's');
    }
  },
  shooter(e) {
    if (e.st === 0) {
      e.y += (e.ty - e.y) * 0.05;
      if (Math.abs(e.ty - e.y) < 1) { e.st = 1; e.k = 0; e.fireT = 20; }
    } else if (e.st === 1) {
      e.k++;
      e.x = e.x0 + Math.sin(e.k * 0.03) * 10;
      if (--e.fireT <= 0) { e.fireT = Math.max(40, 110 / G.diff.fire); e.burst = 3; e.bt = 0; }
      if (e.burst > 0 && ++e.bt % 7 === 0) {
        e.burst--;
        if (canFire(e)) { eShot(e.x, e.y + 4, aimAt(e.x, e.y), 1.6, 'red', 'm'); AU.sfx.eshot(e.x, 'm'); }
      }
      if (e.k > e.hold) e.st = 2;
    } else {
      e.vy = Math.min(e.vy + 0.04, 2);
      e.y += e.vy;
    }
  },
  spinner(e) {
    e.spr = (e.t >> 3) & 1 ? SPR.spinB : SPR.spinA;
    if (e.st === 0) {
      e.y += (e.ty - e.y) * 0.03;
      if (Math.abs(e.ty - e.y) < 1) { e.st = 1; e.k = 0; e.ang = 0; }
    } else if (e.st === 1) {
      e.k++;
      e.ang += 0.055;
      const iv = Math.max(5, Math.round(11 / G.diff.fire));
      if (e.k % iv === 0 && canFire(e)) {
        const arms = G.stage >= 4 ? 4 : 3;
        for (let i = 0; i < arms; i++) eShot(e.x, e.y, e.ang + (i / arms) * Math.PI * 2, 1.0, 'purple', 's');
        AU.sfx.eshot(e.x, 's');
      }
      if (e.k > 360) e.st = 2;
    } else {
      e.y += 1.1;
    }
  },
  heavy(e) {
    if (e.st === 0) {
      e.y += (e.ty - e.y) * 0.02;
      if (Math.abs(e.ty - e.y) < 1) { e.st = 1; e.k = 0; }
    } else if (e.st === 1) {
      e.k++;
      e.x += (e.x0 + Math.sin(e.k * 0.012) * 55 - e.x) * 0.05;
      if (e.k % Math.round(100 / G.diff.fire) === 0 && canFire(e)) {
        eFan(e.x, e.y + 5, aimAt(e.x, e.y), 5, 0.2, 1.25, 'orange', 'm');
        AU.sfx.eshot(e.x, 'l');
      }
      if (e.k % Math.round(46 / G.diff.fire) === 0 && canFire(e)) {
        eShot(e.x - 6, e.y + 5, Math.PI / 2, 2.0, 'red', 'n');
        eShot(e.x + 6, e.y + 5, Math.PI / 2, 2.0, 'red', 'n');
        AU.sfx.eshot(e.x, 'n');
      }
      if (e.k > 900) e.st = 2;
    } else {
      e.y += 0.6;
    }
  },
  rock(e) { e.x += e.vx; e.y += e.vy; },
  rockS(e) { e.x += e.vx; e.y += e.vy; },
  ufo(e) {
    e.x += e.vx;
    e.y = e.y0 + Math.sin(e.t * 0.05) * 6;
    if (e.hum) e.hum.update(e.x);
    if (e.t % 6 === 0) G.parts.push({ x: e.x + rand(-4, 4), y: e.y + 3, vx: 0, vy: 0.5, life: 10, max: 10, kind: 'spark', col: '#2ce8f5', sz: 1, drag: 1 });
  },
};

export function killEnemy(e) {
  e.dead = true;
  const T = ET[e.type];
  const oldMult = G.mult;
  G.chain++;
  G.chainT = 120;
  G.mult = Math.min(8, 1 + Math.floor(G.chain / 12));
  if (G.mult > oldMult) {
    AU.sfx.chainUp(G.mult);
    popup(e.x, e.y - 12, 'x' + G.mult + ' CHAIN', '#f77622', 50);
  }
  const pts = T.score * G.mult;
  addScore(pts);
  popup(e.x, e.y - 4, pts, G.mult > 1 ? '#fee761' : '#c7dcd0', 35);
  const isRock = e.type === 'rock' || e.type === 'rockS';
  explode(e.x, e.y, e.type === 'heavy' ? 3 : T.hp >= 10 ? 2 : 1, isRock);
  if (isRock) AU.sfx.rock(e.x);

  if (e.type === 'ufo') {
    dropPup(e.x - 5, e.y, randomPup(true));
    dropPup(e.x + 5, e.y, randomPup(chance(0.3)));
  } else {
    // A pity meter guarantees a drop now and then.
    G.dropMeter += T.score;
    const pity = G.dropMeter > 4500 ? 0.6 : 0;
    if (!e.minion && chance(T.drop + pity)) { dropPup(e.x, e.y, randomPup(false)); G.dropMeter = 0; }
  }
  if (e.type === 'rock') {
    const n = randi(2, 3);
    for (let i = 0; i < n; i++) spawn('rockS', e.x, e.y, { vx: rand(-0.9, 0.9), vy: rand(0.4, 1.3), wave: e.wave, flip: chance(0.5) });
  }
}

export function damage(e, dmg, x, y) {
  if (e.dead) return;
  if (e.isBoss) {
    if (e.st !== 'fight' || e.invulnT > 0) { spark(x, y, '#7f8fa6', 1); AU.sfx.deflect(x); return; }
    e.hp -= dmg;
    e.flash = 2;
    addScore(dmg * 4);
    spark(x, y, '#fee761', 2);
    AU.sfx.bossHit(x);
    if (e.hp <= 0) { e.hp = 0; bossDefeated(e); }
    return;
  }
  e.hp -= dmg;
  e.flash = 3;
  spark(x, y);
  AU.sfx.hit(x);
  if (e.hp <= 0) killEnemy(e);
}

export function nearestEnemy(x, y) {
  let best = null, bd = 1e9;
  for (const e of G.enemies) {
    if (e.dead || e.y < 4 || (e.isBoss && e.st !== 'fight')) continue;
    const d = (e.x - x) ** 2 + (e.y - y) ** 2;
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

export function updateEnemies(fxOnly, onTouchPlayer) {
  for (const e of G.enemies) {
    if (e.dead) continue;
    e.t++;
    if (e.flash > 0) e.flash--;
    if (e.isBoss) updateBoss(e); else BEH[e.type](e);
    if (!e.isBoss && e.t > 30 && (e.y > H + 20 || e.y < -60 || e.x < -40 || e.x > W + 40)) { e.dead = true; continue; }
    if (!e.dead && !fxOnly && !P.dead && P.inv <= 0 && !(e.isBoss && e.st === 'dying') &&
        Math.abs(e.x - P.x) < e.hw + 1 && Math.abs(e.y - P.y) < e.hh + 1) {
      onTouchPlayer();
      if (!e.isBoss) damage(e, 20, e.x, e.y);
    }
  }
  G.enemies = G.enemies.filter(e => {
    if (e.dead && e.hum) e.hum.stop();
    return !e.dead;
  });
}
