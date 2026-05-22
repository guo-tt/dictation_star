import { useMemo, useState } from 'react';
import { WordList, DictationMode, FilterMode, Subject } from '../types';
import { getWordStats, clearAllRecords } from '../utils/storage';
import WordCard from './WordCard';

interface DictationViewProps {
  wordList: WordList;
  dictationMode: DictationMode;
  filterMode: FilterMode;
  subject: Subject;
}

export default function DictationView({
  wordList,
  dictationMode,
  filterMode,
  subject,
}: DictationViewProps) {
  const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;
  const [confirmClear, setConfirmClear] = useState(false);
  const [cleared, setCleared] = useState(false);

  function handleClearAll() {
    clearAllRecords();
    setCleared(c => !c);
    setConfirmClear(false);
  }

  const filteredWords = useMemo(() => {
    let words = [...wordList.words];

    if (filterMode === 'error-rate') {
      words.sort((a, b) => {
        const sa = getWordStats(a.id);
        const sb = getWordStats(b.id);
        const errA = sa.total === 0 ? 0 : (sa.total - sa.correct) / sa.total;
        const errB = sb.total === 0 ? 0 : (sb.total - sb.correct) / sb.total;
        return errB - errA;
      });
    } else if (filterMode === 'not-practiced') {
      const cutoff = Date.now() - ONE_MONTH_MS;
      words = words.filter(w => {
        const stats = getWordStats(w.id);
        if (!stats.lastPracticed) return true;
        return new Date(stats.lastPracticed).getTime() < cutoff;
      });
    }

    return words;
  }, [wordList, filterMode]);

  if (filteredWords.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-10 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h3 className="text-xl font-bold text-stone-700">没有符合条件的词语</h3>
        <p className="text-stone-400 text-sm mt-2">
          {filterMode === 'not-practiced'
            ? '所有词语在最近一个月内都练习过了，真棒！'
            : '请尝试其他筛选条件。'}
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 pb-8">
      <div className="flex items-center justify-between text-sm text-stone-500 px-1 mb-3">
        <span>
          {filterMode === 'all'
            ? `共 ${filteredWords.length} 个词语`
            : filterMode === 'error-rate'
            ? `按错误率排序 · ${filteredWords.length} 个词`
            : `近1个月未练习 · ${filteredWords.length} 个词`}
        </span>
        <div className="flex items-center gap-2">
          {confirmClear ? (
            <div className="flex gap-1">
              <button
                onClick={handleClearAll}
                className="px-2.5 py-1 rounded-lg bg-[#D09098] text-white text-xs font-semibold"
              >
                确认清除
              </button>
              <button
                onClick={() => setConfirmClear(false)}
                className="px-2.5 py-1 rounded-lg bg-stone-100 text-stone-600 text-xs font-semibold"
              >
                取消
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmClear(true)}
              className="text-xs text-stone-300 hover:text-[#D09098] transition-colors"
            >
              清除全部记录
            </button>
          )}
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            dictationMode === 'parent'
              ? 'bg-[#F0F2FB] text-[#5868A8]'
              : 'bg-[#EEF5FA] text-[#407898]'
          }`}>
            {dictationMode === 'parent' ? '家长模式' : '学生模式'}
          </span>
        </div>
      </div>

      <div key={String(cleared)} className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredWords.map((word, index) => (
          <WordCard
            key={word.id}
            word={word}
            index={index}
            dictationMode={dictationMode}
            subject={subject}
          />
        ))}
      </div>
    </div>
  );
}
