# Bottom Toolbar, Random Dictation & Progress Reset — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent bottom toolbar (reset progress on all views, random dictation on DictationView only) and random word auto-selection inside WordSelectorView for both lesson and grade modes.

**Architecture:** 4 tasks bottom-up — utility first, then new component, then modify existing components, then App.tsx wiring. Each task leaves the app runnable.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Vitest.

**Prerequisite:** This plan builds on `src/App.tsx` as rewritten in `2026-05-19-sound-completion-study-mode` plan (Task 7). Confirm that plan's Task 7 is complete before starting here.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/utils/autoSelect.ts` | Modify | Add `'random-errors'` rule + `randomWordsFromErrorsAndUnpracticed` |
| `src/components/BottomToolbar.tsx` | Create | Persistent toolbar with reset + random buttons |
| `src/components/WordSelectorView.tsx` | Modify | Add 随机 to grade-mode auto-select; add 随机5个 to lesson-mode quick-select |
| `src/App.tsx` | Modify | Add `getAllGradeWords`, `toolbarContext`, `handleStartRandom`; render `BottomToolbar`; add `clearWordsRecords` import |

---

## Task 1: Extend `autoSelect.ts` with random selection

**Files:**
- Modify: `src/utils/autoSelect.ts`
- Test: `src/utils/autoSelect.test.ts`

- [ ] **Step 1: Write failing tests**

Open `src/utils/autoSelect.test.ts` and append these tests:

```typescript
import { randomWordsFromErrorsAndUnpracticed } from './autoSelect';
import type { WordStats } from './storage';
import type { Word } from '../types';

function makeWord(id: string): Word {
  return { id, text: id, example: '' };
}

function makeStats(total: number, correct: number): WordStats {
  return {
    total,
    correct,
    accuracy: total === 0 ? 0 : Math.round((correct / total) * 100),
    lastPracticed: total > 0 ? new Date().toISOString() : null,
    recentAttempts: [],
    lastIntervalMs: null,
  };
}

describe('randomWordsFromErrorsAndUnpracticed', () => {
  it('picks only unpracticed and error words when pool is large enough', () => {
    const words = [makeWord('a'), makeWord('b'), makeWord('c'), makeWord('d')];
    const statsMap = {
      a: makeStats(5, 5),  // all correct — excluded
      b: makeStats(0, 0),  // unpracticed — included
      c: makeStats(3, 1),  // has errors — included
      d: makeStats(0, 0),  // unpracticed — included
    };
    const result = randomWordsFromErrorsAndUnpracticed(words, 2, statsMap);
    expect(result).toHaveLength(2);
    result.forEach(w => expect(['b', 'c', 'd']).toContain(w.id));
  });

  it('falls back to all words when pool is empty', () => {
    const words = [makeWord('a'), makeWord('b')];
    const statsMap = {
      a: makeStats(5, 5),
      b: makeStats(3, 3),
    };
    const result = randomWordsFromErrorsAndUnpracticed(words, 2, statsMap);
    expect(result).toHaveLength(2);
  });

  it('returns all pool words when count exceeds pool size', () => {
    const words = [makeWord('a'), makeWord('b')];
    const statsMap = {
      a: makeStats(0, 0),
      b: makeStats(5, 5),
    };
    const result = randomWordsFromErrorsAndUnpracticed(words, 10, statsMap);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a');
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- autoSelect
```

Expected: 3 failing tests — `randomWordsFromErrorsAndUnpracticed is not a function`.

- [ ] **Step 3: Implement the changes**

Replace the entire content of `src/utils/autoSelect.ts` with:

