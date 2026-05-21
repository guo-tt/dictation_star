import { useState } from 'react';
import type { ChengYu } from '../data/chengyu';
import { filterChengyuByGrade, chengyuList, chengyuToWords } from '../data/chengyu';
import type { DictationMode, Word } from '../types';

interface Props {
  onStartDictation: (words: Word[], label: string, mode: DictationMode) => void;
  onStartStudy: (list: ChengYu[], label: string) => void;
}

const GRADE_OPTIONS: { value: 3 | 4 | 5 | 6 | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 3, label: 'P3' },
  { value: 4, label: 'P4' },
  { value: 5, label: 'P5' },
  { value: 6, label: 'P6' },
];

export default function ChengYuPanel({ onStartDictation, onStartStudy }: Props) {
  const [gradeFilter, setGradeFilter] = useState<3 | 4 | 5 | 6 | 'all'>('all');
  const [dictationMode, setDictationMode] = useState<DictationMode>('parent');

  const filtered = filterChengyuByGrade(gradeFilter, chengyuList);
  const gradeLabel = gradeFilter === 'all' ? '全部' : `P${gradeFilter}`;

  return (
    <div className="flex flex-col h-full">
      {/* Grade filter row */}
      <div className="flex gap-2 px-4 pt-4 pb-2 flex-shrink-0 flex-wrap">
        {GRADE_OPTIONS.map(opt => (
          <button
            key={String(opt.value)}
            onClick={() => setGradeFilter(opt.value)}
            className={`px-3 py-1.5 rounded-xl text-sm font-semibold border transition ${
              gradeFilter === opt.value
                ? 'bg-[#F0F2FB] border-[#B0BCDC] text-[#5868A8]'
                : 'bg-stone-50 border-stone-200 text-stone-500'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Dictation mode toggle */}
      <div className="flex gap-2 px-4 pb-3 flex-shrink-0">
        {([
          { value: 'parent' as DictationMode, label: '👨‍👩‍👧 家长模式' },
          { value: 'student' as DictationMode, label: '✏️ 学生模式' },
        ] as const).map(m => (
          <button
            key={m.value}
            onClick={() => setDictationMode(m.value)}
            className={`flex-1 py-1.5 rounded-xl text-sm font-medium border transition ${
              dictationMode === m.value
                ? 'bg-[#F0F2FB] border-[#B0BCDC] text-[#5868A8]'
                : 'bg-stone-50 border-stone-200 text-stone-500'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Scrollable idiom list */}
      <div className="flex-1 overflow-y-auto px-4 pb-2">
        {filtered.map(cy => (
          <div
            key={cy.id}
            className="flex items-center justify-between py-3 border-b border-stone-100"
          >
            <span className="text-base text-stone-800">{cy.text}</span>
            <span className="text-xs text-stone-400">{cy.examples.length} 条例句</span>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center text-stone-400 text-sm pt-8">暂无成语</div>
        )}
      </div>

      {/* Sticky action buttons */}
      <div className="flex gap-3 px-4 py-4 border-t border-stone-100 bg-stone-50 flex-shrink-0">
        <button
          onClick={() => onStartDictation(chengyuToWords(filtered), gradeLabel, dictationMode)}
          disabled={filtered.length === 0}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-[#8090C0] text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          全部听写 ({filtered.length}个)
        </button>
        <button
          onClick={() => onStartStudy(filtered, gradeLabel)}
          disabled={filtered.length === 0}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 border-[#B0BCDC] text-[#5868A8] bg-white disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          全部学习
        </button>
      </div>
    </div>
  );
}
