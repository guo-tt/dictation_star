import { useState, useMemo } from 'react';
import { Volume2 } from 'lucide-react';
import type { ChengYu } from '../data/chengyu';
import { getDisplayPinyin } from '../utils/pinyin';
import ExampleEditor from './ExampleEditor';

const GRADES = [3, 4, 5, 6] as const;
type ChengyuGrade = 3 | 4 | 5 | 6;

interface Props {
  list: ChengYu[];
}

function speak(text: string) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'zh-CN';
  utter.rate = 0.8;
  window.speechSynthesis.speak(utter);
}

export default function ChengYuStudyView({ list }: Props) {
  const [selectedGrades, setSelectedGrades] = useState<Set<ChengyuGrade>>(new Set(GRADES));

  const filteredList = useMemo(() => {
    if (selectedGrades.size === GRADES.length) return list;
    return list.filter(cy =>
      cy.examples.some(e => selectedGrades.has(e.grade as ChengyuGrade)),
    );
  }, [list, selectedGrades]);

  function toggleGrade(g: ChengyuGrade) {
    setSelectedGrades(prev => {
      const next = new Set(prev);
      if (next.has(g)) {
        if (next.size === 1) return prev;
        next.delete(g);
      } else {
        next.add(g);
      }
      return next;
    });
  }

  if (list.length === 0) {
    return <div className="flex-1 flex items-center justify-center text-stone-400">暂无成语</div>;
  }

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

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="text-sm text-stone-400 px-1 mb-3">共 {filteredList.length} 个成语</div>
        <div className="flex flex-col gap-3">
          {filteredList.map((cy, index) => (
            <div
              key={cy.id}
              className="bg-white rounded-2xl shadow-sm border border-[#B0BCDC] overflow-hidden"
            >
              <div className="bg-[#F0F2FB] px-4 pt-4 pb-3">
                <div className="flex items-start gap-3">
                  <div className="bg-[#8090C0] text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-3xl font-bold text-[#5868A8] leading-none tracking-widest">
                      {cy.text}
                    </div>
                    <div className="text-sm text-stone-400 mt-1 font-medium">
                      {getDisplayPinyin(cy.text, undefined)}
                    </div>
                  </div>
                  <button
                    onClick={() => speak(cy.text)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-white text-xs font-medium bg-[#8090C0] active:bg-[#6878B0] transition-colors shadow-sm flex-shrink-0"
                  >
                    <Volume2 size={14} />
                  </button>
                </div>

                {cy.examples.length > 0 && (
                  <div className="mt-3 space-y-2.5">
                    {cy.examples.map((ex, i) => (
                      <div key={i} className="border-t border-[#D8DEF0] pt-2.5">
                        <div className="text-xs font-semibold text-[#8090C0] mb-1">
                          P{ex.grade} 第{ex.lesson}课
                        </div>
                        <div className="text-sm text-stone-700 leading-relaxed">{ex.sentence}</div>
                      </div>
                    ))}
                  </div>
                )}
                <ExampleEditor
                  wordId={cy.id}
                  original={cy.examples[0]?.sentence ?? ''}
                  addOnly={true}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
