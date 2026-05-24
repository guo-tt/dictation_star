import { useState, useMemo, useRef } from 'react';
import { DictationMode, Word } from '../types';
import { chengyuList, chengyuToWords } from '../data/chengyu';
import { getDisplayPinyin } from '../utils/pinyin';
import { getWordStats } from '../utils/storage';

const GRADES = [3, 4, 5, 6] as const;
type ChengyuGrade = 3 | 4 | 5 | 6;

interface Props {
  mode: DictationMode;
  onStart: (words: Word[]) => void;
}

export default function ChengYuSelectorView({ onStart }: Props) {
  const [selectedGrades, setSelectedGrades] = useState<Set<ChengyuGrade>>(new Set(GRADES));
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(chengyuList.map(c => c.id)),
  );

  const listRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    active: boolean;
    startIndex: number;
    isSelecting: boolean;
    initialIds: Set<string>;
  } | null>(null);
  const didDragRef = useRef(false);
  const displayItemsRef = useRef(chengyuList);
  const dragMoveFnRef = useRef<((e: TouchEvent) => void) | null>(null);
  const autoScrollRef = useRef<number | null>(null);
  const touchPosRef = useRef<{ x: number; y: number } | null>(null);

  const filteredList = useMemo(() => {
    if (selectedGrades.size === GRADES.length) return chengyuList;
    return chengyuList.filter(cy =>
      cy.examples.some(e => selectedGrades.has(e.grade as ChengyuGrade)),
    );
  }, [selectedGrades]);

  displayItemsRef.current = filteredList;

  function toggleGrade(g: ChengyuGrade) {
    const next = new Set(selectedGrades);
    if (next.has(g)) {
      if (next.size === 1) return;
      next.delete(g);
    } else {
      next.add(g);
    }
    setSelectedGrades(next);
    const newFiltered =
      next.size === GRADES.length
        ? chengyuList
        : chengyuList.filter(cy =>
            cy.examples.some(e => next.has(e.grade as ChengyuGrade)),
          );
    setSelectedIds(new Set(newFiltered.map(c => c.id)));
  }

  function toggleItem(id: string) {
    if (didDragRef.current) { didDragRef.current = false; return; }
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const filteredIds = filteredList.map(c => c.id);
  const allSelected = filteredIds.length > 0 && filteredIds.every(id => selectedIds.has(id));

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        filteredIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        filteredIds.forEach(id => next.add(id));
        return next;
      });
    }
  }

  function applyDragSelection(x: number, y: number) {
    const d = dragRef.current;
    if (!d) return;
    const target = document.elementFromPoint(x, y)
      ?.closest('[data-item-index]') as HTMLElement | null;
    if (!target) return;
    const i = parseInt(target.dataset.itemIndex ?? '-1');
    if (i < 0) return;
    const items = displayItemsRef.current;
    const lo = Math.min(d.startIndex, i);
    const hi = Math.max(d.startIndex, i);
    const next = new Set(d.initialIds);
    for (let j = lo; j <= hi; j++) {
      if (items[j]) {
        if (d.isSelecting) next.add(items[j].id);
        else next.delete(items[j].id);
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
    const itemEl = (touch.target as Element).closest('[data-item-index]') as HTMLElement | null;
    if (!itemEl) return;
    const idx = parseInt(itemEl.dataset.itemIndex ?? '-1');
    if (idx < 0 || !displayItemsRef.current[idx]) return;

    dragRef.current = {
      active: false,
      startIndex: idx,
      isSelecting: !selectedIds.has(displayItemsRef.current[idx].id),
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

  const selectedWords = chengyuToWords(filteredList.filter(cy => selectedIds.has(cy.id)));
  const selectedCount = filteredList.filter(cy => selectedIds.has(cy.id)).length;

  return (
    <div className="flex flex-col h-full">
      {/* Grade filter */}
      <div className="px-4 py-3 border-b border-stone-100 bg-stone-50 flex-shrink-0">
        <div className="text-xs text-stone-400 mb-2">按年级过滤（可多选）</div>
        <div className="flex gap-2">
          {GRADES.map(g => (
            <button
              key={g}
              onClick={() => toggleGrade(g)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition ${
                selectedGrades.has(g)
                  ? 'bg-[#F0F2FB] border-[#B0BCDC] text-[#5868A8]'
                  : 'bg-white border-stone-200 text-stone-400'
              }`}
            >
              P{g}
            </button>
          ))}
        </div>
      </div>

      {/* Select all row */}
      <div className="px-4 py-2 flex items-center gap-3 flex-shrink-0 bg-white border-b border-stone-100">
        <span className="text-xs text-stone-500 flex-1">
          共 {filteredList.length} 个 · 已选 <span className="font-semibold text-stone-700">{selectedCount}</span> 个
        </span>
        <button onClick={toggleAll} className="text-xs text-[#5868A8] font-semibold">
          {allSelected ? '取消全选' : '全选'}
        </button>
        <button
          disabled={selectedCount === 0}
          onClick={() => { if (selectedWords.length > 0) onStart(selectedWords); }}
          className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#7888C8] to-[#A8B8DC] disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          开始 →
        </button>
      </div>

      {/* Word list */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2"
        onTouchStart={handleDragTouchStart}
        onTouchEnd={handleDragTouchEnd}
        onTouchCancel={handleDragTouchEnd}
      >
        {filteredList.map((cy, index) => {
          const checked = selectedIds.has(cy.id);
          const stats = getWordStats(cy.id);
          const errorRate =
            stats.total === 0
              ? null
              : Math.round(((stats.total - stats.correct) / stats.total) * 100);

          return (
            <button
              key={cy.id}
              data-item-index={String(index)}
              onClick={() => toggleItem(cy.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition active:scale-[0.98] text-left ${
                checked ? 'border-[#B0BCDC] bg-[#F0F2FB]' : 'border-stone-200 bg-white'
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

              {/* Round checkbox */}
              <div
                className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                  checked ? 'border-[#8090C0] bg-[#8090C0]' : 'border-stone-300'
                }`}
              >
                {checked && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>

              {/* Text + pinyin + example */}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-stone-800 text-sm">{cy.text}</div>
                <div className="text-xs text-stone-400 mt-0.5">
                  {getDisplayPinyin(cy.text, undefined)}
                </div>
                {cy.examples[0] && (
                  <div className="text-xs text-stone-400 mt-0.5 truncate">
                    {cy.examples[0].sentence}
                  </div>
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
              </div>
            </button>
          );
        })}
      </div>

      {/* Start button */}
      <div className="px-4 py-4 bg-white border-t border-stone-100 flex-shrink-0">
        <button
          onClick={() => { if (selectedWords.length > 0) onStart(selectedWords); }}
          disabled={selectedWords.length === 0}
          className="w-full py-3 rounded-2xl font-bold text-white text-base shadow-md active:scale-[0.98] transition bg-gradient-to-r from-[#7888C8] to-[#A8B8DC] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          开始听写（{selectedCount} 个）
        </button>
      </div>
    </div>
  );
}
