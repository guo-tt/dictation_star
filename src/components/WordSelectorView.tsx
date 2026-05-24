import { useState, useMemo, useEffect, useRef } from 'react';
import { Word, GradeFilter, SessionConfig, DictationMode } from '../types';
import { presetWordLists } from '../data/wordLists';
import { getDisplayPinyin } from '../utils/pinyin';
import {
  getWordStats,
  getCustomLists,
  getCustomWordsForList,
  applyOverridesAndFilter,
  getHiddenListIds,
  clearWordsRecords,
} from '../utils/storage';
import { autoSelectWords, AutoSelectRule, randomWordsFromErrorsAndUnpracticed } from '../utils/autoSelect';

const SESSION_SIZES_MIXED = [10, 15, 20, 25, 30];

interface WordSelectorViewProps {
  grade: GradeFilter;
  dictationMode: DictationMode;
  onStart: (config: SessionConfig) => void;
  mode?: 'lesson' | 'mixed';
  lessonListId?: string;
}

const GRADE_LABEL: Record<string, string> = {
  all: '全部',
  '5': '五年级',
  '6': '六年级',
};

const SHOWN_GRADES = new Set([5, 6]);

const AUTO_RULES: { rule: AutoSelectRule; label: string }[] = [
  { rule: 'most-errors', label: '错误最多' },
  { rule: 'least-recent', label: '最久未练' },
  { rule: 'recent-error-rate', label: '近期错误率' },
  { rule: 'random-errors', label: '随机' },
];

