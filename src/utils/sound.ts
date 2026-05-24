// Generate a WAV data URI from mixed sine-wave tracks.
// Using HTMLAudioElement instead of Web Audio API for reliable iOS/Capacitor support.
function makeWavUri(
  tracks: Array<{ f0: number; f1: number; vol: number; len: number; delay?: number }>,
  totalLen: number,
): string {
  const sr = 22050;
  const n = Math.floor(sr * totalLen);
  const pcm = new Float32Array(n);

  for (const { f0, f1, vol, len, delay = 0 } of tracks) {
    const start = Math.floor(sr * delay);
    const end = Math.min(n, start + Math.floor(sr * len));
    for (let i = start; i < end; i++) {
      const t = (i - start) / sr;
      const freq = f0 + (f1 - f0) * Math.min(1, t / (len * 0.6));
      const fadeIn = Math.min(1, t * 120);
      const fadeOut = Math.min(1, (len - t) * 30);
      pcm[i] += Math.sin(2 * Math.PI * freq * t) * vol * fadeIn * fadeOut;
    }
  }

  // Normalise to avoid clipping
  let peak = 0;
  for (const s of pcm) if (Math.abs(s) > peak) peak = Math.abs(s);
  const scale = peak > 0 ? 0.88 / peak : 1;

  // Build 8-bit mono WAV
  const bytes = new Uint8Array(44 + n);
  const dv = new DataView(bytes.buffer);
  const tag = (o: number, s: string) => { for (let i = 0; i < s.length; i++) bytes[o + i] = s.charCodeAt(i); };
  tag(0, 'RIFF'); dv.setUint32(4, 36 + n, true); tag(8, 'WAVE');
  tag(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true);
  dv.setUint16(22, 1, true); dv.setUint32(24, sr, true); dv.setUint32(28, sr, true);
  dv.setUint16(32, 1, true); dv.setUint16(34, 8, true);
  tag(36, 'data'); dv.setUint32(40, n, true);
  for (let i = 0; i < n; i++) bytes[44 + i] = Math.round((pcm[i] * scale + 1) * 127.5);

  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return 'data:audio/wav;base64,' + btoa(bin);
}

// Pre-generate at module load so first play has no latency
const CORRECT_URI = makeWavUri(
  [
    { f0: 660, f1: 1320, vol: 0.6, len: 0.18 },
    { f0: 990, f1: 1980, vol: 0.3, len: 0.18 },
    { f0: 880, f1: 1760, vol: 0.45, len: 0.15, delay: 0.12 },
  ],
  0.30,
);

const WRONG_URI = makeWavUri(
  [
    { f0: 1800, f1: 700, vol: 0.65, len: 0.35 },
    { f0: 1400, f1: 500, vol: 0.40, len: 0.30, delay: 0.04 },
  ],
  0.40,
);

export function playSound(type: 'correct' | 'wrong'): void {
  const audio = new Audio(type === 'correct' ? CORRECT_URI : WRONG_URI);
  audio.play().catch(() => {});
}
