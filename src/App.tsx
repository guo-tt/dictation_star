import { useState, useMemo } from 'react';
import { ViewMode, DictationMode, FilterMode, WordList, GradeFilter, SessionConfig, Word } from './types';
import Header from './components/Header';
import WordListView from './components/WordListView';
import LessonSelectorView from './components/LessonSelectorView';
import WordSelectorView from './components/WordSelectorView';
import DictationView from './components/DictationView';
import StudyView from './components/StudyView';
import StudyListView from './components/StudyListView';
import SearchModal from './components/SearchModal';
import BottomToolbar from './components/BottomToolbar';
import { ensureFreshInstall, applyOverridesAndFilter, getHiddenListIds, clearWordsRecords, clearAllRecords, getCustomListsForGrade, getCustomWordsForList } from './utils/storage';
import LessonEditView from './components/LessonEditView';
import { presetWordLists } from './data/wordLists';
import ChengYuStudyView from './components/ChengYuStudyView';
import type { ChengYu } from './data/chengyu';

ensureFreshInstall();

function getAllGradeWords(grade: GradeFilter): Word[] {
  const hiddenListIds = new Set(getHiddenListIds());
  return presetWordLists
    .filter(l =>
      l.subject === 'chinese' &&
      [5, 6].includes(l.grade ?? -1) &&
      l.lesson === undefined &&
      (grade === 'all' || l.grade === grade) &&
      !hiddenListIds.has(l.id),
    )
    .flatMap(l => applyOverridesAndFilter(l.words));
}

