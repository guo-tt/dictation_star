import { useState } from 'react';
import { Word } from '../types';
import { randomWordsFromErrorsAndUnpracticed } from '../utils/autoSelect';

interface BottomToolbarProps {
  contextWords: Word[];
  resetLabel: string;
  showRandom: boolean;
  onStartRandom: (words: Word[]) => void;
  onReset: () => void;
}

const RANDOM_COUNTS = [5, 10, 15, 20, 30];

export default function BottomToolbar({
  contextWords,
  resetLabel,
  showRandom,
  onStartRandom,
  onReset,
}: BottomToolbarProps) {
  const [mode, setMode] = useState<'idle' | 'pickCount' | 'confirmReset'>('idle');

  function handleRandomCount(count: number) {
    const words = randomWordsFromErrorsAndUnpracticed(contextWords, count);
    setMode('idle');
    onStartRandom(words);
  }

  function handleConfirmReset() {
    setMode('idle');
    onReset();
  }

  if (mode === 'pickCount') {
    return (
      <div className="bg-white border-t border-stone-100 px-3 py-2.5 flex items-center gap-1.5">
        {RANDOM_COUNTS.map(n => (
          <button
            key={n}
            onClick={() => handleRandomCount(n)}
            className="flex-1 py-2 rounded-xl bg-[#F0F2FB] text-[#5868A8] text-sm font-bold border border-[#B0BCDC] active:scale-[0.97] transition"
          >
            {n}
          </button>
        ))}
        <button
          onClick={() => setMode('idle')}
          className="px-3 py-2 rounded-xl bg-stone-100 text-stone-500 text-sm font-medium active:scale-[0.97] transition"
        >
          ×
        </button>
      </div>
    );
  }

  if (mode === 'confirmReset') {
    return (
      <div className="bg-white border-t border-stone-100 px-4 py-2.5 flex items-center gap-2">
        <span className="text-xs text-stone-500 flex-1">{resetLabel}？</span>
        <button
          onClick={handleConfirmReset}
          className="px-3 py-2 rounded-xl bg-[#D09098] text-white text-xs font-semibold active:scale-[0.97] transition"
        >
          确认重置
        </button>
        <button
          onClick={() => setMode('idle')}
          className="px-3 py-2 rounded-xl bg-stone-100 text-stone-500 text-xs font-semibold active:scale-[0.97] transition"
        >
          取消
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border-t border-stone-100 px-4 py-2.5 flex items-center gap-2">
      {showRandom && (
        <button
          onClick={() => setMode('pickCount')}
          className="flex-1 py-2 rounded-xl bg-[#F0F2FB] text-[#5868A8] text-sm font-semibold border border-[#B0BCDC] active:scale-[0.97] transition"
        >
          🎲 随机听写
        </button>
      )}
      <button
        onClick={() => setMode('confirmReset')}
        className={`${showRandom ? 'flex-1' : 'w-full'} py-2 rounded-xl bg-stone-50 text-stone-500 text-sm font-semibold border border-stone-200 active:scale-[0.97] transition`}
      >
        🔄 {resetLabel}
      </button>
    </div>
  );
}
