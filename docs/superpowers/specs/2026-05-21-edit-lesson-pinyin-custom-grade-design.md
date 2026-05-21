# Design: Edit Lesson Words + Pinyin Display + Custom Grade Management

**Date:** 2026-05-21  
**Status:** Approved

---

## Overview

Three related features that extend the app's content management capabilities:

1. **Edit lesson words** — add/remove words from any lesson (preset or custom), edit word details including pinyin and optional example sentence
2. **Pinyin display** — show auto-generated pinyin (via `pinyin-pro`) across all word views, with manual override support
3. **Custom grade management** — create new grades (e.g. "P4", "初一") with custom lessons and words; support grade-wide dictation sessions

---

## 1. Data Model Changes

### 1a. New: `CustomGrade`

```typescript
// src/types/index.ts
interface CustomGrade {
  id: string;        // 'cgrade-<timestamp>'
  name: string;      // '小学四年级', 'P4', '初一语文', etc.
  subject: Subject;  // 'chinese' only for now
  createdAt: string;
}
```

### 1b. Extend: `CustomListMeta`

Add optional `gradeId` field (backward-compatible):

```typescript
interface CustomListMeta {
  id: string;
  name: string;
  subject: Subject;
  grade?: number;
  gradeId?: string;   // NEW — points to CustomGrade.id
  createdAt: string;
}
```

### 1c. New: Lesson-scoped word hiding

Separate from the existing global `hideWord` (which hides a word everywhere). Preset words removed from a specific lesson are hidden only in that lesson's context.

```typescript
// Storage key: 'dictation_lesson_hidden_v1'
// Structure: Record<listId, wordId[]>

hideWordFromLesson(listId: string, wordId: string): void
getHiddenWordsForLesson(listId: string): string[]
unhideWordFromLesson(listId: string, wordId: string): void
```

### 1d. New: `getDisplayPinyin` utility

```typescript
// src/utils/pinyin.ts (new file)
import { pinyin } from 'pinyin-pro';

export function getDisplayPinyin(text: string, storedPinyin?: string): string {
  if (storedPinyin) return storedPinyin;
  if (!text) return '';
  try {
    return pinyin(text, { toneType: 'symbol', separator: ' ' });
  } catch {
    return '';
  }
}
```

---

## 2. Feature 1: Edit Lesson Words

### Entry points

- **Preset lessons**: In `LessonSelectorView`, each lesson card gets a pencil icon (edit button) in the top-right corner.
- **Custom lessons**: Same pencil icon on custom lesson cards.

Tapping the pencil navigates to `LessonEditView` (new component).

### LessonEditView

File: `src/components/LessonEditView.tsx`

**Layout:**
```
Header: 「编辑《课名》」  + 完成 button
─────────────────────────────────────
Scrollable word list:
  [词语行]
    词语文字
    拼音（getDisplayPinyin, gray, small）
    例句（if set, truncated, gray）
    [× 删除]   [pencil 编辑]
─────────────────────────────────────
Bottom: [+ 添加词语] button
```

**Deleting a word:**
- Preset word in preset lesson → `hideWordFromLesson(listId, wordId)`
- Custom word in custom lesson → `deleteCustomWord(wordId)`
- Preset word in custom lesson → not possible (custom lessons only contain custom words)

**Editing a word:** Opens existing `EditWordModal`. The modal already supports editing text, pinyin, example, and example meaning.

**Example sentence audio ("试听"):** Add a speaker icon button next to the example sentence textarea in `EditWordModal`. Clicking it calls `window.speechSynthesis` with the current example text (same Web Speech API already used for word audio in `sound.ts`).

**Adding a word:** Opens `AddWordModal` (existing component). Changes:
- Example sentence field becomes **optional** (remove required validation)
- Pinyin field: auto-populated via `getDisplayPinyin` on text change, user can override
- Word is added to the current lesson's listId

### Applying lesson-hidden words

In `LessonSelectorView` and anywhere a lesson's words are loaded:

```typescript
function getLessonWords(list: WordList): Word[] {
  const hidden = new Set(getHiddenWordsForLesson(list.id));
  return applyOverridesAndFilter(list.words).filter(w => !hidden.has(w.id));
}
```

---

## 3. Feature 2: Pinyin Display

### Where pinyin appears

| Component | How | Condition |
|-----------|-----|-----------|
| `WordCard` | Small text above word, centered | Hidden in student mode |
| `WordSelectorView` word rows | Gray small text after word | Always |
| `LessonEditView` word rows | Gray small text below word | Always |
| `StudyView` / `StudyListView` | Below word, same style as WordCard | Always |

