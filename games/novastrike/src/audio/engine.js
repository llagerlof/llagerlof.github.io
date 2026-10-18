// Low-level WebAudio synth: mixer graph, voices, instruments and drum kit.
//
//   music voices -> musicBus -> musicFade -> musicFilter -> musicDuck -\
//   sfx voices   -> sfxBus -------------------------------------------- > compressor -> master -> out
//   any voice    -> (send) reverbIn / echoIn --------------------------/
import { W } from '../core/config.js';

export const A = { ac: null, tOff: 0 };

const clampv = (v, a, b) => (v < a ? a : v > b ? b : v);
export const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
export const panX = x => clampv((x / W) * 2 - 1, -1, 1) * 0.75;

// Returns true the first time the engine is created. Pass an
// OfflineAudioContext to render audio for testing.
export function initEngine(ctx) {
  if (A.ac) {
    if (A.ac.state === 'suspended' && A.ac.resume) A.ac.resume();
    return false;
  }
  let ac = ctx;
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { ac = new AC(); } catch (e) { return false; }
  }
  A.ac = ac;
  const gain = (v, to) => { const g = ac.createGain(); g.gain.value = v; if (to) g.connect(to); return g; };

  A.master = gain(0.8, ac.destination);
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -14; comp.knee.value = 8; comp.ratio.value = 3.5;
  comp.attack.value = 0.003; comp.release.value = 0.25;
  comp.connect(A.master);

  A.musicDuck = gain(1, comp);
  A.musicFilter = ac.createBiquadFilter();
  A.musicFilter.type = 'lowpass';
  A.musicFilter.frequency.value = 20000;
  A.musicFilter.connect(A.musicDuck);
  A.musicFade = gain(1, A.musicFilter);
  A.musicBus = gain(0.5, A.musicFade);
  A.sfxBus = gain(0.8, comp);

  // Reverb send: generated impulse response, no assets needed.
  A.reverbIn = gain(1);
  const rv = ac.createConvolver();
  rv.buffer = impulse(ac, 2.2, 3);
  A.reverbIn.connect(rv);
  rv.connect(gain(0.35, comp));

  // Echo send: filtered feedback delay; the music player syncs it to the tempo.
  A.echoIn = gain(1);
  A.delay = ac.createDelay(2);
  A.delay.delayTime.value = 0.3;
  const fb = gain(0.33);
  const tone = ac.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 2800;
  A.echoIn.connect(A.delay);
  A.delay.connect(tone);
  tone.connect(fb);
  fb.connect(A.delay);
  tone.connect(gain(0.45, comp));

  const nb = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const d = nb.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  A.noise = nb;

  // NES-style pulse waves at the classic duty cycles.
  A.waves = { pulse12: pulse(ac, 0.125), pulse25: pulse(ac, 0.25), pulse50: pulse(ac, 0.5) };
  return true;
}

function impulse(ac, sec, decay) {
  const len = Math.floor(ac.sampleRate * sec);
  const b = ac.createBuffer(2, len, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = b.getChannelData(ch);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return b;
}

// Fourier series of a pulse train with the given duty cycle.
function pulse(ac, duty) {
  const n = 48;
  const re = new Float32Array(n), im = new Float32Array(n);
  for (let k = 1; k < n; k++) re[k] = (2 / (k * Math.PI)) * Math.sin(Math.PI * k * duty);
  return ac.createPeriodicWave(re, im);
}

const now = () => A.ac.currentTime + A.tOff;

// Connects a voice to its destination with optional stereo pan and effect sends.
export function route(node, { dest, pan, rev, echo } = {}) {
  const ac = A.ac;
  let out = node;
  if (pan && ac.createStereoPanner) {
    const p = ac.createStereoPanner();
    p.pan.value = pan;
    node.connect(p);
    out = p;
  }
  out.connect(dest || A.sfxBus);
  if (rev) { const g = ac.createGain(); g.gain.value = rev; out.connect(g); g.connect(A.reverbIn); }
  if (echo) { const g = ac.createGain(); g.gain.value = echo; out.connect(g); g.connect(A.echoIn); }
}

export function makeOsc(wave, freq, t) {
  const o = A.ac.createOscillator();
  if (A.waves[wave]) o.setPeriodicWave(A.waves[wave]);
  else o.type = wave;
  o.frequency.setValueAtTime(freq, t);
  return o;
}

// One-shot pitched blip with a pitch sweep from f0 to f1.
export function tone({ wave = 'square', f0, f1 = f0, dur = 0.1, vol = 0.1, t, delay = 0, attack = 0.003,
  curve = 'exp', dest, pan, rev, echo }) {
  if (!A.ac) return;
  t = (t !== undefined ? t : now()) + delay;
  const o = makeOsc(wave, f0, t);
  if (f1 !== f0) {
    if (curve === 'lin') o.frequency.linearRampToValueAtTime(f1, t + dur);
    else o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  }
  const g = A.ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  route(g, { dest, pan, rev, echo });
  o.start(t);
  o.stop(t + dur + 0.05);
}

// One-shot filtered noise burst; the filter cutoff sweeps f0 -> f1.
export function noise({ dur = 0.2, vol = 0.2, f0 = 3000, f1 = f0, type = 'lowpass', q = 1, t, delay = 0,
  attack = 0.001, dest, pan, rev }) {
  if (!A.ac) return;
  const ac = A.ac;
  t = (t !== undefined ? t : now()) + delay;
  const s = ac.createBufferSource();
  s.buffer = A.noise;
  const f = ac.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f);
  f.connect(g);
  route(g, { dest, pan, rev });
  s.start(t, Math.random() * 1.5);
  s.stop(t + dur + 0.05);
}

