# Grade Management, Word Addition & Common Mistakes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add custom grade creation, per-grade word addition with pinyin/audio, and a 常错字 system with fuzzy matching.

**Architecture:** Build bottom-up: types/storage first, then home screen grade cards, then per-grade view, then word addition with audio, then 常错字. Existing `dictation_custom_lists_v1` and `dictation_custom_v1` stores are reused; two new stores (`dictation_audio_v1`, `dictation_mistake_chars_v1`) are added.

**Tech Stack:** React 18 + TypeScript + Tailwind CSS + Vite + Vitest + pinyin-pro (already installed) + Web Speech API (TTS) + MediaRecorder API (recording)

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/types/index.ts` | modify | Add `MistakeEntry`, `GradeEntry`; extend `ViewMode` |
| `src/utils/storage.ts` | modify | Add audio + mistake CRUD |
| `src/utils/storage.audio.test.ts` | create | Tests for audio storage |
| `src/utils/storage.mistake.test.ts` | create | Tests for mistake storage |
| `src/components/WordListView.tsx` | modify | Grade cards + 常错字 card + "+" button |
| `src/components/NewGradeSheet.tsx` | create | Bottom sheet for creating a custom grade |
| `src/components/GradeView.tsx` | create | Grade word list + entry buttons + add-word button |
| `src/components/AddWordSheet.tsx` | create | Single-word form with auto-pinyin, example, TTS + recording |
| `src/components/MistakeView.tsx` | create | 常错字 input, fuzzy match, list, start-dictation |
| `src/components/WordCard.tsx` | modify | Play recorded audio when available, fall back to TTS |
| `src/components/WordSelectorView.tsx` | modify | Add `customListId` prop |
| `src/App.tsx` | modify | Add `gradeView`/`mistakeView` routing + new state |

---

### Task 1: Types + Storage Foundation

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/utils/storage.ts`
- Create: `src/utils/storage.audio.test.ts`
- Create: `src/utils/storage.mistake.test.ts`

- [ ] **Step 1: Extend types in `src/types/index.ts`**

Change:
```ts
export type ViewMode = 'wordlists' | 'lessonSelector' | 'wordSelector' | 'dictation' | 'study';
```
To:
```ts
export type ViewMode = 'wordlists' | 'lessonSelector' | 'wordSelector' | 'dictation' | 'study' | 'gradeView' | 'mistakeView';
```

Append at end of file:
```ts
export interface GradeEntry {
  listId: string;
  label: string;
  isPreset: boolean;
  grade?: 5 | 6;
  wordCount: number;
}

export interface MistakeEntry {
  id: string;
  text: string;
  pinyin?: string;
  example?: string;
  linkedWordId?: string;
  createdAt: string;
}
```

- [ ] **Step 2: Write failing audio storage tests**

Create `src/utils/storage.audio.test.ts`:
```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

const store: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { for (const k of Object.keys(store)) delete store[k]; },
});

import { getAudio, saveAudio, deleteAudio } from './storage';

beforeEach(() => { localStorage.clear(); });

describe('audio storage', () => {
  it('returns null for unknown word', () => {
    expect(getAudio('word-1')).toBeNull();
  });
  it('stores and retrieves audio', () => {
    saveAudio('word-1', 'data:audio/webm;base64,ABC==');
    expect(getAudio('word-1')).toBe('data:audio/webm;base64,ABC==');
  });
  it('stores multiple words independently', () => {
    saveAudio('word-1', 'AAA');
    saveAudio('word-2', 'BBB');
    expect(getAudio('word-1')).toBe('AAA');
    expect(getAudio('word-2')).toBe('BBB');
  });
  it('deletes audio', () => {
    saveAudio('word-1', 'data:audio/webm;base64,ABC==');
    deleteAudio('word-1');
    expect(getAudio('word-1')).toBeNull();
  });
  it('delete is no-op for unknown word', () => {
    expect(() => deleteAudio('unknown')).not.toThrow();
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npm test -- storage.audio`
Expected: FAIL — "getAudio is not a function"

- [ ] **Step 4: Add audio + mistake functions to `src/utils/storage.ts`**

Add `MistakeEntry` to the existing import at line 1:
```ts
import { WordRecord, CustomWordEntry, CustomListMeta, Word, Subject, MistakeEntry } from '../types';
```

