import { useState, useCallback, useMemo } from 'react';
import { Plus, Trash2, BookOpen, PenLine } from 'lucide-react';
import { DictationMode, FilterMode, WordList, CustomListMeta, GradeFilter } from '../types';
import {
  buildAllList,
  presetWordLists,
} from '../data/wordLists';
import {
  getCustomWordsForList,
  getWordStats,
  getCustomLists,
  deleteCustomList,
  hidePresetList,
  getHiddenListIds,
  applyOverridesAndFilter,
} from '../utils/storage';
import AddWordModal from './AddWordModal';
import AddListModal from './AddListModal';

interface WordListViewProps {
  onOpenSelector: (grade: GradeFilter, mode: DictationMode) => void;
  onOpenMixedSelector: (grade: GradeFilter, mode: DictationMode) => void;
  onOpenLessonSelector: (mode: DictationMode) => void;
  onStudy: (list: WordList, mode: DictationMode, filter: FilterMode) => void;
}

const GRADE_TABS: { value: GradeFilter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 5, label: '五年级' },
  { value: 6, label: '六年级' },
];

export default function WordListView({ onOpenSelector, onOpenMixedSelector, onOpenLessonSelector, onStudy }: WordListViewProps) {
  const [gradeFilter, setGradeFilter] = useState<GradeFilter>('all');
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [dictationMode, setDictationMode] = useState<DictationMode>('parent');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [showAddWord, setShowAddWord] = useState(false);
  const [showAddList, setShowAddList] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const bump = useCallback(() => setVersion(v => v + 1), []);

  const hiddenIds = useMemo(() => getHiddenListIds(), [version]);

  const allLists = useMemo((): (WordList & { isCustomList?: boolean })[] => {
    const presets = presetWordLists
      .filter(l => l.subject === 'chinese' && (l.grade === 5 || l.grade === 6) && !hiddenIds.includes(l.id))
      .map(l => ({ ...l, words: [...applyOverridesAndFilter(l.words), ...getCustomWordsForList(l.id)] }));

    const customs: (WordList & { isCustomList?: boolean })[] = getCustomLists('chinese').map(
      (meta: CustomListMeta) => ({
        id: meta.id,
        name: meta.name,
        subject: 'chinese' as const,
        grade: meta.grade,
        isVirtual: false,
        isCustomList: true,
        words: getCustomWordsForList(meta.id),
      }),
    );

    return [...presets, ...customs];
  }, [version]);

  const filteredLists = useMemo(() => {
    if (gradeFilter === 'all') return allLists;
    return allLists.filter(l => l.grade === gradeFilter);
  }, [allLists, gradeFilter]);

  function buildDictationList(): WordList {
    if (!selectedListId) {
      const base = buildAllList('chinese');
      const source = gradeFilter === 'all' ? allLists : allLists.filter(l => l.grade === gradeFilter);
      const words = source.flatMap(l => l.words);
      const seen = new Set<string>();
      return { ...base, words: words.filter(w => seen.has(w.id) ? false : (seen.add(w.id), true)) };
    }
    return allLists.find(l => l.id === selectedListId) ?? allLists[0] ?? buildAllList('chinese');
  }

  function listProgress(list: WordList) {
    let practiced = 0;
    for (const w of list.words) {
      if (getWordStats(w.id).total > 0) practiced++;
    }
    return { practiced, total: list.words.length };
  }

  function handleDelete(list: WordList & { isCustomList?: boolean }) {
    if (list.isCustomList) deleteCustomList(list.id);
    else hidePresetList(list.id);
    if (selectedListId === list.id) setSelectedListId('');
    setConfirmDeleteId(null);
    bump();
  }

  const canStart = selectedListId !== '' || filteredLists.length > 0;

  return (
    <div className="flex flex-col h-full">

      {/* ── Grade tabs + actions ── */}
      <div className="bg-stone-50 px-4 pt-3 pb-2 border-b border-stone-100 flex items-center gap-2">
        <div className="flex gap-1.5 flex-1">
          {GRADE_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => { setGradeFilter(tab.value); setSelectedListId(''); }}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                gradeFilter === tab.value
                  ? 'bg-[#8090C0] text-white shadow-sm'
                  : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowAddList(true)}
          className="flex items-center gap-1 text-xs font-medium text-[#5868A8] bg-[#F0F2FB] border border-[#B0BCDC] px-2.5 py-1.5 rounded-xl active:opacity-70"
        >
          <Plus size={13} />新建
        </button>
        <button
          onClick={() => setShowAddWord(true)}
          className="flex items-center gap-1 text-xs font-medium text-[#5868A8] bg-[#F0F2FB] border border-[#B0BCDC] px-2.5 py-1.5 rounded-xl active:opacity-70"
        >
          <Plus size={13} />加词
        </button>
      </div>

      {/* ── Quick-start section ── */}
      <div className="px-4 pt-3 pb-1">
        <div className="text-xs text-stone-400 font-medium mb-2">快速练习</div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onOpenLessonSelector(dictationMode)}
            className="rounded-2xl px-4 py-3 text-left border-2 border-[#B0BCDC] bg-[#F0F2FB] active:scale-[0.98] transition"
          >
            <div className="text-sm font-bold text-[#5868A8]">按课听写</div>
            <div className="text-xs text-[#8090C0] mt-0.5">选年级→选课</div>
          </button>
          <button
            onClick={() => onOpenMixedSelector(5, dictationMode)}
            className="rounded-2xl px-4 py-3 text-left border-2 border-stone-200 bg-white active:scale-[0.98] transition"
          >
            <div className="text-sm font-bold text-stone-700">五年级混合</div>
            <div className="text-xs text-stone-400 mt-0.5">全部五年级词语</div>
          </button>
          <button
            onClick={() => onOpenMixedSelector(6, dictationMode)}
            className="rounded-2xl px-4 py-3 text-left border-2 border-stone-200 bg-white active:scale-[0.98] transition"
          >
            <div className="text-sm font-bold text-stone-700">六年级混合</div>
            <div className="text-xs text-stone-400 mt-0.5">全部六年级词语</div>
          </button>
          <button
            onClick={() => onOpenMixedSelector('all', dictationMode)}
            className="rounded-2xl px-4 py-3 text-left border-2 border-stone-200 bg-white active:scale-[0.98] transition"
          >
            <div className="text-sm font-bold text-stone-700">全部混合</div>
            <div className="text-xs text-stone-400 mt-0.5">五六年级一起</div>
          </button>
        </div>
      </div>

      {/* ── 词单管理 header ── */}
      <div className="px-4 pt-3 pb-1">
        <div className="text-xs text-stone-400 font-medium">词单管理</div>
      </div>

      {/* ── Scrollable word list ── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2 pb-4">

        {/* "全部合并" card — only when no specific list selected */}
        {gradeFilter === 'all' && (
          <button
            onClick={() => setSelectedListId('')}
            className={`w-full rounded-2xl p-4 text-left border-2 transition active:scale-[0.98] ${
              selectedListId === '' ? 'border-[#B0BCDC] bg-[#F0F2FB]' : 'border-stone-200 bg-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                selectedListId === '' ? 'bg-[#8090C0]' : 'bg-stone-100'
              }`}>
                <BookOpen size={18} className={selectedListId === '' ? 'text-white' : 'text-stone-400'} />
              </div>
              <div className="flex-1">
                <div className={`font-semibold text-sm ${selectedListId === '' ? 'text-[#5868A8]' : 'text-stone-700'}`}>
                  全部词语合并练习
                </div>
                <div className="text-xs text-stone-400 mt-0.5">五六年级所有词单一起</div>
              </div>
              <Radio selected={selectedListId === ''} />
            </div>
          </button>
        )}

        {filteredLists.length === 0 && (
          <div className="text-center py-12 text-stone-400 text-sm">暂无词单</div>
        )}

        {filteredLists.map(list => {
          const isSelected = list.id === selectedListId;
          const isConfirming = confirmDeleteId === list.id;
          const { practiced, total } = listProgress(list);
          const charCount = list.words.filter(w => w.wordType === 'char').length;
          const wordCount = list.words.filter(w => w.wordType === 'word').length;
          const sentCount = list.words.filter(w => w.wordType === 'sentence').length;
          const pct = total > 0 ? Math.round((practiced / total) * 100) : 0;

          return (
            <div key={list.id} className="relative">
              <button
                onClick={() => { setSelectedListId(list.id); setConfirmDeleteId(null); }}
                className={`w-full rounded-2xl p-4 text-left border-2 transition active:scale-[0.98] ${
                  isSelected ? 'border-[#B0BCDC] bg-[#F0F2FB]' : 'border-stone-200 bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-semibold text-sm ${isSelected ? 'text-[#5868A8]' : 'text-stone-800'}`}>
                        {list.name}
                      </span>
                      {list.isCustomList && (
                        <span className="text-xs bg-[#FBF5E8] text-[#9A8040] px-1.5 py-0.5 rounded-full">自定义</span>
                      )}
                    </div>
                    <div className="text-xs text-stone-400 mt-1 flex items-center gap-2 flex-wrap">
                      {charCount > 0 && <span>字 {charCount}</span>}
                      {wordCount > 0 && <span>词 {wordCount}</span>}
                      {sentCount > 0 && <span>句 {sentCount}</span>}
                      {total === 0 && <span className="text-stone-300">空词单</span>}
                    </div>
                    {total > 0 && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#8090C0] rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-stone-400 flex-shrink-0">{practiced}/{total}</span>
                      </div>
                    )}
                  </div>
                  <Radio selected={isSelected} />
                </div>
              </button>

              {/* Delete */}
              {!isConfirming ? (
                <button
                  onClick={e => { e.stopPropagation(); setConfirmDeleteId(list.id); }}
                  className="absolute top-3.5 right-10 p-1.5 text-stone-300 hover:text-[#8090C0] transition"
                  aria-label="删除"
                >
                  <Trash2 size={14} />
                </button>
              ) : (
                <div className="absolute top-2 right-2 flex gap-1 bg-white rounded-xl shadow-lg border border-stone-200 p-1.5 z-10">
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(list); }}
                    className="px-2.5 py-1 rounded-lg bg-[#D09098] text-white text-xs font-semibold"
                  >确认删除</button>
                  <button
                    onClick={e => { e.stopPropagation(); setConfirmDeleteId(null); }}
                    className="px-2.5 py-1 rounded-lg bg-stone-100 text-stone-600 text-xs font-semibold"
                  >取消</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Sticky bottom action panel ── */}
      <div className="bg-white border-t border-stone-100 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] px-4 py-4 flex flex-col gap-3">

        {/* Mode */}
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

        {/* Filter */}
        <div className="flex gap-1.5">
          {([
            { value: 'all' as FilterMode, label: '全部' },
            { value: 'error-rate' as FilterMode, label: '错误率高' },
            { value: 'not-practiced' as FilterMode, label: '未练习' },
          ]).map(f => (
            <button
              key={f.value}
              onClick={() => setFilterMode(f.value)}
              className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition border ${
                filterMode === f.value
                  ? 'bg-[#F0F2FB] border-[#B0BCDC] text-[#5868A8]'
                  : 'bg-stone-50 border-stone-200 text-stone-400'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Start buttons */}
        <div className="flex gap-2">
          <button
            disabled={!canStart}
            onClick={() => onStudy(buildDictationList(), dictationMode, filterMode)}
            className="flex-1 py-3 rounded-2xl font-semibold text-sm border-2 border-stone-200 text-stone-600 bg-white active:scale-[0.98] transition disabled:opacity-40 flex items-center justify-center gap-1.5"
          >
            <PenLine size={16} />先学习
          </button>
          <button
            disabled={!canStart}
            onClick={() => onOpenSelector(gradeFilter, dictationMode)}
            className="flex-[2] py-3 rounded-2xl text-white font-bold text-base shadow-md active:scale-[0.98] transition bg-gradient-to-r from-[#7888C8] to-[#A8B8DC] disabled:opacity-40"
          >
            开始听写 →
          </button>
        </div>
      </div>

      {showAddWord && (
        <AddWordModal
          subject="chinese"
          lists={allLists.filter(l => !l.isVirtual)}
          defaultListId={selectedListId || (allLists[0]?.id ?? '')}
          onClose={() => setShowAddWord(false)}
          onAdded={bump}
        />
      )}
      {showAddList && (
        <AddListModal
          onClose={() => setShowAddList(false)}
          onAdded={bump}
        />
      )}
    </div>
  );
}

function Radio({ selected }: { selected: boolean }) {
  return (
    <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center mt-0.5 ${
      selected ? 'border-[#8090C0] bg-[#8090C0]' : 'border-stone-300'
    }`}>
      {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
    </div>
  );
}
