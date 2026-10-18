// Step sequencer: compiles the text songs in songs.js into per-step events and
// schedules them slightly ahead of time on the audio clock.
import { A, INST, playNote, playDrum, setEchoTime } from './engine.js';
import { SONGS, BASS, ARP, DRUMS } from './songs.js';

const LOOKAHEAD = 0.15;   // seconds scheduled ahead of the audio clock
const STEPS_PER_BAR = 16;

// ------------------------------------------------------------------ COMPILER
const NOTE_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const CHORD_IV = {
  '': [0, 4, 7], m: [0, 3, 7], dim: [0, 3, 6], sus4: [0, 5, 7], 5: [0, 7, 12],
  7: [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10],
};

const tokens = s => s.trim().split(/\s+/).filter(t => t !== '|');

export function parseNote(tok) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(tok);
  if (!m) return null;
  return 12 * (+m[3] + 1) + NOTE_PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}

export function parseChord(name) {
  const m = /^([A-G])([#b]?)(m7|maj7|m|dim|sus4|5|7)?$/.exec(name);
  if (!m) throw new Error('bad chord ' + name);
  let root = 48 + NOTE_PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  if (root < 52) root += 12; // keep chords between E3 and Eb4
  return { root, tones: CHORD_IV[m[3] || ''].map(i => root + i) };
}

function compileSection(song, sec, where) {
  const warn = msg => console.warn(`[music] ${where}: ${msg}`);
  const chords = tokens(sec.chords).map(parseChord);
  const bars = chords.length, len = bars * STEPS_PER_BAR;
  const steps = Array.from({ length: len }, () => []);
  const inst = Object.assign({}, song.inst, sec.inst);
  for (const ch in inst) if (!INST[inst[ch]]) warn(`unknown instrument ${inst[ch]}`);
  const perBar = (v, b) => (Array.isArray(v) ? v[b] : v);

  // Lays a 16-step pattern over bar b; fn(token, step, lengthInSteps).
  const lay = (table, name, b, fn) => {
    if (!name) return;
    const tpl = table[name];
    if (!tpl) { warn(`unknown pattern ${name}`); return; }
    const tk = tokens(tpl);
    if (tk.length !== STEPS_PER_BAR) warn(`pattern ${name} has ${tk.length} steps`);
    for (let i = 0; i < tk.length; i++) {
      const k = tk[i];
      if (k === '.' || k === '-') continue;
      let l = 1;
      while (i + l < tk.length && tk[i + l] === '-') l++;
      fn(k, b * STEPS_PER_BAR + i, l);
    }
  };

  for (let b = 0; b < bars; b++) {
    const ch = chords[b];
    lay(BASS, perBar(sec.bass, b), b, (k, s, l) => {
      const m = { R: ch.root - 12, O: ch.root, F: ch.root - 5, 5: ch.root - 5 + 12 }[k];
      if (m === undefined) warn(`bad bass token ${k}`);
      else steps[s].push({ inst: inst.bass, midi: [m], len: l });
    });
    lay(ARP, perBar(sec.arp, b), b, (k, s, l) => {
      if (k === 'C') { steps[s].push({ inst: inst.pad, midi: ch.tones, len: l }); return; }
      const d = +k, n = ch.tones.length;
      if (Number.isNaN(d)) { warn(`bad arp token ${k}`); return; }
      steps[s].push({ inst: inst.arp, midi: [ch.tones[d % n] + 12 * Math.floor(d / n) + 12], len: l });
    });
    lay(DRUMS, perBar(sec.drums, b), b, (k, s) => {
      for (const c of k) steps[s].push({ drum: c });
    });
  }

  if (sec.lead) {
    if (sec.lead.length !== bars) warn(`lead has ${sec.lead.length} bars, chords have ${bars}`);
    sec.lead.forEach((bar, i) => { const n = tokens(bar).length; if (n !== STEPS_PER_BAR) warn(`lead bar ${i + 1} has ${n} steps`); });
    const tk = sec.lead.flatMap(tokens);
    for (let i = 0; i < tk.length && i < len; i++) {
      const k = tk[i];
      if (k === '.' || k === '-') continue;
      const m = parseNote(k);
      if (m === null) { warn(`bad note ${k}`); continue; }
      let l = 1;
      while (i + l < tk.length && tk[i + l] === '-') l++;
      steps[i].push({ inst: inst.lead, midi: [m], len: l, legato: true });
    }
  }
  return { steps, len, bpm: sec.bpm || song.bpm };
}

function compileSong(name, song) {
  const sections = {};
  for (const k in song.sections) sections[k] = compileSection(song, song.sections[k], `${name}.${k}`);
  const lists = { intro: song.intro || [], loop: song.loop, intense: song.intense || null };
  for (const l in lists) {
    for (const s of lists[l] || []) if (!sections[s]) console.warn(`[music] ${name}: ${l} names missing section ${s}`);
  }
  return { name, bpm: song.bpm, loops: !song.once, sections, lists };
}

export const COMPILED = {};
for (const name in SONGS) COMPILED[name] = compileSong(name, SONGS[name]);

// ------------------------------------------------------------------ PLAYER
let cur = null, timer = null, pending = null;

function fire(ev, t, spb) {
  if (ev.drum) { playDrum(ev.drum, t); return; }
  const dur = ev.len * spb * (ev.legato ? 0.95 : 0.85);
  const inst = INST[ev.inst];
  if (!inst) return;
  for (const m of ev.midi) playNote(inst, m, t, dur);
}

function section() {
  return cur.song.sections[cur.song.lists[cur.list][cur.idx]];
}

function advance() {
  const lists = cur.song.lists;
  cur.idx++;
  if (cur.list !== 'intro' && cur.next) {
    cur.list = cur.next; cur.next = null; cur.idx = 0;
    return;
  }
  if (cur.idx >= lists[cur.list].length) {
    if (cur.list === 'intro') { cur.list = cur.next || 'loop'; cur.next = null; cur.idx = 0; }
    else if (!cur.song.loops) cur = null;
    else cur.idx = 0;
  }
}

// Schedules every step that starts before tEnd (audio-clock seconds).
export function scheduleUntil(tEnd) {
  if (!cur || !A.ac) return;
  if (cur.t < A.ac.currentTime - 0.25) cur.t = A.ac.currentTime + 0.03; // recover from a stalled tab
  while (cur && cur.t < tEnd) {
    const sec = section();
    const spb = 60 / sec.bpm / 4;
    for (const ev of sec.steps[cur.step]) fire(ev, cur.t, spb);
    cur.t += spb;
    if (++cur.step >= sec.len) { cur.step = 0; advance(); }
  }
}

export function playSong(name) {
  pending = name;
  if (!A.ac) return;
  const song = COMPILED[name];
  if (!song) { stopSong(); return; }
  const t = A.ac.currentTime;
  cur = { song, list: song.lists.intro.length ? 'intro' : 'loop', idx: 0, step: 0, next: null, t: t + 0.06 };
  A.musicFade.gain.cancelScheduledValues(t);
  A.musicFade.gain.setValueAtTime(1, t);
  setEchoTime((60 / song.bpm / 4) * 3); // dotted eighth
  if (!timer) timer = setInterval(() => scheduleUntil(A.ac.currentTime + LOOKAHEAD), 25);
}

export function stopSong(fade = 0) {
  pending = null;
  cur = null;
  if (fade && A.ac) {
    const g = A.musicFade.gain, t = A.ac.currentTime;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(0, t + fade);
  }
}

// Switch to an alternate loop (e.g. 'intense') at the next section boundary.
export function setVariant(v) {
  if (cur && cur.song.lists[v] && cur.list !== v) cur.next = v;
}

// Starts whatever was requested before the audio context existed.
export function onEngineReady() {
  if (pending) playSong(pending);
}

// Debug view of the player position, e.g. { song: 'boss', list: 'intense', section: 'X' }.
export function musicState() {
  if (!cur) return null;
  return { song: cur.song.name, list: cur.list, section: cur.song.lists[cur.list][cur.idx], next: cur.next };
}
