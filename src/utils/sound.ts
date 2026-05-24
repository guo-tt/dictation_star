const AudioCtx =
  window.AudioContext ||
  (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

let sharedCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (!AudioCtx) return null;
  if (!sharedCtx || sharedCtx.state === 'closed') sharedCtx = new AudioCtx();
  return sharedCtx;
}

function playTone(
  ctx: AudioContext,
  freq: number,
  endFreq: number,
  type: OscillatorType,
  volume: number,
  duration: number,
  startOffset = 0,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  const t = ctx.currentTime + startOffset;
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.linearRampToValueAtTime(endFreq, t + duration * 0.6);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(volume, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.start(t);
  osc.stop(t + duration);
}

export function playSound(type: 'correct' | 'wrong'): void {
  const ctx = getCtx();
  if (!ctx) return;

  ctx.resume().then(() => {
    if (type === 'correct') {
      // Bright ascending ding — two harmonics for richness
      playTone(ctx, 660, 1320, 'sine', 0.28, 0.18);
      playTone(ctx, 990, 1980, 'sine', 0.12, 0.18);
      // Short second ding slightly after
      playTone(ctx, 880, 1760, 'sine', 0.18, 0.15, 0.12);
    } else {
      // Sad descending low tone
      playTone(ctx, 320, 140, 'triangle', 0.30, 0.45);
      playTone(ctx, 220, 100, 'triangle', 0.15, 0.45, 0.05);
    }
  }).catch(() => {});
}
