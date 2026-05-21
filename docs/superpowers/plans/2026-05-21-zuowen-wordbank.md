# 作文常错字库 + 词库查重 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated "作文常错字库" home-page card and word-bank lookup when adding words to any custom lesson.

**Architecture:** Three independent layers — storage utilities (new functions + tests), home-page card (WordListView), and inline confirmation panel (LessonEditView). Each task is self-contained; later tasks import from earlier ones.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Vite + Vitest, localStorage

---

## File Map

| File | Change |
|------|--------|
| `src/utils/storage.ts` | Add `ZUOWEN_LIST_ID`, `getOrCreateZuowenList()`, `findWordDataInBanks()` |
| `src/utils/storage.test.ts` | Extend with tests for the three new exports |
| `src/components/WordListView.tsx` | Add 作文常错字库 card (dictation tab only) |
| `src/components/LessonEditView.tsx` | Add `foundWordData` state, `commitAddWord` helper, confirmation panel |

---

## Task 1: Storage utilities — `ZUOWEN_LIST_ID`, `getOrCreateZuowenList`, `findWordDataInBanks`

**Files:**
- Modify: `src/utils/storage.ts`
- Modify: `src/utils/storage.test.ts`

### Background for implementer

`storage.ts` already imports `presetWordLists` and `findWordInPresets` from `../data/wordLists`, and exports `getCustomLists`, `addCustomList`, `loadCustomEntries` (private), `getCustomWordsForList`, `addCustomWord`. The existing `CUSTOM_LISTS_KEY` constant holds the list of `CustomListMeta` objects. The `Word` interface (from `../types`) has `id`, `text`, `pinyin?`, `example: string` (required, may be `''`), `wordType?`, `isCustom?`.

The test file uses `beforeEach(() => localStorage.clear())` and imports from `./storage`. Tests run with Vitest.

---

- [ ] **Step 1: Write failing tests in `storage.test.ts`**

Replace the entire import block at the top of `src/utils/storage.test.ts` with:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getCustomGrades, addCustomGrade, deleteCustomGrade, updateCustomGrade,
  hideWordFromLesson, getHiddenWordsForLesson, unhideWordFromLesson,
  addCustomList, getCustomListsForGrade,
  ZUOWEN_LIST_ID, getOrCreateZuowenList, getCustomLists,
  findWordDataInBanks,
  addCustomWord,
} from './storage';
import type { Word } from '../types';
import { presetWordLists } from '../data/wordLists';
```

Append these test blocks at the end of the file:

```typescript
describe('getOrCreateZuowenList', () => {
  it('creates the list on first call with correct shape', () => {
    const list = getOrCreateZuowenList();
    expect(list.id).toBe(ZUOWEN_LIST_ID);
    expect(list.name).toBe('作文常错字');
    expect(list.subject).toBe('chinese');
  });

  it('is idempotent — second call returns same id without duplicating', () => {
    getOrCreateZuowenList();
    getOrCreateZuowenList();
    expect(getCustomLists().filter(l => l.id === ZUOWEN_LIST_ID)).toHaveLength(1);
  });
});

