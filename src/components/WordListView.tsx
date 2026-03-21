import { useState, useCallback, useMemo } from 'react';
import { Plus, Trash2, BookOpen } from 'lucide-react';
import { Subject, DictationMode, FilterMode, WordList, CustomListMeta } from '../types';
import {
  getWordListsBySubject,
  buildAllList,
  buildLetterList,
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
  subject: Subject;
  onStart: (list: WordList, mode: DictationMode, filter: FilterMode) => void;
  onStudy: (list: WordList, mode: DictationMode, filter: FilterMode) => void;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const GRADE_NUM_TO_CHINESE: Record<number, string> = { 1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六' };
function gradeLabel(g: GradeFilter): string {
  if (g === 'all') return '全部';
  if (g === 0) return '学前';
  return `${GRADE_NUM_TO_CHINESE[g as number]}年级`;
}

type GradeFilter = 'all' | number;
type EnglishGrouping = 'set' | 'alpha';

export default function WordListView({ subject, onStart, onStudy }: WordListViewProps) {
  const isChinese = subject === 'chinese';

  // ── state ──────────────────────────────────────────────────────────────────
  const [gradeFilter, setGradeFilter] = useState<GradeFilter>('all');
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [englishGrouping, setEnglishGrouping] = useState<EnglishGrouping>('set');
  const [dictationMode, setDictationMode] = useState<DictationMode>('parent');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [showAddWord, setShowAddWord] = useState(false);
  const [showAddList, setShowAddList] = useState(false);
  const [version, setVersion] = useState(0); // bump to force re-render
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const bump = useCallback(() => setVersion(v => v + 1), []);

  // ── derived lists ──────────────────────────────────────────────────────────
  const hiddenIds = useMemo(() => getHiddenListIds(), [version]);

  /** All visible WordList objects for Chinese (preset + custom), respecting hidden. */
  const chineseLists = useMemo((): (WordList & { isCustomList?: boolean })[] => {
    const presets = presetWordLists
      .filter(l => l.subject === 'chinese' && !hiddenIds.includes(l.id))
      .map(l => ({ ...l, words: [...applyOverridesAndFilter(l.words), ...getCustomWordsForList(l.id)] }));

    const customs: (WordList & { isCustomList?: boolean })[] = getCustomLists('chinese').map(
      (meta: CustomListMeta) => ({
        id: meta.id,
        name: meta.name,
        subject: 'chinese' as Subject,
        grade: meta.grade,
        isVirtual: false,
        isCustomList: true,
        words: getCustomWordsForList(meta.id),
      }),
    );

    return [...presets, ...customs];
  }, [version]);

  /** Grades that have at least one visible list (for showing filter tabs). */
  const visibleGrades = useMemo((): GradeFilter[] => {
    const grades = new Set(chineseLists.map(l => l.grade).filter((g): g is number => g !== undefined));
    return ['all', ...[...grades].sort((a, b) => a - b)];
  }, [chineseLists]);

  /** Chinese lists filtered by grade tab; reset to 'all' if current grade vanished. */
  const filteredChineseLists = useMemo(() => {
    if (gradeFilter !== 'all' && !visibleGrades.includes(gradeFilter)) {
      setGradeFilter('all');
      return chineseLists;
    }
    if (gradeFilter === 'all') return chineseLists;
    return chineseLists.filter(l => l.grade === gradeFilter);
  }, [chineseLists, gradeFilter, visibleGrades]);

  const englishPresets = useMemo(() => getWordListsBySubject('english'), []);

  const visibleEnglishLists = useMemo(
    () => englishPresets.filter(l => !hiddenIds.includes(l.id)),
    [englishPresets, hiddenIds],
  );

  // ── helpers ────────────────────────────────────────────────────────────────
  function listStats(list: WordList) {
    let practiced = 0, totalAttempts = 0, errors = 0;
    for (const w of list.words) {
      const s = getWordStats(w.id);
      if (s.total > 0) practiced++;
      totalAttempts += s.total;
      errors += s.total - s.correct;
    }
    return { practiced, wordCount: list.words.length, totalAttempts, errors };
  }

  function buildEnglishSetList(): WordList {
    const preset = englishPresets.find(l => l.id === selectedListId) ?? englishPresets[0];
    const custom = getCustomWordsForList(preset.id);
    return { ...preset, words: [...applyOverridesAndFilter(preset.words), ...custom] };
  }

  function buildChineseDictationList(): WordList {
    if (gradeFilter === 'all' && !selectedListId) {
      // "全部" without a specific list = all visible words
      const allList = buildAllList('chinese');
      const customWords = chineseLists.flatMap(l => getCustomWordsForList(l.id));
      return { ...allList, words: [...allList.words, ...customWords] };
    }
    const list = chineseLists.find(l => l.id === selectedListId);
    if (!list) {
      // Fallback: first list in current filter
      const first = filteredChineseLists[0];
      if (!first) return buildAllList('chinese');
      return first;
    }
    return list;
  }

  function handleStart() {
    const list = isChinese ? buildChineseDictationList() : buildEnglishSetList();
    onStart(list, dictationMode, filterMode);
  }

  function handleLetterStart(letter: string) {
    const letterList = buildLetterList(letter);
    onStart(letterList, dictationMode, filterMode);
  }

  function handleDelete(list: WordList & { isCustomList?: boolean }) {
    if (list.isCustomList) {
      deleteCustomList(list.id);
    } else {
      hidePresetList(list.id);
    }
    if (selectedListId === list.id) setSelectedListId('');
    setConfirmDeleteId(null);
    bump();
  }

  const defaultAddListId = useMemo(() => {
    if (selectedListId) return selectedListId;
    if (isChinese && filteredChineseLists.length > 0) return filteredChineseLists[0].id;
    if (!isChinese && englishPresets.length > 0) return englishPresets[0].id;
    return '';
  }, [selectedListId, filteredChineseLists, englishPresets, isChinese]);

  const addWordLists = isChinese
    ? chineseLists.filter(l => !l.isVirtual)
    : englishPresets;

  // ── theme ──────────────────────────────────────────────────────────────────
  const accentGradient = isChinese
    ? 'from-[#7888C8] to-[#A8B8DC]'
    : 'from-[#6090B0] to-[#8CB4CC]';
  const accentTabActive = isChinese ? 'bg-[#8090C0] text-white' : 'bg-[#6898B8] text-white';
  const accentSelected = isChinese
    ? 'border-[#B0BCDC] bg-[#F0F2FB]'
    : 'border-[#A0C0D8] bg-[#EEF5FA]';
  const accentSelectedText = isChinese ? 'text-[#5868A8]' : 'text-[#407898]';
  const accentAddBtn = isChinese
    ? 'text-[#5868A8] bg-[#F0F2FB] border-[#B0BCDC]'
    : 'text-[#407898] bg-[#EEF5FA] border-[#A0C0D8]';

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-8 md:flex md:gap-8 md:items-start pb-8">

      {/* ══ LEFT COLUMN ══ */}
      <div className="md:flex-1 flex flex-col gap-4">

      {/* ══════════════════════════════════════════════════════════════════
          CHINESE SECTION
      ══════════════════════════════════════════════════════════════════ */}
      {isChinese && (
        <>
          {/* Grade filter tabs + actions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wide">词单</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddList(true)}
                  className={`flex items-center gap-1 text-xs font-medium border px-2.5 py-1.5 rounded-xl active:opacity-80 ${accentAddBtn}`}
                >
                  <Plus size={13} />新建词单
                </button>
                <button
                  onClick={() => setShowAddWord(true)}
                  className={`flex items-center gap-1 text-xs font-medium border px-2.5 py-1.5 rounded-xl active:opacity-80 ${accentAddBtn}`}
                >
                  <Plus size={13} />添加生字
                </button>
              </div>
            </div>

            {/* Grade filter pills */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {visibleGrades.map(g => (
                <button
                  key={String(g)}
                  onClick={() => setGradeFilter(g)}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-xl text-sm font-semibold transition ${
                    gradeFilter === g ? accentTabActive : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  {gradeLabel(g)}
                </button>
              ))}
            </div>
          </div>

          {/* List cards */}
          <div className="flex flex-col gap-2">
            {/* "全部合并" virtual card (only when filter = all) */}
            {gradeFilter === 'all' && (
              <button
                onClick={() => setSelectedListId('')}
                className={`rounded-xl p-4 text-left border-2 transition active:scale-[0.98] ${
                  selectedListId === '' ? accentSelected : 'border-stone-200 bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <BookOpen size={18} className={selectedListId === '' ? 'text-[#8090C0]' : 'text-stone-400'} />
                  <div className="flex-1 min-w-0">
                    <div className={`font-semibold ${selectedListId === '' ? accentSelectedText : 'text-stone-800'}`}>
                      全部词语合并
                    </div>
                    <div className="text-xs text-stone-400 mt-0.5">
                      所有年级、所有词单一起复习
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                    selectedListId === '' ? 'border-[#8090C0] bg-[#8090C0]' : 'border-stone-300'
                  }`}>
                    {selectedListId === '' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
              </button>
            )}

            {filteredChineseLists.length === 0 && (
              <div className="text-center py-8 text-stone-400 text-sm">
                {gradeFilter === 'all' ? '所有词单已被删除' : '该年级没有词单'}
              </div>
            )}

            {filteredChineseLists.map(list => {
              const isSelected = list.id === selectedListId;
              const stats = listStats(list);
              const isConfirming = confirmDeleteId === list.id;
              const charCount = list.words.filter(w => w.wordType === 'char').length;
              const wordCount = list.words.filter(w => w.wordType === 'word').length;
              const sentCount = list.words.filter(w => w.wordType === 'sentence').length;
              const otherCount = list.words.filter(w => !w.wordType).length;

              return (
                <div key={list.id} className="relative">
                  <button
                    onClick={() => { setSelectedListId(list.id); setConfirmDeleteId(null); }}
                    className={`w-full rounded-xl p-4 text-left border-2 transition active:scale-[0.98] ${
                      isSelected ? accentSelected : 'border-stone-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0 pr-8">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-semibold ${isSelected ? accentSelectedText : 'text-stone-800'}`}>
                            {list.name}
                          </span>
                          {list.isCustomList && (
                            <span className="text-xs bg-[#FBF5E8] text-[#9A8040] px-1.5 py-0.5 rounded-full">
                              自定义
                            </span>
                          )}
                          {list.grade && (
                            <span className="text-xs bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded-full">
                              {gradeLabel(list.grade as GradeFilter)}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-stone-400 mt-1 flex gap-2 flex-wrap">
                          {charCount > 0 && <span>字 {charCount}</span>}
                          {wordCount > 0 && <span>词 {wordCount}</span>}
                          {sentCount > 0 && <span>句 {sentCount}</span>}
                          {otherCount > 0 && <span>其他 {otherCount}</span>}
                          {list.words.length === 0 && <span className="text-stone-300">空词单</span>}
                          {stats.wordCount > 0 && (
                            <span className="text-stone-300">·</span>
                          )}
                          {stats.wordCount > 0 && (
                            <span>已练 {stats.practiced}/{stats.wordCount}</span>
                          )}
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center mt-0.5 ${
                        isSelected ? 'border-[#8090C0] bg-[#8090C0]' : 'border-stone-300'
                      }`}>
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                  </button>

                  {/* Delete button */}
                  {!isConfirming ? (
                    <button
                      onClick={e => { e.stopPropagation(); setConfirmDeleteId(list.id); }}
                      className="absolute top-3 right-10 p-1.5 rounded-lg text-stone-300 hover:text-[#8090C0] hover:bg-[#F0F2FB] transition"
                      aria-label="删除词单"
                    >
                      <Trash2 size={15} />
                    </button>
                  ) : (
                    <div className="absolute top-2 right-2 flex gap-1 bg-white rounded-xl shadow-lg border border-stone-200 p-1.5 z-10">
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(list); }}
                        className="px-2.5 py-1 rounded-lg bg-[#D09098] text-white text-xs font-semibold"
                      >
                        确认删除
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setConfirmDeleteId(null); }}
                        className="px-2.5 py-1 rounded-lg bg-stone-100 text-stone-600 text-xs font-semibold"
                      >
                        取消
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          ENGLISH SECTION
      ══════════════════════════════════════════════════════════════════ */}
      {!isChinese && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wide">词单分组</h3>
            <button
              onClick={() => setShowAddWord(true)}
              className={`flex items-center gap-1 text-xs font-medium border px-2.5 py-1.5 rounded-xl active:opacity-80 ${accentAddBtn}`}
            >
              <Plus size={13} />Add Word
            </button>
          </div>
          <div className="bg-stone-100 rounded-xl p-1 flex gap-1 mb-3">
            {(['set', 'alpha'] as EnglishGrouping[]).map(g => (
              <button
                key={g}
                onClick={() => setEnglishGrouping(g)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${
                  englishGrouping === g ? 'bg-white shadow-sm text-[#407898]' : 'text-stone-500'
                }`}
              >
                {g === 'set' ? '按 Set' : '按首字母 A–Z'}
              </button>
            ))}
          </div>

          {englishGrouping === 'set' && (
            <div className="flex flex-col gap-2">
              {visibleEnglishLists.length === 0 && (
                <div className="text-center py-8 text-stone-400 text-sm">All word lists are hidden</div>
              )}
              {visibleEnglishLists.map(list => {
                const stats = listStats(list);
                const isSelected = list.id === selectedListId || (!selectedListId && list === visibleEnglishLists[0]);
                const isConfirming = confirmDeleteId === list.id;
                return (
                  <div key={list.id} className="relative">
                    <button
                      onClick={() => { setSelectedListId(list.id); setConfirmDeleteId(null); }}
                      className={`w-full rounded-xl p-4 text-left border-2 transition active:scale-[0.98] ${
                        isSelected ? accentSelected : 'border-stone-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between pr-7">
                        <div>
                          <div className={`font-semibold ${isSelected ? accentSelectedText : 'text-stone-800'}`}>
                            {list.name}
                          </div>
                          <div className="text-xs text-stone-400 mt-0.5">
                            {stats.wordCount} words · practiced {stats.practiced}/{stats.wordCount}
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? 'border-[#6898B8] bg-[#6898B8]' : 'border-stone-300'
                        }`}>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                    </button>
                    {!isConfirming ? (
                      <button
                        onClick={e => { e.stopPropagation(); setConfirmDeleteId(list.id); }}
                        className="absolute top-3 right-3 p-1.5 rounded-lg text-stone-300 hover:text-[#8090C0] hover:bg-[#F0F2FB] transition"
                      >
                        <Trash2 size={15} />
                      </button>
                    ) : (
                      <div className="absolute top-2 right-2 flex gap-1 bg-white rounded-xl shadow-lg border border-stone-200 p-1.5 z-10">
                        <button
                          onClick={e => { e.stopPropagation(); hidePresetList(list.id); setConfirmDeleteId(null); if (selectedListId === list.id) setSelectedListId(''); bump(); }}
                          className="px-2.5 py-1 rounded-lg bg-[#D09098] text-white text-xs font-semibold"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); setConfirmDeleteId(null); }}
                          className="px-2.5 py-1 rounded-lg bg-stone-100 text-stone-600 text-xs font-semibold"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {englishGrouping === 'alpha' && (
            <div>
              <p className="text-xs text-stone-400 mb-2 px-1">点击字母直接开始听写该字母的所有单词</p>
              <div className="grid grid-cols-6 gap-2">
                {ALPHABET.map(letter => {
                  const { words } = buildLetterList(letter);
                  return (
                    <button
                      key={letter}
                      disabled={words.length === 0}
                      onClick={() => handleLetterStart(letter)}
                      className={`aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-bold transition active:scale-95 ${
                        words.length > 0
                          ? 'bg-[#EEF5FA] border border-[#A0C0D8] text-[#407898] hover:bg-[#DDE8F5]'
                          : 'bg-stone-50 border border-stone-100 text-stone-300 cursor-not-allowed'
                      }`}
                    >
                      <span>{letter}</span>
                      {words.length > 0 && <span className="text-xs font-normal text-[#7BAFC8]">{words.length}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      </div>{/* ══ END LEFT COLUMN ══ */}

      {/* ══════════════════════════════════════════════════════════════════
          MODE + FILTER + START  (shown for Chinese and English set mode)
      ══════════════════════════════════════════════════════════════════ */}
      {(isChinese || englishGrouping === 'set') && (
        <div className="flex flex-col gap-4 mt-4 md:mt-0 md:w-72 md:sticky md:top-20">
          {/* Mode */}
          <div>
            <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-2">模式选择</h3>
            <div className="bg-stone-100 rounded-xl p-1 flex gap-1">
              {(['parent', 'student'] as DictationMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setDictationMode(mode)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${
                    dictationMode === mode
                      ? `bg-white shadow-sm ${isChinese ? 'text-[#5868A8]' : 'text-[#407898]'}`
                      : 'text-stone-500'
                  }`}
                >
                  {mode === 'parent' ? '👨‍👩‍👧 家长模式' : '✏️ 学生模式'}
                </button>
              ))}
            </div>
            <p className="text-xs text-stone-400 mt-1.5 px-1">
              {dictationMode === 'parent' ? '显示词语文字，适合家长对照朗读' : '隐藏词语文字，学生听音后作答'}
            </p>
          </div>

          {/* Filter */}
          <div>
            <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-2">词语筛选</h3>
            <div className="flex flex-col gap-1.5">
              {([
                { value: 'all', label: '全部词语', desc: '显示所有词语' },
                { value: 'error-rate', label: '错误率排序', desc: '错误率高的优先显示' },
                { value: 'not-practiced', label: '近1个月未练习', desc: '最近一个月内没有练习过的词语' },
              ] as { value: FilterMode; label: string; desc: string }[]).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFilterMode(opt.value)}
                  className={`rounded-xl p-3 text-left border transition ${
                    filterMode === opt.value
                      ? isChinese ? 'border-[#B0BCDC] bg-[#F0F2FB]' : 'border-[#A0C0D8] bg-[#EEF5FA]'
                      : 'border-stone-200 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                      filterMode === opt.value
                        ? isChinese ? 'border-[#8090C0] bg-[#8090C0]' : 'border-[#6898B8] bg-[#6898B8]'
                        : 'border-stone-300'
                    }`}>
                      {filterMode === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div>
                      <div className={`text-sm font-medium ${filterMode === opt.value ? accentSelectedText : 'text-stone-700'}`}>
                        {opt.label}
                      </div>
                      <div className="text-xs text-stone-400">{opt.desc}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Start */}
          <div className="mt-2 flex flex-col gap-2">
            <button
              onClick={() => {
                const list = isChinese ? buildChineseDictationList() : buildEnglishSetList();
                onStudy(list, dictationMode, filterMode);
              }}
              className="py-3 rounded-2xl font-semibold text-base border-2 border-stone-200 text-stone-600 hover:bg-stone-50 active:scale-[0.98] transition"
            >
              先学习再听写 📖
            </button>
            <button
              onClick={handleStart}
              className={`py-4 rounded-2xl text-white font-bold text-lg shadow-lg active:scale-[0.98] transition bg-gradient-to-r ${accentGradient}`}
            >
              直接开始听写 →
            </button>
          </div>
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {showAddWord && (
        <AddWordModal
          subject={subject}
          lists={addWordLists}
          defaultListId={defaultAddListId}
          onClose={() => setShowAddWord(false)}
          onAdded={bump}
        />
      )}
      {showAddList && (
        <AddListModal
          onClose={() => setShowAddList(false)}
          onAdded={() => bump()}
        />
      )}
    </div>
  );
}
