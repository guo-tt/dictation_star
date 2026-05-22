import { useState, useMemo } from 'react';
import { Check } from 'lucide-react';
import { DictationMode, Word } from '../types';
import { chengyuList, chengyuToWords } from '../data/chengyu';
import { getDisplayPinyin } from '../utils/pinyin';

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

  const filteredList = useMemo(() => {
    if (selectedGrades.size === GRADES.length) return chengyuList;
    return chengyuList.filter(cy =>
      cy.examples.some(e => selectedGrades.has(e.grade as ChengyuGrade)),
    );
  }, [selectedGrades]);

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

  function toggleChengyu(id: string) {
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

  const selectedWords = chengyuToWords(filteredList.filter(cy => selectedIds.has(cy.id)));

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
      <div className="px-4 py-2 flex justify-between items-center flex-shrink-0 bg-white border-b border-stone-100">
        <span className="text-xs text-stone-500">共 {filteredList.length} 个成语</span>
        <button onClick={toggleAll} className="text-xs text-[#5868A8] font-semibold">
          {allSelected ? '取消全选' : '全选'}
        </button>
      </div>

      {/* Word list */}
      <div className="flex-1 overflow-y-auto">
        {filteredList.map(cy => {
          const checked = selectedIds.has(cy.id);
          return (
            <button
              key={cy.id}
              onClick={() => toggleChengyu(cy.id)}
              className="w-full flex items-center gap-3 px-4 py-3 border-b border-stone-100 text-left active:bg-stone-50 transition"
            >
              <div
                className={`w-6 h-6 rounded-md flex-shrink-0 flex items-center justify-center border-2 transition ${
                  checked
                    ? 'bg-[#8090C0] border-[#8090C0]'
                    : 'bg-white border-stone-300'
                }`}
              >
                {checked && <Check size={14} strokeWidth={3} className="text-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-base font-bold text-stone-800">{cy.text}</div>
                <div className="text-xs text-stone-400 mt-0.5">
                  {getDisplayPinyin(cy.text, undefined)}
                </div>
                {cy.examples[0] && (
                  <div className="text-xs text-stone-400 mt-0.5 truncate">
                    {cy.examples[0].sentence}
                  </div>
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
          开始听写（{selectedWords.length} 个）
        </button>
      </div>
    </div>
  );
}
