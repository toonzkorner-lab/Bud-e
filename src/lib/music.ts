export type TrackId = "garden" | "porch" | "lamp";

export const TRACKS: { id: TrackId; name: string; detail: string }[] = [
  { id: "garden", name: "Night garden", detail: "A low hum and a slow pulse." },
  { id: "porch", name: "Porch", detail: "Soft noise, like air through a screen." },
  { id: "lamp", name: "Lamp", detail: "Two quiet notes, barely moving." },
];

let stopCurrent: (() => void) | null = null;

export function stopMusic(): void {
  stopCurrent?.();
  stopCurrent = null;
}

export function playTrack(id: TrackId): void {
  stopMusic();
  const ctx = new AudioContext();
  const master = ctx.createGain();
  master.gain.value = 0.06;
  master.connect(ctx.destination);
  const nodes: { stop: () => void }[] = [];

  const tone = (freq: number, type: OscillatorType, gain: number) => {
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    amp.gain.value = gain;
    osc.connect(amp);
    amp.connect(master);
    osc.start();
    nodes.push({
      stop: () => {
        osc.stop();
        osc.disconnect();
      },
    });
    return osc;
  };

  if (id === "garden") {
    const low = tone(82, "sine", 0.7);
    const drift = ctx.createOscillator();
    const driftGain = ctx.createGain();
    drift.frequency.value = 0.07;
    driftGain.gain.value = 6;
    drift.connect(driftGain);
    driftGain.connect(low.frequency);
    drift.start();
    nodes.push({ stop: () => drift.stop() });
    tone(164, "triangle", 0.15);
  } else if (id === "porch") {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 500;
    const amp = ctx.createGain();
    amp.gain.value = 0.35;
    noise.connect(filter);
    filter.connect(amp);
    amp.connect(master);
    noise.start();
    nodes.push({ stop: () => noise.stop() });
  } else {
    tone(196, "sine", 0.45);
    tone(247, "sine", 0.2);
  }

  stopCurrent = () => {
    for (const node of nodes) node.stop();
    master.disconnect();
    void ctx.close();
  };
}
