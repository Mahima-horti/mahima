/*
 * The garden's one sound, synthesised with Web Audio (no files): "kachak", the crisp snap-and-rustle of a vine
 * springing out as each one starts to grow. Browsers only allow sound after the visitor interacts, so nothing plays
 * until the first click, key or scroll; the nav's sound button mutes it.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let started = false;
let muted = false;
const listeners = new Set<(m: boolean) => void>();

export const sound = {
  get muted() {
    return muted;
  },
  get on() {
    return started && !muted;
  },
  /** The browser is actually letting sound play right now (not still waiting for a click). */
  get running() {
    return started && !muted && ctx?.state === "running";
  },
};

function noiseBuffer(c: AudioContext, seconds: number) {
  const b = c.createBuffer(1, Math.floor(c.sampleRate * seconds), c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}
let noise: AudioBuffer | null = null;

function out() {
  return master!;
}

/** Starts the audio (call from a user gesture). Safe to call repeatedly. */
export function startAudio() {
  if (started) {
    if (ctx?.state === "suspended") void ctx.resume();
    return;
  }
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.9;
  // a touch of space: a short feedback echo through a low-pass, shared by everything
  const echo = ctx.createDelay(1);
  echo.delayTime.value = 0.28;
  const fb = ctx.createGain();
  fb.gain.value = 0.28;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 2400;
  master.connect(ctx.destination);
  master.connect(echo);
  echo.connect(lp).connect(fb).connect(echo);
  lp.connect(ctx.destination);
  noise = noiseBuffer(ctx, 2);
  started = true;
}

export function setMuted(m: boolean) {
  muted = m;
  if (ctx && master) master.gain.setTargetAtTime(m ? 0 : 0.9, ctx.currentTime, 0.15);
  listeners.forEach((f) => f(m));
}
export function onMute(f: (m: boolean) => void) {
  listeners.add(f);
  return () => listeners.delete(f);
}

/* ------------------------------------------------------------------ one-shots */

function burst(at: number, length: number, type: BiquadFilterType, freq: number, q: number, gain: number, attack = 0.002) {
  const c = ctx!;
  const s = c.createBufferSource();
  s.buffer = noise;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(gain, at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + length);
  s.connect(f).connect(g).connect(out());
  s.start(at, Math.random());
  s.stop(at + length + 0.05);
  return f;
}

/**
 * Leaves rustling as a vine springs in: a quick flurry of crisp, dry leaf-brushes (many tiny filtered noise
 * crackles of different brightness) over a soft swish, rising and settling in about half a second.
 */
export function kachak(strength = 1) {
  if (!sound.on || !ctx) return;
  const t = ctx.currentTime;
  const v = 0.55 + 0.45 * strength;
  // the swish: leaves moving through air
  const sw = burst(t, 0.65, "bandpass", 1100, 0.6, 0.1 * v, 0.18);
  sw.frequency.setValueAtTime(900, t);
  sw.frequency.linearRampToValueAtTime(2000, t + 0.6);
  // the rustle: leaf edges brushing one another, crowded at the start, thinning out
  const n = 14 + Math.round(10 * strength);
  for (let i = 0; i < n; i++) {
    const at = t + 0.5 * Math.pow(Math.random(), 1.6);
    // softer: lower, wider bands, gentler onsets and quieter brushes
    const len = 0.04 + Math.random() * 0.07;
    burst(at, len, "bandpass", 1200 + Math.random() * 2200, 0.8 + Math.random(), (0.025 + Math.random() * 0.045) * v, 0.015);
  }
}

/** "Whish": a soft, airy sweep as the next print slides into view, rising then falling away. */
export function whish() {
  if (!sound.on || !ctx) return;
  const t = ctx.currentTime;
  const f = burst(t, 0.6, "bandpass", 700, 0.9, 0.09, 0.22);
  f.frequency.setValueAtTime(600, t);
  f.frequency.linearRampToValueAtTime(1900, t + 0.28);
  f.frequency.linearRampToValueAtTime(900, t + 0.6);
}

let wind: { stop: () => void } | null = null;

/**
 * Soft wind over grass for the loader: low, breathy filtered noise with slow gusts, a brighter whisper of blades on
 * top, fading in gently. `stopWind()` lets it die away.
 */
export function startWind() {
  if (!ctx || wind) return;
  const c = ctx;
  const t = c.currentTime;
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  // soft but clearly there: wind over grass under the loader
  g.gain.linearRampToValueAtTime(0.4, t + 1.8);
  g.connect(out());
  const layer = (type: BiquadFilterType, freq: number, q: number, level: number, gustRate: number, gustDepth: number) => {
    const s = c.createBufferSource();
    s.buffer = noise;
    s.loop = true;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const lg = c.createGain();
    lg.gain.value = level;
    // gusts: the level and the brightness rise and fall slowly
    const lfo = c.createOscillator();
    lfo.frequency.value = gustRate;
    const amt = c.createGain();
    amt.gain.value = level * gustDepth;
    lfo.connect(amt).connect(lg.gain);
    const sweep = c.createGain();
    sweep.gain.value = freq * 0.35;
    lfo.connect(sweep).connect(f.frequency);
    s.connect(f).connect(lg).connect(g);
    s.start(t, Math.random());
    lfo.start(t);
    return [s, lfo];
  };
  const nodes = [...layer("lowpass", 450, 0.5, 0.16, 0.13, 0.6), ...layer("bandpass", 1600, 0.8, 0.05, 0.21, 0.8)];
  wind = {
    stop: () => {
      const now = c.currentTime;
      g.gain.cancelScheduledValues(now);
      g.gain.setValueAtTime(g.gain.value, now);
      g.gain.linearRampToValueAtTime(0, now + 1.8);
      nodes.forEach((n) => n.stop(now + 1.9));
    },
  };
}

export function stopWind() {
  wind?.stop();
  wind = null;
}

/** A single soft gust of wind over grass (the same voice as the loader's wind), swelling and dying away. */
export function windGust(strength = 1, length = 1.6) {
  if (!sound.on || !ctx) return;
  const c = ctx;
  const t = c.currentTime;
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.5 * strength, t + length * 0.35);
  g.gain.exponentialRampToValueAtTime(0.0001, t + length);
  g.connect(out());
  const layer = (type: BiquadFilterType, from: number, to: number, q: number, level: number) => {
    const s = c.createBufferSource();
    s.buffer = noise;
    const f = c.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(from, t);
    f.frequency.linearRampToValueAtTime(to, t + length * 0.4);
    f.frequency.linearRampToValueAtTime(from, t + length);
    const lg = c.createGain();
    lg.gain.value = level;
    s.connect(f).connect(lg).connect(g);
    s.start(t, Math.random());
    s.stop(t + length + 0.05);
  };
  layer("lowpass", 380, 900, 0.5, 0.2);
  // the hissy top fades out faster than the body as the gust gets gentler, so quiet gusts are just a soft breath
  layer("bandpass", 1300, 2600, 0.6, 0.06 * strength);
  // the whish itself: a clear sweep of air rising and falling with the gust
  layer("bandpass", 600, 2400, 1.1, 0.16 * strength);
}
