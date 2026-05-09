# Grade Selector + Word Picker + Session Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the dictation app so users pick a grade, preview all words with error stats, auto- or manually select N words, and run a focused dictation session.

**Architecture:** One new component (`WordSelectorView`) sits between `WordListView` and `DictationView`. Auto-select algorithms live in a pure utility (`autoSelect.ts`) so they can be unit-tested without localStorage. `App.tsx` gains a `wordSelector` view state and a `SessionConfig` object that carries the chosen words into `DictationView`.

**Tech Stack:** React 18, TypeScript 5, Tailwind CSS, Vitest (unit tests), localStorage (existing persistence)

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/types/index.ts` | Modify | Add `GradeFilter`, `SessionConfig`, extend `ViewMode` |
| `vite.config.ts` | Modify | Add Vitest config block |
| `package.json` | Modify | Add `vitest` to devDependencies + test script |
| `src/utils/autoSelect.ts` | Create | Pure ranking + selection functions |
| `src/utils/autoSelect.test.ts` | Create | Unit tests for autoSelect |
| `src/App.tsx` | Modify | New view state, sessionConfig, selectorGrade, navigation wiring |
| `src/components/WordListView.tsx` | Modify | Expose gradeFilter; route "开始听写" to wordSelector |
| `src/components/WordSelectorView.tsx` | Create | Word picker UI (stats list + auto-select bar + slider) |
| `src/components/DictationView.tsx` | Modify | Accept optional `sessionConfig`; add progress indicator |

---

## Task 1: Add types and Vitest

**Files:**
- Modify: `src/types/index.ts`
- Modify: `vite.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Add GradeFilter, SessionConfig, extend ViewMode in `src/types/index.ts`**

Replace the first two lines of `src/types/index.ts`:

```typescript
export type Subject = 'chinese' | 'english';
export type ViewMode = 'wordlists' | 'dictation' | 'study';
```

With:

```typescript
export type Subject = 'chinese' | 'english';
export type ViewMode = 'wordlists' | 'wordSelector' | 'dictation' | 'study';
export type GradeFilter = 'all' | 5 | 6;

export interface SessionConfig {
  words: Word[];
  grade: string;  // '全部' | '五年级' | '六年级' — display label only
}
```

Note: `SessionConfig` references `Word`, which is defined later in the same file — TypeScript hoists interfaces, so order doesn't matter.

- [ ] **Step 2: Install Vitest**

```bash
npm install -D vitest @vitest/ui
```

- [ ] **Step 3: Add test script to `package.json`**

In `package.json`, add `"test": "vitest run"` and `"test:watch": "vitest"` to the scripts block:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc && vite build",
  "preview": "vite preview",
  "ios": "npm run build && npx cap sync ios && npx cap open ios",
  "test": "vitest run",
  "test:watch": "vitest"
},
```

- [ ] **Step 4: Add Vitest config to `vite.config.ts`**

Replace the entire `vite.config.ts` with:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    watch: {
      usePolling: true,
      interval: 300,
    },
  },
  test: {
    environment: 'node',
  },
})
```

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts vite.config.ts package.json package-lock.json
git commit -m "feat: add SessionConfig type, GradeFilter, extend ViewMode, add Vitest"
```

---

## Task 2: autoSelect utility (TDD)

**Files:**
- Create: `src/utils/autoSelect.ts`
- Create: `src/utils/autoSelect.test.ts`

- [ ] **Step 1: Write the failing tests in `src/utils/autoSelect.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { rankWords, autoSelectWords } from './autoSelect';
import type { Word } from '../types';
import type { WordStats } from './storage';

function makeWord(id: string): Word {
  return { id, text: id, example: '' };
}

function makeStats(overrides: Partial<WordStats>): WordStats {
  return {
    total: 0,
    correct: 0,
    accuracy: 0,
    lastPracticed: null,
    recentAttempts: [],
    lastIntervalMs: null,
    ...overrides,
  };
}

const words = [
  makeWord('a'), // 2 errors total
  makeWord('b'), // 5 errors total
  makeWord('c'), // 0 errors, never practiced
];

