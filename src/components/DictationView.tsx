import { useMemo, useState, useCallback } from 'react';
import { WordList, DictationMode, FilterMode, Subject, SessionConfig, Word } from '../types';
import { getWordStats, clearAllRecords, clearWordsRecords, saveAttempt } from '../utils/storage';
import WordCard from './WordCard';

interface DictationViewProps {
  wordList: WordList;
  dictationMode: DictationMode;
  filterMode: FilterMode;
  subject: Subject;
  sessionConfig?: SessionConfig;
  onComplete?: () => void;
  onRetry?: (wrongWords: Word[]) => void;
}

export default function DictationView({
  wordList,
  dictationMode,
  filterMode,
  subject,
  sessionConfig,
  onComplete,
  onRetry,
}: DictationViewProps) {
  const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;
  const [confirmClear, setConfirmClear] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [sessionMarks, setSessionMarks] = useState<Map<string, boolean>>(new Map());
  const [showCompletion, setShowCompletion] = useState(false);

  function handleClearAll() {
    if (sessionConfig) {
      clearWordsRecords(sessionConfig.words.map(w => w.id));
    } else {
      clearAllRecords();
    }
    setCleared(c => !c);
    setConfirmClear(false);
    setSessionMarks(new Map());
  }

  const handleMark = useCallback((word: Word, correct: boolean) => {
    setSessionMarks(prev => {
      const next = new Map(prev);
      next.set(word.id, correct);
      return next;
    });
  }, []);

  function handleComplete() {
    if (showCompletion) return;
    sessionMarks.forEach((correct, wordId) => {
      saveAttempt(wordId, correct);
    });
    setShowCompletion(true);
  }

  const clearLabel = sessionConfig ? '重置本次进度' : '清除全部记录';

  const filteredWords = useMemo(() => {
    if (sessionConfig) {
      return [...sessionConfig.words].sort((a, b) => {
        const sa = getWordStats(a.id);
        const sb = getWordStats(b.id);
        const errA = sa.total - sa.correct;
        const errB = sb.total - sb.correct;
        const groupA = sa.total === 0 ? 0 : errA > 0 ? 1 : 2;
        const groupB = sb.total === 0 ? 0 : errB > 0 ? 1 : 2;
        if (groupA !== groupB) return groupA - groupB;
        return errB - errA;
      });
    }

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
  }, [wordList, filterMode, sessionConfig]);

  if (filteredWords.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-10 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h3 className="text-xl font-bold text-stone-700">没有符合条件的词语</h3>
        <p className="text-stone-400 text-sm mt-2">
          {sessionConfig
            ? '没有选中的词语。'
            : filterMode === 'not-practiced'
            ? '所有词语在最近一个月内都练习过了，真棒！'
            : '请尝试其他筛选条件。'}
        </p>
      </div>
    );
  }

  const headerLabel = sessionConfig
    ? `共 ${filteredWords.length} 个词语`
    : filterMode === 'all'
    ? `共 ${filteredWords.length} 个词语`
    : filterMode === 'error-rate'
    ? `按错误率排序 · ${filteredWords.length} 个词`
    : `近1个月未练习 · ${filteredWords.length} 个词`;

  const sessionTotal = sessionMarks.size;
  const sessionCorrect = [...sessionMarks.values()].filter(Boolean).length;
  const sessionWrongWords = filteredWords.filter(w => sessionMarks.get(w.id) === false);

  return (
    <div className="flex flex-col h-full">
    <div className="flex-1 overflow-y-auto p-4 pb-4">
      <div className="flex items-center justify-between text-sm text-stone-500 px-1 mb-3">
        <span>{headerLabel}</span>
        <div className="flex items-center gap-2">
          {confirmClear ? (
            <div className="flex gap-1">
              <button
                onClick={handleClearAll}
                className="px-2.5 py-1 rounded-lg bg-[#D09098] text-white text-xs font-semibold"
              >
                确认重置
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
              className="text-xs text-stone-300 active:text-[#D09098] transition-colors"
            >
              {clearLabel}
            </button>
          )}
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              dictationMode === 'parent'
                ? 'bg-[#F0F2FB] text-[#5868A8]'
                : 'bg-[#EEF5FA] text-[#407898]'
            }`}
          >
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
            pendingResult={sessionMarks.get(word.id) ?? null}
            locked={showCompletion}
            onMark={handleMark}
          />
        ))}
      </div>
    </div>

    {onComplete && (
      <div className="bg-white border-t border-stone-100 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] px-4 py-4">
        <button
          onClick={handleComplete}
          className="w-full py-3 rounded-2xl text-white font-bold text-base shadow-md active:scale-[0.98] transition bg-gradient-to-r from-[#7888C8] to-[#A8B8DC]"
        >
          完成听写 ✓
        </button>
      </div>
    )}

    {showCompletion && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
        <div className="bg-white rounded-3xl p-6 shadow-xl w-full max-w-sm">
          <div className="text-center mb-5">
            <div className="text-4xl mb-2">
              {sessionTotal === 0 ? '📋' : sessionWrongWords.length === 0 ? '🎉' : '📊'}
            </div>
            <h2 className="text-lg font-bold text-stone-800">本次听写完成</h2>
          </div>

          {sessionTotal === 0 ? (
            <p className="text-sm text-stone-400 text-center mb-5">本次未打分</p>
          ) : (
            <div className="bg-stone-50 rounded-2xl p-4 mb-5 flex justify-around text-center">
              <div>
                <div className="text-2xl font-bold text-[#4A8842]">{sessionCorrect}</div>
                <div className="text-xs text-stone-400 mt-0.5">答对</div>
              </div>
              <div className="w-px bg-stone-200" />
              <div>
                <div className="text-2xl font-bold text-[#B05860]">
                  {sessionTotal - sessionCorrect}
                </div>
                <div className="text-xs text-stone-400 mt-0.5">答错</div>
              </div>
              <div className="w-px bg-stone-200" />
              <div>
                <div
                  className={`text-2xl font-bold ${
                    Math.round((sessionCorrect / sessionTotal) * 100) >= 80
                      ? 'text-[#4A8842]'
                      : Math.round((sessionCorrect / sessionTotal) * 100) >= 60
                      ? 'text-amber-500'
                      : 'text-[#B05860]'
                  }`}
                >
                  {Math.round((sessionCorrect / sessionTotal) * 100)}%
                </div>
                <div className="text-xs text-stone-400 mt-0.5">正确率</div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {sessionWrongWords.length > 0 && onRetry && (
              <button
                onClick={() => {
                  setShowCompletion(false);
                  onRetry(sessionWrongWords);
                }}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#D09098] to-[#E0A8B0] text-white font-bold text-sm shadow-md active:scale-[0.98] transition"
              >
                再练一次错误的词（{sessionWrongWords.length} 个）
              </button>
            )}
            <button
              onClick={() => {
                setShowCompletion(false);
                onComplete?.();
              }}
              className="w-full py-3 rounded-2xl border-2 border-stone-200 text-stone-600 font-semibold text-sm active:scale-[0.98] transition"
            >
              返回首页
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}
