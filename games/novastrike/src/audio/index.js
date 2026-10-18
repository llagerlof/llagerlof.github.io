// Audio facade used by the rest of the game.
import { A, initEngine } from './engine.js';
import { sfx, ufoHum, stopLoops } from './sfx.js';
import { playSong, stopSong, setVariant, onEngineReady } from './music.js';
import { store } from '../core/util.js';

const MASTER = 0.8, MUSIC = 0.5;

const settings = { muted: false, music: true };
try { Object.assign(settings, JSON.parse(store('nova_audio') || '{}')); } catch (e) { /* bad json */ }

function save() { store('nova_audio', JSON.stringify(settings)); }

function apply() {
  if (!A.ac) return;
  const t = A.ac.currentTime;
  A.master.gain.setTargetAtTime(settings.muted ? 0 : MASTER, t, 0.02);
  A.musicBus.gain.setTargetAtTime(settings.music ? MUSIC : 0, t, 0.05);
}

export const AU = {
  // Browsers only allow audio after a user gesture, so call this from input handlers.
  init() {
    if (initEngine()) { apply(); onEngineReady(); }
  },
  sfx,
  ufoHum,
  stopLoops,
  playMusic: playSong,
  stopMusic: stopSong,
  musicVariant: setVariant,
  toggleMute() { settings.muted = !settings.muted; save(); apply(); },
  toggleMusic() { settings.music = !settings.music; save(); apply(); },
  // Muffles the music while the game is paused.
  setPaused(p) {
    if (!A.ac) return;
    A.musicFilter.frequency.setTargetAtTime(p ? 550 : 20000, A.ac.currentTime, 0.08);
  },
  get muted() { return settings.muted; },
  get musicOn() { return settings.music; },
};
