import { useState, useMemo, useEffect } from 'react';
import { Word, GradeFilter, SessionConfig, DictationMode } from '../types';
import { presetWordLists } from '../data/wordLists';
import {
  getWordStats,
  getCustomLists,
  getCustomWordsForList,
  applyOverridesAndFilter,
  getHiddenListIds,
} from '../utils/storage';
import { autoSelectWords, AutoSelectRule } from '../utils/autoSelect';

interface WordSelectorViewProps {
  grade: GradeFilter;
  dictationMode: DictationMode;
  onStart: (config: SessionConfig) => void;
}

const GRADE_LABEL: Record<string, string> = {
  all: '全部',
  '5': '五年级',
  '6': '六年级',
};

const SESSION_SIZES = [10, 15, 20, 25, 30];

const SHOWN_GRADES = new Set([5, 6]);

const AUTO_RULES: { rule: AutoSelectRule; label: string }[] = [
  { rule: 'most-errors', label: '错误最多' },
  { rule: 'least-recent', label: '最久未练' },
  { rule: 'recent-error-rate', label: '近期错误率' },
];

export default function WordSelectorView({ grade, dictationMode: _dictationMode, onStart }: WordSelectorViewProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeRule, setActiveRule] = useState<AutoSelectRule | null>(null);
  const [sessionSize, setSessionSize] = useState(10);
  const [statsVersion, setStatsVersion] = useState(0);

  useEffect(() => {
    setStatsVersion(v => v + 1);
  }, []);

  const allWords = useMemo((): Word[] => {
    const hiddenListIds = new Set(getHiddenListIds());

    const presetWords = presetWordLists
      .filter(l =>
        l.subject === 'chinese' &&
        SHOWN_GRADES.has(l.grade ?? -1) &&
        (grade === 'all' || l.grade === grade) &&
        !hiddenListIds.has(l.id),
      )
      .flatMap(l => applyOverridesAndFilter(l.words));

    const customWords = getCustomLists('chinese')
      .filter(l => grade === 'all' || l.grade === grade)
      .flatMap(l => getCustomWordsForList(l.id));

    const seen = new Set<string>();
    return [...presetWords, ...customWords].filter(w =>
      seen.has(w.id) ? false : (seen.add(w.id), true),
    );
  }, [grade]);

  // Default sort: highest error rate first (unpracticed words go last at 0%)
  const sortedWords = useMemo(() => {
    return [...allWords].sort((a, b) => {
      const sa = getWordStats(a.id);
      const sb = getWordStats(b.id);
      const errA = sa.total === 0 ? -1 : (sa.total - sa.correct) / sa.total;
      const errB = sb.total === 0 ? -1 : (sb.total - sb.correct) / sb.total;
      return errB - errA;
    });
  }, [allWords, statsVersion]);

  function applyRule(rule: AutoSelectRule, size: number) {
    const selected = autoSelectWords(sortedWords, rule, size);
    setSelectedIds(new Set(selected.map(w => w.id)));
  }

  function handleRuleClick(rule: AutoSelectRule) {
    if (activeRule === rule) {
      setActiveRule(null);
      setSelectedIds(new Set());
    } else {
      setActiveRule(rule);
      applyRule(rule, sessionSize);
    }
  }

  function handleSizeClick(size: number) {
    setSessionSize(size);
    if (activeRule) applyRule(activeRule, size);
  }

  function toggleWord(wordId: string) {
    setActiveRule(null);
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(wordId)) next.delete(wordId);
      else next.add(wordId);
      return next;
    });
  }

  function handleStart() {
    const selectedWords = sortedWords.filter(w => selectedIds.has(w.id));
    onStart({ words: selectedWords, grade: GRADE_LABEL[String(grade)] ?? '全部' });
  }

  return (
    <div className="flex flex-col h-full">

      {/* ── Word stats list ── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2 pb-4">
        {sortedWords.length === 0 && (
          <div className="text-center py-12 text-stone-400 text-sm">暂无词语</div>
        )}
        {sortedWords.map(word => {
          const stats = getWordStats(word.id);
          const isSelected = selectedIds.has(word.id);
          const errorRate =
            stats.total === 0
              ? null
              : Math.round(((stats.total - stats.correct) / stats.total) * 100);
          const lastLabel = stats.lastPracticed
            ? new Date(stats.lastPracticed).toLocaleDateString('zh-CN', {
                month: 'short',
                day: 'numeric',
              })
            : null;

          return (
            <button
              key={word.id}
              onClick={() => toggleWord(word.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition active:scale-[0.98] text-left ${
                isSelected ? 'border-[#B0BCDC] bg-[#F0F2FB]' : 'border-stone-200 bg-white'
              }`}
            >
              {/* Checkbox */}
              <div
                className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                  isSelected ? 'border-[#8090C0] bg-[#8090C0]' : 'border-stone-300'
                }`}
              >
                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>

              {/* Word text + pinyin */}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-stone-800 text-sm">{word.text}</div>
                {word.pinyin && (
                  <div className="text-xs text-stone-400 mt-0.5">{word.pinyin}</div>
                )}
              </div>

              {/* Stats */}
              <div className="text-right flex-shrink-0">
                {errorRate !== null ? (
                  <div
                    className={`text-sm font-bold ${
                      errorRate > 50
                        ? 'text-[#D09098]'
                        : errorRate > 20
                        ? 'text-amber-500'
                        : 'text-stone-400'
                    }`}
                  >
                    错 {errorRate}%
                  </div>
                ) : (
                  <div className="text-xs text-stone-300">未练习</div>
                )}
                {lastLabel && (
                  <div className="text-xs text-stone-300 mt-0.5">{lastLabel}</div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Auto-select bar + slider ── */}
      <div className="bg-stone-50 border-t border-stone-100 px-4 py-3 flex flex-col gap-2">

        {/* Rule buttons + counter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-400 flex-shrink-0">智能选词</span>
          <div className="flex gap-1.5 flex-1">
            {AUTO_RULES.map(({ rule, label }) => (
              <button
                key={rule}
                onClick={() => handleRuleClick(rule)}
                className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition border ${
                  activeRule === rule
                    ? 'bg-[#F0F2FB] border-[#B0BCDC] text-[#5868A8]'
                    : 'bg-white border-stone-200 text-stone-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="text-xs text-stone-500 font-medium flex-shrink-0 w-12 text-right">
            已选 {selectedIds.size} 个
          </span>
        </div>

        {/* Session size picker */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-400 flex-shrink-0">每次</span>
          <div className="flex gap-1.5 flex-1">
            {SESSION_SIZES.map(n => (
              <button
                key={n}
                onClick={() => handleSizeClick(n)}
                className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition border ${
                  sessionSize === n
                    ? 'bg-[#8090C0] text-white border-[#8090C0]'
                    : 'bg-white border-stone-200 text-stone-400'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <span className="text-xs text-stone-400 flex-shrink-0">个词</span>
        </div>
      </div>

      {/* ── Start button ── */}
      <div className="bg-white border-t border-stone-100 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] px-4 py-4">
        <button
          disabled={selectedIds.size === 0}
          onClick={handleStart}
          className="w-full py-3 rounded-2xl text-white font-bold text-base shadow-md active:scale-[0.98] transition bg-gradient-to-r from-[#7888C8] to-[#A8B8DC] disabled:opacity-40"
        >
          {selectedIds.size > 0 ? `开始听写 · ${selectedIds.size} 个词 →` : '请选择词语'}
        </button>
      </div>
    </div>
  );
}