const statsMap: Record<string, WordStats> = {
  a: makeStats({ total: 10, correct: 8, accuracy: 80, lastPracticed: '2026-01-15T00:00:00.000Z' }),
  b: makeStats({ total: 10, correct: 5, accuracy: 50, lastPracticed: '2026-03-01T00:00:00.000Z' }),
  c: makeStats({ total: 0, correct: 0, accuracy: 0, lastPracticed: null }),
};

describe('rankWords', () => {
  it('most-errors: sorts by total errors descending', () => {
    const result = rankWords(words, 'most-errors', statsMap);
    expect(result.map(w => w.id)).toEqual(['b', 'a', 'c']);
  });

  it('least-recent: puts never-practiced first, then oldest date', () => {
    const result = rankWords(words, 'least-recent', statsMap);
    // c: never (null) → first; a: Jan 15 → second; b: Mar 1 → last
    expect(result.map(w => w.id)).toEqual(['c', 'a', 'b']);
  });

  it('recent-error-rate: sorts by error rate in last 10 attempts descending', () => {
    const statsWithRecent: Record<string, WordStats> = {
      a: makeStats({
        recentAttempts: [
          { date: '2026-01-01T00:00:00.000Z', correct: false },
          { date: '2026-01-02T00:00:00.000Z', correct: false },
          { date: '2026-01-03T00:00:00.000Z', correct: true },
        ],
      }),
      b: makeStats({
        recentAttempts: [
          { date: '2026-01-01T00:00:00.000Z', correct: false },
          { date: '2026-01-02T00:00:00.000Z', correct: false },
          { date: '2026-01-03T00:00:00.000Z', correct: false },
        ],
      }),
      c: makeStats({ recentAttempts: [] }),
    };
    // b: 3/3 wrong = 100%; a: 2/3 wrong ≈ 67%; c: 0 attempts = 0%
    const result = rankWords(words, 'recent-error-rate', statsWithRecent);
    expect(result.map(w => w.id)).toEqual(['b', 'a', 'c']);
  });
});