```typescript
import type { Word } from '../types';
import type { WordStats } from './storage';
import { getWordStats } from './storage';

export type AutoSelectRule = 'most-errors' | 'least-recent' | 'recent-error-rate' | 'random-errors';

function scoreWord(rule: AutoSelectRule, stats: WordStats): number {
  if (rule === 'most-errors') {
    return stats.total - stats.correct;
  }
  if (rule === 'least-recent') {
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
  const defaultStats: WordStats = {
    total: 0,
    correct: 0,
    accuracy: 0,
    lastPracticed: null,
    recentAttempts: [],
    lastIntervalMs: null,
  };
  return [...words].sort((a, b) => {
    const sa = scoreWord(rule, statsMap[a.id] ?? defaultStats);
    const sb = scoreWord(rule, statsMap[b.id] ?? defaultStats);
    if (sa === Infinity && sb === Infinity) return 0;
    if (sa === Infinity) return -1;
    if (sb === Infinity) return 1;
    return sb - sa;
  });
}

/** Pick random words from the errors+unpracticed pool. Falls back to all words if pool is empty. */
export function randomWordsFromErrorsAndUnpracticed(
  words: Word[],
  count: number,
  statsMap?: Record<string, WordStats>,
): Word[] {
  const map = statsMap ?? Object.fromEntries(words.map(w => [w.id, getWordStats(w.id)]));
  const pool = words.filter(w => {
    const s = map[w.id];
    if (!s) return true;
    return s.total === 0 || s.total > s.correct;
  });
  const source = pool.length > 0 ? pool : words;
  const shuffled = [...source].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/** Select top `count` words by `rule`, reading stats from localStorage. */
export function autoSelectWords(
  words: Word[],
  rule: AutoSelectRule,
  count: number,
  statsMap?: Record<string, WordStats>,
): Word[] {
  if (rule === 'random-errors') {
    return randomWordsFromErrorsAndUnpracticed(words, count, statsMap);
  }
  const map = statsMap ?? Object.fromEntries(words.map(w => [w.id, getWordStats(w.id)]));
  return rankWords(words, rule, map).slice(0, count);
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- autoSelect
```

Expected: all tests pass (existing + 3 new).

- [ ] **Step 5: Commit**

```bash
git add src/utils/autoSelect.ts src/utils/autoSelect.test.ts
git commit -m "feat: add random-errors rule and randomWordsFromErrorsAndUnpracticed to autoSelect"
```

---

## Task 2: Create `BottomToolbar` component

**Files:**
- Create: `src/components/BottomToolbar.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/BottomToolbar.tsx` with this content:

```tsx
import { useState } from 'react';
import { Word } from '../types';
import { randomWordsFromErrorsAndUnpracticed } from '../utils/autoSelect';

interface BottomToolbarProps {
  contextWords: Word[];
  resetLabel: string;
  showRandom: boolean;
  onStartRandom: (words: Word[]) => void;
  onReset: () => void;
}

const RANDOM_COUNTS = [5, 10, 15, 20, 30];

export default function BottomToolbar({
  contextWords,
  resetLabel,
  showRandom,
  onStartRandom,
  onReset,
}: BottomToolbarProps) {
  const [mode, setMode] = useState<'idle' | 'pickCount' | 'confirmReset'>('idle');

  function handleRandomCount(count: number) {
    const words = randomWordsFromErrorsAndUnpracticed(contextWords, count);
    setMode('idle');
    onStartRandom(words);
  }

  function handleConfirmReset() {
    setMode('idle');
    onReset();
  }

  if (mode === 'pickCount') {
    return (
      <div className="bg-white border-t border-stone-100 px-3 py-2.5 flex items-center gap-1.5">
        {RANDOM_COUNTS.map(n => (
          <button
            key={n}
            onClick={() => handleRandomCount(n)}
            className="flex-1 py-2 rounded-xl bg-[#F0F2FB] text-[#5868A8] text-sm font-bold border border-[#B0BCDC] active:scale-[0.97] transition"
          >
            {n}
          </button>
        ))}
        <button
          onClick={() => setMode('idle')}
          className="px-3 py-2 rounded-xl bg-stone-100 text-stone-500 text-sm font-medium active:scale-[0.97] transition"
        >
          ×
        </button>
      </div>
    );
  }

  if (mode === 'confirmReset') {
    return (
      <div className="bg-white border-t border-stone-100 px-4 py-2.5 flex items-center gap-2">
        <span className="text-xs text-stone-500 flex-1">{resetLabel}？</span>
        <button
          onClick={handleConfirmReset}
          className="px-3 py-2 rounded-xl bg-[#D09098] text-white text-xs font-semibold active:scale-[0.97] transition"
        >
          确认重置
        </button>
        <button
          onClick={() => setMode('idle')}
          className="px-3 py-2 rounded-xl bg-stone-100 text-stone-500 text-xs font-semibold active:scale-[0.97] transition"
        >
          取消
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border-t border-stone-100 px-4 py-2.5 flex items-center gap-2">
      {showRandom && (
        <button
          onClick={() => setMode('pickCount')}
          className="flex-1 py-2 rounded-xl bg-[#F0F2FB] text-[#5868A8] text-sm font-semibold border border-[#B0BCDC] active:scale-[0.97] transition"
        >
          🎲 随机听写
        </button>
      )}
      <button
        onClick={() => setMode('confirmReset')}
        className={`${showRandom ? 'flex-1' : 'w-full'} py-2 rounded-xl bg-stone-50 text-stone-500 text-sm font-semibold border border-stone-200 active:scale-[0.97] transition`}
      >
        🔄 {resetLabel}
      </button>
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
git add src/components/BottomToolbar.tsx
git commit -m "feat: add BottomToolbar component with random dictation and progress reset"
```

