import { useState } from 'react';
import { ViewMode, DictationMode, FilterMode, WordList, GradeFilter, SessionConfig, Word } from './types';
import Header from './components/Header';
import WordListView from './components/WordListView';
import LessonSelectorView from './components/LessonSelectorView';
import WordSelectorView from './components/WordSelectorView';
import DictationView from './components/DictationView';
import StudyView from './components/StudyView';
import StudyListView from './components/StudyListView';
import SearchModal from './components/SearchModal';
import { ensureFreshInstall, applyOverridesAndFilter, getHiddenListIds } from './utils/storage';
import { presetWordLists } from './data/wordLists';

ensureFreshInstall();

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

  // Study mode state
  const [studyWords, setStudyWords] = useState<Word[]>([]);
  const [studyTitle, setStudyTitle] = useState('');
  const [studyOrigin, setStudyOrigin] = useState<'lessonSelector' | 'wordlists'>('wordlists');
  const [lessonSelectorMode, setLessonSelectorMode] = useState<'dictation' | 'study'>('dictation');

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
    const hiddenListIds = new Set(getHiddenListIds());
    const words = presetWordLists
      .filter(l =>
        l.subject === 'chinese' &&
        [5, 6].includes(l.grade ?? -1) &&
        l.lesson === undefined &&
        (grade === 'all' || l.grade === grade) &&
        !hiddenListIds.has(l.id),
      )
      .flatMap(l => applyOverridesAndFilter(l.words));
    const title = grade === 5 ? '五年级' : grade === 6 ? '六年级' : '全部';
    setStudyWords(words);
    setStudyTitle(title);
    setStudyOrigin('wordlists');
    setView('studyList');
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

  function handleBack() {
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
    : view === 'wordSelector' ? '选择词语'
    : view === 'studyList' ? `学习：${studyTitle}`
    : view === 'study' ? `学习：${selectedList?.name ?? ''}`
    : sessionConfig ? `听写 · ${sessionConfig.grade}`
    : selectedList?.name ?? '听写';

  const headerBack =
    view === 'dictation' || view === 'study' || view === 'wordSelector' || view === 'lessonSelector' || view === 'studyList'
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
          />
        )}
        {view === 'lessonSelector' && (
          <LessonSelectorView onSelectLesson={handleLessonSelected} />
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
      </main>

      {showSearch && <SearchModal onClose={() => setShowSearch(false)} />}
    </div>
  );
}