Append at end of file:
```ts
// ── audio recordings ──────────────────────────────────────────────────────────

const AUDIO_KEY = 'dictation_audio_v1';

export function getAudio(wordId: string): string | null {
  try {
    const store: Record<string, string> = JSON.parse(localStorage.getItem(AUDIO_KEY) || '{}');
    return store[wordId] ?? null;
  } catch { return null; }
}

export function saveAudio(wordId: string, dataUrl: string): void {
  try {
    const store: Record<string, string> = JSON.parse(localStorage.getItem(AUDIO_KEY) || '{}');
    store[wordId] = dataUrl;
    localStorage.setItem(AUDIO_KEY, JSON.stringify(store));
  } catch {}
}

export function deleteAudio(wordId: string): void {
  try {
    const store: Record<string, string> = JSON.parse(localStorage.getItem(AUDIO_KEY) || '{}');
    delete store[wordId];
    localStorage.setItem(AUDIO_KEY, JSON.stringify(store));
  } catch {}
}

// ── common-mistake entries ────────────────────────────────────────────────────

const MISTAKE_KEY = 'dictation_mistake_chars_v1';

export function getMistakeEntries(): MistakeEntry[] {
  try { return JSON.parse(localStorage.getItem(MISTAKE_KEY) || '[]'); }
  catch { return []; }
}

export function addMistakeEntry(entry: MistakeEntry): void {
  const entries = getMistakeEntries();
  entries.push(entry);
  localStorage.setItem(MISTAKE_KEY, JSON.stringify(entries));
}

export function deleteMistakeEntry(id: string): void {
  const entries = getMistakeEntries().filter(e => e.id !== id);
  localStorage.setItem(MISTAKE_KEY, JSON.stringify(entries));
}
```

- [ ] **Step 5: Run audio tests to verify pass**

Run: `npm test -- storage.audio`
Expected: PASS (5 tests)

- [ ] **Step 6: Write failing mistake storage tests**

Create `src/utils/storage.mistake.test.ts`:
```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { MistakeEntry } from '../types';

const store: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { for (const k of Object.keys(store)) delete store[k]; },
});

import { getMistakeEntries, addMistakeEntry, deleteMistakeEntry } from './storage';

beforeEach(() => { localStorage.clear(); });

function m(id: string, text: string): MistakeEntry {
  return { id, text, createdAt: '2026-01-01T00:00:00.000Z' };
}

describe('mistake storage', () => {
  it('returns empty array initially', () => {
    expect(getMistakeEntries()).toEqual([]);
  });
  it('stores and retrieves entries', () => {
    addMistakeEntry(m('m-1', '的'));
    expect(getMistakeEntries()[0].text).toBe('的');
  });
  it('accumulates entries in order', () => {
    addMistakeEntry(m('m-1', '的'));
    addMistakeEntry(m('m-2', '地'));
    expect(getMistakeEntries().map(e => e.id)).toEqual(['m-1', 'm-2']);
  });
  it('deletes entry by id', () => {
    addMistakeEntry(m('m-1', '的'));
    addMistakeEntry(m('m-2', '地'));
    deleteMistakeEntry('m-1');
    expect(getMistakeEntries().map(e => e.id)).toEqual(['m-2']);
  });
  it('delete is no-op for unknown id', () => {
    addMistakeEntry(m('m-1', '的'));
    deleteMistakeEntry('unknown');
    expect(getMistakeEntries()).toHaveLength(1);
  });
});
```

- [ ] **Step 7: Run to verify failure**

Run: `npm test -- storage.mistake`
Expected: FAIL — "getMistakeEntries is not a function"

- [ ] **Step 8: Run to verify mistake tests pass**

Run: `npm test -- storage.mistake`
Expected: PASS (5 tests)

- [ ] **Step 9: Run all tests**

Run: `npm test`
Expected: 19 tests pass (9 existing + 5 audio + 5 mistake)

- [ ] **Step 10: Commit**

```bash
git add src/types/index.ts src/utils/storage.ts src/utils/storage.audio.test.ts src/utils/storage.mistake.test.ts
git commit -m "feat: GradeEntry/MistakeEntry types, gradeView/mistakeView ViewMode, audio/mistake storage"
```

---

### Task 2: WordListView → Grade Cards

**Files:**
- Modify: `src/components/WordListView.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Rewrite `src/components/WordListView.tsx`**

```tsx
import { useState, useMemo } from 'react';
import { DictationMode, GradeEntry } from '../types';
import { getCustomLists, getMistakeEntries, applyOverridesAndFilter } from '../utils/storage';
import { presetWordLists } from '../data/wordLists';
import NewGradeSheet from './NewGradeSheet';

interface WordListViewProps {
  dictationMode: DictationMode;
  onDictationModeChange: (mode: DictationMode) => void;
  onOpenGrade: (entry: GradeEntry) => void;
  onOpenMistakes: () => void;
}

