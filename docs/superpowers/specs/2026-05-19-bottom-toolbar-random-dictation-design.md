# Design Spec: Bottom Toolbar, Random Dictation & Progress Reset

**Date:** 2026-05-19  
**Status:** Approved

---

## Overview

Two new features added to all relevant views via a persistent bottom toolbar:

1. **重置进度** — context-aware progress reset, on all views
2. **随机听写** — random dictation from errors + unpracticed words, only shown inside DictationView
3. **随机选词 in WordSelectorView** — random auto-select option within the word selector flow (both lesson and grade modes)

---

## Feature 1: Bottom Toolbar (`BottomToolbar` component)

### Placement
Rendered in `App.tsx` between `<main>` and the search modal, as a persistent bottom bar across all views.

### Visibility rules

| View | Buttons shown |
|------|--------------|
| `wordlists` | 重置进度 only |
| `lessonSelector` | 重置进度 only |
| `wordSelector` | 重置进度 only |
| `studyList` | 重置进度 only |
| `dictation` | 随机听写 + 重置进度 |
| `study` | 重置进度 only |

### 随机听写 button (DictationView only)

Default state: button reads `🎲 随机听写`.

On tap: the toolbar row replaces itself with a count-picker row:
```
[ 5 ] [ 10 ] [ 15 ] [ 20 ] [ 30 ] [ × 取消 ]
```
Tapping a count:
1. Computes random words from the current session's `contextWords` (errors + unpracticed, see below)
2. Calls `onStartRandom(words)` on `App.tsx`, which rebuilds `SessionConfig` and increments `dictationKey` to force remount of `DictationView`
3. Count picker collapses back to default state

### 重置进度 button (all views)

Default state: button reads the `resetLabel` for the current context (e.g., "重置全部进度").

On tap: confirms inline — button row replaces itself with:
```
[ 确认重置 ] [ 取消 ]
```
On confirm: calls `onReset()` on `App.tsx`, which calls `clearWordsRecords` with the current context words' IDs. Collapses back.

### Props interface

```typescript
interface BottomToolbarProps {
  contextWords: Word[];        // words in scope for random selection and reset
  resetLabel: string;          // e.g. "重置全部进度", "重置本课进度"
  showRandom: boolean;         // true only when view === 'dictation'
  sessionGrade: string;        // grade label for SessionConfig when starting random
  onStartRandom: (words: Word[]) => void;
  onReset: () => void;
}
```

---

## Feature 2: Context computation in `App.tsx`

`App.tsx` computes a `toolbarContext` object passed to `BottomToolbar`:

| Current state | `contextWords` | `resetLabel` |
|---------------|----------------|--------------|
| `view === 'dictation'` and `sessionConfig` | `sessionConfig.words` | `重置本次进度` |
| `view === 'wordSelector'` and `selectorMode === 'lesson'` | words of `selectedLessonId` list (via `presetWordLists`) | `重置本课进度` |
| `view === 'wordSelector'` and `selectorMode === 'mixed'` and `selectorGrade === 5` | all P5 words (same query as `openStudyGrade`) | `重置五年级进度` |
| `view === 'wordSelector'` and `selectorMode === 'mixed'` and `selectorGrade === 6` | all P6 words | `重置六年级进度` |
| `view === 'wordSelector'` and `selectorMode === 'mixed'` and `selectorGrade === 'all'` | all P5+P6 words | `重置全部进度` |
| `view === 'studyList'` | `studyWords` (already in App state) | `重置当前进度` |
| all other views (`wordlists`, `lessonSelector`, `study`) | all P5+P6 words | `重置全部进度` |

A helper function `getAllGradeWords(grade: GradeFilter): Word[]` is extracted in `App.tsx` (reusing the same logic already in `openStudyGrade`) to avoid duplication.

### `onReset` handler
`App.tsx` passes a closure that captures the current `toolbarContext.contextWords`:
```typescript
// passed as prop:
onReset={() => clearWordsRecords(toolbarContext.contextWords.map(w => w.id))}
```

### `onStartRandom` handler
```typescript
function handleStartRandom(words: Word[]) {
  if (words.length === 0) return;
  const grade = sessionConfig?.grade ?? '全部';
  setSessionConfig({ words, grade });
  setDictationKey(k => k + 1);
}
```

---

## Feature 3: Random word selection utility

New function added to `src/utils/autoSelect.ts`:

```typescript
export function randomWordsFromErrorsAndUnpracticed(
  words: Word[],
  count: number,
): Word[]
```

Logic:
1. Build candidate pool: words where `getWordStats(w.id).total === 0` (unpracticed) OR `stats.total > stats.correct` (has errors)
2. If pool is empty, fall back to all `words`
3. Shuffle pool with `Math.random()`
4. Return first `Math.min(count, pool.length)` words

---

## Feature 4: Random auto-select in `WordSelectorView`

### Grade mode (mixed)

In the `AUTO_RULES` array, add a fourth entry:
```typescript
{ rule: 'random-errors', label: '随机' }
```

Add a new `AutoSelectRule` type value `'random-errors'` in `src/utils/autoSelect.ts`.

`autoSelectWords` is extended to handle `'random-errors'`: calls `randomWordsFromErrorsAndUnpracticed(words, size)`.

Behavior: selecting "随机" + a session size → random N words from errors + unpracticed in current grade. Works identically to existing rules (toggleable, respects `sessionSize`).

### Lesson mode

In the lesson mode bottom bar (currently "选择全部" + "选择5个"), add a third button: **随机 5 个**.

On tap: calls `randomWordsFromErrorsAndUnpracticed(allWords, 5)`, sets `selectedIds` to those words' IDs. Button is toggleable (tap again to deselect).

The count is fixed at 5 for lesson mode (matching the existing "选择5个" convention).

---

## Component / file changes summary

| File | Change |
|------|--------|
| `src/utils/autoSelect.ts` | Add `'random-errors'` to `AutoSelectRule`; add `randomWordsFromErrorsAndUnpracticed`; extend `autoSelectWords` |
| `src/components/BottomToolbar.tsx` | New component — reset + random toolbar |
| `src/components/WordSelectorView.tsx` | Add `随机` to grade-mode auto-select; add `随机 5 个` to lesson-mode quick-select |
| `src/App.tsx` | Extract `getAllGradeWords`; compute `toolbarContext`; add `handleToolbarReset` + `handleStartRandom`; render `BottomToolbar` |
