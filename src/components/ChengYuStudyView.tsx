import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ChengYu } from '../data/chengyu';
import { getDisplayPinyin } from '../utils/pinyin';

interface Props {
  list: ChengYu[];
}

export default function ChengYuStudyView({ list }: Props) {
  const [index, setIndex] = useState(0);

  if (list.length === 0) {
    return <div className="flex-1 flex items-center justify-center text-stone-400">暂无成语</div>;
  }

  const cy = list[index];

  return (
    <div className="flex flex-col h-full px-4 py-5">
      {/* Idiom card */}
      <div className="flex-1 overflow-y-auto">
        <div className="rounded-2xl bg-[#F0F2FB] border border-[#D0D8F0] p-6">
          <div className="text-4xl font-bold text-[#3A4A8A] text-center tracking-widest mb-2">
            {cy.text}
          </div>
          <div className="text-sm text-[#8090C0] text-center mb-5">
            {getDisplayPinyin(cy.text, undefined)}
          </div>
          <div className="border-t border-[#D0D8F0] pt-4 space-y-5">
            {cy.examples.map((ex, i) => (
              <div key={i}>
                <div className="text-xs font-semibold text-[#8090C0] mb-1">
                  P{ex.grade} 第{ex.lesson}课
                </div>
                <div className="text-sm text-stone-700 leading-relaxed">{ex.sentence}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-5 flex-shrink-0">
        <button
          onClick={() => setIndex(i => i - 1)}
          disabled={index === 0}
          className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-semibold border-2 border-[#B0BCDC] text-[#5868A8] disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <ChevronLeft size={16} />上一个
        </button>
        <span className="text-sm text-stone-400">{index + 1} / {list.length}</span>
        <button
          onClick={() => setIndex(i => i + 1)}
          disabled={index === list.length - 1}
          className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-semibold border-2 border-[#B0BCDC] text-[#5868A8] disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          下一个<ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
