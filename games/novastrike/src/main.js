// Entry point: canvas scaling, fixed-timestep loop, debug hooks.
import { W, H } from './core/config.js';
import { G, P } from './core/state.js';
import { cv } from './gfx/canvas.js';
import { AU } from './audio/index.js';
import { A, initEngine } from './audio/engine.js';
import { sfx } from './audio/sfx.js';
import { playSong, scheduleUntil, stopSong, musicState } from './audio/music.js';
import { update, setPaused } from './game.js';
import { render } from './render/index.js';

function resize() {
  const s = Math.min(innerWidth / W, innerHeight / H);
  // Prefer crisp integer scaling unless it would waste too much of the screen.
  const si = s >= 1 && Math.floor(s) / s > 0.85 ? Math.floor(s) : s;
  cv.style.width = Math.round(W * si) + 'px';
  cv.style.height = Math.round(H * si) + 'px';
}
addEventListener('resize', resize);
resize();

const autoPause = () => { if (G.state === 'play' && !G.demo) setPaused(true); };
addEventListener('blur', autoPause);
document.addEventListener('visibilitychange', () => { if (document.hidden) autoPause(); });

AU.playMusic('title'); // starts once the first input unlocks audio

const STEP = 1000 / 60;
let acc = 0, lastT = performance.now();
function frame(now) {
  acc += Math.min(100, now - lastT);
  lastT = now;
  while (acc >= STEP) { update(); acc -= STEP; }
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Console helpers: NOVA.step(n) advances n frames; NOVA.renderAudio(...) renders
// a song or every sound effect offline and returns level statistics.
window.NOVA = {
  G,
  get P() { return P; },
  get music() { return musicState(); },
  initAudio: () => AU.init(),
  step(n = 1) { for (let i = 0; i < n; i++) update(); render(); },
  async renderAudio(what, seconds = 8) {
    if (A.ac) throw new Error('renderAudio needs a fresh page (audio already started)');
    const sr = 44100;
    const oc = new OfflineAudioContext(2, sr * seconds, sr);
    initEngine(oc);
    if (what === 'sfx') {
      const names = Object.keys(sfx);
      const gap = seconds / names.length;
      const args = { power: ['P'], eshot: [W / 2, 'l'], explode: [3, W / 2], chainUp: [4], pause: [true] };
      names.forEach((n, i) => { A.tOff = i * gap; sfx[n](...(args[n] || [W / 2])); });
      A.tOff = 0;
    } else {
      playSong(what);
      scheduleUntil(seconds);
      stopSong();
    }
    const buf = await oc.startRendering();
    const L = buf.getChannelData(0), R = buf.getChannelData(1);
    let peak = 0, sum = 0, nan = 0;
    const perSec = [];
    for (let s = 0; s < seconds; s++) {
      let ss = 0;
      for (let i = s * sr; i < (s + 1) * sr; i++) {
        const v = (Math.abs(L[i]) + Math.abs(R[i])) / 2;
        if (Number.isNaN(L[i])) nan++;
        peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
        ss += v * v;
      }
      sum += ss;
      perSec.push(+Math.sqrt(ss / sr).toFixed(3));
    }
    return { peak: +peak.toFixed(3), rms: +Math.sqrt(sum / (sr * seconds)).toFixed(3), nan, perSec };
  },
};
