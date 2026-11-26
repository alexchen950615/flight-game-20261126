// Skyline Courier — synthesised sound.
// One file, one job: every sound is built with WebAudio oscillators, so the
// game ships no audio files and makes no network request. Sound starts on
// the first key press or click, as browsers require.

export function createAudio() {
  return {
    ctx: null,
    engineOsc: null,
    engineGain: null,
    muted: false,
    started: false,
  };
}

export function ensureAudio(audio) {
  if (audio.started || audio.muted) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    audio.ctx = new Ctx();
    audio.engineOsc = audio.ctx.createOscillator();
    audio.engineOsc.type = 'sawtooth';
    audio.engineOsc.frequency.value = 52;
    const filter = audio.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    audio.engineGain = audio.ctx.createGain();
    audio.engineGain.gain.value = 0.0;
    audio.engineOsc.connect(filter);
    filter.connect(audio.engineGain);
    audio.engineGain.connect(audio.ctx.destination);
    audio.engineOsc.start();
    audio.started = true;
  } catch {
    audio.started = false;
  }
}

// The engine hum follows throttle: pitch and loudness rise with power.
export function updateEngineSound(audio, throttle, speed) {
  if (!audio.started || !audio.ctx) return;
  const t = audio.ctx.currentTime;
  audio.engineOsc.frequency.setTargetAtTime(46 + throttle * 64 + speed * 0.08, t, 0.12);
  audio.engineGain.gain.setTargetAtTime(audio.muted ? 0 : 0.028 + throttle * 0.05, t, 0.1);
}

function blip(audio, freq, dur, vol, type = 'sine') {
  if (!audio.started || !audio.ctx || audio.muted) return;
  const t = audio.ctx.currentTime;
  const osc = audio.ctx.createOscillator();
  const gain = audio.ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain);
  gain.connect(audio.ctx.destination);
  osc.start(t);
  osc.stop(t + dur);
}

export function playRingChime(audio) {
  blip(audio, 880, 0.22, 0.16);
  setTimeout(() => blip(audio, 1318, 0.3, 0.14), 90);
}

export function playClipThud(audio) {
  blip(audio, 140, 0.25, 0.22, 'square');
}

export function playWarning(audio) {
  blip(audio, 520, 0.12, 0.12, 'square');
  setTimeout(() => blip(audio, 520, 0.12, 0.12, 'square'), 160);
}

export function playLandingFanfare(audio) {
  [523, 659, 784, 1046].forEach((freq, i) => {
    setTimeout(() => blip(audio, freq, 0.35, 0.15), i * 130);
  });
}

export function playCrash(audio) {
  blip(audio, 90, 0.7, 0.28, 'sawtooth');
  setTimeout(() => blip(audio, 55, 0.9, 0.22, 'sawtooth'), 120);
}
