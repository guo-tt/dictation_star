# Edit Lesson Words + Pinyin Display + Custom Grade Management — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add lesson word editing (add/remove/edit), pinyin display via pinyin-pro, and a custom grade/lesson/word management system.

**Architecture:** Layered bottom-up — types first, then storage, then utility, then components, then wiring. Each task is independently testable or visually verifiable before moving on.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, `pinyin-pro` (already installed), Vitest, localStorage for persistence.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/types/index.ts` | Modify | Add `CustomGrade`, `gradeId` on `CustomListMeta`, `'lessonEdit'` in `ViewMode` |
| `src/utils/storage.ts` | Modify | Add CustomGrade CRUD, lesson-scoped word hiding |
| `src/utils/storage.test.ts` | Create | Tests for new storage functions |
| `src/utils/pinyin.ts` | Create | `getDisplayPinyin` utility |
| `src/utils/pinyin.test.ts` | Create | Tests for pinyin utility |
| `src/components/LessonEditView.tsx` | Create | UI for editing a lesson's words |
| `src/components/EditWordModal.tsx` | Modify | Add 试听 (preview audio) button for example sentence |
| `src/components/AddWordModal.tsx` | Modify | Allow empty example sentence |
| `src/components/WordCard.tsx` | Modify | Show pinyin via `getDisplayPinyin`; guard empty example |
| `src/components/WordSelectorView.tsx` | Modify | Show pinyin in word rows |
| `src/components/LessonSelectorView.tsx` | Modify | Add edit pencil per lesson card; accept `onEditLesson` prop |
| `src/components/WordListView.tsx` | Modify | Add custom grade management section |
| `src/App.tsx` | Modify | Wire `lessonEdit` view, custom grade dictation routing |

---

## Task 1: Types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add `CustomGrade` interface and extend `CustomListMeta` and `ViewMode`**

Open `src/types/index.ts`. Make these changes:

```typescript
// Change ViewMode to include 'lessonEdit':
export type ViewMode = 'wordlists' | 'lessonSelector' | 'lessonEdit' | 'wordSelector' | 'dictation' | 'study' | 'studyList';

// Add CustomGrade interface (after CustomListMeta):
export interface CustomGrade {
  id: string;       // 'cgrade-<timestamp>'
  name: string;     // e.g. '小学四年级', 'P4', '初一'
  subject: Subject; // 'chinese' only for now
  createdAt: string;
}

// Extend CustomListMeta — add gradeId field:
export interface CustomListMeta {
  id: string;
  name: string;
  subject: Subject;
  grade?: number;
  gradeId?: string;   // ← NEW: points to CustomGrade.id
  createdAt: string;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/guotiantian/Documents/project/dictation_star && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors (or only pre-existing errors unrelated to these types).

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add CustomGrade type, gradeId on CustomListMeta, lessonEdit ViewMode"
```

---

## Task 2: Storage — CustomGrade CRUD + lesson-scoped word hiding

**Files:**
- Modify: `src/utils/storage.ts`
- Create: `src/utils/storage.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/utils/storage.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getCustomGrades, addCustomGrade, deleteCustomGrade, updateCustomGrade,
  hideWordFromLesson, getHiddenWordsForLesson, unhideWordFromLesson,
  addCustomList, getCustomListsForGrade,
} from './storage';

beforeEach(() => {
  localStorage.clear();
});

describe('CustomGrade CRUD', () => {
  it('starts empty', () => {
    expect(getCustomGrades()).toEqual([]);
  });

  it('adds a grade', () => {
    const grade = addCustomGrade('P4', 'chinese');
    expect(grade.name).toBe('P4');
    expect(grade.subject).toBe('chinese');
    expect(grade.id).toMatch(/^cgrade-/);
    expect(getCustomGrades()).toHaveLength(1);
  });

  it('deletes a grade and its lessons', () => {
    const grade = addCustomGrade('P4', 'chinese');
    addCustomList('第1课', 'chinese', undefined, grade.id);
    deleteCustomGrade(grade.id);
    expect(getCustomGrades()).toHaveLength(0);
    expect(getCustomListsForGrade(grade.id)).toHaveLength(0);
  });

  it('updates grade name', () => {
    const grade = addCustomGrade('P4', 'chinese');
    updateCustomGrade(grade.id, '小学四年级');
    expect(getCustomGrades()[0].name).toBe('小学四年级');
  });
});

describe('getCustomListsForGrade', () => {
  it('returns only lists for the given gradeId', () => {
    const g1 = addCustomGrade('P4', 'chinese');
    const g2 = addCustomGrade('P5', 'chinese');
    addCustomList('课A', 'chinese', undefined, g1.id);
    addCustomList('课B', 'chinese', undefined, g2.id);
    expect(getCustomListsForGrade(g1.id)).toHaveLength(1);
    expect(getCustomListsForGrade(g1.id)[0].name).toBe('课A');
  });
});

