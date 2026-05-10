import { useState, useMemo } from 'react';
import { presetWordLists } from '../data/wordLists';
import { getWordStats } from '../utils/storage';

interface LessonSelectorViewProps {
  onSelectLesson: (lessonId: string) => void;
}

const GRADE_TABS = [
  { value: 5, label: '五年级' },
  { value: 6, label: '六年级' },
] as const;

export default function LessonSelectorView({ onSelectLesson }: LessonSelectorViewProps) {
  const [gradeTab, setGradeTab] = useState<5 | 6>(5);

  const lessonLists = useMemo(() => {
    return presetWordLists
      .filter(l => l.subject === 'chinese' && l.grade === gradeTab && l.lesson !== undefined)
      .sort((a, b) => (a.lesson ?? 0) - (b.lesson ?? 0));
  }, [gradeTab]);

  return (
    <div className="flex flex-col h-full">

      {/* Grade tabs */}
      <div className="bg-stone-50 px-4 pt-3 pb-2 border-b border-stone-100 flex gap-2">
        {GRADE_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setGradeTab(tab.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
              gradeTab === tab.value
                ? 'bg-[#8090C0] text-white shadow-sm'
                : 'bg-stone-100 text-stone-500'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Lesson cards */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
        {lessonLists.map(list => {
          const total = list.words.length;
          const practiced = list.words.filter(w => getWordStats(w.id).total > 0).length;
          const pct = total > 0 ? Math.round((practiced / total) * 100) : 0;

          return (
            <button
              key={list.id}
              onClick={() => onSelectLesson(list.id)}
              className="w-full rounded-2xl p-4 text-left border-2 border-stone-200 bg-white active:scale-[0.98] transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-stone-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-stone-500">
                    {list.lesson}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-stone-800">
                    {list.name} {list.lessonTitle}
                  </div>
                  <div className="text-xs text-stone-400 mt-0.5">{total} 个词语</div>
                  {total > 0 && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex-1 h-1 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#8090C0] rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-stone-400 flex-shrink-0">{practiced}/{total}</span>
                    </div>
                  )}
                </div>
                <div className="text-stone-300 text-lg">›</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
