// Sound effects, all synthesized. Most take the emitter's x position for
// stereo panning. Rapid-fire sounds are rate-limited so they don't pile up.
import { A, tone, noise, duck, mtof, panX } from './engine.js';

const last = {};
function gate(name, ms) {
  if (!A.ac) return false;
  const t = performance.now();
  if (last[name] && t - last[name] < ms) return false;
  last[name] = t;
  return true;
}

const PENTA = [0, 3, 5, 7, 10, 12, 15, 17];
const arpeggio = (notes, base, step, o) =>
  notes.forEach((n, i) => tone(Object.assign({ f0: mtof(base + n), delay: i * step }, o)));

export const sfx = {
  // ---------------------------------------------------------------- player
  shoot(x) {
    if (!gate('shoot', 70)) return;
    const pan = panX(x);
    tone({ wave: 'pulse25', f0: 1650 + Math.random() * 150, f1: 480, dur: 0.055, vol: 0.04, pan });
    noise({ type: 'highpass', f0: 6500, dur: 0.02, vol: 0.02, pan });
  },
  missile(x) {
    if (!gate('missile', 130)) return;
    const pan = panX(x);
    noise({ type: 'bandpass', f0: 800, f1: 4200, q: 3, dur: 0.2, vol: 0.07, pan });
    tone({ wave: 'sawtooth', f0: 180, f1: 900, dur: 0.16, vol: 0.02, pan });
  },
  bomb(x) {
    const pan = panX(x);
    noise({ type: 'bandpass', f0: 200, f1: 4500, q: 1.5, dur: 0.35, vol: 0.25, pan });
    noise({ type: 'lowpass', f0: 3000, f1: 40, dur: 1.9, vol: 0.6, delay: 0.15, rev: 0.4 });
    tone({ wave: 'sawtooth', f0: 110, f1: 25, dur: 1.5, vol: 0.28, delay: 0.15 });
    tone({ wave: 'sine', f0: 65, f1: 24, dur: 1.6, vol: 0.55, delay: 0.15 });
    duck(0.25, 0.4, 1.6);
  },
  die(x) {
    const pan = panX(x);
    noise({ type: 'lowpass', f0: 5000, f1: 50, dur: 1.5, vol: 0.55, pan, rev: 0.35 });
    tone({ wave: 'pulse25', f0: 880, f1: 40, dur: 1.1, vol: 0.12, pan });
    tone({ wave: 'sine', f0: 90, f1: 30, dur: 0.9, vol: 0.45 });
    duck(0.2, 0.6, 1.6);
  },
  shieldBreak(x) {
    const pan = panX(x);
    tone({ wave: 'triangle', f0: 2300, f1: 280, dur: 0.38, vol: 0.16, pan, rev: 0.25 });
    noise({ type: 'highpass', f0: 6500, f1: 1500, dur: 0.32, vol: 0.14, pan });
    arpeggio([24, 19, 15, 12, 7], 72, 0.035, { wave: 'pulse12', dur: 0.06, vol: 0.04, pan });
  },
  graze(x) {
    if (!gate('graze', 50)) return;
    tone({ wave: 'sine', f0: 2700 + Math.random() * 300, dur: 0.03, vol: 0.03, pan: panX(x) });
  },

  // ---------------------------------------------------------------- pickups and score
  power(kind) {
    if (!gate('power', 60)) return;
    switch (kind) {
      case 'P': arpeggio([0, 4, 7, 12, 16, 19], 72, 0.04, { wave: 'pulse25', dur: 0.09, vol: 0.06, echo: 0.25 }); break;
      case 'M':
        for (let i = 0; i < 3; i++) {
          tone({ wave: 'pulse12', f0: 1320, dur: 0.04, vol: 0.06, delay: i * 0.09 });
          tone({ wave: 'pulse12', f0: 1760, dur: 0.04, vol: 0.06, delay: i * 0.09 + 0.045 });
        }
        break;
      case 'S':
        tone({ wave: 'triangle', f0: 500, f1: 2600, dur: 0.4, vol: 0.12, rev: 0.4 });
        arpeggio([12, 19, 24, 31], 79, 0.06, { wave: 'pulse12', dur: 0.12, vol: 0.035, echo: 0.4 });
        break;
      case 'B':
        noise({ type: 'lowpass', f0: 600, dur: 0.12, vol: 0.2 });
        arpeggio([0, 7, 12], 55, 0.07, { wave: 'pulse50', dur: 0.12, vol: 0.08 });
        break;
      default: break;
    }
  },
  oneup() {
    arpeggio([0, 3, 12, 8, 10, 15], 76, 0.075, { wave: 'pulse25', dur: 0.11, vol: 0.07, echo: 0.35 });
  },
  chainUp(mult) {
    if (!gate('chain', 100)) return;
    const base = 72 + mult * 2;
    tone({ wave: 'pulse12', f0: mtof(base), dur: 0.05, vol: 0.05 });
    tone({ wave: 'pulse12', f0: mtof(base + 7), dur: 0.08, vol: 0.05, delay: 0.05, echo: 0.3 });
  },
  // Sparkle when bullets turn into points (bombs, phase changes).
  cancel() {
    if (!gate('cancel', 200)) return;
    for (let i = 0; i < 6; i++) {
      tone({ wave: 'pulse12', f0: mtof(84 + PENTA[Math.floor(Math.random() * PENTA.length)]), dur: 0.07, vol: 0.025, delay: i * 0.04, echo: 0.4 });
    }
  },

  // ---------------------------------------------------------------- enemies
  hit(x) {
    if (!gate('hit', 40)) return;
    tone({ wave: 'pulse12', f0: 900, f1: 300, dur: 0.04, vol: 0.04, pan: panX(x) });
  },
  bossHit(x) {
    if (!gate('bossHit', 55)) return;
    const pan = panX(x);
    tone({ wave: 'square', f0: 230, f1: 180, dur: 0.05, vol: 0.035, pan });
    noise({ type: 'bandpass', f0: 3300, q: 8, dur: 0.05, vol: 0.06, pan });
  },
  deflect(x) {
    if (!gate('deflect', 80)) return;
    tone({ wave: 'triangle', f0: 2500, f1: 2200, dur: 0.06, vol: 0.04, pan: panX(x) });
  },
  // kind: 's' small orb, 'm'/'l' big orb, 'n' needle
  eshot(x, kind = 's') {
    if (!gate('eshot' + kind, 70)) return;
    const pan = panX(x);
    if (kind === 'n') tone({ wave: 'pulse12', f0: 1250, f1: 700, dur: 0.05, vol: 0.025, pan });
    else if (kind === 's') tone({ wave: 'sawtooth', f0: 640, f1: 260, dur: 0.08, vol: 0.02, pan });
    else {
      tone({ wave: 'pulse25', f0: 320, f1: 120, dur: 0.14, vol: 0.04, pan });
      noise({ type: 'lowpass', f0: 1500, f1: 300, dur: 0.1, vol: 0.05, pan });
    }
  },
  // size 1 small, 2 medium, 3 large
  explode(size, x) {
    if (!gate('explode' + size, size === 1 ? 35 : 60)) return;
    const pan = panX(x);
    if (size <= 1) {
      noise({ type: 'lowpass', f0: 3600, f1: 300, dur: 0.22, vol: 0.2, pan });
      tone({ wave: 'triangle', f0: 260, f1: 60, dur: 0.15, vol: 0.13, pan });
    } else if (size === 2) {
      noise({ type: 'lowpass', f0: 2600, f1: 120, dur: 0.45, vol: 0.3, pan, rev: 0.1 });
      tone({ wave: 'triangle', f0: 180, f1: 40, dur: 0.35, vol: 0.2, pan });
      noise({ type: 'highpass', f0: 5000, dur: 0.22, vol: 0.05, delay: 0.05, pan });
    } else {
      noise({ type: 'lowpass', f0: 1900, f1: 60, dur: 1.1, vol: 0.48, pan, rev: 0.3 });
      noise({ type: 'bandpass', f0: 450, q: 0.8, dur: 0.8, vol: 0.2, pan });
      tone({ wave: 'sine', f0: 95, f1: 28, dur: 0.9, vol: 0.45 });
      duck(0.55, 0.1, 0.8);
    }
  },
  rock(x) {
    if (!gate('rock', 50)) return;
    const pan = panX(x);
    noise({ type: 'bandpass', f0: 900, f1: 300, q: 2, dur: 0.2, vol: 0.2, pan });
    tone({ wave: 'square', f0: 120, f1: 60, dur: 0.08, vol: 0.05, pan });
  },

  // ---------------------------------------------------------------- bosses
  warn() {
    for (let i = 0; i < 6; i++) {
      const d = i * 0.46;
      tone({ wave: 'pulse50', f0: 440, f1: 660, dur: 0.23, vol: 0.08, delay: d, curve: 'lin', rev: 0.2 });
      tone({ wave: 'pulse50', f0: 660, f1: 440, dur: 0.23, vol: 0.08, delay: d + 0.23, curve: 'lin', rev: 0.2 });
      tone({ wave: 'triangle', f0: 110, dur: 0.4, vol: 0.2, delay: d });
    }
  },
  bossEnter() {
    noise({ type: 'lowpass', f0: 140, dur: 3.2, vol: 0.4, attack: 1.2 });
    tone({ wave: 'sine', f0: 38, f1: 44, dur: 3.2, vol: 0.35, attack: 1.0 });
  },
  roar() {
    tone({ wave: 'sawtooth', f0: 150, f1: 35, dur: 0.95, vol: 0.2, rev: 0.3 });
    tone({ wave: 'sawtooth', f0: 158, f1: 37, dur: 0.95, vol: 0.16 });
    noise({ type: 'lowpass', f0: 900, f1: 100, dur: 0.9, vol: 0.25 });
    duck(0.5, 0.3, 0.8);
  },
  charge(x) {
    const pan = panX(x);
    tone({ wave: 'sawtooth', f0: 80, f1: 1400, dur: 0.8, vol: 0.06, pan });
    tone({ wave: 'pulse12', f0: 160, f1: 2800, dur: 0.8, vol: 0.025, pan });
  },
  laser(x) {
    const pan = panX(x);
    noise({ type: 'bandpass', f0: 2400, q: 3, dur: 1.25, vol: 0.15, pan, rev: 0.2 });
    tone({ wave: 'sawtooth', f0: 85, f1: 78, dur: 1.25, vol: 0.1, pan });
    tone({ wave: 'pulse50', f0: 170, f1: 160, dur: 1.25, vol: 0.03, pan });
  },
  bossExplode() {
    for (let i = 0; i < 4; i++) {
      noise({ type: 'lowpass', f0: 2200, f1: 60, dur: 1.2, vol: 0.45, delay: i * 0.22, pan: (Math.random() - 0.5) * 1.2, rev: 0.4 });
    }
    tone({ wave: 'sine', f0: 80, f1: 20, dur: 2.6, vol: 0.6 });
    noise({ type: 'highpass', f0: 4000, f1: 800, dur: 1.5, vol: 0.12, delay: 0.3 });
    duck(0.15, 0.8, 2.0);
  },

  // ---------------------------------------------------------------- UI
  select() { tone({ wave: 'pulse25', f0: 880, f1: 1760, dur: 0.08, vol: 0.07 }); },
  start() {
    arpeggio([0, 4, 7, 12, 16, 24], 67, 0.045, { wave: 'pulse25', dur: 0.1, vol: 0.07, echo: 0.3 });
    noise({ type: 'bandpass', f0: 300, f1: 5000, q: 2, dur: 0.35, vol: 0.12 });
  },
  pause(on) {
    tone({ wave: 'pulse25', f0: on ? 1320 : 660, dur: 0.06, vol: 0.06 });
    tone({ wave: 'pulse25', f0: on ? 660 : 1320, dur: 0.08, vol: 0.06, delay: 0.07 });
  },
};

