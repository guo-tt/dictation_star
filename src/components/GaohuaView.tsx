import { useState, useRef } from 'react';
import { Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import type { GaohuaEntry } from '../types';
import { gaohuaPreset } from '../data/gaohuaWords';
import { getGaohuaCustomEntries, addGaohuaEntry, deleteGaohuaEntry, getGaohuaRecords, saveGaohuaAttempts } from '../utils/storage';
import { playSound } from '../utils/sound';

type Phase = 'select' | 'quiz' | 'done';
type QuickMode = 'random' | 'mostErrors' | 'leastRecent';

function renderSentence(wrongSentence: string, wrongWord: string) {
  if (!wrongWord) return <span>{wrongSentence}</span>;
  const idx = wrongSentence.indexOf(wrongWord);
  if (idx !== -1) {
    return (
      <>
        {wrongSentence.slice(0, idx)}
        <u className="text-red-500 decoration-red-400 decoration-2 underline-offset-2 font-semibold not-italic">
          {wrongWord}
        </u>
        {wrongSentence.slice(idx + wrongWord.length)}
      </>
    );
  }
  const paren = `（${wrongWord}）`;
  const parenIdx = wrongSentence.indexOf(paren);
  if (parenIdx !== -1) {
    return (
      <>
        {wrongSentence.slice(0, parenIdx)}
        <u className="text-red-500 decoration-red-400 decoration-2 underline-offset-2 font-semibold not-italic">
          {paren}
        </u>
        {wrongSentence.slice(parenIdx + paren.length)}
      </>
    );
  }
  return <span>{wrongSentence}</span>;
}

export default function GaohuaView() {
  const [customEntries, setCustomEntries] = useState<GaohuaEntry[]>(() => getGaohuaCustomEntries());
  const [phase, setPhase] = useState<Phase>('select');
  const [quickMode, setQuickMode] = useState<QuickMode>('random');
  const [lastCount, setLastCount] = useState<number>(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [quizEntries, setQuizEntries] = useState<GaohuaEntry[]>([]);
  const [marks, setMarks] = useState<Map<string, boolean>>(new Map());
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [showAddForm, setShowAddForm] = useState(false);
  const [draftSentence, setDraftSentence] = useState('');
  const [draftWrong, setDraftWrong] = useState('');
  const [draftCorrect, setDraftCorrect] = useState('');

  const allEntries = [...gaohuaPreset, ...customEntries];

  // ── Drag-to-select (same pattern as WordSelectorView) ─────────────────────
  const listRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    active: boolean;
    startIndex: number;
    isSelecting: boolean;
    initialIds: Set<string>;
  } | null>(null);
  const didDragRef = useRef(false);
  const allEntriesRef = useRef<GaohuaEntry[]>(allEntries);
  allEntriesRef.current = allEntries;
  const dragMoveFnRef = useRef<((e: TouchEvent) => void) | null>(null);
  const autoScrollRef = useRef<number | null>(null);
  const touchPosRef = useRef<{ x: number; y: number } | null>(null);

  function applyDragSelection(x: number, y: number) {
    const d = dragRef.current;
    if (!d) return;
    const target = document.elementFromPoint(x, y)
      ?.closest('[data-entry-index]') as HTMLElement | null;
    if (!target) return;
    const i = parseInt(target.dataset.entryIndex ?? '-1');
    if (i < 0) return;
    const entries = allEntriesRef.current;
    const lo = Math.min(d.startIndex, i);
    const hi = Math.max(d.startIndex, i);
    const next = new Set(d.initialIds);
    for (let j = lo; j <= hi; j++) {
      if (entries[j]) {
        if (d.isSelecting) next.add(entries[j].id);
        else next.delete(entries[j].id);
      }
    }
    setSelectedIds(next);
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
    const entryEl = (touch.target as Element).closest('[data-entry-index]') as HTMLElement | null;
    if (!entryEl) return;
    const idx = parseInt(entryEl.dataset.entryIndex ?? '-1');
    if (idx < 0 || !allEntriesRef.current[idx]) return;
    dragRef.current = {
      active: false,
      startIndex: idx,
      isSelecting: !selectedIds.has(allEntriesRef.current[idx].id),
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

  function toggleEntry(id: string) {
    if (didDragRef.current) { didDragRef.current = false; return; }
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function applyQuickSelect(mode: QuickMode, count: number) {
    const records = getGaohuaRecords();
    let pool: GaohuaEntry[];

    if (mode === 'mostErrors') {
      const withErrors = allEntries
        .filter(e => records[e.id]?.wrongCount > 0)
        .sort((a, b) => {
          const ra = records[a.id], rb = records[b.id];
          return (rb.wrongCount / rb.totalAttempts) - (ra.wrongCount / ra.totalAttempts);
        });
      pool = withErrors.length > 0 ? withErrors : [...allEntries].sort(() => Math.random() - 0.5);
    } else if (mode === 'leastRecent') {
      pool = [...allEntries].sort((a, b) => {
        const ta = records[a.id]?.lastPracticed;
        const tb = records[b.id]?.lastPracticed;
        if (!ta && !tb) return 0;
        if (!ta) return -1;
        if (!tb) return 1;
        return new Date(ta).getTime() - new Date(tb).getTime();
      });
    } else {
      pool = [...allEntries].sort(() => Math.random() - 0.5);
    }

    setSelectedIds(new Set(pool.slice(0, Math.min(count, pool.length)).map(e => e.id)));
  }

  function handleModeSelect(mode: QuickMode) {
    setQuickMode(mode);
    applyQuickSelect(mode, lastCount);
  }

  function handleCountSelect(count: number) {
    setLastCount(count);
    applyQuickSelect(quickMode, count);
  }

  function finishQuiz() {
    const results = [...marks.entries()].map(([id, correct]) => ({ id, correct }));
    if (results.length > 0) saveGaohuaAttempts(results);
    setPhase('done');
  }

  function startQuiz() {
    const chosen = allEntries.filter(e => selectedIds.has(e.id));
    if (chosen.length === 0) return;
    setQuizEntries(chosen);
    setMarks(new Map());
    setRevealed(new Set());
    setPhase('quiz');
  }

  function mark(id: string, value: boolean) {
    setMarks(prev => {
      const next = new Map(prev);
      if (next.get(id) === value) {
        next.delete(id);
      } else {
        next.set(id, value);
        playSound(value ? 'correct' : 'wrong');
      }
      return next;
    });
  }

  function toggleReveal(id: string) {
    setRevealed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleDelete(id: string) {
    deleteGaohuaEntry(id);
    setCustomEntries(getGaohuaCustomEntries());
    setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
  }

  function handleAdd() {
    const sentence = draftSentence.trim();
    const wrongWord = draftWrong.trim();
    const correctWord = draftCorrect.trim();
    if (!sentence || !correctWord) return;
    addGaohuaEntry({ wrongSentence: sentence, wrongWord, correctWord });
    setCustomEntries(getGaohuaCustomEntries());
    setDraftSentence(''); setDraftWrong(''); setDraftCorrect('');
    setShowAddForm(false);
  }

  const correct = [...marks.values()].filter(Boolean).length;
  const wrong = [...marks.values()].filter(v => !v).length;

  // ── Select phase ───────────────────────────────────────────────────────────
  if (phase === 'select') {
    return (
      <div className="flex flex-col h-full">

        {/* Controls bar */}
        <div className="bg-stone-50 border-b border-stone-100 px-4 pt-3 pb-2 flex flex-col gap-2 flex-shrink-0">
          {/* Row 1: mode buttons */}
          <div className="flex gap-1.5">
            {(['mostErrors', 'leastRecent', 'random'] as QuickMode[]).map(mode => {
              const label = mode === 'mostErrors' ? '错误最多' : mode === 'leastRecent' ? '最久未练' : '随机';
              const active = quickMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => handleModeSelect(mode)}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold border transition ${
                    active
                      ? 'bg-[#F0F2FB] border-[#B0BCDC] text-[#5868A8]'
                      : 'bg-white border-stone-200 text-stone-500 active:bg-[#F0F2FB] active:border-[#B0BCDC] active:text-[#5868A8]'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {/* Row 2: count chips + selected count */}
          <div className="flex items-center gap-1.5">
            <div className="flex gap-1.5 flex-1">
              {([5, 10, 20, 30] as number[]).map(count => (
                <button
                  key={count}
                  onClick={() => handleCountSelect(count)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-semibold border transition ${
                    lastCount === count
                      ? 'bg-[#F0F2FB] border-[#B0BCDC] text-[#5868A8]'
                      : 'bg-white border-stone-200 text-stone-500 active:bg-[#F0F2FB] active:border-[#B0BCDC] active:text-[#5868A8]'
                  }`}
                >
                  {count}题
                </button>
              ))}
            </div>
            <span className="text-xs text-stone-500 font-medium flex-shrink-0 w-14 text-right">
              已选 {selectedIds.size} 题
            </span>
          </div>
        </div>

        {/* Start button */}
        <div className="bg-white border-b border-stone-100 shadow-[0_4px_16px_rgba(0,0,0,0.06)] px-4 py-3 flex-shrink-0">
          <button
            disabled={selectedIds.size === 0}
            onClick={startQuiz}
            className="w-full py-3 rounded-2xl text-white font-bold text-base shadow-md active:scale-[0.98] transition bg-gradient-to-r from-[#7888C8] to-[#A8B8DC] disabled:opacity-40"
          >
            {selectedIds.size > 0 ? `开始练习 · ${selectedIds.size} 题 →` : '请选择题目'}
          </button>
        </div>

        {/* Entry list */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2"
          onTouchStart={handleDragTouchStart}
          onTouchEnd={handleDragTouchEnd}
          onTouchCancel={handleDragTouchEnd}
        >
          {allEntries.map((entry, index) => {
            const isSelected = selectedIds.has(entry.id);
            return (
              <button
                key={entry.id}
                data-entry-index={String(index)}
                onClick={() => toggleEntry(entry.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition active:scale-[0.98] text-left ${
                  isSelected ? 'border-[#B0BCDC] bg-[#F0F2FB]' : 'border-stone-200 bg-white'
                }`}
              >
                {/* Drag handle */}
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
                <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                  isSelected ? 'border-[#8090C0] bg-[#8090C0]' : 'border-stone-300'
                }`}>
                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-stone-800 truncate">{entry.wrongSentence}</div>
                  {entry.wrongWord && (
                    <div className="text-xs mt-0.5">
                      <span className="text-red-400 font-semibold">{entry.wrongWord}</span>
                    </div>
                  )}
                </div>

                {/* Delete button for custom entries */}
                {entry.isCustom && (
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(entry.id); }}
                    className="text-stone-300 hover:text-[#D09098] flex-shrink-0 transition-colors p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </button>
            );
          })}

          {/* Add custom entry */}
          <div className="mt-2 border-t border-stone-100 pt-3">
            <button
              onClick={() => setShowAddForm(v => !v)}
              className="flex items-center gap-1.5 text-sm text-stone-400 hover:text-[#8090C0] transition-colors"
            >
              <Plus size={15} />
              添加自定义题目
            </button>
            {showAddForm && (
              <div className="mt-3 rounded-2xl border-2 border-[#B0BCDC] bg-[#F0F2FB] p-4 flex flex-col gap-3">
                <textarea
                  value={draftSentence}
                  onChange={e => setDraftSentence(e.target.value)}
                  placeholder="含错字的完整句子"
                  rows={2}
                  className="w-full text-sm text-stone-700 border border-[#B0BCDC] rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#8090C0] bg-white"
                />
                <div className="flex gap-2">
                  <input
                    value={draftWrong}
                    onChange={e => setDraftWrong(e.target.value)}
                    placeholder="错字"
                    className="flex-1 text-sm text-stone-700 border border-[#B0BCDC] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8090C0] bg-white"
                  />
                  <input
                    value={draftCorrect}
                    onChange={e => setDraftCorrect(e.target.value)}
                    placeholder="正确的字"
                    className="flex-1 text-sm text-stone-700 border border-[#B0BCDC] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8090C0] bg-white"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAdd}
                    disabled={!draftSentence.trim() || !draftCorrect.trim()}
                    className="flex-1 py-2 rounded-xl text-sm font-bold bg-[#8090C0] text-white disabled:opacity-40"
                  >
                    保存
                  </button>
                  <button
                    onClick={() => { setShowAddForm(false); setDraftSentence(''); setDraftWrong(''); setDraftCorrect(''); }}
                    className="flex-1 py-2 rounded-xl text-sm font-semibold border-2 border-stone-200 text-stone-600 bg-white"
                  >
                    取消
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Done phase ─────────────────────────────────────────────────────────────
  if (phase === 'done') {
    const total = quizEntries.length;
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    const emoji = pct >= 90 ? '🎉' : pct >= 70 ? '👍' : '📝';
    const pctColor = pct >= 80 ? 'text-[#4A8842]' : pct >= 60 ? 'text-amber-500' : 'text-[#B05860]';
    return (
      <div className="flex flex-col h-full items-center justify-center px-8 gap-4">
        <div className="text-5xl">{emoji}</div>
        <div className="text-2xl font-bold text-stone-800">完成！</div>
        <div className="text-stone-400 text-sm">共 {total} 题</div>
        <div className="flex gap-10 my-2">
          <div className="text-center">
            <div className="text-4xl font-bold text-[#4A8842]">{correct}</div>
            <div className="text-sm text-stone-400 mt-1">答对</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-[#B05860]">{wrong}</div>
            <div className="text-sm text-stone-400 mt-1">答错</div>
          </div>
        </div>
        <div className={`text-5xl font-bold ${pctColor}`}>{pct}%</div>
        <div className="text-sm text-stone-400">正确率</div>
        <div className="flex gap-3 w-full mt-4">
          <button
            onClick={() => { setMarks(new Map()); setRevealed(new Set()); setPhase('quiz'); }}
            className="flex-1 py-3 rounded-2xl font-bold border-2 border-[#8090C0] text-[#8090C0] active:bg-stone-50 transition"
          >
            再练一次
          </button>
          <button
            onClick={() => setPhase('select')}
            className="flex-1 py-3 rounded-2xl font-bold bg-[#8090C0] text-white active:bg-[#6878B0] transition"
          >
            重新选题
          </button>
        </div>
      </div>
    );
  }

  // ── Quiz phase ─────────────────────────────────────────────────────────────
  const answeredCount = marks.size;
  const totalCount = quizEntries.length;
  const allAnswered = answeredCount === totalCount && totalCount > 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 px-4 py-3 border-b border-stone-100 bg-stone-50 flex items-center justify-between">
        <div className="text-sm text-stone-500">
          已答 <span className="font-semibold text-stone-700">{answeredCount}/{totalCount}</span>
          {' · '}
          <span className="text-[#4A8842] font-semibold">{correct} 对</span>
          {' · '}
          <span className="text-[#B05860] font-semibold">{wrong} 错</span>
        </div>
        {allAnswered && (
          <button
            onClick={finishQuiz}
            className="px-4 py-1.5 rounded-xl text-sm font-bold bg-[#4A8842] text-white active:bg-[#3A6832] transition"
          >
            完成
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {quizEntries.map((entry, idx) => {
          const result = marks.get(entry.id);
          const isRevealed = revealed.has(entry.id) || result !== undefined;
          const bgClass =
            result === true ? 'bg-[#EDF6EB] border-[#90BE88]'
            : result === false ? 'bg-[#FAEDEE] border-[#D09098]'
            : 'bg-white border-stone-200';

          return (
            <div key={entry.id} className={`rounded-2xl border-2 ${bgClass} overflow-hidden transition-colors`}>
              <div className="px-4 pt-4 pb-3">
                <div className="flex items-start gap-2">
                  <span className="text-xs font-bold text-stone-400 w-6 flex-shrink-0 mt-0.5 text-right">
                    {idx + 1}
                  </span>
                  <p className="text-base text-stone-800 leading-relaxed flex-1">
                    {renderSentence(entry.wrongSentence, entry.wrongWord)}
                  </p>
                </div>

                {/* 查看答案 — full-width tap target */}
                <div className="ml-8 mt-3">
                  {isRevealed ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#4A8842]">
                        正确：{entry.correctWord}
                      </span>
                      {result !== undefined && (
                        <button
                          onClick={() => toggleReveal(entry.id)}
                          className="text-stone-300 hover:text-stone-400 transition-colors"
                        >
                          <EyeOff size={14} />
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => toggleReveal(entry.id)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-stone-100 text-stone-500 active:bg-stone-200 transition-colors w-full justify-center"
                    >
                      <Eye size={15} />
                      查看答案
                    </button>
                  )}
                </div>
              </div>

              <div className="px-4 pb-3 flex gap-2">
                <button
                  onClick={() => mark(entry.id, true)}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-lg transition-colors ${
                    result === true ? 'bg-[#4A8842] text-white' : 'bg-white border-2 border-[#90BE88] text-[#4A8842]'
                  }`}
                >
                  ✓
                </button>
                <button
                  onClick={() => mark(entry.id, false)}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-lg transition-colors ${
                    result === false ? 'bg-[#B05860] text-white' : 'bg-white border-2 border-[#D09098] text-[#B05860]'
                  }`}
                >
                  ✗
                </button>
              </div>
            </div>
          );
        })}

        {allAnswered && (
          <div className="py-4 text-center">
            <button
              onClick={finishQuiz}
              className="px-8 py-3 rounded-2xl font-bold text-base bg-[#4A8842] text-white active:bg-[#3A6832] shadow-sm transition"
            >
              查看结果 →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