// Dips the music briefly so big sound effects punch through.
export function duck(amount = 0.35, hold = 0.15, release = 1.0) {
  if (!A.ac) return;
  const g = A.musicDuck.gain, t = A.ac.currentTime;
  g.cancelScheduledValues(t);
  g.setValueAtTime(g.value, t);
  g.linearRampToValueAtTime(amount, t + 0.03);
  g.setValueAtTime(amount, t + 0.03 + hold);
  g.linearRampToValueAtTime(1, t + 0.03 + hold + release);
}

export function setEchoTime(sec) {
  if (A.ac) A.delay.delayTime.setValueAtTime(clampv(sec, 0.05, 1.9), A.ac.currentTime);
}

// ------------------------------------------------------------------ INSTRUMENTS
// a/d/s/r: ADSR envelope (s is a fraction of vol). filter: lowpass with an
// optional envelope sweep. vib: delayed vibrato in cents. sub: extra oscillator
// one octave down. detune: chorus (three oscillators, +/- cents).
export const INST = {
  lead25:   { wave: 'pulse25', a: 0.005, d: 0.12, s: 0.55, r: 0.08, vol: 0.13, vib: { rate: 5.5, depth: 14, delay: 0.16 }, echo: 0.3, rev: 0.12 },
  lead12:   { wave: 'pulse12', a: 0.005, d: 0.12, s: 0.6, r: 0.08, vol: 0.12, vib: { rate: 6, depth: 12, delay: 0.14 }, echo: 0.3, rev: 0.12 },
  leadSaw:  { wave: 'sawtooth', a: 0.004, d: 0.1, s: 0.6, r: 0.06, vol: 0.085, filter: { f: 2400, q: 3, env: 2200 }, vib: { rate: 6.5, depth: 16, delay: 0.12 }, detune: 7, echo: 0.22, rev: 0.1 },
  softLead: { wave: 'triangle', a: 0.03, d: 0.2, s: 0.75, r: 0.45, vol: 0.2, vib: { rate: 4.5, depth: 10, delay: 0.3 }, echo: 0.5, rev: 0.45 },
  arp:      { wave: 'pulse50', a: 0.002, d: 0.06, s: 0.3, r: 0.03, vol: 0.04, echo: 0.18, rev: 0.08 },
  arpTri:   { wave: 'triangle', a: 0.002, d: 0.12, s: 0.4, r: 0.12, vol: 0.09, echo: 0.4, rev: 0.3 },
  bass:     { wave: 'triangle', a: 0.003, d: 0.08, s: 0.8, r: 0.04, vol: 0.4, sub: { wave: 'pulse50', vol: 0.15 } },
  bassSaw:  { wave: 'sawtooth', a: 0.003, d: 0.1, s: 0.6, r: 0.05, vol: 0.15, filter: { f: 420, q: 7, env: 1100 }, sub: { wave: 'triangle', vol: 1.2 } },
  pad:      { wave: 'pulse50', a: 0.25, d: 0.3, s: 0.8, r: 0.6, vol: 0.03, detune: 9, filter: { f: 1400, q: 0.5 }, rev: 0.5 },
};

