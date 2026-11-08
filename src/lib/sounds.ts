let ctx: AudioContext | null = null;
let enabled = true;
let lastChime = 0;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const Ctx =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    if (!ctx) ctx = new Ctx();
    return ctx;
  } catch {
    return null;
  }
}

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

export function primeAudio() {
  const current = audio();
  if (current?.state === "suspended") void current.resume();
}

function env(gain: GainNode, when: number, peak: number, seconds: number) {
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(peak, when + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + seconds);
}

function note(freq: number, when: number, seconds: number, peak: number) {
  const current = audio();
  if (!current) return;
  const osc = current.createOscillator();
  const overtone = current.createOscillator();
  const gain = current.createGain();
  const overtoneGain = current.createGain();
  osc.type = "sine";
  overtone.type = "triangle";
  osc.frequency.setValueAtTime(freq, when);
  overtone.frequency.setValueAtTime(freq * 2, when);
  overtoneGain.gain.setValueAtTime(0.22, when);
  osc.connect(gain);
  overtone.connect(overtoneGain);
  overtoneGain.connect(gain);
  gain.connect(current.destination);
  env(gain, when, peak, seconds);
  osc.start(when);
  overtone.start(when);
  osc.stop(when + seconds + 0.05);
  overtone.stop(when + seconds + 0.05);
}

export function playStart() {
  if (!enabled) return;
  const current = audio();
  if (!current) return;
  primeAudio();
  note(196, current.currentTime, 0.18, 0.05);
}

export function playPause() {
  if (!enabled) return;
  const current = audio();
  if (!current) return;
  primeAudio();
  note(146, current.currentTime, 0.12, 0.04);
}

export function playBreath() {
  if (!enabled) return;
  const current = audio();
  if (!current) return;
  note(392, current.currentTime, 0.16, 0.03);
}

export function playDone() {
  if (!enabled) return;
  const now = performance.now();
  if (now - lastChime < 3500) return;
  lastChime = now;
  const current = audio();
  if (!current) return;
  primeAudio();
  const start = current.currentTime + 0.02;
  const chord = [440, 554.37, 659.25];
  chord.forEach((freq, index) => note(freq, start + index * 0.2, 0.7, 0.09));
  note(880, start + 1.05, 0.9, 0.07);
}
