# Design Spec: Sound Effects, Completion Popup & Study Mode

**Date:** 2026-05-19  
**Status:** Approved

---

## Overview

Three features added to 听写小状元:

1. **Sound effects** — audio feedback when marking a word correct or wrong
2. **Session completion popup** — summary stats after finishing a dictation round, with option to re-practice wrong words
3. **Main page + study mode** — main page split into 听写模式 and 学习模式 tabs; new scrollable word list for studying

---

## Feature 1: Sound Effects

### Where
`WordCard.tsx` — the ✓ and ✗ buttons.

### Behavior
- Pressing ✓ plays a short, upward-pitch "correct" tone (bright, rewarding)
- Pressing ✗ plays a short, downward-pitch "wrong" tone (low, buzzer-like)

### Implementation
Use the **Web Audio API** to synthesize tones programmatically — no audio files required.

A small utility function `playSound(type: 'correct' | 'wrong')` is created (e.g., in `src/utils/sound.ts`):
- `'correct'`: short ascending beep (~200ms, frequency ramp up ~440→880 Hz)
- `'wrong'`: short descending buzz (~300ms, frequency ramp down ~300→150 Hz)

The function is called inside `handleAttempt` in `WordCard` before saving the attempt.

---

## Feature 2: Session Completion Popup

### Where
`DictationView.tsx` — triggered when the user presses 「完成听写」.

### Session stat tracking
`DictationView` maintains two pieces of state:
- `sessionCorrect: number` — count of ✓ presses this session
- `sessionWrongWordIds: Set<string>` — IDs of words that received at least one ✗ press this session

`WordCard` receives an `onAttempt(wordId: string, correct: boolean)` callback. `DictationView` passes this callback down and updates the two state values on every attempt.

### Popup behavior
When the user presses 「完成听写」, instead of calling `onComplete` immediately, `DictationView` sets `showCompletionModal = true` and displays a modal overlay with:

- **正确率**: `sessionCorrect / sessionTotal * 100` (rounded to integer %)
- **答对 X 个 / 答错 Y 个** (where X = sessionCorrect, Y = sessionTotal - sessionCorrect; sessionTotal = total number of ✓+✗ presses this session)

Two buttons:

| Button | Behavior |
|--------|----------|
| 返回首页 | Close modal, call `onComplete` (navigate back to main page) |
| 再练一次错误的词 | Close modal, call `onRetry(wrongWords)` with the `Word[]` array of words that were answered wrong at least once this session. Storage records are **NOT** cleared — all attempts remain saved. `App.tsx` rebuilds `SessionConfig` with those words and re-renders `DictationView`. |

**Edge case**: If `sessionWrongWordIds` is empty (all words answered correctly with no wrong presses), the 「再练一次错误的词」button is hidden.

**Edge case**: If the user presses 「完成听写」 without having pressed any ✓ or ✗ (sessionTotal = 0), the popup still appears but shows "本次未打分" instead of stats, with only the 「返回首页」button.

### Retry flow
`DictationView` receives a new prop `onRetry(wrongWords: Word[])`. When the user presses 「再练一次错误的词」:
1. The modal closes.
2. `onRetry` is called with the array of `Word` objects that were answered wrong at least once this session.
3. `App.tsx` handles `onRetry` by building a new `SessionConfig` from those wrong words (same grade label) and calling `setSessionConfig` — this re-renders `DictationView` with the new config, which resets all session state naturally.

This keeps `DictationView` stateless about word list management; `App.tsx` owns the session config.

---

## Feature 3: Main Page Redesign + Study Mode

### 3a. Main page — two-tab layout (`WordListView`)

The main page (`WordListView`) gains a top-level tab switcher with two tabs:

- **听写** (default)
- **学习**

#### 听写 tab (unchanged from current)
- 家长模式 / 学生模式 toggle
- Four entry buttons: 按课听写 | 五年级 | 六年级 | 全部

#### 学习 tab (new)
- No parent/student toggle (not relevant for studying)
- Same four entry buttons: 按课学习 | 五年级 | 六年级 | 全部

### 3b. Study mode navigation flow

The study mode reuses the existing grade/lesson selection views:

```
学习 tab → 按课学习 → LessonSelectorView → select lesson → StudyListView (all words in lesson)
学习 tab → 五年级   → StudyListView (all P5 words)
学习 tab → 六年级   → StudyListView (all P6 words)
学习 tab → 全部     → StudyListView (all P5+P6 words)
```

`LessonSelectorView` already handles navigation to a lesson's word list. A new `onStudyLesson(lessonId)` callback is added alongside the existing `onSelectLesson` so the caller can distinguish dictation vs. study destinations.

New `ViewMode` value: `'studyList'`

### 3c. StudyListView (new component)

A read-only, scrollable list of all words in the selected grade/lesson.

Each word is displayed as a compact card showing:
- 词语 (large text) + 拼音 (if available)
- 释义 (if available)
- 例句

No ✓/✗ buttons. No record tracking. Pure reference view.

Header (in `App.tsx` title logic): `学习：<grade or lesson name>`

Back button returns to:
- `lessonSelector` if came from a lesson selection
- `wordlists` (main page) otherwise

---

## Component / type changes summary

| File | Change |
|------|--------|
| `src/utils/sound.ts` | New file — `playSound('correct' \| 'wrong')` using Web Audio API |
| `src/components/WordCard.tsx` | Add `onAttempt` prop; call `playSound` in `handleAttempt` |
| `src/components/DictationView.tsx` | Track `sessionCorrect`, `sessionWrongWordIds`; show completion modal; call `onRetry(wrongWords)` prop |
| `src/components/WordListView.tsx` | Add 听写/学习 tab switcher; add study entry buttons calling new callbacks |
| `src/components/LessonSelectorView.tsx` | Add `onStudyLesson` callback prop |
| `src/components/StudyListView.tsx` | New component — scrollable word list |
| `src/App.tsx` | Wire up study tab flow; add `'studyList'` ViewMode; handle `onStudyLesson`; handle `onRetry` by rebuilding `SessionConfig` |
| `src/types/index.ts` | Add `'studyList'` to `ViewMode` |