export function playNote(inst, midi, t, dur, dest) {
  const ac = A.ac;
  const f = mtof(midi);
  const hold = Math.max(inst.a + inst.d, dur);
  const end = t + hold + inst.r;

  const g = ac.createGain();
  const p = g.gain;
  const sus = Math.max(0.0001, inst.vol * inst.s);
  p.setValueAtTime(0.0001, t);
  p.linearRampToValueAtTime(inst.vol, t + inst.a);
  p.exponentialRampToValueAtTime(sus, t + inst.a + inst.d);
  p.setValueAtTime(sus, t + hold);
  p.exponentialRampToValueAtTime(0.0001, end);

  let input = g;
  if (inst.filter) {
    const fl = ac.createBiquadFilter();
    fl.type = 'lowpass';
    fl.Q.value = inst.filter.q;
    if (inst.filter.env) {
      fl.frequency.setValueAtTime(inst.filter.f + inst.filter.env, t);
      fl.frequency.exponentialRampToValueAtTime(inst.filter.f, t + inst.a + inst.d * 2 + 0.05);
    } else fl.frequency.setValueAtTime(inst.filter.f, t);
    fl.connect(g);
    input = fl;
  }

  const oscs = [];
  const add = (wave, freq, det, level) => {
    const o = makeOsc(wave, freq, t);
    if (det) o.detune.value = det;
    if (level !== undefined) {
      const lg = ac.createGain();
      lg.gain.value = level;
      o.connect(lg);
      lg.connect(input);
    } else o.connect(input);
    oscs.push(o);
  };
  add(inst.wave, f, 0);
  if (inst.detune) { add(inst.wave, f, inst.detune, 0.7); add(inst.wave, f, -inst.detune, 0.7); }
  if (inst.sub) add(inst.sub.wave, f / 2, 0, inst.sub.vol);

  if (inst.vib && hold > inst.vib.delay) {
    const lfo = ac.createOscillator();
    lfo.frequency.value = inst.vib.rate;
    const depth = ac.createGain();
    depth.gain.setValueAtTime(0, t);
    depth.gain.setValueAtTime(0, t + inst.vib.delay);
    depth.gain.linearRampToValueAtTime(inst.vib.depth, t + inst.vib.delay + 0.15);
    lfo.connect(depth);
    for (const o of oscs) depth.connect(o.detune);
    lfo.start(t);
    lfo.stop(end + 0.02);
  }

  route(g, { dest: dest || A.musicBus, rev: inst.rev, echo: inst.echo });
  for (const o of oscs) { o.start(t); o.stop(end + 0.02); }
}

// ------------------------------------------------------------------ DRUM KIT
// k kick, s snare, h closed hat, o open hat, c crash, t high tom, T low tom
export const DRUM_KIT = {
  k(t, d) {
    tone({ wave: 'sine', f0: 155, f1: 42, dur: 0.16, vol: 0.85, t, dest: d });
    noise({ type: 'highpass', f0: 3000, dur: 0.012, vol: 0.12, t, dest: d });
  },
  s(t, d) {
    noise({ type: 'bandpass', f0: 1900, q: 0.7, dur: 0.17, vol: 0.38, t, dest: d, rev: 0.12 });
    tone({ wave: 'triangle', f0: 200, f1: 135, dur: 0.08, vol: 0.32, t, dest: d });
  },
  h(t, d) { noise({ type: 'highpass', f0: 7500, dur: 0.035, vol: 0.12, t, dest: d }); },
  o(t, d) { noise({ type: 'highpass', f0: 6500, dur: 0.24, vol: 0.1, t, dest: d }); },
  c(t, d) {
    noise({ type: 'highpass', f0: 4200, f1: 3000, dur: 1.3, vol: 0.16, t, dest: d, rev: 0.3 });
    noise({ type: 'bandpass', f0: 8000, q: 1, dur: 0.6, vol: 0.08, t, dest: d });
  },
  t(t, d) { tone({ wave: 'sine', f0: 230, f1: 115, dur: 0.18, vol: 0.45, t, dest: d }); },
  T(t, d) { tone({ wave: 'sine', f0: 150, f1: 70, dur: 0.22, vol: 0.5, t, dest: d }); },
};

export function playDrum(name, t, dest) {
  const fn = DRUM_KIT[name];
  if (fn) fn(t, dest || A.musicBus);
}
