// Global constants and URL options.
//   ?stage=N   start at stage N        ?boss  skip straight to the boss
//   ?autoplay  demo AI plays           ?god   invincible

export const W = 180;
export const H = 320;
export const TAU = Math.PI * 2;
export const params = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
