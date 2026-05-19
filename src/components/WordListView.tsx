import { useState } from 'react';
import { DictationMode, GradeFilter } from '../types';

interface WordListViewProps {
  onOpenMixedSelector: (grade: GradeFilter, mode: DictationMode) => void;
  onOpenLessonSelector: (mode: DictationMode) => void;
  onOpenStudyGrade: (grade: GradeFilter) => void;
  onOpenStudyLessonSelector: () => void;
}

export default function WordListView({
  onOpenMixedSelector,
  onOpenLessonSelector,
  onOpenStudyGrade,
  onOpenStudyLessonSelector,
}: WordListViewProps) {
  const [mainTab, setMainTab] = useState<'dictation' | 'study'>('dictation');
  const [dictationMode, setDictationMode] = useState<DictationMode>('parent');

  return (
    <div className="flex flex-col h-full px-4 py-5 gap-4">

      {/* Main tab switcher */}
      <div className="flex gap-2">
        {(['dictation', 'study'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setMainTab(tab)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition border ${
              mainTab === tab
                ? 'bg-[#F0F2FB] border-[#B0BCDC] text-[#5868A8]'
                : 'bg-stone-50 border-stone-200 text-stone-500'
            }`}
          >
            {tab === 'dictation' ? '听写' : '学习'}
          </button>
        ))}
      </div>

      {mainTab === 'dictation' && (
        <>
          {/* Parent / Student toggle */}
          <div className="flex gap-2">
            {([
              { value: 'parent' as DictationMode, label: '👨‍👩‍👧 家长模式', desc: '显示文字' },
              { value: 'student' as DictationMode, label: '✏️ 学生模式', desc: '隐藏文字' },
            ]).map(m => (
              <button
                key={m.value}
                onClick={() => setDictationMode(m.value)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition border ${
                  dictationMode === m.value
                    ? 'bg-[#F0F2FB] border-[#B0BCDC] text-[#5868A8]'
                    : 'bg-stone-50 border-stone-200 text-stone-500'
                }`}
              >
                <div>{m.label}</div>
                <div className="text-xs opacity-60 font-normal">{m.desc}</div>
              </button>
            ))}
          </div>

          {/* Dictation entry buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onOpenLessonSelector(dictationMode)}
              className="rounded-2xl px-4 py-5 text-left border-2 border-[#B0BCDC] bg-[#F0F2FB] active:scale-[0.98] transition"
            >
              <div className="text-base font-bold text-[#5868A8]">按课听写</div>
              <div className="text-xs text-[#8090C0] mt-0.5">选年级→选课</div>
            </button>
            <button
              onClick={() => onOpenMixedSelector(5, dictationMode)}
              className="rounded-2xl px-4 py-5 text-left border-2 border-stone-200 bg-white active:scale-[0.98] transition"
            >
              <div className="text-base font-bold text-stone-700">五年级</div>
              <div className="text-xs text-stone-400 mt-0.5">全部五年级词语</div>
            </button>
            <button
              onClick={() => onOpenMixedSelector(6, dictationMode)}
              className="rounded-2xl px-4 py-5 text-left border-2 border-stone-200 bg-white active:scale-[0.98] transition"
            >
              <div className="text-base font-bold text-stone-700">六年级</div>
              <div className="text-xs text-stone-400 mt-0.5">全部六年级词语</div>
            </button>
            <button
              onClick={() => onOpenMixedSelector('all', dictationMode)}
              className="rounded-2xl px-4 py-5 text-left border-2 border-stone-200 bg-white active:scale-[0.98] transition"
            >
              <div className="text-base font-bold text-stone-700">全部</div>
              <div className="text-xs text-stone-400 mt-0.5">五六年级一起</div>
            </button>
          </div>
        </>
      )}

      {mainTab === 'study' && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onOpenStudyLessonSelector}
            className="rounded-2xl px-4 py-5 text-left border-2 border-[#B0BCDC] bg-[#F0F2FB] active:scale-[0.98] transition"
          >
            <div className="text-base font-bold text-[#5868A8]">按课学习</div>
            <div className="text-xs text-[#8090C0] mt-0.5">选年级→选课</div>
          </button>
          <button
            onClick={() => onOpenStudyGrade(5)}
            className="rounded-2xl px-4 py-5 text-left border-2 border-stone-200 bg-white active:scale-[0.98] transition"
          >
            <div className="text-base font-bold text-stone-700">五年级</div>
            <div className="text-xs text-stone-400 mt-0.5">全部五年级词语</div>
          </button>
          <button
            onClick={() => onOpenStudyGrade(6)}
            className="rounded-2xl px-4 py-5 text-left border-2 border-stone-200 bg-white active:scale-[0.98] transition"
          >
            <div className="text-base font-bold text-stone-700">六年级</div>
            <div className="text-xs text-stone-400 mt-0.5">全部六年级词语</div>
          </button>
          <button
            onClick={() => onOpenStudyGrade('all')}
            className="rounded-2xl px-4 py-5 text-left border-2 border-stone-200 bg-white active:scale-[0.98] transition"
          >
            <div className="text-base font-bold text-stone-700">全部</div>
            <div className="text-xs text-stone-400 mt-0.5">五六年级一起</div>
          </button>
        </div>
      )}
    </div>
  );
}
