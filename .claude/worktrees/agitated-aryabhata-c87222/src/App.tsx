import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { downloadFromCloud } from './utils/cloudSync';
import { onAuthChanged, signOut } from './utils/firebase';
import { Subject, ViewMode, DictationMode, FilterMode, WordList } from './types';
import Header from './components/Header';
import HomeView from './components/HomeView';
import WordListView from './components/WordListView';
import DictationView from './components/DictationView';
import StudyView from './components/StudyView';
import SearchModal from './components/SearchModal';
import LoginView from './components/LoginView';

export default function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined); // undefined = loading
  const [view, setView] = useState<ViewMode>('home');
  const [dataVersion, setDataVersion] = useState(0);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    const unsub = onAuthChanged(u => setUser(u));
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    downloadFromCloud().then(changed => {
      if (changed) setDataVersion(v => v + 1);
    });
  }, [user]);

  const [subject, setSubject] = useState<Subject>('chinese');
  const [selectedList, setSelectedList] = useState<WordList | null>(null);
  const [dictationMode, setDictationMode] = useState<DictationMode>('parent');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');

  function goHome() {
    setView('home');
    setSelectedList(null);
  }

  function selectSubject(s: Subject) {
    setSubject(s);
    setView('wordlists');
  }

  function startDictation(list: WordList, mode: DictationMode, filter: FilterMode) {
    setSelectedList(list);
    setDictationMode(mode);
    setFilterMode(filter);
    setView('dictation');
  }

  function startStudy(list: WordList, mode: DictationMode, filter: FilterMode) {
    setSelectedList(list);
    setDictationMode(mode);
    setFilterMode(filter);
    setView('study');
  }

  const headerTitle =
    view === 'home' ? '听写小状元'
    : view === 'wordlists' ? (subject === 'chinese' ? '语文听写' : '英语听写')
    : view === 'study' ? `学习：${selectedList?.name ?? ''}`
    : selectedList?.name ?? '听写';

  const headerBack =
    view === 'wordlists' ? goHome
    : view === 'dictation' ? () => setView('wordlists')
    : view === 'study' ? () => setView('wordlists')
    : undefined;

  if (user === undefined) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#8090C0] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user === null) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col max-w-6xl mx-auto">
      <Header
        view={view}
        subject={subject}
        onBack={headerBack}
        title={headerTitle}
        onSearch={() => setShowSearch(true)}
        userPhotoURL={user.photoURL}
        userName={user.displayName}
        onSignOut={signOut}
      />

      <main key={dataVersion} className="flex-1 overflow-y-auto">
        {view === 'home' && <HomeView onSelectSubject={selectSubject} />}
        {view === 'wordlists' && (
          <WordListView subject={subject} onStart={startDictation} onStudy={startStudy} />
        )}
        {view === 'study' && selectedList && (
          <StudyView
            wordList={selectedList}
            filterMode={filterMode}
            subject={subject}
            dictationMode={dictationMode}
            onStartDictation={() => setView('dictation')}
          />
        )}
        {view === 'dictation' && selectedList && (
          <DictationView
            wordList={selectedList}
            dictationMode={dictationMode}
            filterMode={filterMode}
            subject={subject}
          />
        )}
      </main>

      {showSearch && <SearchModal onClose={() => setShowSearch(false)} />}
    </div>
  );
}