export default function WordSelectorView({
  grade, dictationMode: _dictationMode, onStart, mode = 'mixed', lessonListId,
}: WordSelectorViewProps) {
  const [activeRule, setActiveRule] = useState<AutoSelectRule | null>(null);
  const [statsVersion, setStatsVersion] = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);

  // ── drag-to-select (handle zone on right edge of each row) ──────────────────
  const listRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    active: boolean;
    startIndex: number;
    isSelecting: boolean;
    initialIds: Set<string>;
  } | null>(null);
  const didDragRef = useRef(false);
  const displayWordsRef = useRef<Word[]>([]);
  const dragMoveFnRef = useRef<((e: TouchEvent) => void) | null>(null);
  const autoScrollRef = useRef<number | null>(null);
  const touchPosRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setStatsVersion(v => v + 1);
  }, []);

  const lessonList = useMemo(() => {
    if (mode !== 'lesson' || !lessonListId) return null;
    return presetWordLists.find(l => l.id === lessonListId) ?? null;
  }, [mode, lessonListId]);

  const allWords = useMemo((): Word[] => {
    if (mode === 'lesson') {
      if (!lessonList) return [];
      return applyOverridesAndFilter(lessonList.words);
    }
    const hiddenListIds = new Set(getHiddenListIds());
    const presetWords = presetWordLists
      .filter(l =>
        l.subject === 'chinese' &&
        SHOWN_GRADES.has(l.grade ?? -1) &&
        l.lesson === undefined &&
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
  }, [grade, mode, lessonList]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [quickSelectMode, setQuickSelectMode] = useState<'none' | 'all' | 'five' | 'random'>('none');
  const [sessionSize, setSessionSize] = useState(10);

  const sortedWords = useMemo(() => {
    return [...allWords].sort((a, b) => {
      const sa = getWordStats(a.id);
      const sb = getWordStats(b.id);
      const errA = sa.total === 0 ? -1 : (sa.total - sa.correct) / sa.total;
      const errB = sb.total === 0 ? -1 : (sb.total - sb.correct) / sb.total;
      return errB - errA;
    });
  }, [allWords, statsVersion]);

  // Lesson mode: sort by combined error-rate + recency (worst/oldest first).
  // Never-practiced words treated as 0.3 error rate + max recency (~0.58 score).
  const displayWords = useMemo(() => {
    if (mode !== 'lesson') return sortedWords;
    const now = Date.now();
    const DAYS_MS = 24 * 60 * 60 * 1000;
    return [...allWords].sort((a, b) => {
      const sa = getWordStats(a.id);
      const sb = getWordStats(b.id);
      function score(s: typeof sa) {
        const errRate = s.total === 0 ? 0.3 : (s.total - s.correct) / s.total;
        const days = s.lastPracticed
          ? (now - new Date(s.lastPracticed).getTime()) / DAYS_MS
          : 30;
        return errRate * 0.6 + Math.min(days / 30, 1) * 0.4;
      }
      return score(sb) - score(sa);
    });
  }, [mode, allWords, sortedWords, statsVersion]);

  // Keep ref in sync so the passive touchmove handler always sees current words.
  displayWordsRef.current = displayWords;

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

  function handleSelectAll() {
    if (quickSelectMode === 'all') {
      setQuickSelectMode('none');
      setSelectedIds(new Set());
    } else {
      setQuickSelectMode('all');
      setSelectedIds(new Set(allWords.map(w => w.id)));
    }
  }

  function handleSelectFive() {
    if (quickSelectMode === 'five') {
      setQuickSelectMode('none');
      setSelectedIds(new Set());
    } else {
      setQuickSelectMode('five');
      setSelectedIds(new Set(displayWords.slice(0, 5).map(w => w.id)));
    }
  }

  function handleSelectRandom() {
    if (quickSelectMode === 'random') {
      setQuickSelectMode('none');
      setSelectedIds(new Set());
    } else {
      setQuickSelectMode('random');
      const selected = randomWordsFromErrorsAndUnpracticed(allWords, 5);
      setSelectedIds(new Set(selected.map(w => w.id)));
    }
  }

  function handleSizeClick(size: number) {
    setSessionSize(size);
    if (activeRule) applyRule(activeRule, size);
  }

  function applyDragSelection(x: number, y: number) {
    const d = dragRef.current;
    if (!d) return;
    const target = document.elementFromPoint(x, y)
      ?.closest('[data-word-index]') as HTMLElement | null;
    if (!target) return;
    const i = parseInt(target.dataset.wordIndex ?? '-1');
    if (i < 0) return;
    const words = displayWordsRef.current;
    const lo = Math.min(d.startIndex, i);
    const hi = Math.max(d.startIndex, i);
    const next = new Set(d.initialIds);
    for (let j = lo; j <= hi; j++) {
      if (words[j]) {
        if (d.isSelecting) next.add(words[j].id);
        else next.delete(words[j].id);
      }
    }
    setSelectedIds(next);
    setQuickSelectMode('none');
    setActiveRule(null);
  }

  function stopAutoScroll() {
    if (autoScrollRef.current !== null) {
      cancelAnimationFrame(autoScrollRef.current);
      autoScrollRef.current = null;
    }
  }

  function startAutoScroll() {
    if (autoScrollRef.current !== null) return;
    function tick() {
      const pos = touchPosRef.current;
      const container = listRef.current;
      if (!pos || !container || !dragRef.current) { autoScrollRef.current = null; return; }
      const rect = container.getBoundingClientRect();
      const ZONE = 72;
      const MAX_SPEED = 10;
      let delta = 0;
      if (pos.y > rect.bottom - ZONE) delta = MAX_SPEED * ((pos.y - (rect.bottom - ZONE)) / ZONE);
      else if (pos.y < rect.top + ZONE) delta = -MAX_SPEED * (((rect.top + ZONE) - pos.y) / ZONE);
      if (delta !== 0) {
        container.scrollTop += delta;
        applyDragSelection(pos.x, pos.y);
      }
      autoScrollRef.current = requestAnimationFrame(tick);
    }
    autoScrollRef.current = requestAnimationFrame(tick);
  }

  function handleDragTouchStart(e: React.TouchEvent) {
    didDragRef.current = false;
    const touch = e.touches[0];
    if (!(touch.target as Element).closest('[data-drag-handle]')) return;
    const wordEl = (touch.target as Element).closest('[data-word-index]') as HTMLElement | null;
    if (!wordEl) return;
    const idx = parseInt(wordEl.dataset.wordIndex ?? '-1');
    if (idx < 0 || !displayWords[idx]) return;

    dragRef.current = {
      active: false,
      startIndex: idx,
      isSelecting: !selectedIds.has(displayWords[idx].id),
      initialIds: new Set(selectedIds),
    };

    const el = listRef.current;
    if (!el) return;

    function onDragMove(ev: TouchEvent) {
      const d = dragRef.current;
      if (!d) return;
      const t = ev.touches[0];
      ev.preventDefault();
      d.active = true;
      touchPosRef.current = { x: t.clientX, y: t.clientY };
      applyDragSelection(t.clientX, t.clientY);
      const container = listRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        const ZONE = 72;
        if (t.clientY > rect.bottom - ZONE || t.clientY < rect.top + ZONE) startAutoScroll();
        else stopAutoScroll();
      }
    }

    dragMoveFnRef.current = onDragMove;
    el.addEventListener('touchmove', onDragMove, { passive: false });
  }

  function handleDragTouchEnd() {
    stopAutoScroll();
    touchPosRef.current = null;
    const el = listRef.current;
    if (el && dragMoveFnRef.current) {
      el.removeEventListener('touchmove', dragMoveFnRef.current);
      dragMoveFnRef.current = null;
    }
    if (dragRef.current?.active) didDragRef.current = true;
    dragRef.current = null;
  }

  function toggleWord(wordId: string) {
    if (didDragRef.current) { didDragRef.current = false; return; }
    setActiveRule(null);
    setQuickSelectMode('none');
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(wordId)) next.delete(wordId);
      else next.add(wordId);
      return next;
    });
  }

  const resetLabel =
    mode === 'lesson'
      ? `重置本课 ${allWords.length} 个词的进度`
      : grade === 5
      ? '重置五年级进度'
      : grade === 6
      ? '重置六年级进度'
      : '重置全部进度';

  function handleReset() {
    clearWordsRecords(allWords.map(w => w.id));
    setStatsVersion(v => v + 1);
    setConfirmReset(false);
    setSelectedIds(new Set());
    setQuickSelectMode('none');
    setActiveRule(null);
  }

  function handleStart() {
    const selectedWords = displayWords.filter(w => selectedIds.has(w.id));
    const gradeLabel =
      mode === 'lesson'
        ? `${lessonList?.name ?? ''}${lessonList?.lessonTitle ?? ''}`
        : (GRADE_LABEL[String(grade)] ?? '全部');
    onStart({ words: selectedWords, grade: gradeLabel });
  }

  return (
    <div className="flex flex-col h-full">

      {/* ── Top controls (always visible) ── */}
      <div className="bg-stone-50 border-b border-stone-100 px-4 pt-3 pb-2 flex flex-col gap-2 flex-shrink-0">

        {mode === 'lesson' ? (
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5 flex-1">
              <button
                onClick={handleSelectAll}
                className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition border ${
                  quickSelectMode === 'all'
                    ? 'bg-[#F0F2FB] border-[#B0BCDC] text-[#5868A8]'
                    : 'bg-white border-stone-200 text-stone-400'
                }`}
              >
                选择全部
              </button>
              <button
                onClick={handleSelectFive}
                className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition border ${
                  quickSelectMode === 'five'
                    ? 'bg-[#F0F2FB] border-[#B0BCDC] text-[#5868A8]'
                    : 'bg-white border-stone-200 text-stone-400'
                }`}
              >
                选择5个
              </button>
              <button
                onClick={handleSelectRandom}
                className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition border ${
                  quickSelectMode === 'random'
                    ? 'bg-[#F0F2FB] border-[#B0BCDC] text-[#5868A8]'
                    : 'bg-white border-stone-200 text-stone-400'
                }`}
              >
                随机5个
              </button>
            </div>
            <span className="text-xs text-stone-500 font-medium flex-shrink-0 w-12 text-right">
              已选 {selectedIds.size} 个
            </span>
          </div>
        ) : (
          <>
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
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-400 flex-shrink-0">每次</span>
              <div className="flex gap-1.5 flex-1">
                {SESSION_SIZES_MIXED.map(n => (
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
          </>
        )}

        {/* Reset */}
        <div className="flex justify-center pt-0.5">
          {confirmReset ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-500">{resetLabel}？</span>
              <button
                onClick={handleReset}
                className="px-2.5 py-1 rounded-lg bg-[#D09098] text-white text-xs font-semibold"
              >
                确认重置
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                className="px-2.5 py-1 rounded-lg bg-stone-100 text-stone-600 text-xs font-semibold"
              >
                取消
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmReset(true)}
              className="text-xs text-stone-300 active:text-[#D09098] transition-colors"
            >
              重置进度
            </button>
          )}
        </div>
      </div>

      {/* ── Start button (sticky top) ── */}
      <div className="bg-white border-b border-stone-100 shadow-[0_4px_16px_rgba(0,0,0,0.06)] px-4 py-3 flex-shrink-0">
        <button
          disabled={selectedIds.size === 0}
          onClick={handleStart}
          className="w-full py-3 rounded-2xl text-white font-bold text-base shadow-md active:scale-[0.98] transition bg-gradient-to-r from-[#7888C8] to-[#A8B8DC] disabled:opacity-40"
        >
          {selectedIds.size > 0 ? `开始听写 · ${selectedIds.size} 个词 →` : '请选择词语'}
        </button>
      </div>

      {/* ── Word stats list ── */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2 pb-4"
        onTouchStart={handleDragTouchStart}
        onTouchEnd={handleDragTouchEnd}
        onTouchCancel={handleDragTouchEnd}
      >
        {displayWords.length === 0 && (
          <div className="text-center py-12 text-stone-400 text-sm">暂无词语</div>
        )}
        {displayWords.map((word, index) => {
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
              data-word-index={String(index)}
              onClick={() => toggleWord(word.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition active:scale-[0.98] text-left ${
                isSelected ? 'border-[#B0BCDC] bg-[#F0F2FB]' : 'border-stone-200 bg-white'
              }`}
            >
              {/* Drag handle — touch here to drag-select */}
              <div
                data-drag-handle="true"
                style={{ touchAction: 'none' }}
                className="flex flex-col gap-[3px] items-center justify-center w-6 self-stretch flex-shrink-0 -ml-1"
              >
                {[0, 1, 2].map(r => (
                  <div key={r} className="flex gap-[3px]">
                    <div className="w-[3px] h-[3px] rounded-full bg-stone-300" />
                    <div className="w-[3px] h-[3px] rounded-full bg-stone-300" />
                  </div>
                ))}
              </div>

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
                <div className="text-xs text-stone-400 mt-0.5">{getDisplayPinyin(word.text, word.pinyin)}</div>
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
    </div>
  );
}