export default function WordListView({
  dictationMode, onDictationModeChange, onOpenGrade, onOpenMistakes,
}: WordListViewProps) {
  const [showNewGrade, setShowNewGrade] = useState(false);
  const [refresh, setRefresh] = useState(0);

  const presetGrades: GradeEntry[] = [5, 6].map(g => {
    const list = presetWordLists.find(l => l.id === `zh-grade${g}`)!;
    return {
      listId: list.id,
      label: g === 5 ? '五年级' : '六年级',
      isPreset: true,
      grade: g as 5 | 6,
      wordCount: applyOverridesAndFilter(list.words).length,
    };
  });

  const customGrades: GradeEntry[] = useMemo(
    () => getCustomLists('chinese').map(l => ({
      listId: l.id,
      label: l.name,
      isPreset: false,
      wordCount: 0,
    })),
    [refresh],
  );

  const mistakeCount = getMistakeEntries().length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 px-4 pt-5 pb-3">
        {([
          { value: 'parent' as DictationMode, label: '👨‍👩‍👧 家长模式', desc: '显示文字' },
          { value: 'student' as DictationMode, label: '✏️ 学生模式', desc: '隐藏文字' },
        ]).map(m => (
          <button
            key={m.value}
            onClick={() => onDictationModeChange(m.value)}
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

      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-3">
        {[...presetGrades, ...customGrades].map(entry => (
          <button
            key={entry.listId}
            onClick={() => onOpenGrade(entry)}
            className="w-full rounded-2xl px-5 py-4 text-left border-2 border-[#B0BCDC] bg-[#F0F2FB] active:scale-[0.98] transition"
          >
            <div className="text-base font-bold text-[#5868A8]">{entry.label}</div>
            <div className="text-xs text-[#8090C0] mt-0.5">{entry.wordCount} 个词语</div>
          </button>
        ))}

        <button
          onClick={() => setShowNewGrade(true)}
          className="w-full rounded-2xl px-5 py-4 text-left border-2 border-dashed border-stone-300 bg-white active:scale-[0.98] transition"
        >
          <div className="text-base font-bold text-stone-400">＋ 新增年级</div>
        </button>

        <button
          onClick={onOpenMistakes}
          className="w-full rounded-2xl px-5 py-4 text-left border-2 border-[#F0C8A8] bg-[#FBF5EE] active:scale-[0.98] transition"
        >
          <div className="text-base font-bold text-[#C07840]">常错字</div>
          <div className="text-xs text-[#C09060] mt-0.5">
            {mistakeCount > 0 ? `${mistakeCount} 个词语` : '还没有记录，点击添加'}
          </div>
        </button>
      </div>

      {showNewGrade && (
        <NewGradeSheet
          onClose={() => setShowNewGrade(false)}
          onCreated={() => { setRefresh(r => r + 1); setShowNewGrade(false); }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update `src/App.tsx`**

Add these imports:
```tsx
import GradeView from './components/GradeView';
import MistakeView from './components/MistakeView';
```

Add these state variables inside `App()` (after existing state):
```tsx
const [selectedGradeId, setSelectedGradeId] = useState<string | null>(null);
const [selectedGradeLabel, setSelectedGradeLabel] = useState('');
const [selectedGradeIsPreset, setSelectedGradeIsPreset] = useState(false);
const [selectedPresetGrade, setSelectedPresetGrade] = useState<5 | 6 | null>(null);
const [selectedCustomListId, setSelectedCustomListId] = useState<string | null>(null);
```

Delete the `openMixedSelector` and `openLessonSelector` functions entirely (they are no longer called).

Replace `handleBack` with:
```tsx
function handleBack() {
  if (view === 'wordSelector' && selectorMode === 'lesson') {
    setView('lessonSelector');
  } else if (view === 'lessonSelector' || view === 'wordSelector') {
    setView('gradeView');
  } else if (view === 'gradeView' || view === 'mistakeView') {
    setView('wordlists');
  } else {
    setSessionConfig(null);
    setView('wordlists');
  }
}
```

Replace `headerTitle` with:
```tsx
const headerTitle =
  view === 'wordlists' ? '听写小状元'
  : view === 'gradeView' ? selectedGradeLabel
  : view === 'mistakeView' ? '常错字'
  : view === 'lessonSelector' ? '选择课次'
  : view === 'wordSelector' ? '选择词语'
  : view === 'study' ? `学习：${selectedList?.name ?? ''}`
  : sessionConfig ? `听写 · ${sessionConfig.grade}`
  : selectedList?.name ?? '听写';
```

Replace `headerBack` with:
```tsx
const headerBack =
  view === 'dictation' || view === 'study' || view === 'wordSelector' ||
  view === 'lessonSelector' || view === 'gradeView' || view === 'mistakeView'
    ? handleBack
    : undefined;
```

Replace the `{view === 'wordlists' && ...}` block with:
```tsx
{view === 'wordlists' && (
  <WordListView
    dictationMode={dictationMode}
    onDictationModeChange={setDictationMode}
    onOpenGrade={({ listId, label, isPreset, grade }) => {
      setSelectedGradeId(listId);
      setSelectedGradeLabel(label);
      setSelectedGradeIsPreset(isPreset);
      setSelectedPresetGrade(grade ?? null);
      setView('gradeView');
    }}
    onOpenMistakes={() => setView('mistakeView')}
  />
)}
```

Add after the wordlists block:
```tsx
{view === 'gradeView' && selectedGradeId && (
  <GradeView
    listId={selectedGradeId}
    isPreset={selectedGradeIsPreset}
    presetGrade={selectedPresetGrade ?? undefined}
    onOpenAll={() => {
      if (selectedGradeIsPreset && selectedPresetGrade) {
        setSelectorGrade(selectedPresetGrade);
        setSelectedCustomListId(null);
      } else {
        setSelectorGrade('all');
        setSelectedCustomListId(selectedGradeId);
      }
      setSelectorMode('mixed');
      setSelectedLessonId(null);
      setView('wordSelector');
    }}
    onOpenByLesson={() => setView('lessonSelector')}
  />
)}
{view === 'mistakeView' && (
  <MistakeView
    onStart={config => { setSessionConfig(config); setView('dictation'); }}
  />
)}
```

Update the `{view === 'wordSelector' && ...}` block to pass `customListId`:
```tsx
{view === 'wordSelector' && (
  <WordSelectorView
    grade={selectorGrade}
    dictationMode={dictationMode}
    onStart={startFromSelector}
    mode={selectorMode}
    lessonListId={selectedLessonId ?? undefined}
    customListId={selectedCustomListId ?? undefined}
  />
)}
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: BUILD SUCCEEDED (TypeScript errors for missing GradeView/MistakeView components are expected until Tasks 3-5 create them — add stub files first if needed)

- [ ] **Step 4: Commit**

```bash
git add src/components/WordListView.tsx src/App.tsx
git commit -m "feat: home screen grade cards, wire gradeView/mistakeView routing in App"
```

---

### Task 3: NewGradeSheet

**Files:**
- Create: `src/components/NewGradeSheet.tsx`

- [ ] **Step 1: Create `src/components/NewGradeSheet.tsx`**

```tsx
import { useState } from 'react';
import { X } from 'lucide-react';
import { addCustomList } from '../utils/storage';

interface NewGradeSheetProps {
  onClose: () => void;
  onCreated: () => void;
}

export default function NewGradeSheet({ onClose, onCreated }: NewGradeSheetProps) {
  const [name, setName] = useState('');
  const [gradeNum, setGradeNum] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { setError('请输入年级名称'); return; }
    const grade = gradeNum ? parseInt(gradeNum) : undefined;
    addCustomList(trimmed, 'chinese', grade);
    onCreated();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div className="w-full max-w-md bg-white rounded-t-3xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-[#7888C8] to-[#A8B8DC] px-5 py-4 flex items-center justify-between">
          <h2 className="text-white font-bold text-lg">新增年级</h2>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30">
            <X size={18} className="text-white" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-semibold text-stone-600 mb-1">年级名称</label>
            <input
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              placeholder="例：三年级、校本词语"
              className="w-full border-2 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 ring-[#8090C0] border-stone-200 focus:border-transparent"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-stone-600 mb-1">年级数字（可选）</label>
            <select
              value={gradeNum}
              onChange={e => setGradeNum(e.target.value)}
              className="w-full border-2 rounded-xl px-4 py-2.5 outline-none focus:ring-2 ring-[#8090C0] border-stone-200 focus:border-transparent bg-white text-sm"
            >
              <option value="">不指定</option>
              {[1, 2, 3, 4].map(n => (
                <option key={n} value={String(n)}>{n} 年级</option>
              ))}
            </select>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-2xl border-2 border-stone-200 text-stone-600 font-semibold">
              取消
            </button>
            <button type="submit"
              className="flex-1 py-3 rounded-2xl text-white font-bold bg-gradient-to-r from-[#7888C8] to-[#A8B8DC]">
              创建
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: BUILD SUCCEEDED

- [ ] **Step 3: Commit**

```bash
git add src/components/NewGradeSheet.tsx
git commit -m "feat: NewGradeSheet for creating custom grades"
```

---

### Task 4: GradeView

**Files:**
- Create: `src/components/GradeView.tsx`

- [ ] **Step 1: Create `src/components/GradeView.tsx`**

```tsx
import { useState, useMemo } from 'react';
import { Word } from '../types';
import { presetWordLists } from '../data/wordLists';
import { applyOverridesAndFilter, getCustomWordsForList } from '../utils/storage';
import AddWordSheet from './AddWordSheet';

interface GradeViewProps {
  listId: string;
  isPreset: boolean;
  presetGrade?: 5 | 6;
  onOpenAll: () => void;
  onOpenByLesson: () => void;
}

export default function GradeView({
  listId, isPreset, presetGrade, onOpenAll, onOpenByLesson,
}: GradeViewProps) {
  const [showAddWord, setShowAddWord] = useState(false);
  const [wordsVersion, setWordsVersion] = useState(0);

  const words: Word[] = useMemo(() => {
    if (isPreset) {
      const list = presetWordLists.find(l => l.id === listId);
      return list ? applyOverridesAndFilter(list.words) : [];
    }
    return getCustomWordsForList(listId);
  }, [listId, isPreset, wordsVersion]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3 flex gap-3">
        <button
          onClick={onOpenAll}
          className="flex-1 rounded-2xl px-4 py-4 text-left border-2 border-[#B0BCDC] bg-[#F0F2FB] active:scale-[0.98] transition"
        >
          <div className="text-base font-bold text-[#5868A8]">全部词语</div>
          <div className="text-xs text-[#8090C0] mt-0.5">{words.length} 个词 · 随机选词</div>
        </button>
        {isPreset && presetGrade && (
          <button
            onClick={onOpenByLesson}
            className="flex-1 rounded-2xl px-4 py-4 text-left border-2 border-stone-200 bg-white active:scale-[0.98] transition"
          >
            <div className="text-base font-bold text-stone-700">按课选词</div>
            <div className="text-xs text-stone-400 mt-0.5">选课次听写</div>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-2">
        {words.length === 0 && (
          <div className="text-center py-12 text-stone-400 text-sm">还没有词语，点击下方"添加词语"</div>
        )}
        {words.map(word => (
          <div key={word.id}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-stone-200 bg-white">
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-stone-800 text-sm">{word.text}</div>
              {word.pinyin && <div className="text-xs text-stone-400 mt-0.5">{word.pinyin}</div>}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border-t border-stone-100 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] px-4 py-4">
        <button
          onClick={() => setShowAddWord(true)}
          className="w-full py-3 rounded-2xl text-white font-bold text-base bg-gradient-to-r from-[#7888C8] to-[#A8B8DC]"
        >
          ＋ 添加词语
        </button>
      </div>

      {showAddWord && (
        <AddWordSheet
          listId={listId}
          onClose={() => setShowAddWord(false)}
          onAdded={() => setWordsVersion(v => v + 1)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: BUILD SUCCEEDED (AddWordSheet stub may not exist yet — create empty stub if needed)

- [ ] **Step 3: Commit**

```bash
git add src/components/GradeView.tsx
git commit -m "feat: GradeView with word list and 全部/按课 entry buttons"
```

---

### Task 5: AddWordSheet (pinyin + example)

**Files:**
- Create: `src/components/AddWordSheet.tsx`

- [ ] **Step 1: Create `src/components/AddWordSheet.tsx`**

```tsx
import { useState, useId, useRef } from 'react';
import { X, Volume2, Mic, StopCircle } from 'lucide-react';
import { pinyin as getPinyin } from 'pinyin-pro';
import { Word } from '../types';
import { addCustomWord, saveAudio } from '../utils/storage';

interface AddWordSheetProps {
  listId: string;
  onClose: () => void;
  onAdded: () => void;
}

export default function AddWordSheet({ listId, onClose, onAdded }: AddWordSheetProps) {
  const uid = useId();
  const [text, setText] = useState('');
  const [pinyinValue, setPinyinValue] = useState('');
  const [pinyinEdited, setPinyinEdited] = useState(false);
  const [example, setExample] = useState('');
  const [audioDataUrl, setAudioDataUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  function handleTextChange(val: string) {
    setText(val);
    setError('');
    if (!pinyinEdited && val.trim()) {
      try {
        setPinyinValue(getPinyin(val.trim(), { toneType: 'symbol', separator: ' ' }));
      } catch {
        setPinyinValue('');
      }
    } else if (!val.trim()) {
      setPinyinValue('');
      setPinyinEdited(false);
    }
  }

  function playTTS() {
    if (!text.trim() || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text.trim());
    utter.lang = 'zh-CN';
    utter.rate = 0.8;
    window.speechSynthesis.speak(utter);
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType });
        const reader = new FileReader();
        reader.onload = () => setAudioDataUrl(reader.result as string);
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      setIsRecording(true);
    } catch {
      // microphone permission denied — silently ignore
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedText = text.trim();
    if (!trimmedText) { setError('请输入词语'); return; }
    const wordId = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const word: Word = {
      id: wordId,
      text: trimmedText,
      pinyin: pinyinValue.trim() || undefined,
      example: example.trim() || trimmedText,
      wordType: trimmedText.length === 1 ? 'char' : 'word',
      isCustom: true,
    };
    addCustomWord(word, listId, 'chinese');
    if (audioDataUrl) saveAudio(wordId, audioDataUrl);
    onAdded();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div className="w-full max-w-md bg-white rounded-t-3xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-[#7888C8] to-[#A8B8DC] px-5 py-4 flex items-center justify-between">
          <h2 className="text-white font-bold text-lg">添加词语</h2>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30">
            <X size={18} className="text-white" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div>
            <label htmlFor={`${uid}-text`} className="block text-sm font-semibold text-stone-600 mb-1">词语</label>
            <input
              id={`${uid}-text`}
              type="text"
              value={text}
              onChange={e => handleTextChange(e.target.value)}
              placeholder="输入词语或汉字"
              className="w-full border-2 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 ring-[#8090C0] border-stone-200 focus:border-transparent"
              autoFocus
            />
          </div>
          <div>
            <label htmlFor={`${uid}-pinyin`} className="block text-sm font-semibold text-stone-600 mb-1">
              拼音 <span className="text-stone-400 font-normal">（自动生成，可修改）</span>
            </label>
            <input
              id={`${uid}-pinyin`}
              type="text"
              value={pinyinValue}
              onChange={e => { setPinyinValue(e.target.value); setPinyinEdited(true); }}
              placeholder="自动填入"
              className="w-full border-2 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 ring-[#8090C0] border-stone-200 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor={`${uid}-example`} className="block text-sm font-semibold text-stone-600 mb-1">
              例句 <span className="text-stone-400 font-normal">（选填）</span>
            </label>
            <textarea
              id={`${uid}-example`}
              rows={2}
              value={example}
              onChange={e => setExample(e.target.value)}
              placeholder="输入例句"
              className="w-full border-2 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 ring-[#8090C0] border-stone-200 focus:border-transparent resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-stone-600 mb-2">发音</label>
            <div className="flex gap-2 items-center">
              <button type="button" onClick={playTTS} disabled={!text.trim()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-100 text-stone-600 text-sm font-medium disabled:opacity-40">
                <Volume2 size={15} /><span>试听</span>
              </button>
              {!isRecording ? (
                <button type="button" onClick={startRecording}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-100 text-stone-600 text-sm font-medium">
                  <Mic size={15} /><span>{audioDataUrl ? '重新录音' : '录音'}</span>
                </button>
              ) : (
                <button type="button" onClick={stopRecording}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#D09098] text-white text-sm font-medium">
                  <StopCircle size={15} /><span>停止</span>
                </button>
              )}
              {audioDataUrl && !isRecording && (
                <span className="text-xs text-[#4A8842] font-medium">✓ 已录音</span>
              )}
            </div>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-3 pt-1 pb-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-2xl border-2 border-stone-200 text-stone-600 font-semibold">
              取消
            </button>
            <button type="submit" disabled={!text.trim()}
              className="flex-1 py-3 rounded-2xl text-white font-bold bg-gradient-to-r from-[#7888C8] to-[#A8B8DC] disabled:opacity-40">
              添加
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: BUILD SUCCEEDED

- [ ] **Step 3: Test manually**

Open a grade → tap "＋ 添加词语". Type a Chinese word — verify pinyin auto-fills. Edit pinyin manually — stays edited. Add optional example. Tap 试听 — TTS plays. Tap 录音, speak, tap 停止 — "✓ 已录音". Tap 添加 — word appears in grade word list.

- [ ] **Step 4: Commit**

```bash
git add src/components/AddWordSheet.tsx
git commit -m "feat: AddWordSheet with auto-pinyin, optional example, TTS preview, and audio recording"
```

---

### Task 6: WordCard Recorded Audio Playback

**Files:**
- Modify: `src/components/WordCard.tsx`

- [ ] **Step 1: Update `playWord` in `src/components/WordCard.tsx`**

Add import (alongside existing imports):
```tsx
import { saveAttempt, getWordStats, deleteCustomWord, clearWordRecord, getAudio } from '../utils/storage';
```

Replace the existing `playWord` function:
```tsx
function playWord() {
  const recorded = getAudio(localWord.id);
  if (recorded) {
    new Audio(recorded).play().catch(() => speak(localWord.text, lang));
    return;
  }
  speak(localWord.text, lang);
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: BUILD SUCCEEDED

- [ ] **Step 3: Test manually**

Add a word with a recording. Open dictation view for that grade. Tap 朗读 on the word — recorded audio plays. Tap 朗读 on a word without recording — TTS plays.

- [ ] **Step 4: Commit**

```bash
git add src/components/WordCard.tsx
git commit -m "feat: WordCard plays recorded audio when available, falls back to TTS"
```

---

### Task 7: MistakeView

**Files:**
- Create: `src/components/MistakeView.tsx`

- [ ] **Step 1: Create `src/components/MistakeView.tsx`**

```tsx
import { useState, useMemo } from 'react';
import { pinyin as getPinyin } from 'pinyin-pro';
import { Trash2 } from 'lucide-react';
import { Word, MistakeEntry, SessionConfig } from '../types';
import { presetWordLists } from '../data/wordLists';
import {
  applyOverridesAndFilter, getCustomLists, getCustomWordsForList,
  getMistakeEntries, addMistakeEntry, deleteMistakeEntry,
} from '../utils/storage';

interface MistakeViewProps {
  onStart: (config: SessionConfig) => void;
}

function getAllDictationWords(): Word[] {
  const seen = new Set<string>();
  const result: Word[] = [];
  const push = (w: Word) => { if (!seen.has(w.id)) { seen.add(w.id); result.push(w); } };
  presetWordLists
    .filter(l => l.subject === 'chinese' && l.lesson === undefined)
    .flatMap(l => applyOverridesAndFilter(l.words))
    .forEach(push);
  getCustomLists('chinese').flatMap(l => getCustomWordsForList(l.id)).forEach(push);
  return result;
}

function fuzzyMatch(input: string, words: Word[]): Word[] {
  const chars = new Set(input.split(''));
  return words.filter(w => w.text.split('').some(c => chars.has(c)));
}

function gradeLabel(word: Word): string {
  const list = presetWordLists.find(
    l => l.lesson === undefined && l.words.some(w => w.id === word.id)
  );
  return list ? list.name : '自定义';
}

export default function MistakeView({ onStart }: MistakeViewProps) {
  const [inputText, setInputText] = useState('');
  const [entries, setEntries] = useState<MistakeEntry[]>(() => getMistakeEntries());
  const [confirm, setConfirm] = useState<{ input: string; matches: Word[] } | null>(null);

  const allWords = useMemo(getAllDictationWords, []);

  function refresh() { setEntries(getMistakeEntries()); }

  function handleAdd() {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    const matches = fuzzyMatch(trimmed, allWords);
    if (matches.length > 0) {
      setConfirm({ input: trimmed, matches });
    } else {
      saveStandalone(trimmed);
    }
    setInputText('');
  }

  function saveStandalone(text: string) {
    let py: string | undefined;
    try { py = getPinyin(text, { toneType: 'symbol', separator: ' ' }); } catch {}
    addMistakeEntry({
      id: `mistake-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      text, pinyin: py, createdAt: new Date().toISOString(),
    });
    refresh();
  }

  function saveMerged(word: Word) {
    addMistakeEntry({
      id: `mistake-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      text: word.text,
      linkedWordId: word.id,
      createdAt: new Date().toISOString(),
    });
    refresh();
    setConfirm(null);
  }

  function handleStart() {
    const words: Word[] = entries.map(e => {
      if (e.linkedWordId) {
        const found = allWords.find(w => w.id === e.linkedWordId);
        if (found) return found;
      }
      return { id: e.id, text: e.text, pinyin: e.pinyin, example: e.example ?? e.text, isCustom: true };
    });
    onStart({ words, grade: '常错字' });
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3 flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
          placeholder="输入字、词或短句"
          className="flex-1 border-2 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 ring-[#C09060] border-stone-200 focus:border-transparent"
        />
        <button onClick={handleAdd} disabled={!inputText.trim()}
          className="px-4 py-2.5 rounded-xl bg-[#C09060] text-white text-sm font-bold disabled:opacity-40">
          添加
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-2">
        {entries.length === 0 && (
          <div className="text-center py-12 text-stone-400 text-sm">还没有常错字，在上方输入添加</div>
        )}
        {entries.map(e => {
          const linked = e.linkedWordId ? allWords.find(w => w.id === e.linkedWordId) : null;
          return (
            <div key={e.id}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-stone-200 bg-white">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-stone-800 text-sm">{e.text}</div>
                {linked && <div className="text-xs text-[#8090C0] mt-0.5">合并自 {gradeLabel(linked)}</div>}
                {!linked && e.pinyin && <div className="text-xs text-stone-400 mt-0.5">{e.pinyin}</div>}
              </div>
              <button onClick={() => { deleteMistakeEntry(e.id); refresh(); }}
                className="p-2 rounded-xl text-stone-300 active:text-[#D09098]">
                <Trash2 size={15} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="bg-white border-t border-stone-100 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] px-4 py-4">
        <button disabled={entries.length === 0} onClick={handleStart}
          className="w-full py-3 rounded-2xl text-white font-bold text-base bg-gradient-to-r from-[#C09060] to-[#E0B880] disabled:opacity-40">
          {entries.length > 0 ? `开始听写 · ${entries.length} 个词 →` : '请先添加常错字'}
        </button>
      </div>

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
          <div className="w-full max-w-md bg-white rounded-t-3xl shadow-2xl p-5">
            <h3 className="font-bold text-stone-800 mb-1">找到相似词语</h3>
            <p className="text-sm text-stone-500 mb-4">"{confirm.input}" 与以下词语有重叠字，请选择：</p>
            <div className="flex flex-col gap-2 mb-4 max-h-48 overflow-y-auto">
              {confirm.matches.slice(0, 5).map(w => (
                <button key={w.id} onClick={() => saveMerged(w)}
                  className="flex items-center justify-between px-4 py-3 rounded-2xl border-2 border-[#B0BCDC] bg-[#F0F2FB] active:scale-[0.98] transition">
                  <div className="text-left">
                    <div className="font-semibold text-[#5868A8] text-sm">{w.text}</div>
                    <div className="text-xs text-[#8090C0]">{gradeLabel(w)} · 合并统计</div>
                  </div>
                  <span className="text-xs text-[#8090C0]">选择 →</span>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => { saveStandalone(confirm.input); setConfirm(null); }}
                className="flex-1 py-2.5 rounded-2xl border-2 border-stone-200 text-stone-600 text-sm font-semibold">
                单独添加
              </button>
              <button onClick={() => setConfirm(null)}
                className="flex-1 py-2.5 rounded-2xl bg-stone-100 text-stone-500 text-sm font-semibold">
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: BUILD SUCCEEDED

- [ ] **Step 3: Test manually**

Tap 常错字 card. Type a character shared with a P5/P6 word (e.g. "的"). Tap 添加. Confirm sheet shows matching words — tap one. Entry appears with "合并自 五年级". Type an unmatched string → saves as standalone. Tap 开始听写 → DictationView opens.

- [ ] **Step 4: Commit**

```bash
git add src/components/MistakeView.tsx
git commit -m "feat: MistakeView with fuzzy matching, merge flow, and dictation entry"
```

---

### Task 8: WordSelectorView customListId

**Files:**
- Modify: `src/components/WordSelectorView.tsx`

- [ ] **Step 1: Add `customListId` prop and update `allWords` useMemo**

In `src/components/WordSelectorView.tsx`, update the props interface:
```tsx
interface WordSelectorViewProps {
  grade: GradeFilter;
  dictationMode: DictationMode;
  onStart: (config: SessionConfig) => void;
  mode?: 'lesson' | 'mixed';
  lessonListId?: string;
  customListId?: string;
}
```

Update the destructuring:
```tsx
export default function WordSelectorView({
  grade, dictationMode: _dictationMode, onStart, mode = 'mixed', lessonListId, customListId,
}: WordSelectorViewProps) {
```

Update the `allWords` useMemo (add `customListId` branch before the existing mixed-mode logic):
```tsx
const allWords = useMemo((): Word[] => {
  if (mode === 'lesson') {
    if (!lessonList) return [];
    return applyOverridesAndFilter(lessonList.words);
  }
  if (customListId) {
    return getCustomWordsForList(customListId);
  }
  const hiddenListIds = new Set(getHiddenListIds());
  const presetWords = presetWordLists
    .filter(l =>
      l.subject === 'chinese' &&
      SHOWN_GRADES.has(l.grade ?? -1) &&
      l.lesson === undefined &&
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
}, [grade, mode, lessonList, customListId]);
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: BUILD SUCCEEDED

- [ ] **Step 3: Run all tests**

Run: `npm test`
Expected: All 19 tests pass

- [ ] **Step 4: Test manually**

Create a custom grade, add 3 words. Tap the grade card → GradeView. Tap 全部词语 → WordSelectorView shows only those 3 words. Tap 五年级 → WordSelectorView shows all P5 words.

- [ ] **Step 5: Build and deploy to iPhone**

```bash
npm run build && npx cap sync ios
xcodebuild -workspace ios/App/App.xcworkspace -scheme App -configuration Debug \
  -destination 'id=00008140-00125D101ED2801C'
xcrun devicectl device install app --device 00008140-00125D101ED2801C \
  /Users/guotiantian/Library/Developer/Xcode/DerivedData/App-hcngdryemankymbyssufzrsalaqi/Build/Products/Debug-iphoneos/App.app
```

- [ ] **Step 6: Commit**

```bash
git add src/components/WordSelectorView.tsx
git commit -m "feat: WordSelectorView customListId for custom grade word selection"
```