describe('autoSelectWords', () => {
  it('returns the top N words by the given rule', () => {
    const result = autoSelectWords(words, 'most-errors', 2, statsMap);
    expect(result).toHaveLength(2);
    expect(result.map(w => w.id)).toEqual(['b', 'a']);
  });

  it('returns all words if count exceeds list length', () => {
    const result = autoSelectWords(words, 'most-errors', 99, statsMap);
    expect(result).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run to verify tests fail**

```bash
npm test
```

Expected: FAIL — `autoSelect` module not found.

- [ ] **Step 3: Create `src/utils/autoSelect.ts`**

```typescript
import type { Word } from '../types';
import type { WordStats } from './storage';
import { getWordStats } from './storage';

export type AutoSelectRule = 'most-errors' | 'least-recent' | 'recent-error-rate';

function scoreWord(wordId: string, rule: AutoSelectRule, stats: WordStats): number {
  if (rule === 'most-errors') {
    return stats.total - stats.correct;
  }
  if (rule === 'least-recent') {
    // null (never practiced) → Infinity so it sorts first
    return stats.lastPracticed === null
      ? Infinity
      : -new Date(stats.lastPracticed).getTime();
  }
  // recent-error-rate: error rate over last 10 attempts
  const recent = stats.recentAttempts.slice(-10);
  if (recent.length === 0) return 0;
  return recent.filter(a => !a.correct).length / recent.length;
}

/** Pure ranking function — accepts a statsMap so it can be tested without localStorage. */
export function rankWords(
  words: Word[],
  rule: AutoSelectRule,
  statsMap: Record<string, WordStats>,
): Word[] {
  return [...words].sort((a, b) => {
    const sa = scoreWord(a.id, rule, statsMap[a.id] ?? { total: 0, correct: 0, accuracy: 0, lastPracticed: null, recentAttempts: [], lastIntervalMs: null });
    const sb = scoreWord(b.id, rule, statsMap[b.id] ?? { total: 0, correct: 0, accuracy: 0, lastPracticed: null, recentAttempts: [], lastIntervalMs: null });
    if (sa === Infinity && sb === Infinity) return 0;
    if (sa === Infinity) return -1;
    if (sb === Infinity) return 1;
    return sb - sa;
  });
}

/** Select top `count` words by `rule`, reading stats from localStorage. */
export function autoSelectWords(
  words: Word[],
  rule: AutoSelectRule,
  count: number,
  statsMap?: Record<string, WordStats>,
): Word[] {
  const map = statsMap ?? Object.fromEntries(words.map(w => [w.id, getWordStats(w.id)]));
  return rankWords(words, rule, map).slice(0, count);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/utils/autoSelect.ts src/utils/autoSelect.test.ts
git commit -m "feat: add autoSelect utility with unit tests"
```

---

## Task 3: Update App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Replace `src/App.tsx` with the updated version**

```typescript
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
```

- [ ] **Step 2: Verify TypeScript compiles (WordSelectorView doesn't exist yet — expected error)**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: error about missing `WordSelectorView` module — that's fine, it'll be created in Task 5.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add wordSelector view state and SessionConfig wiring in App"
```

---

## Task 4: Update WordListView

**Files:**
- Modify: `src/components/WordListView.tsx`

The only change: replace `onStart` prop with `onOpenSelector`, remove the local `GradeFilter` type (now in `types/index.ts`), and route "开始听写" through `onOpenSelector`.

- [ ] **Step 1: Update imports and prop interface**

At the top of `src/components/WordListView.tsx`, replace:

```typescript
import { DictationMode, FilterMode, WordList, CustomListMeta } from '../types';
```

with:

```typescript
import { DictationMode, FilterMode, WordList, CustomListMeta, GradeFilter } from '../types';
```

- [ ] **Step 2: Remove local GradeFilter type**

Remove this line (it's now in `types/index.ts`):

```typescript
type GradeFilter = 'all' | 5 | 6;
```

- [ ] **Step 3: Update the props interface**

Replace:

```typescript
interface WordListViewProps {
  onStart: (list: WordList, mode: DictationMode, filter: FilterMode) => void;
  onStudy: (list: WordList, mode: DictationMode, filter: FilterMode) => void;
}
```

with:

```typescript
interface WordListViewProps {
  onOpenSelector: (grade: GradeFilter, mode: DictationMode) => void;
  onStudy: (list: WordList, mode: DictationMode, filter: FilterMode) => void;
}
```

- [ ] **Step 4: Update the destructured props and "开始听写" button**

Replace:

```typescript
export default function WordListView({ onStart, onStudy }: WordListViewProps) {
```

with:

```typescript
export default function WordListView({ onOpenSelector, onStudy }: WordListViewProps) {
```

Then find the "开始听写" button (near the bottom of the component) and replace its `onClick`:

Replace:

```typescript
onClick={() => onStart(buildDictationList(), dictationMode, filterMode)}
```

with:

```typescript
onClick={() => onOpenSelector(gradeFilter, dictationMode)}
```

- [ ] **Step 5: Verify TypeScript compiles (WordSelectorView still missing — that's OK)**

```bash
npx tsc --noEmit 2>&1 | grep -v WordSelectorView
```

Expected: no errors except the missing WordSelectorView.

- [ ] **Step 6: Commit**

```bash
git add src/components/WordListView.tsx
git commit -m "feat: route WordListView 开始听写 to word selector"
```

---

## Task 5: Create WordSelectorView

**Files:**
- Create: `src/components/WordSelectorView.tsx`

- [ ] **Step 1: Create `src/components/WordSelectorView.tsx`**

```typescript
import { useState, useMemo } from 'react';
import { Word, GradeFilter, SessionConfig, DictationMode } from '../types';
import { presetWordLists } from '../data/wordLists';
import {
  getWordStats,
  getCustomLists,
  getCustomWordsForList,
  applyOverridesAndFilter,
  getHiddenListIds,
} from '../utils/storage';
import { autoSelectWords, AutoSelectRule } from '../utils/autoSelect';

interface WordSelectorViewProps {
  grade: GradeFilter;
  dictationMode: DictationMode;
  onStart: (config: SessionConfig) => void;
}

const GRADE_LABEL: Record<string, string> = {
  all: '全部',
  '5': '五年级',
  '6': '六年级',
};

const SESSION_SIZES = [10, 15, 20, 25, 30];

const AUTO_RULES: { rule: AutoSelectRule; label: string }[] = [
  { rule: 'most-errors', label: '错误最多' },
  { rule: 'least-recent', label: '最久未练' },
  { rule: 'recent-error-rate', label: '近期错误率' },
];

export default function WordSelectorView({ grade, dictationMode, onStart }: WordSelectorViewProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeRule, setActiveRule] = useState<AutoSelectRule | null>(null);
  const [sessionSize, setSessionSize] = useState(10);

  const allWords = useMemo((): Word[] => {
    const hiddenListIds = new Set(getHiddenListIds());

    const presetWords = presetWordLists
      .filter(l =>
        l.subject === 'chinese' &&
        (l.grade === 5 || l.grade === 6) &&
        (grade === 'all' || l.grade === grade) &&
        !hiddenListIds.has(l.id),
      )
      .flatMap(l => applyOverridesAndFilter(l.words));

    const customWords = getCustomLists('chinese')
      .filter(l => grade === 'all' || l.grade === grade)
      .flatMap(l => getCustomWordsForList(l.id));

    const seen = new Set<string>();
    return [...presetWords, ...customWords].filter(w =>
      seen.has(w.id) ? false : (seen.add(w.id), true),
    );
  }, [grade]);

  // Default sort: highest error rate first (unpracticed words go last at 0%)
  const sortedWords = useMemo(() => {
    return [...allWords].sort((a, b) => {
      const sa = getWordStats(a.id);
      const sb = getWordStats(b.id);
      const errA = sa.total === 0 ? -1 : (sa.total - sa.correct) / sa.total;
      const errB = sb.total === 0 ? -1 : (sb.total - sb.correct) / sb.total;
      return errB - errA;
    });
  }, [allWords]);

  function applyRule(rule: AutoSelectRule, size: number) {
    const selected = autoSelectWords(sortedWords, rule, size);
    setSelectedIds(new Set(selected.map(w => w.id)));
  }

  function handleRuleClick(rule: AutoSelectRule) {
    if (activeRule === rule) {
      setActiveRule(null);
      setSelectedIds(new Set());
    } else {
      setActiveRule(rule);
      applyRule(rule, sessionSize);
    }
  }

  function handleSizeClick(size: number) {
    setSessionSize(size);
    if (activeRule) applyRule(activeRule, size);
  }

  function toggleWord(wordId: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(wordId)) next.delete(wordId);
      else next.add(wordId);
      return next;
    });
  }

  function handleStart() {
    const selectedWords = sortedWords.filter(w => selectedIds.has(w.id));
    onStart({ words: selectedWords, grade: GRADE_LABEL[String(grade)] ?? '全部' });
  }

  return (
    <div className="flex flex-col h-full">

      {/* ── Word stats list ── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2 pb-4">
        {sortedWords.length === 0 && (
          <div className="text-center py-12 text-stone-400 text-sm">暂无词语</div>
        )}
        {sortedWords.map(word => {
          const stats = getWordStats(word.id);
          const isSelected = selectedIds.has(word.id);
          const errorRate =
            stats.total === 0
              ? null
              : Math.round(((stats.total - stats.correct) / stats.total) * 100);
          const lastLabel = stats.lastPracticed
            ? new Date(stats.lastPracticed).toLocaleDateString('zh-CN', {
                month: 'short',
                day: 'numeric',
              })
            : null;

          return (
            <button
              key={word.id}
              onClick={() => toggleWord(word.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition active:scale-[0.98] text-left ${
                isSelected ? 'border-[#B0BCDC] bg-[#F0F2FB]' : 'border-stone-200 bg-white'
              }`}
            >
              {/* Checkbox */}
              <div
                className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                  isSelected ? 'border-[#8090C0] bg-[#8090C0]' : 'border-stone-300'
                }`}
              >
                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>

              {/* Word text + pinyin */}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-stone-800 text-sm">{word.text}</div>
                {word.pinyin && (
                  <div className="text-xs text-stone-400 mt-0.5">{word.pinyin}</div>
                )}
              </div>

              {/* Stats */}
              <div className="text-right flex-shrink-0">
                {errorRate !== null ? (
                  <div
                    className={`text-sm font-bold ${
                      errorRate > 50
                        ? 'text-[#D09098]'
                        : errorRate > 20
                        ? 'text-amber-500'
                        : 'text-stone-400'
                    }`}
                  >
                    错 {errorRate}%
                  </div>
                ) : (
                  <div className="text-xs text-stone-300">未练习</div>
                )}
                {lastLabel && (
                  <div className="text-xs text-stone-300 mt-0.5">{lastLabel}</div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Auto-select bar + slider ── */}
      <div className="bg-stone-50 border-t border-stone-100 px-4 py-3 flex flex-col gap-2">

        {/* Rule buttons + counter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-400 flex-shrink-0">智能选词</span>
          <div className="flex gap-1.5 flex-1">
            {AUTO_RULES.map(({ rule, label }) => (
              <button
                key={rule}
                onClick={() => handleRuleClick(rule)}
                className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition border ${
                  activeRule === rule
                    ? 'bg-[#F0F2FB] border-[#B0BCDC] text-[#5868A8]'
                    : 'bg-white border-stone-200 text-stone-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="text-xs text-stone-500 font-medium flex-shrink-0 w-12 text-right">
            已选 {selectedIds.size} 个
          </span>
        </div>

        {/* Session size picker */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-400 flex-shrink-0">每次</span>
          <div className="flex gap-1.5 flex-1">
            {SESSION_SIZES.map(n => (
              <button
                key={n}
                onClick={() => handleSizeClick(n)}
                className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition border ${
                  sessionSize === n
                    ? 'bg-[#8090C0] text-white border-[#8090C0]'
                    : 'bg-white border-stone-200 text-stone-400'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <span className="text-xs text-stone-400 flex-shrink-0">个词</span>
        </div>
      </div>

      {/* ── Start button ── */}
      <div className="bg-white border-t border-stone-100 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] px-4 py-4">
        <button
          disabled={selectedIds.size === 0}
          onClick={handleStart}
          className="w-full py-3 rounded-2xl text-white font-bold text-base shadow-md active:scale-[0.98] transition bg-gradient-to-r from-[#7888C8] to-[#A8B8DC] disabled:opacity-40"
        >
          {selectedIds.size > 0 ? `开始听写 · ${selectedIds.size} 个词 →` : '请选择词语'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 3: Run tests to make sure nothing broke**

```bash
npm test
```

Expected: all 5 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/WordSelectorView.tsx
git commit -m "feat: add WordSelectorView with word stats, auto-select, and session size picker"
```

---

## Task 6: Update DictationView

**Files:**
- Modify: `src/components/DictationView.tsx`

Add an optional `sessionConfig` prop. When provided, skip the filter logic and use `sessionConfig.words` directly. Add a word count indicator in the header row.

- [ ] **Step 1: Replace `src/components/DictationView.tsx`**

```typescript
import { useMemo, useState } from 'react';
import { WordList, DictationMode, FilterMode, Subject, SessionConfig } from '../types';
import { getWordStats, clearAllRecords } from '../utils/storage';
import WordCard from './WordCard';

interface DictationViewProps {
  wordList: WordList;
  dictationMode: DictationMode;
  filterMode: FilterMode;
  subject: Subject;
  sessionConfig?: SessionConfig;
}

export default function DictationView({
  wordList,
  dictationMode,
  filterMode,
  subject,
  sessionConfig,
}: DictationViewProps) {
  const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;
  const [confirmClear, setConfirmClear] = useState(false);
  const [cleared, setCleared] = useState(false);

  function handleClearAll() {
    clearAllRecords();
    setCleared(c => !c);
    setConfirmClear(false);
  }

  const filteredWords = useMemo(() => {
    // Session mode: words already chosen by WordSelectorView
    if (sessionConfig) return sessionConfig.words;

    let words = [...wordList.words];

    if (filterMode === 'error-rate') {
      words.sort((a, b) => {
        const sa = getWordStats(a.id);
        const sb = getWordStats(b.id);
        const errA = sa.total === 0 ? 0 : (sa.total - sa.correct) / sa.total;
        const errB = sb.total === 0 ? 0 : (sb.total - sb.correct) / sb.total;
        return errB - errA;
      });
    } else if (filterMode === 'not-practiced') {
      const cutoff = Date.now() - ONE_MONTH_MS;
      words = words.filter(w => {
        const stats = getWordStats(w.id);
        if (!stats.lastPracticed) return true;
        return new Date(stats.lastPracticed).getTime() < cutoff;
      });
    }

    return words;
  }, [wordList, filterMode, sessionConfig]);

  if (filteredWords.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-10 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h3 className="text-xl font-bold text-stone-700">没有符合条件的词语</h3>
        <p className="text-stone-400 text-sm mt-2">
          {filterMode === 'not-practiced'
            ? '所有词语在最近一个月内都练习过了，真棒！'
            : '请尝试其他筛选条件。'}
        </p>
      </div>
    );
  }

  const headerLabel = sessionConfig
    ? `共 ${filteredWords.length} 个词语`
    : filterMode === 'all'
    ? `共 ${filteredWords.length} 个词语`
    : filterMode === 'error-rate'
    ? `按错误率排序 · ${filteredWords.length} 个词`
    : `近1个月未练习 · ${filteredWords.length} 个词`;

  return (
    <div className="p-4 md:p-8 pb-8">
      <div className="flex items-center justify-between text-sm text-stone-500 px-1 mb-3">
        <span>{headerLabel}</span>
        <div className="flex items-center gap-2">
          {confirmClear ? (
            <div className="flex gap-1">
              <button
                onClick={handleClearAll}
                className="px-2.5 py-1 rounded-lg bg-[#D09098] text-white text-xs font-semibold"
              >
                确认清除
              </button>
              <button
                onClick={() => setConfirmClear(false)}
                className="px-2.5 py-1 rounded-lg bg-stone-100 text-stone-600 text-xs font-semibold"
              >
                取消
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmClear(true)}
              className="text-xs text-stone-300 hover:text-[#D09098] transition-colors"
            >
              清除全部记录
            </button>
          )}
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              dictationMode === 'parent'
                ? 'bg-[#F0F2FB] text-[#5868A8]'
                : 'bg-[#EEF5FA] text-[#407898]'
            }`}
          >
            {dictationMode === 'parent' ? '家长模式' : '学生模式'}
          </span>
        </div>
      </div>

      <div key={String(cleared)} className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredWords.map((word, index) => (
          <WordCard
            key={word.id}
            word={word}
            index={index}
            dictationMode={dictationMode}
            subject={subject}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 3: Run tests**

```bash
npm test
```

Expected: all 5 tests pass.

- [ ] **Step 4: Build to confirm no bundle errors**

```bash
npm run build 2>&1 | tail -10
```

Expected: build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/DictationView.tsx
git commit -m "feat: DictationView accepts sessionConfig for pre-selected word sessions"
```

---

## Manual Test Checklist

After all tasks complete, verify the golden path in the browser (`npm run dev`):

- [ ] Home screen shows grade tabs (全部 / 五年级 / 六年级) — tap each, list updates
- [ ] Tap "开始听写" → opens 选择词语 screen with word list and error stats
- [ ] Word list is sorted by error rate descending by default
- [ ] Tap a word row → checkbox toggles, counter "已选 X 个" updates
- [ ] Tap "错误最多" → top 10 words auto-checked, unchecked words become unchecked
- [ ] Change session size to 15 → selection updates to top 15
- [ ] Tap "错误最多" again → all words deselected, rule deactivated
- [ ] Tap "最久未练" → never-practiced words appear first in selection
- [ ] Manually adjust checkboxes after auto-select → works without resetting rule
- [ ] Switch to "近期错误率" rule → re-selects from scratch (manual adjustments discarded)
- [ ] Tap "开始听写 · N 个词 →" → DictationView shows exactly N words
- [ ] ✓ / ✗ taps save immediately (records persist on reload)
- [ ] Back button from DictationView → home screen (word selection is not preserved)
- [ ] Back button from 选择词语 → home screen
- [ ] "先学习" (Study) flow still works normally (unchanged)
- [ ] Grade filter 五年级 → WordSelectorView shows only Grade 5 words
