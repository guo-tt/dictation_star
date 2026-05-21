import { useState, useEffect } from 'react';
import { Plus, ChevronDown, ChevronRight, Pencil, Trash2, BookOpen } from 'lucide-react';
import { DictationMode, GradeFilter, CustomGrade, CustomListMeta, Word } from '../types';
import ChengYuPanel from './ChengYuPanel';
import type { ChengYu } from '../data/chengyu';
import {
  getCustomGrades, addCustomGrade, deleteCustomGrade,
  addCustomList, getCustomListsForGrade, deleteCustomList,
  ZUOWEN_LIST_ID, getOrCreateZuowenList, getCustomWordsForList,
} from '../utils/storage';

interface WordListViewProps {
  onOpenMixedSelector: (grade: GradeFilter, mode: DictationMode) => void;
  onOpenLessonSelector: (mode: DictationMode) => void;
  onOpenStudyGrade: (grade: GradeFilter) => void;
  onOpenStudyLessonSelector: () => void;
  onEditLesson: (listId: string) => void;
  onStartCustomLesson: (listId: string, lessonName: string, mode: DictationMode) => void;
  onStartGradeDictation: (gradeId: string, gradeName: string, mode: DictationMode) => void;
  onStartChengyuDictation: (words: Word[], label: string, mode: DictationMode) => void;
  onStartChengyuStudy: (list: ChengYu[], label: string) => void;
}