### Implementation

No changes to `Word` type needed — `pinyin` field already exists and is optional. All display sites call `getDisplayPinyin(word.text, word.pinyin)`.

### Manual override flow

User taps pencil on a word → `EditWordModal` opens → pinyin field pre-filled by `getDisplayPinyin` → user edits → saved via `saveWordOverride` (preset) or `updateCustomWord` (custom). Next render picks up the stored value.

---

## 4. Feature 3: Custom Grade Management

### Storage

New storage functions in `storage.ts`:

```typescript
const CUSTOM_GRADES_KEY = 'dictation_custom_grades_v1';

getCustomGrades(): CustomGrade[]
addCustomGrade(name: string): CustomGrade
deleteCustomGrade(id: string): void   // also deletes its lessons and words
updateCustomGrade(id: string, name: string): void

// Existing addCustomList gains optional gradeId param:
addCustomList(name: string, subject: Subject, grade?: number, gradeId?: string): CustomListMeta
// getCustomLists gains optional gradeId filter:
getCustomListsForGrade(gradeId: string): CustomListMeta[]
```

### UI: WordListView changes

Below the existing dictation entry buttons, add a **「自定义年级」** section:

```
自定义年级
┌──────────────┐  ┌──────────────┐  ┌──────────┐
│  小学四年级   │  │   初一语文    │  │  + 新建  │
└──────────────┘  └──────────────┘  └──────────┘

[展开选中年级后]
  课程列表:
    第1课：出行词语 (8词)  [听写] [编辑] [删除课]
    第2课：节日词语 (10词) [听写] [编辑] [删除课]
    [整年级听写]  [+ 新建课]
  [删除年级]
```

**New grade flow:**
1. Tap「+ 新建」→ input sheet: 年级名称
2. On confirm → `addCustomGrade(name)` → expand the new grade → show empty course list

**New lesson flow:**
1. Tap「+ 新建课」→ input sheet: 课名
2. On confirm → `addCustomList(name, 'chinese', undefined, gradeId)` → navigate to `LessonEditView` for the new (empty) lesson

**Dictation from custom grade:**
- Single lesson → navigate to `WordSelectorView` with that lesson's words (existing flow)
- Whole grade → navigate to `WordSelectorView` with all words from all lessons in that grade (grade label shown as the custom grade name)

### No impact on preset grades

Preset grades (五年级, 六年级) are unchanged. The custom grade UI is a separate section below.

---

## 5. Navigation Changes

### New view: `LessonEditView`

Add `'lessonEdit'` to `ViewMode`:

```typescript
export type ViewMode = 'wordlists' | 'lessonSelector' | 'lessonEdit' | 'wordSelector' | 'dictation' | 'study' | 'studyList';
```

State needed in `App.tsx`:
```typescript
const [editingListId, setEditingListId] = useState<string | null>(null);
```

Navigation: `LessonSelectorView` and `WordListView` call `onEditLesson(listId)` → App sets `editingListId` and `view = 'lessonEdit'`.

---

## 6. What Does Not Change

- `DictationView` — unchanged
- `WordSelectorView` — pinyin display added to word rows, no logic changes
- `StudyView` / `StudyListView` — pinyin display added, no logic changes
- `sound.ts` — unchanged (example sentence audio reuses existing `speak()` call pattern)
- All existing custom list/word storage keys — backward-compatible
- Preset word data in `wordLists.ts` — unchanged

---

## 7. File Summary

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `CustomGrade`, `gradeId` to `CustomListMeta`, add `'lessonEdit'` to `ViewMode` |
| `src/utils/pinyin.ts` | New — `getDisplayPinyin` |
| `src/utils/storage.ts` | Add `CustomGrade` CRUD, `hideWordFromLesson`/`getHiddenWordsForLesson`, extend `addCustomList`/`getCustomLists` |
| `src/components/LessonEditView.tsx` | New — edit lesson words UI |
| `src/components/EditWordModal.tsx` | Add 试听 button for example sentence |
| `src/components/AddWordModal.tsx` | Make example optional, add pinyin auto-fill |
| `src/components/WordCard.tsx` | Add pinyin display (hidden in student mode) |
| `src/components/WordSelectorView.tsx` | Add pinyin to word rows |
| `src/components/LessonSelectorView.tsx` | Add edit pencil per lesson |
| `src/components/WordListView.tsx` | Add custom grade section |
| `src/App.tsx` | Handle `lessonEdit` view, custom grade dictation routing |
