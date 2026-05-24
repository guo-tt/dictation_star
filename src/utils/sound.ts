const AudioCtxClass =
  window.AudioContext ||
  (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

let sharedCtx: AudioContext | null = null;
let unlocked = false;

function getCtx(): AudioContext | null {
  if (!AudioCtxClass) return null;
  try {
    if (!sharedCtx || sharedCtx.state === 'closed') sharedCtx = new AudioCtxClass();
    return sharedCtx;
  } catch {
    return null;
  }
}

// iOS WKWebView requires a silent buffer to be played on first user gesture
// before any Web Audio will produce output.
function unlockOnce(ctx: AudioContext): void {
  if (unlocked) return;
  try {
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
    unlocked = true;
  } catch {
    // ignore — best-effort unlock
  }
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
  const t = ctx.currentTime + 0.01 + startOffset;
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

  unlockOnce(ctx);

  ctx.resume().then(() => {
    if (type === 'correct') {
      playTone(ctx, 660, 1320, 'sine', 0.28, 0.18);
      playTone(ctx, 990, 1980, 'sine', 0.12, 0.18);
      playTone(ctx, 880, 1760, 'sine', 0.18, 0.15, 0.12);
    } else {
      playTone(ctx, 320, 140, 'triangle', 0.30, 0.45);
      playTone(ctx, 220, 100, 'triangle', 0.15, 0.45, 0.05);
    }
  }).catch(() => {});
}
