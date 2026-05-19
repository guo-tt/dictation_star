# Sound Effects, Completion Popup & Study Mode — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add sound feedback on ✓/✗, a session-completion stats popup with wrong-word retry, and a new study mode (scrollable word list) accessible from a redesigned two-tab main page.

**Architecture:** 7 independent tasks building bottom-up — new utilities and types first, then components, then the top-level App.tsx wiring. Each task compiles and the app remains runnable after every commit.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Vite, Vitest, Web Audio API (no audio files).

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/utils/sound.ts` | Create | `playSound('correct' \| 'wrong')` via Web Audio API |
| `src/types/index.ts` | Modify | Add `'studyList'` to `ViewMode` |
| `src/components/WordCard.tsx` | Modify | Add `onAttempt` prop; call `playSound` in `handleAttempt` |
| `src/components/DictationView.tsx` | Modify | Session stat tracking; completion modal; `onRetry` prop |
| `src/components/StudyListView.tsx` | Create | Scrollable word list for study mode |
| `src/components/WordListView.tsx` | Modify | 听写/学习 tab switcher; study entry buttons |
| `src/App.tsx` | Modify | Study mode state + routing; lesson-selector mode; retry handler; `dictationKey` for forced remount |

---

## Task 1: Sound Utility

**Files:**
- Create: `src/utils/sound.ts`

- [ ] **Step 1: Create the sound utility**

Create `src/utils/sound.ts` with this exact content:

```typescript
export function playSound(type: 'correct' | 'wrong'): void {
  const AudioCtx =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;
  const ctx = new AudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  const now = ctx.currentTime;
  if (type === 'correct') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.linearRampToValueAtTime(880, now + 0.15);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.2);
    osc.start(now);
    osc.stop(now + 0.2);
  } else {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.linearRampToValueAtTime(150, now + 0.25);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.3);
    osc.start(now);
    osc.stop(now + 0.3);
  }
  osc.onended = () => ctx.close();
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/utils/sound.ts
git commit -m "feat: add Web Audio sound utility for correct/wrong feedback"
```

---

## Task 2: Add `'studyList'` to ViewMode

**Files:**
- Modify: `src/types/index.ts:2`

- [ ] **Step 1: Update the ViewMode type**

In `src/types/index.ts`, change line 2 from:
```typescript
export type ViewMode = 'wordlists' | 'lessonSelector' | 'wordSelector' | 'dictation' | 'study';
```
to:
```typescript
export type ViewMode = 'wordlists' | 'lessonSelector' | 'wordSelector' | 'dictation' | 'study' | 'studyList';
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add studyList to ViewMode type"
```

---

## Task 3: WordCard — sound feedback + `onAttempt` callback

**Files:**
- Modify: `src/components/WordCard.tsx`

- [ ] **Step 1: Add `onAttempt` to the props interface**

In `src/components/WordCard.tsx`, change the `WordCardProps` interface from:
```typescript
interface WordCardProps {
  word: Word;
  index: number;
  dictationMode: DictationMode;
  subject: Subject;
}
```
to:
```typescript
interface WordCardProps {
  word: Word;
  index: number;
  dictationMode: DictationMode;
  subject: Subject;
  onAttempt?: (word: Word, correct: boolean) => void;
}
```

- [ ] **Step 2: Destructure the new prop**

Change:
```typescript
export default function WordCard({ word, index, dictationMode, subject }: WordCardProps) {
```
to:
```typescript
export default function WordCard({ word, index, dictationMode, subject, onAttempt }: WordCardProps) {
```

- [ ] **Step 3: Import playSound**

Add this import at the top of the file (after the existing imports):
```typescript
import { playSound } from '../utils/sound';
```

- [ ] **Step 4: Update `handleAttempt` to call playSound and onAttempt**

Change:
```typescript
  const handleAttempt = useCallback((correct: boolean) => {
    saveAttempt(word.id, correct);
    setStatsVersion(v => v + 1);
  }, [word.id]);
```
to:
```typescript
  const handleAttempt = useCallback((correct: boolean) => {
    playSound(correct ? 'correct' : 'wrong');
    saveAttempt(word.id, correct);
    setStatsVersion(v => v + 1);
    onAttempt?.(localWord, correct);
  }, [word.id, onAttempt, localWord]);
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Manual test**

Run `npm run dev` and open the app. Press ✓ and ✗ on a word card — confirm upward "ding" on ✓ and lower buzzer on ✗. (If no sound, check browser autoplay policy — click anywhere on page first.)

- [ ] **Step 7: Commit**

```bash
git add src/components/WordCard.tsx src/utils/sound.ts
git commit -m "feat: play sound feedback on correct/wrong attempt in WordCard"
```

---

## Task 4: DictationView — session tracking + completion modal

**Files:**
- Modify: `src/components/DictationView.tsx`

- [ ] **Step 1: Add `onRetry` to props interface**

Change:
```typescript
interface DictationViewProps {
  wordList: WordList;
  dictationMode: DictationMode;
  filterMode: FilterMode;
  subject: Subject;
  sessionConfig?: SessionConfig;
  onComplete?: () => void;
}
```
to:
```typescript
interface DictationViewProps {
  wordList: WordList;
  dictationMode: DictationMode;
  filterMode: FilterMode;
  subject: Subject;
  sessionConfig?: SessionConfig;
  onComplete?: () => void;
  onRetry?: (wrongWords: Word[]) => void;
}
```

- [ ] **Step 2: Destructure the new prop**

Change:
```typescript
export default function DictationView({
  wordList,
  dictationMode,
  filterMode,
  subject,
  sessionConfig,
  onComplete,
}: DictationViewProps) {
```
to:
```typescript
export default function DictationView({
  wordList,
  dictationMode,
  filterMode,
  subject,
  sessionConfig,
  onComplete,
  onRetry,
}: DictationViewProps) {
```

- [ ] **Step 3: Add session tracking state**

After the existing `useState` declarations (after `const [cleared, setCleared] = useState(false);`), add:
```typescript
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [sessionWrongWords, setSessionWrongWords] = useState<Word[]>([]);
  const [showCompletion, setShowCompletion] = useState(false);
```

Also add this import at the top — `useCallback` to the existing react import:
```typescript
import { useMemo, useState, useCallback } from 'react';
```

- [ ] **Step 4: Add `handleSessionAttempt` function**

After the `handleClearAll` function, add:
```typescript
  const handleSessionAttempt = useCallback((word: Word, correct: boolean) => {
    setSessionTotal(t => t + 1);
    if (correct) {
      setSessionCorrect(c => c + 1);
    } else {
      setSessionWrongWords(prev =>
        prev.find(w => w.id === word.id) ? prev : [...prev, word],
      );
    }
  }, []);
```

- [ ] **Step 5: Pass `onAttempt` to each WordCard**

In the JSX, change:
```tsx
          <WordCard
            key={word.id}
            word={word}
            index={index}
            dictationMode={dictationMode}
            subject={subject}
          />
```
to:
```tsx
          <WordCard
            key={word.id}
            word={word}
            index={index}
            dictationMode={dictationMode}
            subject={subject}
            onAttempt={handleSessionAttempt}
          />
```

- [ ] **Step 6: Change 完成听写 button to open modal**

Change:
```tsx
        <button
          onClick={onComplete}
          className="w-full py-3 rounded-2xl text-white font-bold text-base shadow-md active:scale-[0.98] transition bg-gradient-to-r from-[#7888C8] to-[#A8B8DC]"
        >
          完成听写 ✓
        </button>
```
to:
```tsx
        <button
          onClick={() => setShowCompletion(true)}
          className="w-full py-3 rounded-2xl text-white font-bold text-base shadow-md active:scale-[0.98] transition bg-gradient-to-r from-[#7888C8] to-[#A8B8DC]"
        >
          完成听写 ✓
        </button>
```

- [ ] **Step 7: Add completion modal**

Just before the final closing `</div>` of the component's return (after the bottom button bar `</div>`), add:
```tsx
    {showCompletion && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
        <div className="bg-white rounded-3xl p-6 shadow-xl w-full max-w-sm">
          <div className="text-center mb-5">
            <div className="text-4xl mb-2">
              {sessionTotal === 0 ? '📋' : sessionWrongWords.length === 0 ? '🎉' : '📊'}
            </div>
            <h2 className="text-lg font-bold text-stone-800">本次听写完成</h2>
          </div>

          {sessionTotal === 0 ? (
            <p className="text-sm text-stone-400 text-center mb-5">本次未打分</p>
          ) : (
            <div className="bg-stone-50 rounded-2xl p-4 mb-5 flex justify-around text-center">
              <div>
                <div className="text-2xl font-bold text-[#4A8842]">{sessionCorrect}</div>
                <div className="text-xs text-stone-400 mt-0.5">答对</div>
              </div>
              <div className="w-px bg-stone-200" />
              <div>
                <div className="text-2xl font-bold text-[#B05860]">
                  {sessionTotal - sessionCorrect}
                </div>
                <div className="text-xs text-stone-400 mt-0.5">答错</div>
              </div>
              <div className="w-px bg-stone-200" />
              <div>
                <div
                  className={`text-2xl font-bold ${
                    Math.round((sessionCorrect / sessionTotal) * 100) >= 80
                      ? 'text-[#4A8842]'
                      : Math.round((sessionCorrect / sessionTotal) * 100) >= 60
                      ? 'text-amber-500'
                      : 'text-[#B05860]'
                  }`}
                >
                  {Math.round((sessionCorrect / sessionTotal) * 100)}%
                </div>
                <div className="text-xs text-stone-400 mt-0.5">正确率</div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {sessionWrongWords.length > 0 && onRetry && (
              <button
                onClick={() => {
                  setShowCompletion(false);
                  onRetry(sessionWrongWords);
                }}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#D09098] to-[#E0A8B0] text-white font-bold text-sm shadow-md active:scale-[0.98] transition"
              >
                再练一次错误的词（{sessionWrongWords.length} 个）
              </button>
            )}
            <button
              onClick={() => {
                setShowCompletion(false);
                onComplete?.();
              }}
              className="w-full py-3 rounded-2xl border-2 border-stone-200 text-stone-600 font-semibold text-sm active:scale-[0.98] transition"
            >
              返回首页
            </button>
          </div>
        </div>
      </div>
    )}
```

- [ ] **Step 8: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 9: Manual test**

Run `npm run dev`. Start a dictation, mark some words ✓ and some ✗, then press 完成听写.
- Verify the modal appears with correct count of right/wrong words and accuracy %.
- Verify 返回首页 navigates back.
- Verify 再练一次错误的词 button shows only when there are wrong words.
- Leave its wiring to App.tsx (Task 7).

- [ ] **Step 10: Commit**

```bash
git add src/components/DictationView.tsx
git commit -m "feat: add session completion modal with correct/wrong stats and retry callback"
```

---

## Task 5: StudyListView — new scrollable word list component

**Files:**
- Create: `src/components/StudyListView.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/StudyListView.tsx` with this content:

```tsx
import { Word } from '../types';
import { Volume2, BookOpen } from 'lucide-react';

interface StudyListViewProps {
  words: Word[];
}

function speak(text: string) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'zh-CN';
  utter.rate = 0.8;
  window.speechSynthesis.speak(utter);
}

export default function StudyListView({ words }: StudyListViewProps) {
  if (words.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-10 text-center">
        <div className="text-5xl mb-4">📚</div>
        <h3 className="text-xl font-bold text-stone-700">暂无词语</h3>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="text-sm text-stone-400 px-1 mb-3">共 {words.length} 个词语</div>
        <div className="flex flex-col gap-3">
          {words.map((word, index) => (
            <div
              key={word.id}
              className="bg-white rounded-2xl shadow-sm border border-[#B0BCDC] overflow-hidden"
            >
              <div className="bg-[#F0F2FB] px-4 pt-4 pb-3">
                <div className="flex items-start gap-3">
                  <div className="bg-[#8090C0] text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-3xl font-bold text-[#5868A8] leading-none">
                        {word.text}
                      </span>
                      {word.wordType && (
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                            word.wordType === 'char'
                              ? 'bg-[#EEF5FA] text-[#407898]'
                              : word.wordType === 'word'
                              ? 'bg-[#EFF7EE] text-[#4A8842]'
                              : 'bg-[#F5F0FA] text-[#7060A0]'
                          }`}
                        >
                          {word.wordType === 'char' ? '字' : word.wordType === 'word' ? '词' : '句'}
                        </span>
                      )}
                    </div>
                    {word.pinyin && (
                      <div className="text-sm text-stone-400 mt-0.5 font-medium">
                        {word.pinyin}
                      </div>
                    )}
                    {word.meaning && (
                      <div className="text-xs text-stone-500 mt-1">{word.meaning}</div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => speak(word.text)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-sm font-medium bg-[#8090C0] hover:bg-[#6878B0] active:bg-[#5060A0] transition-colors shadow-sm"
                  >
                    <Volume2 size={16} />
                    <span>朗读</span>
                  </button>
                  <button
                    onClick={() => speak(word.example)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-600 hover:bg-stone-700 active:bg-stone-800 text-white text-sm font-medium transition-colors shadow-sm"
                  >
                    <BookOpen size={16} />
                    <span>例句</span>
                  </button>
                </div>

                {word.example && (
                  <div className="mt-2 text-xs text-stone-500 italic pl-1">
                    例：{word.example}
                    {word.exampleMeaning && (
                      <span className="text-stone-400 not-italic">
                        {' '}— {word.exampleMeaning}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/StudyListView.tsx
git commit -m "feat: add StudyListView scrollable word list component"
```

---

## Task 6: WordListView — add 听写/学习 tab switcher

**Files:**
- Modify: `src/components/WordListView.tsx`

- [ ] **Step 1: Replace the entire file content**

Replace `src/components/WordListView.tsx` with:

```tsx
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
            {tab === 'dictation' ? '听写模式' : '学习模式'}
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: errors in `App.tsx` because it doesn't pass the new props yet — that's expected, fixed in Task 7.

- [ ] **Step 3: Commit**

```bash
git add src/components/WordListView.tsx
git commit -m "feat: add 听写/学习 tab switcher to WordListView"
```

---

## Task 7: App.tsx — wire study mode, retry handler, and lesson routing

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Replace the entire file content**

Replace `src/App.tsx` with:

```tsx
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
```

- [ ] **Step 2: Verify TypeScript compiles with no errors**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run tests**

```bash
npm test
```

Expected: all existing tests pass.

- [ ] **Step 4: Manual end-to-end test**

Run `npm run dev` and verify the full flow:

**Dictation flow:**
1. Open app → see 听写模式 / 学习模式 tabs
2. 听写模式 → 家长模式 → 按课听写 → select a lesson → select words → start → mark some ✓ and ✗ (hear sounds) → 完成听写 → modal appears with stats
3. Press 再练一次错误的词 → dictation restarts with only wrong words
4. Complete again → press 返回首页 → back on main page

**Study flow:**
1. Switch to 学习模式 tab → see four study entry buttons
2. Click 五年级 → StudyListView shows with scrollable word list, each word shows text + pinyin + example
3. Back button returns to main page
4. Click 按课学习 → LessonSelectorView → select a lesson → StudyListView shows lesson words
5. Back button returns to LessonSelectorView

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire up study mode, retry handler, and lesson routing in App"
```

---

## Done

All seven tasks complete. The app now has:
- Sound feedback (✓ = bright tone, ✗ = low buzz)
- Session completion modal with correct/wrong stats and 再练一次错误的词 button
- Main page with 听写模式 / 学习模式 tabs
- Study mode scrollable word list accessible by grade or lesson