// ------------------------------------------------------------------ LOOPS
// Continuous sounds tied to an entity. Every loop is tracked so it can be
// silenced in one call when the world resets.
const loops = new Set();
const NOOP_LOOP = { update() {}, stop() {} };

// Wobbling hum for the power-up carrier UFO; follows its x for panning.
export function ufoHum() {
  const ac = A.ac;
  if (!ac) return NOOP_LOOP;
  const t = ac.currentTime;
  const out = ac.createGain();
  out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(0.035, t + 0.4);
  const pan = ac.createStereoPanner ? ac.createStereoPanner() : null;
  if (pan) { out.connect(pan); pan.connect(A.sfxBus); } else out.connect(A.sfxBus);

  const o1 = ac.createOscillator(); o1.setPeriodicWave(A.waves.pulse25); o1.frequency.value = 220;
  const o2 = ac.createOscillator(); o2.type = 'triangle'; o2.frequency.value = 330;
  const lfo = ac.createOscillator(); lfo.frequency.value = 7;
  const depth = ac.createGain(); depth.gain.value = 40;
  lfo.connect(depth); depth.connect(o1.frequency); depth.connect(o2.frequency);
  const mix = ac.createGain(); mix.gain.value = 0.6;
  o1.connect(out); o2.connect(mix); mix.connect(out);
  [o1, o2, lfo].forEach(o => o.start(t));

  const h = {
    update(x) { if (pan) pan.pan.setTargetAtTime(panX(x), ac.currentTime, 0.05); },
    stop() {
      if (!loops.has(h)) return;
      loops.delete(h);
      const n = ac.currentTime;
      out.gain.cancelScheduledValues(n);
      out.gain.setValueAtTime(out.gain.value, n);
      out.gain.exponentialRampToValueAtTime(0.0001, n + 0.15);
      [o1, o2, lfo].forEach(o => o.stop(n + 0.2));
    },
  };
  loops.add(h);
  return h;
}

export function stopLoops() {
  for (const h of [...loops]) h.stop();
}