---

## Task 3: Add random selection to `WordSelectorView`

**Files:**
- Modify: `src/components/WordSelectorView.tsx`

- [ ] **Step 1: Import `randomWordsFromErrorsAndUnpracticed`**

In `src/components/WordSelectorView.tsx`, change the autoSelect import from:
```typescript
import { autoSelectWords, AutoSelectRule } from '../utils/autoSelect';
```
to:
```typescript
import { autoSelectWords, AutoSelectRule, randomWordsFromErrorsAndUnpracticed } from '../utils/autoSelect';
```

- [ ] **Step 2: Add `'random'` to `quickSelectMode` state type and add `handleSelectRandom`**

Change:
```typescript
  const [quickSelectMode, setQuickSelectMode] = useState<'none' | 'all' | 'five'>('none');
```
to:
```typescript
  const [quickSelectMode, setQuickSelectMode] = useState<'none' | 'all' | 'five' | 'random'>('none');
```

After the `handleSelectFive` function, add:
```typescript
  function handleSelectRandom() {
    if (quickSelectMode === 'random') {
      setQuickSelectMode('none');
      setSelectedIds(new Set());
    } else {
      setQuickSelectMode('random');
      const selected = randomWordsFromErrorsAndUnpracticed(allWords, 5);
      setSelectedIds(new Set(selected.map(w => w.id)));
    }
  }
```

- [ ] **Step 3: Add `随机` to grade-mode `AUTO_RULES`**

Change:
```typescript
const AUTO_RULES: { rule: AutoSelectRule; label: string }[] = [
  { rule: 'most-errors', label: '错误最多' },
  { rule: 'least-recent', label: '最久未练' },
  { rule: 'recent-error-rate', label: '近期错误率' },
];
```
to:
```typescript
const AUTO_RULES: { rule: AutoSelectRule; label: string }[] = [
  { rule: 'most-errors', label: '错误最多' },
  { rule: 'least-recent', label: '最久未练' },
  { rule: 'recent-error-rate', label: '近期错误率' },
  { rule: 'random-errors', label: '随机' },
];
```

- [ ] **Step 4: Add 随机5个 button to lesson-mode quick-select bar**

In the lesson mode bottom bar JSX, find:
```tsx
          <div className="flex gap-1.5 flex-1">
              <button
                onClick={handleSelectAll}
                className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition border ${
                  quickSelectMode === 'all'
                    ? 'bg-[#F0F2FB] border-[#B0BCDC] text-[#5868A8]'
                    : 'bg-white border-stone-200 text-stone-400'
                }`}
              >
                选择全部
              </button>
              <button
                onClick={handleSelectFive}
                className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition border ${
                  quickSelectMode === 'five'
                    ? 'bg-[#F0F2FB] border-[#B0BCDC] text-[#5868A8]'
                    : 'bg-white border-stone-200 text-stone-400'
                }`}
              >
                选择5个
              </button>
            </div>
```

Replace with:
```tsx
          <div className="flex gap-1.5 flex-1">
              <button
                onClick={handleSelectAll}
                className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition border ${
                  quickSelectMode === 'all'
                    ? 'bg-[#F0F2FB] border-[#B0BCDC] text-[#5868A8]'
                    : 'bg-white border-stone-200 text-stone-400'
                }`}
              >
                选择全部
              </button>
              <button
                onClick={handleSelectFive}
                className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition border ${
                  quickSelectMode === 'five'
                    ? 'bg-[#F0F2FB] border-[#B0BCDC] text-[#5868A8]'
                    : 'bg-white border-stone-200 text-stone-400'
                }`}
              >
                选择5个
              </button>
              <button
                onClick={handleSelectRandom}
                className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition border ${
                  quickSelectMode === 'random'
                    ? 'bg-[#F0F2FB] border-[#B0BCDC] text-[#5868A8]'
                    : 'bg-white border-stone-200 text-stone-400'
                }`}
              >
                随机5个
              </button>
            </div>
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Manual test**