describe('lesson-scoped word hiding', () => {
  it('starts with no hidden words', () => {
    expect(getHiddenWordsForLesson('list-1')).toEqual([]);
  });

  it('hides a word from a specific lesson', () => {
    hideWordFromLesson('list-1', 'word-1');
    expect(getHiddenWordsForLesson('list-1')).toContain('word-1');
    expect(getHiddenWordsForLesson('list-2')).not.toContain('word-1');
  });

  it('unhides a word', () => {
    hideWordFromLesson('list-1', 'word-1');
    unhideWordFromLesson('list-1', 'word-1');
    expect(getHiddenWordsForLesson('list-1')).not.toContain('word-1');
  });

  it('does not duplicate hidden entries', () => {
    hideWordFromLesson('list-1', 'word-1');
    hideWordFromLesson('list-1', 'word-1');
    expect(getHiddenWordsForLesson('list-1').filter(id => id === 'word-1')).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run tests — expect failures**

```bash
cd /Users/guotiantian/Documents/project/dictation_star && npm test -- storage.test 2>&1 | tail -20
```

Expected: failures like "getCustomGrades is not a function".

- [ ] **Step 3: Add CustomGrade storage functions to `src/utils/storage.ts`**

Add at the bottom of `src/utils/storage.ts`:

```typescript
// ── custom grades ─────────────────────────────────────────────────────────────

import type { CustomGrade } from '../types';

const CUSTOM_GRADES_KEY = 'dictation_custom_grades_v1';
const LESSON_HIDDEN_KEY = 'dictation_lesson_hidden_v1';

export function getCustomGrades(): CustomGrade[] {
  try { return JSON.parse(localStorage.getItem(CUSTOM_GRADES_KEY) || '[]'); }
  catch { return []; }
}

export function addCustomGrade(name: string, subject: Subject): CustomGrade {
  const grades = getCustomGrades();
  const grade: CustomGrade = {
    id: `cgrade-${Date.now()}`,
    name: name.trim(),
    subject,
    createdAt: new Date().toISOString(),
  };
  grades.push(grade);
  localStorage.setItem(CUSTOM_GRADES_KEY, JSON.stringify(grades));
  return grade;
}

export function deleteCustomGrade(id: string): void {
  const grades = getCustomGrades().filter(g => g.id !== id);
  localStorage.setItem(CUSTOM_GRADES_KEY, JSON.stringify(grades));
  // Also delete all lessons belonging to this grade
  const lists = getCustomLists().filter(l => l.gradeId !== id);
  localStorage.setItem(CUSTOM_LISTS_KEY, JSON.stringify(lists));
  // Also delete all words in those orphaned lessons
  const remainingListIds = new Set(lists.map(l => l.id));
  const words = loadCustomEntries().filter(e => remainingListIds.has(e.listId));
  saveCustomEntries(words);
}

export function updateCustomGrade(id: string, name: string): void {
  const grades = getCustomGrades().map(g =>
    g.id === id ? { ...g, name: name.trim() } : g,
  );
  localStorage.setItem(CUSTOM_GRADES_KEY, JSON.stringify(grades));
}

export function getCustomListsForGrade(gradeId: string): CustomListMeta[] {
  return getCustomLists().filter(l => l.gradeId === gradeId);
}

// ── lesson-scoped word hiding ──────────────────────────────────────────────────

export function getHiddenWordsForLesson(listId: string): string[] {
  try {
    const all: Record<string, string[]> = JSON.parse(localStorage.getItem(LESSON_HIDDEN_KEY) || '{}');
    return all[listId] ?? [];
  } catch { return []; }
}

export function hideWordFromLesson(listId: string, wordId: string): void {
  const all: Record<string, string[]> = (() => {
    try { return JSON.parse(localStorage.getItem(LESSON_HIDDEN_KEY) || '{}'); }
    catch { return {}; }
  })();
  const current = all[listId] ?? [];
  if (!current.includes(wordId)) {
    all[listId] = [...current, wordId];
    localStorage.setItem(LESSON_HIDDEN_KEY, JSON.stringify(all));
  }
}

export function unhideWordFromLesson(listId: string, wordId: string): void {
  const all: Record<string, string[]> = (() => {
    try { return JSON.parse(localStorage.getItem(LESSON_HIDDEN_KEY) || '{}'); }
    catch { return {}; }
  })();
  all[listId] = (all[listId] ?? []).filter(id => id !== wordId);
  localStorage.setItem(LESSON_HIDDEN_KEY, JSON.stringify(all));
}
```

Also update `addCustomList` signature to accept optional `gradeId`:

```typescript
export function addCustomList(name: string, subject: Subject, grade?: number, gradeId?: string): CustomListMeta {
  const all = getCustomLists();
  const entry: CustomListMeta = {
    id: `clist-${Date.now()}`,
    name: name.trim(),
    subject,
    grade,
    gradeId,
    createdAt: new Date().toISOString(),
  };
  all.push(entry);
  localStorage.setItem(CUSTOM_LISTS_KEY, JSON.stringify(all));
  return entry;
}
```

- [ ] **Step 4: Fix the import — `CustomGrade` is already in types, remove the inline import and use the existing import at top of storage.ts**

The file already imports from `'../types'`. Add `CustomGrade` to that import:

```typescript
import { WordRecord, CustomWordEntry, CustomListMeta, CustomGrade, Word, Subject } from '../types';
```

Remove the `import type { CustomGrade }` line added in step 3.

- [ ] **Step 5: Run tests — expect passing**

```bash
cd /Users/guotiantian/Documents/project/dictation_star && npm test -- storage.test 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/utils/storage.ts src/utils/storage.test.ts
git commit -m "feat: add CustomGrade CRUD and lesson-scoped word hiding to storage"
```

---

## Task 3: Pinyin utility

**Files:**
- Create: `src/utils/pinyin.ts`
- Create: `src/utils/pinyin.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/utils/pinyin.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { getDisplayPinyin } from './pinyin';

describe('getDisplayPinyin', () => {
  it('returns stored pinyin when provided', () => {
    expect(getDisplayPinyin('齐心协力', 'qí xīn xié lì')).toBe('qí xīn xié lì');
  });

  it('auto-generates pinyin when no stored value', () => {
    const result = getDisplayPinyin('你好');
    expect(result).toBeTruthy();
    expect(result).toContain('nǐ');
  });

  it('returns empty string for empty text', () => {
    expect(getDisplayPinyin('')).toBe('');
  });

  it('stored pinyin takes priority over auto-generated', () => {
    expect(getDisplayPinyin('长大', 'zhǎng dà')).toBe('zhǎng dà');
  });
});
```

- [ ] **Step 2: Run test — expect failure**

```bash
cd /Users/guotiantian/Documents/project/dictation_star && npm test -- pinyin.test 2>&1 | tail -10
```

Expected: FAIL — "Cannot find module './pinyin'".

- [ ] **Step 3: Create `src/utils/pinyin.ts`**

```typescript
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

- [ ] **Step 4: Run test — expect passing**

```bash
cd /Users/guotiantian/Documents/project/dictation_star && npm test -- pinyin.test 2>&1 | tail -10
```

Expected: all 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/utils/pinyin.ts src/utils/pinyin.test.ts
git commit -m "feat: add getDisplayPinyin utility with pinyin-pro fallback"
```

---

## Task 4: EditWordModal — 试听 button for example sentence

**Files:**
- Modify: `src/components/EditWordModal.tsx`

- [ ] **Step 1: Add a speak helper and 试听 button**

In `src/components/EditWordModal.tsx`, add a `speak` helper after the `autoPinyin` function (line 17):

```typescript
function speakText(text: string) {
  if (!text || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'zh-CN';
  utter.rate = 0.8;
  window.speechSynthesis.speak(utter);
}
```

Then in the JSX, change the 例句 label row to include the 试听 button. Replace this block:

```typescript
          <div>
            <label className="block text-sm font-semibold text-stone-600 mb-1">例句</label>
            <textarea
```

with:

```typescript
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-semibold text-stone-600">例句 <span className="font-normal text-stone-400">（可选）</span></label>
              {example.trim() && (
                <button
                  type="button"
                  onClick={() => speakText(example)}
                  className="text-xs text-[#8090C0] hover:text-[#5868A8] flex items-center gap-1"
                >
                  ▶ 试听
                </button>
              )}
            </div>
            <textarea
```

- [ ] **Step 2: Make example not required in the save handler**

In `EditWordModal.tsx`, the `handleSubmit` already does `example: example.trim() || text.trim()` — change this so an empty example saves as empty string (not falling back to word text):

```typescript
    const updates: Partial<Word> = {
      text: text.trim(),
      example: example.trim(),
      pinyin: isChinese ? pinyinVal.trim() || undefined : undefined,
      exampleMeaning: exampleMeaning.trim() || undefined,
    };
```

- [ ] **Step 3: Visually verify**

Run dev server:
```bash
cd /Users/guotiantian/Documents/project/dictation_star && npm run dev
```
Open app → tap any word's edit button → confirm 试听 button appears next to 例句 label when text is in the textarea → tapping it plays the audio.

- [ ] **Step 4: Commit**

```bash
git add src/components/EditWordModal.tsx
git commit -m "feat: add 试听 preview button for example sentence in EditWordModal"
```

---

## Task 5: AddWordModal — allow empty example

**Files:**
- Modify: `src/components/AddWordModal.tsx`

- [ ] **Step 1: Allow empty example in parsed items**

In `src/components/AddWordModal.tsx`, find line:

```typescript
        example: idx === -1 ? '' : line.slice(idx + 1).trim(),
```

This is already correct. But the word creation uses `example: item.example || item.text` (line 113). Change it to allow empty:

```typescript
        example: item.example,
```

- [ ] **Step 2: Remove "无例句" amber warning** (keep it clean — empty is fine now)

Find the preview block that shows `（无例句）`:

```typescript
                        {match.type === 'none' && !item.example && !isSentenceMode && (
                          <span className="text-amber-400 text-xs ml-1.5">（无例句）</span>
                        )}
```

Remove this block entirely.

- [ ] **Step 3: Commit**

```bash
git add src/components/AddWordModal.tsx
git commit -m "feat: make example sentence optional in AddWordModal"
```

---

## Task 6: WordCard — pinyin display + guard empty example

**Files:**
- Modify: `src/components/WordCard.tsx`

- [ ] **Step 1: Import `getDisplayPinyin`**

Add to the imports at the top of `src/components/WordCard.tsx`:

```typescript
import { getDisplayPinyin } from '../utils/pinyin';
```

- [ ] **Step 2: Show auto-generated pinyin when `word.pinyin` is absent**

Find this block (around line 126):

```typescript
                  {localWord.pinyin && (
                    <div className="text-sm text-stone-400 mt-0.5 font-medium">{localWord.pinyin}</div>
                  )}
```

Replace with:

```typescript
                  {showText && (
                    <div className="text-sm text-stone-400 mt-0.5 font-medium">
                      {getDisplayPinyin(localWord.text, localWord.pinyin)}
                    </div>
                  )}
```

(Pinyin is hidden in student mode because `showText` is `false` when `dictationMode === 'student'` and not revealed.)

- [ ] **Step 3: Guard empty example in playExample and "例句" button**

Find `function playExample() { speak(localWord.example, lang); }` (line 64) and change to:

```typescript
  function playExample() {
    if (localWord.example) speak(localWord.example, lang);
  }
```

Find the 例句 button (around line 206) and wrap it conditionally:

```typescript
          {localWord.example && (
            <button
              onClick={playExample}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-600 hover:bg-stone-700 active:bg-stone-800 text-white text-sm font-medium transition-colors shadow-sm"
            >
              <BookOpen size={16} />
              <span>例句</span>
            </button>
          )}
```

- [ ] **Step 4: Visually verify**

With dev server running, open the app → go to dictation view. Confirm:
- Pinyin appears above each word in parent mode
- Pinyin is hidden in student mode (before reveal)
- "例句" button is absent for words with empty example

- [ ] **Step 5: Commit**

```bash
git add src/components/WordCard.tsx
git commit -m "feat: show pinyin in WordCard via getDisplayPinyin, guard empty example"
```

---

## Task 7: WordSelectorView — pinyin in word rows

**Files:**
- Modify: `src/components/WordSelectorView.tsx`

- [ ] **Step 1: Import `getDisplayPinyin`**

Add to imports in `src/components/WordSelectorView.tsx`:

```typescript
import { getDisplayPinyin } from '../utils/pinyin';
```

- [ ] **Step 2: Find where word rows are rendered**

Search for the word text display in the scrollable list. Look for where `w.text` is rendered in the word rows (typically inside a `map` over `displayWords`). It will look something like:

```typescript
<span className="... font-semibold">{w.text}</span>
```

After the word text span, add a pinyin line:

```typescript
<span className="text-xs text-stone-400 ml-1">{getDisplayPinyin(w.text, w.pinyin)}</span>
```

(Add this inline after the word text in the same row, or on a new `<div>` below — match the existing row layout.)

- [ ] **Step 3: Visually verify**

Open WordSelectorView — confirm pinyin appears next to each word in the selection list.

- [ ] **Step 4: Commit**

```bash
git add src/components/WordSelectorView.tsx
git commit -m "feat: show pinyin in WordSelectorView word rows"
```

---

## Task 8: LessonEditView — new component

**Files:**
- Create: `src/components/LessonEditView.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/LessonEditView.tsx`:

```typescript
import { useState, useMemo } from 'react';
import { Pencil, X, Plus, Volume2 } from 'lucide-react';
import { Word, WordList } from '../types';
import { presetWordLists } from '../data/wordLists';
import {
  getCustomWordsForList,
  applyOverridesAndFilter,
  getHiddenWordsForLesson,
  hideWordFromLesson,
  unhideWordFromLesson,
  deleteCustomWord,
  addCustomWord,
} from '../utils/storage';
import { getDisplayPinyin } from '../utils/pinyin';
import EditWordModal from './EditWordModal';

interface LessonEditViewProps {
  listId: string;
  onBack: () => void;
}

function speakText(text: string) {
  if (!text || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'zh-CN';
  utter.rate = 0.8;
  window.speechSynthesis.speak(utter);
}

export default function LessonEditView({ listId, onBack }: LessonEditViewProps) {
  const [version, setVersion] = useState(0);
  const [editingWord, setEditingWord] = useState<Word | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addText, setAddText] = useState('');
  const [addExample, setAddExample] = useState('');
  const [addError, setAddError] = useState('');

  const presetList: WordList | undefined = useMemo(
    () => presetWordLists.find(l => l.id === listId),
    [listId],
  );
  const isPreset = Boolean(presetList);

  const words = useMemo(() => {
    const hidden = new Set(getHiddenWordsForLesson(listId));
    if (isPreset && presetList) {
      return applyOverridesAndFilter(presetList.words).filter(w => !hidden.has(w.id));
    }
    return getCustomWordsForList(listId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listId, isPreset, presetList, version]);

  const lessonName = presetList
    ? `${presetList.name}${presetList.lessonTitle ?? ''}`
    : (() => {
        try {
          const { getCustomLists } = require('../utils/storage');
          return getCustomLists().find((l: { id: string; name: string }) => l.id === listId)?.name ?? '自定义课';
        } catch { return '自定义课'; }
      })();

  function handleDelete(word: Word) {
    if (isPreset) {
      hideWordFromLesson(listId, word.id);
    } else {
      deleteCustomWord(word.id);
    }
    setVersion(v => v + 1);
  }

  function handleRestore(word: Word) {
    unhideWordFromLesson(listId, word.id);
    setVersion(v => v + 1);
  }

  function handleAddWord() {
    if (!addText.trim()) { setAddError('请输入词语'); return; }
    const word: Word = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      text: addText.trim(),
      pinyin: undefined,
      example: addExample.trim(),
      wordType: addText.trim().length === 1 ? 'char' : 'word',
      isCustom: true,
    };
    addCustomWord(word, listId, 'chinese');
    setAddText('');
    setAddExample('');
    setAddError('');
    setShowAddForm(false);
    setVersion(v => v + 1);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Word list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
        {words.length === 0 && (
          <div className="text-center py-12 text-stone-400 text-sm">
            暂无词语，点击下方「添加词语」开始
          </div>
        )}
        {words.map(word => (
          <div
            key={word.id}
            className="flex items-center gap-3 p-3 bg-white rounded-2xl border-2 border-stone-200"
          >
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-stone-800 text-base">{word.text}</div>
              <div className="text-xs text-stone-400 mt-0.5">
                {getDisplayPinyin(word.text, word.pinyin)}
              </div>
              {word.example && (
                <div className="text-xs text-stone-500 mt-1 italic truncate">
                  例：{word.example}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {word.example && (
                <button
                  onClick={() => speakText(word.example)}
                  className="p-2 rounded-xl bg-stone-50 border border-stone-200 text-stone-400 hover:text-stone-600"
                  aria-label="朗读例句"
                >
                  <Volume2 size={14} />
                </button>
              )}
              <button
                onClick={() => setEditingWord(word)}
                className="p-2 rounded-xl bg-stone-50 border border-stone-200 text-stone-400 hover:text-[#8090C0]"
                aria-label="编辑"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => handleDelete(word)}
                className="p-2 rounded-xl bg-stone-50 border border-stone-200 text-stone-400 hover:text-red-400"
                aria-label="删除"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ))}

        {/* Add word inline form */}
        {showAddForm && (
          <div className="p-4 bg-[#F0F2FB] rounded-2xl border-2 border-[#B0BCDC] flex flex-col gap-3">
            <input
              autoFocus
              type="text"
              placeholder="词语（必填）"
              value={addText}
              onChange={e => { setAddText(e.target.value); setAddError(''); }}
              className="w-full border-2 border-stone-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 ring-[#8090C0] focus:border-transparent"
            />
            <input
              type="text"
              placeholder="例句（可选）"
              value={addExample}
              onChange={e => setAddExample(e.target.value)}
              className="w-full border-2 border-stone-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 ring-[#8090C0] focus:border-transparent"
            />
            {addError && <p className="text-red-500 text-xs">{addError}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => { setShowAddForm(false); setAddText(''); setAddExample(''); setAddError(''); }}
                className="flex-1 py-2 rounded-xl border-2 border-stone-200 text-stone-600 text-sm font-semibold"
              >
                取消
              </button>
              <button
                onClick={handleAddWord}
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-[#7888C8] to-[#A8B8DC] text-white text-sm font-bold"
              >
                确认添加
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      {!showAddForm && (
        <div className="px-4 py-3 border-t border-stone-100 bg-white">
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-[#7888C8] to-[#A8B8DC] text-white font-bold text-sm"
          >
            <Plus size={18} />
            添加词语
          </button>
        </div>
      )}

      {/* Edit word modal */}
      {editingWord && (
        <EditWordModal
          word={editingWord}
          subject="chinese"
          onClose={() => setEditingWord(null)}
          onSaved={() => { setEditingWord(null); setVersion(v => v + 1); }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Fix the dynamic require — use proper import**

The `lessonName` calculation uses a dynamic `require` which won't work in Vite. Replace it with a proper approach. Add `getCustomLists` to the storage import at the top, then compute `lessonName` differently:

```typescript
import {
  getCustomWordsForList,
  applyOverridesAndFilter,
  getHiddenWordsForLesson,
  hideWordFromLesson,
  unhideWordFromLesson,
  deleteCustomWord,
  addCustomWord,
  getCustomLists,
} from '../utils/storage';

// Then in the component:
  const customListName = useMemo(
    () => getCustomLists().find(l => l.id === listId)?.name ?? '自定义课',
    [listId],
  );
  const lessonName = presetList
    ? `${presetList.name}${presetList.lessonTitle ?? ''}`
    : customListName;
```

Remove the inline `require` in the original `lessonName` assignment.

- [ ] **Step 3: Commit**

```bash
git add src/components/LessonEditView.tsx
git commit -m "feat: add LessonEditView component for editing lesson words"
```

---

## Task 9: LessonSelectorView — edit pencil per lesson

**Files:**
- Modify: `src/components/LessonSelectorView.tsx`

- [ ] **Step 1: Add `onEditLesson` prop and pencil icon**

In `src/components/LessonSelectorView.tsx`, update the props interface:

```typescript
import { Pencil } from 'lucide-react';

interface LessonSelectorViewProps {
  onSelectLesson: (lessonId: string) => void;
  onEditLesson: (lessonId: string) => void;
}
```

Update the component signature:

```typescript
export default function LessonSelectorView({ onSelectLesson, onEditLesson }: LessonSelectorViewProps) {
```

In the lesson card, wrap the existing `<button>` in a container div so we can add the pencil alongside it. Replace the existing:

```typescript
            <button
              key={list.id}
              onClick={() => onSelectLesson(list.id)}
              className="w-full rounded-2xl p-4 text-left border-2 border-stone-200 bg-white active:scale-[0.98] transition"
            >
```

with a flex container:

```typescript
            <div key={list.id} className="flex items-stretch gap-2">
              <button
                onClick={() => onSelectLesson(list.id)}
                className="flex-1 rounded-2xl p-4 text-left border-2 border-stone-200 bg-white active:scale-[0.98] transition"
              >
```

And close the outer div after the closing `</button>`, adding the pencil button before it:

```typescript
              </button>
              <button
                onClick={() => onEditLesson(list.id)}
                className="px-3 rounded-2xl border-2 border-stone-200 bg-white text-stone-400 hover:text-[#8090C0] hover:border-[#B0BCDC] transition flex items-center"
                aria-label="编辑课词"
              >
                <Pencil size={16} />
              </button>
            </div>
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/guotiantian/Documents/project/dictation_star && npx tsc --noEmit 2>&1 | grep -i "lessonSelector\|onEditLesson" | head -10
```

Expected: no errors on these lines (App.tsx will show an error until Task 11).

- [ ] **Step 3: Commit**

```bash
git add src/components/LessonSelectorView.tsx
git commit -m "feat: add edit pencil button to each lesson card in LessonSelectorView"
```

---

## Task 10: WordListView — custom grade management section

**Files:**
- Modify: `src/components/WordListView.tsx`

- [ ] **Step 1: Add props for grade management and import storage functions**

Update `src/components/WordListView.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { Plus, ChevronDown, ChevronRight, Pencil, Trash2, BookOpen } from 'lucide-react';
import { DictationMode, GradeFilter, CustomGrade, CustomListMeta } from '../types';
import {
  getCustomGrades, addCustomGrade, deleteCustomGrade, updateCustomGrade,
  addCustomList, getCustomListsForGrade, deleteCustomList,
} from '../utils/storage';
```

Add new callback props to the interface:

```typescript
interface WordListViewProps {
  onOpenMixedSelector: (grade: GradeFilter, mode: DictationMode) => void;
  onOpenLessonSelector: (mode: DictationMode) => void;
  onOpenStudyGrade: (grade: GradeFilter) => void;
  onOpenStudyLessonSelector: () => void;
  onEditLesson: (listId: string) => void;
  onStartCustomLesson: (listId: string, lessonName: string, mode: DictationMode) => void;
  onStartGradeDictation: (gradeId: string, gradeName: string, mode: DictationMode) => void;
}
```

Update the component signature to accept these props.

- [ ] **Step 2: Add custom grade state and helpers**

Inside the `WordListView` component, add:

```typescript
  const [grades, setGrades] = useState<CustomGrade[]>(() => getCustomGrades());
  const [expandedGradeId, setExpandedGradeId] = useState<string | null>(null);
  const [gradeLessons, setGradeLessons] = useState<CustomListMeta[]>([]);
  const [newGradeName, setNewGradeName] = useState('');
  const [showNewGradeInput, setShowNewGradeInput] = useState(false);
  const [newLessonName, setNewLessonName] = useState('');
  const [showNewLessonInput, setShowNewLessonInput] = useState(false);

  useEffect(() => {
    if (expandedGradeId) {
      setGradeLessons(getCustomListsForGrade(expandedGradeId));
    }
  }, [expandedGradeId]);

  function handleAddGrade() {
    if (!newGradeName.trim()) return;
    const grade = addCustomGrade(newGradeName.trim(), 'chinese');
    setGrades(getCustomGrades());
    setNewGradeName('');
    setShowNewGradeInput(false);
    setExpandedGradeId(grade.id);
    setGradeLessons([]);
  }

  function handleDeleteGrade(id: string) {
    deleteCustomGrade(id);
    setGrades(getCustomGrades());
    if (expandedGradeId === id) setExpandedGradeId(null);
  }

  function handleAddLesson() {
    if (!newLessonName.trim() || !expandedGradeId) return;
    const list = addCustomList(newLessonName.trim(), 'chinese', undefined, expandedGradeId);
    setGradeLessons(getCustomListsForGrade(expandedGradeId));
    setNewLessonName('');
    setShowNewLessonInput(false);
    onEditLesson(list.id);
  }

  function handleDeleteLesson(listId: string) {
    deleteCustomList(listId);
    if (expandedGradeId) setGradeLessons(getCustomListsForGrade(expandedGradeId));
  }
```

- [ ] **Step 3: Add custom grade section JSX**

At the bottom of the main `return` JSX (still inside the dictation tab block, after the existing grade buttons), add:

```typescript
          {/* Custom grade section */}
          <div className="mt-2">
            <div className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">自定义年级</div>

            {/* Grade chips */}
            <div className="flex flex-wrap gap-2 mb-2">
              {grades.map(g => (
                <div key={g.id} className="flex items-center gap-1">
                  <button
                    onClick={() => setExpandedGradeId(expandedGradeId === g.id ? null : g.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold border-2 transition ${
                      expandedGradeId === g.id
                        ? 'bg-[#F0F2FB] border-[#B0BCDC] text-[#5868A8]'
                        : 'bg-white border-stone-200 text-stone-600'
                    }`}
                  >
                    {g.name}
                    {expandedGradeId === g.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                  <button
                    onClick={() => handleDeleteGrade(g.id)}
                    className="p-1 text-stone-300 hover:text-red-400 transition"
                    aria-label="删除年级"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}

              {showNewGradeInput ? (
                <div className="flex items-center gap-1">
                  <input
                    autoFocus
                    type="text"
                    value={newGradeName}
                    onChange={e => setNewGradeName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddGrade(); if (e.key === 'Escape') setShowNewGradeInput(false); }}
                    placeholder="年级名称"
                    className="border-2 border-[#B0BCDC] rounded-xl px-2 py-1 text-sm w-28 outline-none focus:ring-2 ring-[#8090C0]"
                  />
                  <button onClick={handleAddGrade} className="px-2 py-1 rounded-lg bg-[#8090C0] text-white text-sm font-bold">确定</button>
                  <button onClick={() => { setShowNewGradeInput(false); setNewGradeName(''); }} className="px-2 py-1 rounded-lg bg-stone-100 text-stone-600 text-sm">取消</button>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewGradeInput(true)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl border-2 border-dashed border-stone-300 text-stone-400 text-sm hover:border-[#B0BCDC] hover:text-[#8090C0] transition"
                >
                  <Plus size={14} /> 新建年级
                </button>
              )}
            </div>

            {/* Expanded grade: lesson list */}
            {expandedGradeId && (
              <div className="bg-white rounded-2xl border-2 border-[#E0E4F0] p-3 flex flex-col gap-2">
                {gradeLessons.length === 0 && !showNewLessonInput && (
                  <div className="text-sm text-stone-400 text-center py-2">暂无课程</div>
                )}
                {gradeLessons.map(lesson => (
                  <div key={lesson.id} className="flex items-center gap-2">
                    <button
                      onClick={() => onStartCustomLesson(lesson.id, lesson.name, dictationMode)}
                      className="flex-1 text-left px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-sm font-medium text-stone-700 hover:bg-[#F0F2FB] transition"
                    >
                      {lesson.name}
                    </button>
                    <button
                      onClick={() => onEditLesson(lesson.id)}
                      className="p-2 rounded-xl border border-stone-200 text-stone-400 hover:text-[#8090C0] transition"
                      aria-label="编辑"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteLesson(lesson.id)}
                      className="p-2 rounded-xl border border-stone-200 text-stone-400 hover:text-red-400 transition"
                      aria-label="删除课"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}

                {showNewLessonInput ? (
                  <div className="flex items-center gap-1">
                    <input
                      autoFocus
                      type="text"
                      value={newLessonName}
                      onChange={e => setNewLessonName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddLesson(); if (e.key === 'Escape') setShowNewLessonInput(false); }}
                      placeholder="课名"
                      className="flex-1 border-2 border-[#B0BCDC] rounded-xl px-2 py-1.5 text-sm outline-none focus:ring-2 ring-[#8090C0]"
                    />
                    <button onClick={handleAddLesson} className="px-2 py-1.5 rounded-lg bg-[#8090C0] text-white text-sm font-bold">确定</button>
                    <button onClick={() => { setShowNewLessonInput(false); setNewLessonName(''); }} className="px-2 py-1.5 rounded-lg bg-stone-100 text-stone-600 text-sm">取消</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowNewLessonInput(true)}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-xl border-2 border-dashed border-stone-300 text-stone-400 text-sm hover:border-[#B0BCDC] hover:text-[#8090C0] transition"
                  >
                    <Plus size={14} /> 新建课
                  </button>
                )}

                {/* Whole-grade dictation */}
                {gradeLessons.length > 0 && (
                  <button
                    onClick={() => {
                      const gradeName = grades.find(g => g.id === expandedGradeId)?.name ?? '';
                      onStartGradeDictation(expandedGradeId, gradeName, dictationMode);
                    }}
                    className="mt-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#F0F2FB] border-2 border-[#B0BCDC] text-[#5868A8] text-sm font-semibold"
                  >
                    <BookOpen size={14} /> 整年级听写
                  </button>
                )}
              </div>
            )}
          </div>
```

- [ ] **Step 4: Commit**

```bash
git add src/components/WordListView.tsx
git commit -m "feat: add custom grade management section to WordListView"
```

---

## Task 11: App.tsx — wire lessonEdit view and custom grade routing

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add `editingListId` state**

Inside `App()`, add:

```typescript
  const [editingListId, setEditingListId] = useState<string | null>(null);
```

- [ ] **Step 2: Add navigation handlers**

```typescript
  function openLessonEdit(listId: string) {
    setEditingListId(listId);
    setView('lessonEdit');
  }

  function openGradeDictation(gradeId: string, gradeName: string, mode: DictationMode) {
    const { getCustomListsForGrade, getCustomWordsForList } = await import('./utils/storage');
    // collect all words from all lessons in the grade
    const lessons = getCustomListsForGrade(gradeId);
    const words = lessons.flatMap(l => getCustomWordsForList(l.id));
    if (words.length === 0) return;
    setDictationMode(mode);
    setSelectorGrade('all');
    setSelectorMode('mixed');
    setSelectedLessonId(null);
    // Navigate to WordSelectorView with these words pre-loaded via a virtual session
    setSessionConfig({ words, grade: gradeName });
    setView('wordSelector');
  }
```

Wait — `getCustomListsForGrade` and `getCustomWordsForList` are synchronous (localStorage). No dynamic import needed. Fix:

```typescript
  function openCustomLessonDictation(listId: string, lessonName: string, mode: DictationMode) {
    const words = getCustomWordsForList(listId);
    if (words.length === 0) return;
    setDictationMode(mode);
    setSessionConfig({ words, grade: lessonName });
    setDictationKey(k => k + 1);
    setView('dictation');
  }

  function openGradeDictation(gradeId: string, gradeName: string, mode: DictationMode) {
    const lessons = getCustomListsForGrade(gradeId);
    const words = lessons.flatMap(l => getCustomWordsForList(l.id));
    if (words.length === 0) return;
    setDictationMode(mode);
    setSessionConfig({ words, grade: gradeName });
    setDictationKey(k => k + 1);
    setView('dictation');
  }
```

- [ ] **Step 3: Add imports for new storage functions**

In `src/App.tsx`, update the storage import:

```typescript
import {
  ensureFreshInstall, applyOverridesAndFilter, getHiddenListIds,
  clearWordsRecords, getCustomListsForGrade, getCustomWordsForList,
} from './utils/storage';
```

Also import `LessonEditView`:

```typescript
import LessonEditView from './components/LessonEditView';
```

- [ ] **Step 4: Update `handleBack` for `lessonEdit`**

In `handleBack`, add:

```typescript
  function handleBack() {
    if (view === 'lessonEdit') {
      setView('wordlists');
      return;
    }
    if (view === 'wordSelector' && selectorMode === 'lesson') {
      setView('lessonSelector');
    } else if (view === 'studyList' && studyOrigin === 'lessonSelector') {
      setView('lessonSelector');
    } else {
      setSessionConfig(null);
      setView('wordlists');
    }
  }
```

- [ ] **Step 5: Update `headerTitle` and `headerBack` for `lessonEdit`**

In `headerTitle`:

```typescript
  const headerTitle =
    view === 'wordlists' ? '听写小状元'
    : view === 'lessonSelector' ? (lessonSelectorMode === 'study' ? '选择课次（学习）' : '选择课次')
    : view === 'lessonEdit' ? '编辑课词'
    : view === 'wordSelector' ? '选择词语'
    : view === 'studyList' ? `学习：${studyTitle}`
    : view === 'study' ? `学习：${selectedList?.name ?? ''}`
    : sessionConfig ? `听写 · ${sessionConfig.grade}`
    : selectedList?.name ?? '听写';
```

In `headerBack`:

```typescript
  const headerBack =
    view === 'dictation' || view === 'study' || view === 'wordSelector' ||
    view === 'lessonSelector' || view === 'studyList' || view === 'lessonEdit'
      ? handleBack
      : undefined;
```

- [ ] **Step 6: Add `lessonEdit` view rendering**

In the `<main>` block, add after the `lessonSelector` block:

```typescript
        {view === 'lessonEdit' && editingListId && (
          <LessonEditView listId={editingListId} onBack={handleBack} />
        )}
```

- [ ] **Step 7: Update `LessonSelectorView` call to pass `onEditLesson`**

```typescript
        {view === 'lessonSelector' && (
          <LessonSelectorView
            onSelectLesson={handleLessonSelected}
            onEditLesson={openLessonEdit}
          />
        )}
```

- [ ] **Step 8: Update `WordListView` call to pass new props**

```typescript
        {view === 'wordlists' && (
          <WordListView
            onOpenMixedSelector={openMixedSelector}
            onOpenLessonSelector={openLessonSelector}
            onOpenStudyGrade={openStudyGrade}
            onOpenStudyLessonSelector={openStudyLessonSelector}
            onEditLesson={openLessonEdit}
            onStartCustomLesson={openCustomLessonDictation}
            onStartGradeDictation={openGradeDictation}
          />
        )}
```

- [ ] **Step 9: Verify TypeScript compiles with no new errors**

```bash
cd /Users/guotiantian/Documents/project/dictation_star && npx tsc --noEmit 2>&1 | head -30
```

Fix any type errors found.

- [ ] **Step 10: Run all tests**

```bash
cd /Users/guotiantian/Documents/project/dictation_star && npm test 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 11: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire lessonEdit view and custom grade dictation routing in App"
```

---

## Task 12: End-to-end manual verification

- [ ] **Start dev server**

```bash
cd /Users/guotiantian/Documents/project/dictation_star && npm run dev
```

- [ ] **Verify Feature 1 — Edit preset lesson**
  1. Tap 按课听写 → 选五年级 → tap pencil on any lesson
  2. Confirm LessonEditView opens with all words listed
  3. Tap × on a word → confirm it disappears
  4. Tap + 添加词语 → enter a word → confirm it appears
  5. Tap pencil on a word → confirm EditWordModal opens with 试听 button
  6. Tap 试听 → confirm audio plays

- [ ] **Verify Feature 2 — Pinyin display**
  1. Open any dictation session (parent mode) → confirm pinyin shows under each word
  2. Switch to student mode → confirm pinyin is hidden until word is revealed
  3. Open WordSelectorView → confirm pinyin appears in each row

- [ ] **Verify Feature 3 — Custom grade**
  1. On home screen (听写 tab) → tap 新建年级 → enter "P4" → confirm it appears
  2. Tap P4 → tap 新建课 → enter "第1课" → confirm LessonEditView opens
  3. Add 2+ words → tap back → tap 整年级听写 → confirm dictation starts with those words

- [ ] **Final commit**

```bash
git add -A
git commit -m "chore: verify all three features working end to end"
```
