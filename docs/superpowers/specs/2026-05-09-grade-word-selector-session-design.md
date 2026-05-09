# Design: Grade Selector + Word Picker + Session Flow

**Date:** 2026-05-09  
**Status:** Approved

---

## Overview

Upgrade the dictation app's practice flow so users can:
1. Filter words by grade (五年级, 六年级, 全部) from the home screen
2. Preview all words with their error stats, manually select or auto-select by a rule
3. Set a session size (10–30 words) via slider before starting dictation

The existing `WordListView → DictationView` structure is kept and upgraded. One new view (`WordSelectorView`) is added between them.

---

## User Journey

```
WordListView (grade tabs)
    ↓ tap "开始听写"
WordSelectorView (word picker)
    ↓ tap "开始听写" (≥1 word selected)
DictationView (session)
```

---

## 1. WordListView Changes

**What changes:**
- The existing grade filter tabs (全部 / 五年级 / 六年级) are already present; they now also set the scope for what WordSelectorView loads.
- The "开始听写" button navigates to `WordSelectorView`, passing the current grade filter as context. It no longer opens `DictationView` directly.
- "先学习" (Study) is unchanged — still opens `StudyView`.

**What does not change:**
- List cards, progress bars, custom list management, delete/add list flows.

---

## 2. WordSelectorView (new component)

File: `src/components/WordSelectorView.tsx`

### Layout — three zones

**Top: Word stats list**  
Scrollable list of all words for the selected grade. Each row:
- Word text + pinyin
- Error rate % (from `getWordStats()`) and last-practiced date
- Checkbox (tap to toggle selected)

Words are sorted by error rate descending by default (most problematic first).

**Middle: Auto-select bar**  
Three rule buttons, mutually exclusive:
- `错误最多` — top N words by total error count (archivedTotal + recent wrongs)
- `最久未练` — top N words by longest time since last practice
- `近期错误率高` — top N words by error rate in the last 10 attempts

Tapping a rule button immediately checks the top N words (where N = current slider value) and deselects the rest. The user can then manually tap checkboxes to adjust. Tapping the active rule again deselects all (toggle off).

A counter shows: `已选 X 个`

**Bottom: Slider + Start button**  
- Slider snaps to: 10 / 15 / 20 / 25 / 30
- Default: 10
- When an auto-rule is active, changing the slider immediately re-runs auto-select with the new N
- `开始听写` button: disabled until ≥ 1 word is selected; passes selected `Word[]` to `DictationView`

---

## 3. DictationView Changes

**What changes:**
- Accepts a pre-selected `Word[]` prop (the session words) instead of deriving words from a list ID
- No sub-grouping / batch navigation — the slider already caps the session size, so all selected words are shown in one session
- Progress indicator: "第 X / Y 个" (word X of Y) at the top

**What does not change:**
- ✓ / ✗ tap recording (already auto-saves to localStorage on each tap)
- Parent / Student mode toggle
- Audio playback
- WordCard component
- Exit any time — records already saved per tap

---

## 4. Data & Types

### New type in `types/index.ts`

```typescript
interface SessionConfig {
  words: Word[]    // ordered list of selected words
  grade: string    // '五年级' | '六年级' | '全部' — for display label
}
```

### Auto-select algorithms (in `WordSelectorView`)

All three use existing `getWordStats(wordId)` from `utils/storage.ts`:

| Rule | Sort key |
|---|---|
| 错误最多 | `stats.total - stats.correct` (descending) |
| 最久未练 | `stats.lastPracticed` (ascending, nulls first) |
| 近期错误率高 | error rate over last 10 attempts (descending) |

Words with zero attempts are always included at the top for "最久未练".

### App.tsx view states

Add `'wordSelector'` to the view union type:
```typescript
type View = 'wordlists' | 'wordSelector' | 'study' | 'dictation'
```

Add `sessionConfig: SessionConfig | null` to App state, passed to `DictationView`.

---

## 5. Files Changed

| File | Change |
|---|---|
| `src/types/index.ts` | Add `SessionConfig` type |
| `src/App.tsx` | Add `wordSelector` view state + `sessionConfig` state; wire navigation |
| `src/components/WordListView.tsx` | "开始听写" navigates to `wordSelector` with grade context |
| `src/components/WordSelectorView.tsx` | New file — full word picker UI |
| `src/components/DictationView.tsx` | Accept `SessionConfig` prop; add word progress indicator |

---

## 6. Out of Scope

- Sub-batch navigation within a session (e.g., "10 at a time from 30 selected") — slider already handles session size
- Saving/resuming sessions across app restarts — records save per tap, session state is ephemeral
- Changes to StudyView, SearchModal, AddWordModal, EditWordModal, AddListModal