export default function WordListView({
  onOpenMixedSelector,
  onOpenLessonSelector,
  onOpenStudyGrade,
  onOpenStudyLessonSelector,
  onEditLesson,
  onStartCustomLesson,
  onStartGradeDictation,
  onStartChengyuDictation,
  onStartChengyuStudy,
}: WordListViewProps) {
  const [mainTab, setMainTab] = useState<'dictation' | 'study' | 'chengyu'>('dictation');
  const [dictationMode, setDictationMode] = useState<DictationMode>('parent');

  const [grades, setGrades] = useState<CustomGrade[]>(() => getCustomGrades());
  const [expandedGradeId, setExpandedGradeId] = useState<string | null>(null);
  const [gradeLessons, setGradeLessons] = useState<CustomListMeta[]>([]);
  const [newGradeName, setNewGradeName] = useState('');
  const [showNewGradeInput, setShowNewGradeInput] = useState(false);
  const [newLessonName, setNewLessonName] = useState('');
  const [showNewLessonInput, setShowNewLessonInput] = useState(false);

  useEffect(() => {
    if (expandedGradeId) {
      setGradeLessons(getCustomListsForGrade(expandedGradeId));
    }
  }, [expandedGradeId]);

  function handleAddGrade() {
    if (!newGradeName.trim()) return;
    const grade = addCustomGrade(newGradeName.trim(), 'chinese');
    setGrades(getCustomGrades());
    setNewGradeName('');
    setShowNewGradeInput(false);
    setExpandedGradeId(grade.id);
    setGradeLessons([]);
  }

  function handleDeleteGrade(id: string) {
    deleteCustomGrade(id);
    setGrades(getCustomGrades());
    if (expandedGradeId === id) setExpandedGradeId(null);
  }

  function handleAddLesson() {
    if (!newLessonName.trim() || !expandedGradeId) return;
    const list = addCustomList(newLessonName.trim(), 'chinese', undefined, expandedGradeId);
    setGradeLessons(getCustomListsForGrade(expandedGradeId));
    setNewLessonName('');
    setShowNewLessonInput(false);
    onEditLesson(list.id);
  }

  function handleDeleteLesson(listId: string) {
    deleteCustomList(listId);
    if (expandedGradeId) setGradeLessons(getCustomListsForGrade(expandedGradeId));
  }

  return (
    <div className="flex flex-col h-full px-4 py-5 gap-4">

      {/* Main tab switcher */}
      <div className="flex gap-2 flex-shrink-0">
        {([
          { value: 'dictation' as const, label: '听写' },
          { value: 'study' as const, label: '学习' },
          { value: 'chengyu' as const, label: '成语' },
        ]).map(tab => (
          <button
            key={tab.value}
            onClick={() => setMainTab(tab.value)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition border ${
              mainTab === tab.value
                ? 'bg-[#F0F2FB] border-[#B0BCDC] text-[#5868A8]'
                : 'bg-stone-50 border-stone-200 text-stone-500'
            }`}
          >
            {tab.label}
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
          <div className="flex flex-col gap-3">
            <button
              onClick={() => onOpenLessonSelector(dictationMode)}
              className="rounded-2xl px-4 py-5 text-left border-2 border-[#B0BCDC] bg-[#F0F2FB] active:scale-[0.98] transition"
            >
              <div className="text-base font-bold text-[#5868A8]">按课听写</div>
              <div className="text-xs text-[#8090C0] mt-0.5">选年级→选课</div>
            </button>
            <div className="grid grid-cols-2 gap-3">
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
            </div>
          </div>

          {/* 作文常错字库 card */}
          <div className="rounded-2xl border-2 border-[#B0BCDC] bg-[#F0F2FB] px-4 py-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl leading-none">📝</span>
              <div className="flex-1 min-w-0">
                <div className="text-base font-bold text-[#5868A8]">作文常错字库</div>
                <div className="text-xs text-[#8090C0] mt-0.5">收集作文里写错的字词，随时听写复习</div>
                <div className="text-xs text-stone-400 mt-1">
                  {getCustomWordsForList(ZUOWEN_LIST_ID).length} 个词
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => onStartCustomLesson(ZUOWEN_LIST_ID, '作文常错字', dictationMode)}
                disabled={getCustomWordsForList(ZUOWEN_LIST_ID).length === 0}
                className="flex-1 py-2 rounded-xl text-sm font-bold bg-[#8090C0] text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                开始听写
              </button>
              <button
                onClick={() => { getOrCreateZuowenList(); onEditLesson(ZUOWEN_LIST_ID); }}
                className="flex-1 py-2 rounded-xl text-sm font-semibold border-2 border-[#B0BCDC] text-[#5868A8] bg-white transition"
              >
                编辑词库
              </button>
            </div>
          </div>

          {/* Custom grade section */}
          <div className="mt-2">
            <div className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2 px-1">自定义年级</div>

            {/* Grade chips row */}
            <div className="flex flex-wrap gap-2 mb-2">
              {grades.map(g => (
                <div key={g.id} className="flex items-center gap-1">
                  <button
                    onClick={() => setExpandedGradeId(expandedGradeId === g.id ? null : g.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold border-2 transition ${
                      expandedGradeId === g.id
                        ? 'bg-[#F0F2FB] border-[#B0BCDC] text-[#5868A8]'
                        : 'bg-white border-stone-200 text-stone-600'
                    }`}
                  >
                    {g.name}
                    {expandedGradeId === g.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                  <button
                    onClick={() => handleDeleteGrade(g.id)}
                    className="p-1 text-stone-300 hover:text-red-400 transition"
                    aria-label="删除年级"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}

              {showNewGradeInput ? (
                <div className="flex items-center gap-1">
                  <input
                    autoFocus
                    type="text"
                    value={newGradeName}
                    onChange={e => setNewGradeName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleAddGrade();
                      if (e.key === 'Escape') { setShowNewGradeInput(false); setNewGradeName(''); }
                    }}
                    placeholder="年级名称"
                    className="border-2 border-[#B0BCDC] rounded-xl px-2 py-1 text-sm w-28 outline-none focus:ring-2 ring-[#8090C0]"
                  />
                  <button onClick={handleAddGrade} className="px-2 py-1 rounded-lg bg-[#8090C0] text-white text-sm font-bold">确定</button>
                  <button onClick={() => { setShowNewGradeInput(false); setNewGradeName(''); }} className="px-2 py-1 rounded-lg bg-stone-100 text-stone-600 text-sm">取消</button>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewGradeInput(true)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl border-2 border-dashed border-stone-300 text-stone-400 text-sm hover:border-[#B0BCDC] hover:text-[#8090C0] transition"
                >
                  <Plus size={14} /> 新建年级
                </button>
              )}
            </div>

            {/* Expanded grade: lesson list */}
            {expandedGradeId && (
              <div className="bg-white rounded-2xl border-2 border-[#E0E4F0] p-3 flex flex-col gap-2">
                {gradeLessons.length === 0 && !showNewLessonInput && (
                  <div className="text-sm text-stone-400 text-center py-2">暂无课程</div>
                )}

                {gradeLessons.map(lesson => (
                  <div key={lesson.id} className="flex items-center gap-2">
                    <button
                      onClick={() => onStartCustomLesson(lesson.id, lesson.name, dictationMode)}
                      className="flex-1 text-left px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-sm font-medium text-stone-700 hover:bg-[#F0F2FB] transition"
                    >
                      {lesson.name}
                    </button>
                    <button
                      onClick={() => onEditLesson(lesson.id)}
                      className="p-2 rounded-xl border border-stone-200 text-stone-400 hover:text-[#8090C0] transition"
                      aria-label="编辑课"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteLesson(lesson.id)}
                      className="p-2 rounded-xl border border-stone-200 text-stone-400 hover:text-red-400 transition"
                      aria-label="删除课"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}

                {showNewLessonInput ? (
                  <div className="flex items-center gap-1">
                    <input
                      autoFocus
                      type="text"
                      value={newLessonName}
                      onChange={e => setNewLessonName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleAddLesson();
                        if (e.key === 'Escape') { setShowNewLessonInput(false); setNewLessonName(''); }
                      }}
                      placeholder="课名"
                      className="flex-1 border-2 border-[#B0BCDC] rounded-xl px-2 py-1.5 text-sm outline-none focus:ring-2 ring-[#8090C0]"
                    />
                    <button onClick={handleAddLesson} className="px-2 py-1.5 rounded-lg bg-[#8090C0] text-white text-sm font-bold">确定</button>
                    <button onClick={() => { setShowNewLessonInput(false); setNewLessonName(''); }} className="px-2 py-1.5 rounded-lg bg-stone-100 text-stone-600 text-sm">取消</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowNewLessonInput(true)}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-xl border-2 border-dashed border-stone-300 text-stone-400 text-sm hover:border-[#B0BCDC] hover:text-[#8090C0] transition"
                  >
                    <Plus size={14} /> 新建课
                  </button>
                )}

                {gradeLessons.length > 0 && (
                  <button
                    onClick={() => {
                      const gradeName = grades.find(g => g.id === expandedGradeId)?.name ?? '';
                      onStartGradeDictation(expandedGradeId, gradeName, dictationMode);
                    }}
                    className="mt-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#F0F2FB] border-2 border-[#B0BCDC] text-[#5868A8] text-sm font-semibold"
                  >
                    <BookOpen size={14} /> 整年级听写
                  </button>
                )}
              </div>
            )}
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

      {mainTab === 'chengyu' && (
        <div className="flex-1 min-h-0 -mx-4">
          <ChengYuPanel
            onStartDictation={onStartChengyuDictation}
            onStartStudy={onStartChengyuStudy}
          />
        </div>
      )}
    </div>
  );
}