Run `npm run dev`. Test grade mode: open 五年级 word selector → tap 随机 in smart-select area → confirm it selects N random words from errors+unpracticed. Test lesson mode: open a lesson → tap 随机5个 → confirm 5 words are selected.

- [ ] **Step 7: Commit**

```bash
git add src/components/WordSelectorView.tsx
git commit -m "feat: add random auto-select to WordSelectorView grade and lesson modes"
```

---

## Task 4: Wire `BottomToolbar` in `App.tsx`

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add `clearWordsRecords` to the storage import**

In `src/App.tsx`, change:
```typescript
import { ensureFreshInstall, applyOverridesAndFilter, getHiddenListIds } from './utils/storage';
```
to:
```typescript
import { ensureFreshInstall, applyOverridesAndFilter, getHiddenListIds, clearWordsRecords } from './utils/storage';
```

- [ ] **Step 2: Import `BottomToolbar` and `useMemo`**

Add `BottomToolbar` import:
```typescript
import BottomToolbar from './components/BottomToolbar';
```

Add `useMemo` to the React import:
```typescript
import { useState, useMemo } from 'react';
```

- [ ] **Step 3: Add `getAllGradeWords` helper function**

Inside the `App` component, after the state declarations, add:
```typescript
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
```

- [ ] **Step 4: Add `toolbarContext` computed value**

After `getAllGradeWords`, add:
```typescript
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
    return { contextWords: getAllGradeWords('all'), resetLabel: '重置全部进度' };
  }, [view, sessionConfig, selectorMode, selectedLessonId, selectorGrade, studyWords]);
```

- [ ] **Step 5: Add `handleStartRandom` function**

After `handleRetry`, add:
```typescript
  function handleStartRandom(words: Word[]) {
    if (words.length === 0) return;
    const grade = sessionConfig?.grade ?? '全部';
    setSessionConfig({ words, grade });
    setDictationKey(k => k + 1);
    setView('dictation');
  }
```

- [ ] **Step 6: Remove duplicate `getAllGradeWords` logic from `openStudyGrade`**

The existing `openStudyGrade` function duplicates the grade-words query. Replace it with a call to `getAllGradeWords`:

Change:
```typescript
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
```
to:
```typescript
  function openStudyGrade(grade: GradeFilter) {
    const words = getAllGradeWords(grade);
    const title = grade === 5 ? '五年级' : grade === 6 ? '六年级' : '全部';
    setStudyWords(words);
    setStudyTitle(title);
    setStudyOrigin('wordlists');
    setView('studyList');
  }
```

- [ ] **Step 7: Render `BottomToolbar` in JSX**

In the return JSX, after `</main>` and before `{showSearch && <SearchModal ... />}`, add:
```tsx
      <BottomToolbar
        contextWords={toolbarContext.contextWords}
        resetLabel={toolbarContext.resetLabel}
        showRandom={view === 'dictation'}
        onStartRandom={handleStartRandom}
        onReset={() => clearWordsRecords(toolbarContext.contextWords.map(w => w.id))}
      />
```

- [ ] **Step 8: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 9: Run all tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 10: Manual end-to-end test**

Run `npm run dev` and test:

1. **Main page** → bottom bar shows `🔄 重置全部进度` only → tap → confirm inline → dismiss
2. **选课页** → same reset label
3. **选词页（年级）** → reset label = 重置五年级进度 (after entering grade 5)
4. **选词页（课次）** → reset label = 重置本课进度
5. **听写页** → both `🎲 随机听写` and `🔄 重置本次进度` visible → tap 随机听写 → count picker appears → pick 10 → new dictation starts with ≤10 random error/unpracticed words
6. **学习页** → reset label = 重置当前进度, no random button

- [ ] **Step 11: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire BottomToolbar with context-aware reset and random dictation in App"
```

---

## Done

All four tasks complete. The app now has:
- Persistent bottom toolbar on all views showing context-aware reset button
- Random dictation count picker (5/10/15/20/30) visible only in DictationView
- Random auto-select (随机) in grade-mode WordSelectorView smart-select
- 随机5个 quick-select button in lesson-mode WordSelectorView