export default function App() {
  const [view, setView] = useState<ViewMode>('wordlists');
  const [showSearch, setShowSearch] = useState(false);
  const [selectedList] = useState<WordList | null>(null);
  const [dictationMode, setDictationMode] = useState<DictationMode>('parent');
  const [filterMode] = useState<FilterMode>('all');
  const [selectorGrade, setSelectorGrade] = useState<GradeFilter>('all');
  const [selectorMode, setSelectorMode] = useState<'lesson' | 'mixed'>('mixed');
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(null);
  const [dictationKey, setDictationKey] = useState(0);
  const [chengyuStudyList, setChengyuStudyList] = useState<ChengYu[]>([]);
  const [chengyuStudyLabel, setChengyuStudyLabel] = useState('全部');

  const [editingListId, setEditingListId] = useState<string | null>(null);

  // Study mode state
  const [studyWords, setStudyWords] = useState<Word[]>([]);
  const [studyTitle, setStudyTitle] = useState('');
  const [studyOrigin, setStudyOrigin] = useState<'lessonSelector' | 'wordlists'>('wordlists');
  const [lessonSelectorMode, setLessonSelectorMode] = useState<'dictation' | 'study'>('dictation');

  const toolbarContext = useMemo((): { contextWords: Word[]; resetLabel: string } => {
    if (view === 'dictation' && sessionConfig) {
      return { contextWords: sessionConfig.words, resetLabel: '重置本次进度' };
    }
    if (view === 'wordSelector') {
      if (selectorMode === 'lesson' && selectedLessonId) {
        const list = presetWordLists.find(l => l.id === selectedLessonId);
        return {
          contextWords: list ? applyOverridesAndFilter(list.words) : [],
          resetLabel: '重置本课进度',
        };
      }
      const label =
        selectorGrade === 5 ? '重置五年级进度'
        : selectorGrade === 6 ? '重置六年级进度'
        : '重置全部进度';
      return { contextWords: getAllGradeWords(selectorGrade), resetLabel: label };
    }
    if (view === 'studyList') {
      return { contextWords: studyWords, resetLabel: '重置当前进度' };
    }
    if (view === 'chengyuStudy') {
      return { contextWords: [], resetLabel: '重置全部进度' };
    }
    return { contextWords: getAllGradeWords('all'), resetLabel: '重置全部进度' };
  }, [view, sessionConfig, selectorMode, selectedLessonId, selectorGrade, studyWords]);

  function openMixedSelector(grade: GradeFilter, mode: DictationMode) {
    setSelectorGrade(grade);
    setDictationMode(mode);
    setSelectorMode('mixed');
    setSelectedLessonId(null);
    setView('wordSelector');
  }

  function openLessonSelector(mode: DictationMode) {
    setDictationMode(mode);
    setLessonSelectorMode('dictation');
    setView('lessonSelector');
  }

  function openStudyLessonSelector() {
    setLessonSelectorMode('study');
    setView('lessonSelector');
  }

  function openStudyGrade(grade: GradeFilter) {
    const words = getAllGradeWords(grade);
    const title = grade === 5 ? '五年级' : grade === 6 ? '六年级' : '全部';
    setStudyWords(words);
    setStudyTitle(title);
    setStudyOrigin('wordlists');
    setView('studyList');
  }

  function openLessonEdit(listId: string) {
    setEditingListId(listId);
    setView('lessonEdit');
  }

  function openCustomLessonDictation(listId: string, lessonName: string, mode: DictationMode) {
    const words = getCustomWordsForList(listId);
    if (words.length === 0) return;
    setDictationMode(mode);
    setSessionConfig({ words, grade: lessonName });
    setDictationKey(k => k + 1);
    setView('dictation');
  }

  function openGradeDictation(gradeId: string, gradeName: string, mode: DictationMode) {
    const lessons = getCustomListsForGrade(gradeId);
    const words = lessons.flatMap(l => getCustomWordsForList(l.id));
    if (words.length === 0) return;
    setDictationMode(mode);
    setSessionConfig({ words, grade: gradeName });
    setDictationKey(k => k + 1);
    setView('dictation');
  }

  function startChengyuDictation(words: Word[], label: string, mode: DictationMode) {
    setDictationMode(mode);
    setSessionConfig({ words, grade: `成语 · ${label}` });
    setDictationKey(k => k + 1);
    setView('dictation');
  }

  function startChengyuStudy(list: ChengYu[], label: string) {
    setChengyuStudyList(list);
    setChengyuStudyLabel(label);
    setView('chengyuStudy');
  }

  function handleLessonSelected(lessonId: string) {
    if (lessonSelectorMode === 'study') {
      const list = presetWordLists.find(l => l.id === lessonId);
      if (!list) return;
      setStudyWords(applyOverridesAndFilter(list.words));
      setStudyTitle(`${list.name}${list.lessonTitle ?? ''}`);
      setStudyOrigin('lessonSelector');
      setView('studyList');
    } else {
      setSelectedLessonId(lessonId);
      setSelectorMode('lesson');
      setView('wordSelector');
    }
  }

  function startFromSelector(config: SessionConfig) {
    setSessionConfig(config);
    setDictationKey(k => k + 1);
    setView('dictation');
  }

  function handleRetry(wrongWords: Word[]) {
    if (!sessionConfig || wrongWords.length === 0) return;
    setSessionConfig({ words: wrongWords, grade: sessionConfig.grade });
    setDictationKey(k => k + 1);
  }

  function handleStartRandom(words: Word[]) {
    if (words.length === 0) return;
    const grade = sessionConfig?.grade ?? '全部';
    setSessionConfig({ words, grade });
    setDictationKey(k => k + 1);
    setView('dictation');
  }

  function handleBack() {
    if (view === 'chengyuStudy') { setView('wordlists'); return; }
    if (view === 'lessonEdit') {
      setView('wordlists');
      return;
    }
    if (view === 'wordSelector' && selectorMode === 'lesson') {
      setView('lessonSelector');
    } else if (view === 'studyList' && studyOrigin === 'lessonSelector') {
      setView('lessonSelector');
    } else {
      setSessionConfig(null);
      setView('wordlists');
    }
  }

  const headerTitle =
    view === 'wordlists' ? '听写小状元'
    : view === 'lessonSelector' ? (lessonSelectorMode === 'study' ? '选择课次（学习）' : '选择课次')
    : view === 'lessonEdit' ? '编辑课词'
    : view === 'wordSelector' ? '选择词语'
    : view === 'studyList' ? `学习：${studyTitle}`
    : view === 'study' ? `学习：${selectedList?.name ?? ''}`
    : view === 'chengyuStudy' ? `学习成语 · ${chengyuStudyLabel}`
    : sessionConfig ? `听写 · ${sessionConfig.grade}`
    : selectedList?.name ?? '听写';

  const headerBack =
    view === 'dictation' || view === 'study' || view === 'wordSelector' ||
    view === 'lessonSelector' || view === 'studyList' || view === 'lessonEdit' ||
    view === 'chengyuStudy'
      ? handleBack
      : undefined;

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col max-w-2xl mx-auto">
      <Header
        onBack={headerBack}
        title={headerTitle}
        onSearch={view === 'wordlists' ? () => setShowSearch(true) : undefined}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        {view === 'wordlists' && (
          <WordListView
            onOpenMixedSelector={openMixedSelector}
            onOpenLessonSelector={openLessonSelector}
            onOpenStudyGrade={openStudyGrade}
            onOpenStudyLessonSelector={openStudyLessonSelector}
            onEditLesson={openLessonEdit}
            onStartCustomLesson={openCustomLessonDictation}
            onStartGradeDictation={openGradeDictation}
            onStartChengyuDictation={startChengyuDictation}
            onStartChengyuStudy={startChengyuStudy}
            onResetAll={clearAllRecords}
          />
        )}
        {view === 'lessonSelector' && (
          <LessonSelectorView
            onSelectLesson={handleLessonSelected}
            onEditLesson={openLessonEdit}
          />
        )}
        {view === 'lessonEdit' && editingListId && (
          <LessonEditView listId={editingListId} onBack={handleBack} />
        )}
        {view === 'wordSelector' && (
          <WordSelectorView
            grade={selectorGrade}
            dictationMode={dictationMode}
            onStart={startFromSelector}
            mode={selectorMode}
            lessonListId={selectedLessonId ?? undefined}
          />
        )}
        {view === 'study' && selectedList && (
          <StudyView
            wordList={selectedList}
            filterMode={filterMode}
            subject="chinese"
            dictationMode={dictationMode}
            onStartDictation={() => setView('dictation')}
          />
        )}
        {view === 'dictation' && (sessionConfig || selectedList) && (
          <DictationView
            key={dictationKey}
            wordList={selectedList ?? { id: '', name: '', subject: 'chinese', words: [] }}
            dictationMode={dictationMode}
            filterMode={filterMode}
            subject="chinese"
            sessionConfig={sessionConfig ?? undefined}
            onComplete={handleBack}
            onRetry={handleRetry}
          />
        )}
        {view === 'studyList' && (
          <StudyListView words={studyWords} />
        )}
        {view === 'chengyuStudy' && (
          <ChengYuStudyView list={chengyuStudyList} />
        )}
      </main>

      <BottomToolbar
        contextWords={toolbarContext.contextWords}
        resetLabel={toolbarContext.resetLabel}
        showRandom={view === 'dictation'}
        onStartRandom={handleStartRandom}
        onReset={() => clearWordsRecords(toolbarContext.contextWords.map(w => w.id))}
      />

      {showSearch && <SearchModal onClose={() => setShowSearch(false)} />}
    </div>
  );
}
