import { useState } from 'react';
import { ViewMode, DictationMode, FilterMode, WordList, GradeFilter, SessionConfig } from './types';
import Header from './components/Header';
import WordListView from './components/WordListView';
import WordSelectorView from './components/WordSelectorView';
import DictationView from './components/DictationView';
import StudyView from './components/StudyView';
import SearchModal from './components/SearchModal';

export default function App() {
  const [view, setView] = useState<ViewMode>('wordlists');
  const [showSearch, setShowSearch] = useState(false);
  const [selectedList, setSelectedList] = useState<WordList | null>(null);
  const [dictationMode, setDictationMode] = useState<DictationMode>('parent');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [selectorGrade, setSelectorGrade] = useState<GradeFilter>('all');
  const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(null);

  function openWordSelector(grade: GradeFilter, mode: DictationMode) {
    setSelectorGrade(grade);
    setDictationMode(mode);
    setView('wordSelector');
  }

  function startFromSelector(config: SessionConfig) {
    setSessionConfig(config);
    setView('dictation');
  }

  function startStudy(list: WordList, mode: DictationMode, filter: FilterMode) {
    setSelectedList(list);
    setDictationMode(mode);
    setFilterMode(filter);
    setView('study');
  }

  function handleBack() {
    setSessionConfig(null);
    setView('wordlists');
  }

  const headerTitle =
    view === 'wordlists' ? '听写小状元'
    : view === 'wordSelector' ? '选择词语'
    : view === 'study' ? `学习：${selectedList?.name ?? ''}`
    : sessionConfig ? `听写 · ${sessionConfig.grade}`
    : selectedList?.name ?? '听写';

  const headerBack =
    view === 'dictation' || view === 'study' || view === 'wordSelector'
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
          <WordListView onOpenSelector={openWordSelector} onStudy={startStudy} />
        )}
        {view === 'wordSelector' && (
          <WordSelectorView
            grade={selectorGrade}
            dictationMode={dictationMode}
            onStart={startFromSelector}
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
            wordList={selectedList ?? { id: '', name: '', subject: 'chinese', words: [] }}
            dictationMode={dictationMode}
            filterMode={filterMode}
            subject="chinese"
            sessionConfig={sessionConfig ?? undefined}
          />
        )}
      </main>

      {showSearch && <SearchModal onClose={() => setShowSearch(false)} />}
    </div>
  );
}