describe('findWordDataInBanks', () => {
  it('returns null when word not found', () => {
    expect(findWordDataInBanks('绝对不存在的词语XYZ', 'chinese')).toBeNull();
  });

  it('finds a word in preset lists', () => {
    const presetList = presetWordLists.find(l => l.subject === 'chinese' && l.words.length > 0)!;
    const presetWord = presetList.words[0];
    const result = findWordDataInBanks(presetWord.text, 'chinese');
    expect(result).not.toBeNull();
    expect(result!.word.text).toBe(presetWord.text);
    expect(typeof result!.location).toBe('string');
    expect(result!.location.length).toBeGreaterThan(0);
  });

  it('finds a word in custom entries', () => {
    const list = addCustomList('测试课', 'chinese');
    const word: Word = {
      id: 'tw-1',
      text: '璀璨夺目',
      pinyin: 'cuǐ càn duó mù',
      example: '夜空中的星星璀璨夺目。',
      wordType: 'word',
      isCustom: true,
    };
    addCustomWord(word, list.id, 'chinese');

    const result = findWordDataInBanks('璀璨夺目', 'chinese');
    expect(result).not.toBeNull();
    expect(result!.word.text).toBe('璀璨夺目');
    expect(result!.word.pinyin).toBe('cuǐ càn duó mù');
    expect(result!.location).toBe('测试课');
  });

  it('excludes words from the specified listId', () => {
    const list = addCustomList('当前课', 'chinese');
    const word: Word = {
      id: 'tw-2',
      text: '别开生面',
      example: '',
      wordType: 'word',
      isCustom: true,
    };
    addCustomWord(word, list.id, 'chinese');

    const result = findWordDataInBanks('别开生面', 'chinese', list.id);
    expect(result).toBeNull();
  });

  it('matches case-insensitively', () => {
    const list = addCustomList('英文课', 'chinese');
    const word: Word = {
      id: 'tw-3',
      text: '美丽',
      example: '',
      wordType: 'word',
      isCustom: true,
    };
    addCustomWord(word, list.id, 'chinese');

    expect(findWordDataInBanks('美丽', 'chinese')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/guotiantian/Documents/project/dictation_star
npm test -- storage.test.ts 2>&1 | tail -30
```

Expected: failures referencing `ZUOWEN_LIST_ID`, `getOrCreateZuowenList`, `findWordDataInBanks` not exported.

- [ ] **Step 3: Add the three exports to `storage.ts`**

Add the constant and two functions at the end of `src/utils/storage.ts` (after the existing `unhideWordFromLesson` function):

```typescript
// ── 作文常错字 list ────────────────────────────────────────────────────────────

export const ZUOWEN_LIST_ID = 'clist-zuowen-fixed';

export function getOrCreateZuowenList(): CustomListMeta {
  const all = getCustomLists();
  const existing = all.find(l => l.id === ZUOWEN_LIST_ID);
  if (existing) return existing;
  const entry: CustomListMeta = {
    id: ZUOWEN_LIST_ID,
    name: '作文常错字',
    subject: 'chinese',
    createdAt: new Date().toISOString(),
  };
  all.push(entry);
  localStorage.setItem(CUSTOM_LISTS_KEY, JSON.stringify(all));
  return entry;
}

export function findWordDataInBanks(
  text: string,
  subject: Subject,
  excludeListId?: string,
): { location: string; word: Word } | null {
  const needle = text.trim().toLowerCase();

  for (const list of presetWordLists) {
    if (list.subject !== subject) continue;
    const found = list.words.find(w => w.text.toLowerCase() === needle);
    if (found) {
      return { location: `${list.name}${list.lessonTitle ?? ''}`, word: found };
    }
  }

  const entries = loadCustomEntries();
  const customLists = getCustomLists();
  for (const entry of entries) {
    if (entry.subject !== subject) continue;
    if (excludeListId && entry.listId === excludeListId) continue;
    if (entry.word.text.toLowerCase() === needle) {
      const listName = customLists.find(l => l.id === entry.listId)?.name ?? '自定义课';
      return { location: listName, word: entry.word };
    }
  }

  return null;
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- storage.test.ts 2>&1 | tail -30
```

Expected: all tests pass, including the new ones (≥14 total).

- [ ] **Step 5: Commit**

```bash
git add src/utils/storage.ts src/utils/storage.test.ts
git commit -m "feat: add ZUOWEN_LIST_ID, getOrCreateZuowenList, findWordDataInBanks to storage"
```

---

## Task 2: Home page 作文常错字库 card (`WordListView.tsx`)

**Files:**
- Modify: `src/components/WordListView.tsx`

### Background for implementer

`WordListView.tsx` renders a dictation tab and a study tab, toggled by `mainTab`. The dictation tab currently shows (in order): parent/student toggle, three dictation entry buttons, custom grade section. The new card goes between the entry buttons and the custom grade section.

The component already imports from `'../utils/storage'`. Props include `onStartCustomLesson: (listId: string, lessonName: string, mode: DictationMode) => void` and `onEditLesson: (listId: string) => void` — both are exactly what the card's buttons need.

The storage key for custom lists is `'dictation_custom_lists_v1'`. `ZUOWEN_LIST_ID = 'clist-zuowen-fixed'` is a fixed constant so no scan is needed.

---

- [ ] **Step 1: Update the import from `'../utils/storage'` in `WordListView.tsx`**

Find the existing import (around line 6–7):

```typescript
import {
  getCustomGrades, addCustomGrade, deleteCustomGrade,
  addCustomList, getCustomListsForGrade, deleteCustomList,
} from '../utils/storage';
```

Replace with:

```typescript
import {
  getCustomGrades, addCustomGrade, deleteCustomGrade,
  addCustomList, getCustomListsForGrade, deleteCustomList,
  ZUOWEN_LIST_ID, getOrCreateZuowenList, getCustomWordsForList,
} from '../utils/storage';
```

- [ ] **Step 2: Add the 作文常错字库 card in the dictation tab JSX**

Locate the dictation entry buttons section. It ends just before `{/* Custom grade section */}` (around line 145). Insert the new card between the closing `</div>` of the entry buttons and the `<div className="mt-2">` that opens the custom grade section:

```tsx
          {/* 作文常错字库 card */}
          <div className="rounded-2xl border-2 border-[#B0BCDC] bg-[#F0F2FB] px-4 py-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl leading-none">📝</span>
              <div className="flex-1 min-w-0">
                <div className="text-base font-bold text-[#5868A8]">作文常错字库</div>
                <div className="text-xs text-[#8090C0] mt-0.5">收集作文里写错的字词，随时听写复习</div>
                <div className="text-xs text-stone-400 mt-1">
                  {getCustomWordsForList(ZUOWEN_LIST_ID).length} 个词
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => onStartCustomLesson(ZUOWEN_LIST_ID, '作文常错字', dictationMode)}
                disabled={getCustomWordsForList(ZUOWEN_LIST_ID).length === 0}
                className="flex-1 py-2 rounded-xl text-sm font-bold bg-[#8090C0] text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                开始听写
              </button>
              <button
                onClick={() => { getOrCreateZuowenList(); onEditLesson(ZUOWEN_LIST_ID); }}
                className="flex-1 py-2 rounded-xl text-sm font-semibold border-2 border-[#B0BCDC] text-[#5868A8] bg-white transition"
              >
                编辑词库
              </button>
            </div>
          </div>
```

- [ ] **Step 3: Verify the app compiles**

```bash
npm run build 2>&1 | tail -20
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/WordListView.tsx
git commit -m "feat: add 作文常错字库 card to home page dictation tab"
```

---

## Task 3: Word bank lookup + confirmation panel in `LessonEditView.tsx`

**Files:**
- Modify: `src/components/LessonEditView.tsx`

### Background for implementer

`LessonEditView.tsx` manages a custom or preset lesson's word list. It has an inline add form (state: `showAddForm`, `addText`, `addExample`, `addError`). The current `handleAddWord()` validates, constructs a `Word`, calls `addCustomWord`, and resets state. The `Word.example` field is `string` (required, not optional) — empty string means no example.

The new flow: when `handleAddWord()` fires and `findWordDataInBanks` finds a match, set `foundWordData` state instead of immediately adding. The JSX then renders a confirmation panel inside the same add-form card. The `commitAddWord` helper does the actual write to storage.

`findWordDataInBanks` is already exported from `'../utils/storage'` after Task 1. `getDisplayPinyin` is already imported from `'../utils/pinyin'`.

---

- [ ] **Step 1: Add `findWordDataInBanks` to the storage import**

In `src/components/LessonEditView.tsx`, find the existing storage import:

```typescript
import {
  getCustomWordsForList,
  applyOverridesAndFilter,
  getHiddenWordsForLesson,
  hideWordFromLesson,
  deleteCustomWord,
  addCustomWord,
  getCustomLists,
} from '../utils/storage';
```

Replace with:

```typescript
import {
  getCustomWordsForList,
  applyOverridesAndFilter,
  getHiddenWordsForLesson,
  hideWordFromLesson,
  deleteCustomWord,
  addCustomWord,
  getCustomLists,
  findWordDataInBanks,
} from '../utils/storage';
```

- [ ] **Step 2: Add `foundWordData` state**

Inside the component, after the existing state declarations (`showAddForm`, `addText`, `addExample`, `addError`), add:

```typescript
const [foundWordData, setFoundWordData] = useState<{ location: string; word: Word } | null>(null);
```

- [ ] **Step 3: Replace `handleAddWord` with `commitAddWord` + updated `handleAddWord`**

Remove the existing `handleAddWord` function entirely and replace with these two functions:

```typescript
function commitAddWord(text: string, example: string, pinyin?: string) {
  const word: Word = {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    text,
    pinyin,
    example,
    wordType: text.length === 1 ? 'char' : 'word',
    isCustom: true,
  };
  addCustomWord(word, listId, 'chinese');
  setAddText('');
  setAddExample('');
  setAddError('');
  setFoundWordData(null);
  setShowAddForm(false);
  setVersion(v => v + 1);
}

function handleAddWord() {
  if (!addText.trim()) { setAddError('请输入词语'); return; }
  const match = findWordDataInBanks(addText.trim(), 'chinese', listId);
  if (match) {
    setFoundWordData(match);
    return;
  }
  commitAddWord(addText.trim(), addExample.trim());
}
```

- [ ] **Step 4: Replace the inline add form JSX with the two-state version**

Find the `{showAddForm && (` block (starting around line 151). Replace the entire block with:

```tsx
        {showAddForm && (
          <div className="p-4 bg-[#F0F2FB] rounded-2xl border-2 border-[#B0BCDC] flex flex-col gap-3">
            {foundWordData ? (
              <>
                <div className="text-sm font-semibold text-stone-700">
                  「{addText.trim()}」在{' '}
                  <span className="text-[#5868A8]">{foundWordData.location}</span>{' '}
                  中已有
                </div>
                <div className="text-xs text-stone-500">
                  拼音：{getDisplayPinyin(foundWordData.word.text, foundWordData.word.pinyin)}
                </div>
                {foundWordData.word.example && (
                  <div className="text-xs text-stone-500 italic line-clamp-2">
                    例：{foundWordData.word.example}
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => setFoundWordData(null)}
                    className="flex-1 py-2 rounded-xl border-2 border-stone-200 text-stone-600 text-sm font-semibold"
                  >
                    自行填写
                  </button>
                  <button
                    onClick={() =>
                      commitAddWord(
                        foundWordData.word.text,
                        foundWordData.word.example,
                        foundWordData.word.pinyin,
                      )
                    }
                    className="flex-1 py-2 rounded-xl bg-gradient-to-r from-[#7888C8] to-[#A8B8DC] text-white text-sm font-bold"
                  >
                    使用词库数据
                  </button>
                </div>
              </>
            ) : (
              <>
                <input
                  autoFocus
                  type="text"
                  placeholder="词语（必填）"
                  value={addText}
                  onChange={e => { setAddText(e.target.value); setAddError(''); }}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddWord(); }}
                  className="w-full border-2 border-stone-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 ring-[#8090C0] focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="例句（可选）"
                  value={addExample}
                  onChange={e => setAddExample(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddWord(); }}
                  className="w-full border-2 border-stone-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 ring-[#8090C0] focus:border-transparent"
                />
                {addError && <p className="text-red-500 text-xs">{addError}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setAddText('');
                      setAddExample('');
                      setAddError('');
                      setFoundWordData(null);
                    }}
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
              </>
            )}
          </div>
        )}
```

Note: the cancel button now also resets `foundWordData`. The `onKeyDown` Enter handler is added to both inputs for convenience.

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npm run build 2>&1 | tail -20
```

Expected: no errors. If TypeScript complains about `Word` in the `useState` type, confirm `Word` is already imported at line 3 — it is.

- [ ] **Step 6: Run all tests to confirm nothing is broken**

```bash
npm test 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/LessonEditView.tsx
git commit -m "feat: add word bank lookup and confirmation panel in LessonEditView"
```

---

## Done

After all three tasks, the feature is complete:
- `ZUOWEN_LIST_ID`, `getOrCreateZuowenList`, `findWordDataInBanks` are exported from storage with tests
- 作文常错字库 card is visible on the home page dictation tab
- Adding any word to any custom lesson triggers a word-bank check; if found, offers to reuse pinyin + example
