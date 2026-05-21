# Design: 作文常错字库 + 词库查重

**Date:** 2026-05-21  
**Status:** Approved

---

## Overview

Two related features:

1. **作文常错字库** — A dedicated, always-visible entry on the home page for collecting composition mistake words. Backed by a single persistent custom list with a fixed ID; no manual setup required.

2. **词库查重** — When adding a word to any custom lesson, the app checks the existing word bank (preset 五/六年级 lists + all user custom words). If a match is found, a confirmation panel lets the user reuse the existing pinyin and example sentence instead of re-typing them.

---

## 1. Storage Layer Changes (`src/utils/storage.ts`)

### 1a. Fixed Zuowen List ID

```typescript
export const ZUOWEN_LIST_ID = 'clist-zuowen-fixed';
```

A stable, known ID — not timestamp-based — so it can always be looked up without scanning all lists.

### 1b. `getOrCreateZuowenList(): CustomListMeta`

Checks whether a `CustomListMeta` with `id === ZUOWEN_LIST_ID` already exists in the `CUSTOM_LISTS_KEY` store. If not, creates one and persists it. Always returns the meta object. Idempotent.

```typescript
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
```

### 1c. `findWordDataInBanks(text, subject, excludeListId?): { location: string; word: Word } | null`

Searches in order:
1. **Preset lists** — iterates `presetWordLists`, matches by `word.text` (trim + case-insensitive). Returns the matched `Word` object plus a human-readable location like `"五年级第3课"` (constructed from `list.name + list.lessonTitle`).
2. **Custom words** — iterates `loadCustomEntries()`, matches by `entry.word.text`. Skips entries where `entry.listId === excludeListId` (avoids matching the word to itself in the same lesson). Returns `entry.word` plus the custom list name (looked up from `getCustomLists()`).

Returns `null` if no match found.

```typescript
export function findWordDataInBanks(
  text: string,
  subject: Subject,
  excludeListId?: string,
): { location: string; word: Word } | null {
  const needle = text.trim().toLowerCase();

  // 1. Search preset lists
  for (const list of presetWordLists) {
    if (list.subject !== subject) continue;
    const found = list.words.find(w => w.text.toLowerCase() === needle);
    if (found) {
      const location = `${list.name}${list.lessonTitle ?? ''}`;
      return { location, word: found };
    }
  }

  // 2. Search custom entries
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

---

## 2. Home Page Entry (`src/components/WordListView.tsx`)

### Position

In the dictation tab (`mainTab === 'dictation'`), between the existing grade buttons and the 自定义年级 section, add a 作文常错字库 card.

### Card layout

```
┌──────────────────────────────────────────┐
│  📝  作文常错字库                          │
│      在这里收集作文里写错的字词             │
│      12 个词                              │
│                                          │
│   [开始听写]        [编辑词库]             │
└──────────────────────────────────────────┘
```

- Word count is read from `getCustomWordsForList(ZUOWEN_LIST_ID).length` on each render (using a `useState` + `useEffect` or computed inline).
- 「开始听写」is disabled (grayed out) when word count is 0.
- 「开始听写」calls `onStartCustomLesson(ZUOWEN_LIST_ID, '作文常错字', dictationMode)`.
- 「编辑词库」calls `getOrCreateZuowenList()` (ensures list exists) then `onEditLesson(ZUOWEN_LIST_ID)`.

### No new props needed

`onStartCustomLesson` and `onEditLesson` are already present in `WordListViewProps`. No App.tsx changes required.

---

## 3. Word Bank Lookup (`src/components/LessonEditView.tsx`)

### Trigger

`handleAddWord()` is called when the user presses 「确认添加」. Before writing the word to storage, it calls `findWordDataInBanks(addText.trim(), 'chinese', listId)`.

### State additions

```typescript
const [foundWordData, setFoundWordData] = useState<{ location: string; word: Word } | null>(null);
```

### Modified flow in `handleAddWord()`

```
if (!addText.trim()) → show error, return
call findWordDataInBanks(addText, 'chinese', listId)
if match found → setFoundWordData(match), return   ← pause, show confirmation panel
if no match → commitAddWord(addText, addExample)   ← normal add
```

### Confirmation panel (replaces add form in the card)

Shown when `foundWordData !== null`, inside the same `[F0F2FB]` rounded card:

```
「美丽」在 五年级第3课 中已有

拼音：měi lì
例：她长得很美丽。（最多2行截断）

[使用词库数据]   [自行填写]
```

- **「使用词库数据」** — calls `commitAddWord` with `foundWordData.word.text`, `foundWordData.word.pinyin`, `foundWordData.word.example`; clears `foundWordData` and the form.
- **「自行填写」** — clears `foundWordData` only; returns to the add form with `addText` still populated (user keeps their typed word, can now fill example manually).

### `commitAddWord` helper (internal)

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
  setShowAddForm(false);
  setFoundWordData(null);
  setVersion(v => v + 1);
}
```

---

## 4. What Does Not Change

- `App.tsx` — no changes needed (no new props or views)
- `DictationView` — unchanged
- `WordSelectorView` — unchanged
- Preset word data in `wordLists.ts` — unchanged
- `findWordInPresets` in `wordLists.ts` — unchanged (superseded by `findWordDataInBanks` for this feature)
- `findExistingWord` in `storage.ts` — kept as-is (still used by `AddWordModal`)

---

## 5. File Summary

| File | Change |
|------|--------|
| `src/utils/storage.ts` | Add `ZUOWEN_LIST_ID`, `getOrCreateZuowenList()`, `findWordDataInBanks()` |
| `src/components/WordListView.tsx` | Add 作文常错字库 card in dictation tab |
| `src/components/LessonEditView.tsx` | Add word bank lookup + inline confirmation panel |
| `src/utils/storage.test.ts` | Tests for `getOrCreateZuowenList` and `findWordDataInBanks` |
