import { useMemo } from 'react';
import { Subject } from '../types';
import { presetWordLists } from '../data/wordLists';
import { getCustomLists, getHiddenListIds } from '../utils/storage';

interface HomeViewProps {
  onSelectSubject: (subject: Subject) => void;
}

const GRADE_LABEL: Record<number, string> = {
  0: '学前', 1: '一年级', 2: '二年级', 3: '三年级',
  4: '四年级', 5: '五年级', 6: '六年级',
};

export default function HomeView({ onSelectSubject }: HomeViewProps) {
  const chineseChips = useMemo(() => {
    const hiddenIds = getHiddenListIds();
    const visiblePresets = presetWordLists.filter(
      l => l.subject === 'chinese' && !hiddenIds.includes(l.id),
    );
    const customLists = getCustomLists('chinese');

    const grades = new Set([
      ...visiblePresets.map(l => l.grade).filter((g): g is number => g !== undefined),
      ...customLists.map(l => l.grade).filter((g): g is number => g !== undefined),
    ]);

    const chips = [...grades].sort((a, b) => a - b).map(g => GRADE_LABEL[g] ?? `${g}年级`);
    if (chips.length > 1) chips.push('全部一起练');
    return chips;
  }, []);

  const englishChips = useMemo(() => {
    const hiddenIds = getHiddenListIds();
    const visibleSets = presetWordLists
      .filter(l => l.subject === 'english' && !hiddenIds.includes(l.id))
      .map(l => l.name);
    return visibleSets;
  }, []);

  return (
    <div className="p-5 md:p-8 flex flex-col gap-5 md:gap-8">
      <div className="text-center py-4">
        <div className="text-5xl mb-3">📚</div>
        <h2 className="text-2xl font-bold text-stone-800">听写小状元</h2>
        <p className="text-stone-500 mt-1 text-sm">DictationStar · 请选择要练习的科目</p>
      </div>

      <div className="flex flex-col md:flex-row gap-5 md:gap-6">

      {/* Chinese Subject Card */}
      <button
        onClick={() => onSelectSubject('chinese')}
        className="group md:flex-1 bg-gradient-to-br from-[#F0F2FB] to-[#F3F4FB] border-2 border-[#B0BCDC] rounded-2xl p-6 text-left shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-150"
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7888C8] to-[#A8B8DC] flex items-center justify-center text-white text-3xl shadow-md">
            语
          </div>
          <div className="flex-1">
            <div className="text-xl font-bold text-stone-800 group-hover:text-[#5868A8] transition-colors">
              语文
            </div>
            <div className="text-sm text-stone-500 mt-0.5">Chinese Language</div>
            <div className="flex flex-wrap gap-1 mt-2">
              {chineseChips.map(name => (
                <span key={name} className="text-xs bg-[#E8EAF6] text-[#5868A8] px-2 py-0.5 rounded-full">
                  {name}
                </span>
              ))}
            </div>
          </div>
          <div className="text-[#8090C0] text-xl">›</div>
        </div>
      </button>

      {/* English Subject Card */}
      <button
        onClick={() => onSelectSubject('english')}
        className="group md:flex-1 bg-gradient-to-br from-[#EEF5FA] to-[#EEF8FA] border-2 border-[#A0C0D8] rounded-2xl p-6 text-left shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-150"
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6090B0] to-[#8CB4CC] flex items-center justify-center text-white text-3xl shadow-md">
            En
          </div>
          <div className="flex-1">
            <div className="text-xl font-bold text-stone-800 group-hover:text-[#407898] transition-colors">
              英语
            </div>
            <div className="text-sm text-stone-500 mt-0.5">English Language</div>
            <div className="flex flex-wrap gap-1 mt-2">
              {englishChips.map(name => (
                <span key={name} className="text-xs bg-[#DDE8F5] text-[#407898] px-2 py-0.5 rounded-full">
                  {name}
                </span>
              ))}
            </div>
          </div>
          <div className="text-[#7BAFC8] text-xl">›</div>
        </div>
      </button>

      </div>

      <div className="mt-2 text-center text-xs text-stone-400">
        <p>所有练习记录保存在本设备</p>
      </div>
    </div>
  );
}
