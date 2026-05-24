# Custom Example Sentences Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to add/edit example sentences wherever they appear — replacing originals for regular words, adding alongside for chengyu.

**Architecture:** Custom examples stored in localStorage under `dictation_custom_examples` (id→string map). A new `ExampleEditor` component owns display and editing of example sentences inline. ChengYu TTS priority (custom over textbook) handled in `chengyuToWords`.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, localStorage

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/utils/storage.ts` | Modify | Add get/set/clear for custom examples |
| `src/data/chengyu.ts` | Modify | `chengyuToWords` reads custom example for TTS priority |
| `src/components/ExampleEditor.tsx` | Create | Self-contained inline editor, owns display |
| `src/components/WordCard.tsx` | Modify | Replace example display with ExampleEditor |
| `src/components/StudyListView.tsx` | Modify | Track custom examples in state, integrate ExampleEditor |
| `src/components/ChengYuStudyView.tsx` | Modify | Track custom examples in state, integrate ExampleEditor (add-only) |

---

### Task 1: Storage functions

**Files:**
- Modify: `src/utils/storage.ts`

- [ ] **Step 1: Add the three storage functions**

Open `src/utils/storage.ts`. Add after the existing `clearWordsRecords` function:

```typescript
// ── custom example sentences ──────────────────────────────────────────────────

const CUSTOM_EXAMPLES_KEY = 'dictation_custom_examples';

function getCustomExamples(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_EXAMPLES_KEY) ?? '{}');
  } catch {
    return {};
  }
}

export function getCustomExample(id: string): string | null {
  return getCustomExamples()[id] ?? null;
}

export function setCustomExample(id: string, sentence: string): void {
  const all = getCustomExamples();
  all[id] = sentence;
  localStorage.setItem(CUSTOM_EXAMPLES_KEY, JSON.stringify(all));
}

export function clearCustomExample(id: string): void {
  const all = getCustomExamples();
  delete all[id];
  localStorage.setItem(CUSTOM_EXAMPLES_KEY, JSON.stringify(all));
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build
```
Expected: no TypeScript errors, build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/utils/storage.ts
git commit -m "feat: add custom example sentence storage functions"
```

---

### Task 2: Update chengyuToWords for TTS priority

**Files:**
- Modify: `src/data/chengyu.ts`

- [ ] **Step 1: Import and use getCustomExample**

In `src/data/chengyu.ts`, add the import at the top:

```typescript
import { getCustomExample } from '../utils/storage';
```

Replace the `chengyuToWords` function:

```typescript
export function chengyuToWords(list: ChengYu[]): Word[] {
  return list.map(cy => ({
    id: cy.id,
    text: cy.text,
    pinyin: undefined,
    example: getCustomExample(cy.id) ?? cy.examples[0]?.sentence ?? '',
    wordType: 'word' as const,
    isCustom: false,
  }));
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/data/chengyu.ts
git commit -m "feat: chengyuToWords uses custom example for TTS priority"
```

---

### Task 3: ExampleEditor component

**Files:**
- Create: `src/components/ExampleEditor.tsx`

This component has two modes:
- **replace mode** (`addOnly={false}`): owns the full example display. Shows the effective sentence (custom if set, else original) with a pencil icon. If custom exists, shows a "恢复原句" link. Saves replaces the original.
- **add-only mode** (`addOnly={true}`): shows only the custom section. If no custom, shows a "+ 自定义例句" button. If custom exists, shows the custom sentence with pencil + trash.

- [ ] **Step 1: Create the file**

Create `src/components/ExampleEditor.tsx`:

```tsx
import { useState } from 'react';
import { Pencil, X, Plus, Trash2 } from 'lucide-react';
import { getCustomExample, setCustomExample, clearCustomExample } from '../utils/storage';

interface ExampleEditorProps {
  wordId: string;
  original: string;       // textbook/preset sentence (may be empty string)
  addOnly: boolean;       // true = chengyu: cannot replace original, only add custom
  onSaved?: (effectiveSentence: string) => void; // called after save so parent can update TTS
}

export default function ExampleEditor({ wordId, original, addOnly, onSaved }: ExampleEditorProps) {
  const [custom, setCustom] = useState<string | null>(() => getCustomExample(wordId));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const effective = addOnly ? original : (custom ?? original);

  function startEdit() {
    setDraft(custom ?? (addOnly ? '' : original));
    setEditing(true);
  }

  function save() {
    const trimmed = draft.trim();
    if (trimmed === '') {
      handleClear();
      return;
    }
    setCustomExample(wordId, trimmed);
    setCustom(trimmed);
    setEditing(false);
    onSaved?.(addOnly ? trimmed : trimmed);
  }

  function handleClear() {
    clearCustomExample(wordId);
    setCustom(null);
    setEditing(false);
    onSaved?.(original);
  }

  // ── add-only mode (chengyu) ───────────────────────────────────────────────
  if (addOnly) {
    if (editing) {
      return (
        <div className="mt-2">
          <textarea
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            rows={3}
            placeholder="输入自定义例句…"
            className="w-full text-sm text-stone-700 border border-[#B0BCDC] rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#8090C0]"
          />
          <div className="flex gap-2 mt-1.5">
            <button
              onClick={save}
              className="px-3 py-1 rounded-lg bg-[#8090C0] text-white text-xs font-semibold"
            >
              保存
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-3 py-1 rounded-lg bg-stone-100 text-stone-600 text-xs font-semibold"
            >
              取消
            </button>
          </div>
        </div>
      );
    }

    if (custom) {
      return (
        <div className="mt-2 border-t border-[#D8DEF0] pt-2">
          <div className="flex items-start gap-1.5">
            <span className="text-xs font-semibold text-[#8090C0] flex-shrink-0 mt-0.5">自定义</span>
            <span className="text-sm text-stone-700 leading-relaxed flex-1">{custom}</span>
            <button onClick={startEdit} className="text-stone-300 hover:text-[#8090C0] flex-shrink-0">
              <Pencil size={13} />
            </button>
            <button onClick={handleClear} className="text-stone-300 hover:text-[#D09098] flex-shrink-0">
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      );
    }

    return (
      <button
        onClick={startEdit}
        className="mt-2 flex items-center gap-1 text-xs text-stone-300 hover:text-[#8090C0] transition-colors"
      >
        <Plus size={13} />
        <span>自定义例句</span>
      </button>
    );
  }

  // ── replace mode (regular words) ─────────────────────────────────────────
  if (editing) {
    return (
      <div className="mt-2 text-xs italic pl-1">
        <textarea
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          rows={3}
          placeholder="输入例句…"
          className="w-full text-sm text-stone-700 border border-[#B0BCDC] rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#8090C0] not-italic"
        />
        <div className="flex gap-2 mt-1.5 not-italic">
          <button
            onClick={save}
            className="px-3 py-1 rounded-lg bg-[#8090C0] text-white text-xs font-semibold"
          >
            保存
          </button>
          <button
            onClick={() => setEditing(false)}
            className="px-3 py-1 rounded-lg bg-stone-100 text-stone-600 text-xs font-semibold"
          >
            取消
          </button>
        </div>
      </div>
    );
  }

  if (!effective && !original) return null;

  return (
    <div className="mt-2 text-xs text-stone-500 italic pl-1 flex items-start gap-1.5">
      <span className="flex-1 leading-relaxed">
        例：{effective}
        {custom && original && custom !== original && (
          <button
            onClick={handleClear}
            className="ml-2 not-italic text-stone-300 hover:text-[#D09098] text-xs transition-colors"
          >
            恢复原句
          </button>
        )}
      </span>
      <button
        onClick={startEdit}
        className="text-stone-300 hover:text-[#8090C0] flex-shrink-0 mt-0.5 transition-colors"
      >
        <Pencil size={12} />
      </button>
      {custom && (
        <button
          onClick={handleClear}
          className="text-stone-300 hover:text-[#D09098] flex-shrink-0 mt-0.5 transition-colors"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```
Expected: no errors (component not yet used, but must compile).

- [ ] **Step 3: Commit**

```bash
git add src/components/ExampleEditor.tsx
git commit -m "feat: add ExampleEditor inline component"
```

---

### Task 4: Integrate into WordCard

**Files:**
- Modify: `src/components/WordCard.tsx`

WordCard already has `localWord` state. On save, update `localWord.example` so TTS reflects the change immediately.

- [ ] **Step 1: Import ExampleEditor**

At the top of `src/components/WordCard.tsx`, add:

```typescript
import ExampleEditor from './ExampleEditor';
```

- [ ] **Step 2: Determine addOnly**

In the component body, after the existing state declarations, add:

```typescript
const isChengyu = localWord.id.startsWith('cy-');
```

- [ ] **Step 3: Replace example display sections with ExampleEditor**

Find this block in WordCard (around line 210):

```tsx
{localWord.example && (
  <button
    onClick={playExample}
    ...
  >
    <BookOpen size={16} />
    <span>例句</span>
  </button>
)}
```

Keep the "例句" button as-is (it plays TTS). It already uses `localWord.example` which will be updated by onSaved.

Find this block (around line 221):

```tsx
{showText && localWord.example && (
  <div className="mt-2 text-xs text-stone-500 italic pl-1">
    例：{localWord.example}
    {localWord.exampleMeaning && (
      <span className="text-stone-400 not-italic"> — {localWord.exampleMeaning}</span>
    )}
  </div>
)}
```

Replace it with:

```tsx
{showText && (
  <ExampleEditor
    wordId={localWord.id}
    original={localWord.example ?? ''}
    addOnly={isChengyu}
    onSaved={sentence => setLocalWord(w => ({ ...w, example: sentence }))}
  />
)}
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/WordCard.tsx
git commit -m "feat: integrate ExampleEditor into WordCard"
```

---

### Task 5: Integrate into StudyListView

**Files:**
- Modify: `src/components/StudyListView.tsx`

StudyListView is a stateless list. We need:
1. A local state map for custom examples (so the TTS button can use the custom sentence)
2. ExampleEditor replacing the example display

- [ ] **Step 1: Add imports and state**

In `src/components/StudyListView.tsx`, add to the import line:

```typescript
import { useState } from 'react';
import { getCustomExample } from '../utils/storage';
import ExampleEditor from './ExampleEditor';
```

Inside the `StudyListView` component function, before the `return`, add:

```typescript
const [customExamples, setCustomExamples] = useState<Record<string, string>>(() => {
  const map: Record<string, string> = {};
  for (const w of words) {
    const c = getCustomExample(w.id);
    if (c) map[w.id] = c;
  }
  return map;
});
```

- [ ] **Step 2: Update TTS button to use custom example**

Find the "例句" TTS button in the map (currently `onClick={() => speak(word.example)}`). Replace with:

```tsx
<button
  onClick={() => speak(customExamples[word.id] ?? word.example)}
  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-600 hover:bg-stone-700 active:bg-stone-800 text-white text-sm font-medium transition-colors shadow-sm"
>
  <BookOpen size={16} />
  <span>例句</span>
</button>
```

- [ ] **Step 3: Replace example display with ExampleEditor**

Find this block:

```tsx
{word.example && (
  <div className="mt-2 text-xs text-stone-500 italic pl-1">
    例：{word.example}
    {word.exampleMeaning && (
      <span className="text-stone-400 not-italic">
        {' '}— {word.exampleMeaning}
      </span>
    )}
  </div>
)}
```

Replace with:

```tsx
<ExampleEditor
  wordId={word.id}
  original={word.example ?? ''}
  addOnly={false}
  onSaved={sentence => setCustomExamples(prev => ({ ...prev, [word.id]: sentence }))}
/>
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/StudyListView.tsx
git commit -m "feat: integrate ExampleEditor into StudyListView"
```

---

### Task 6: Integrate into ChengYuStudyView

**Files:**
- Modify: `src/components/ChengYuStudyView.tsx`

Chengyu study shows textbook sentences (read-only) + custom sentence below via ExampleEditor in add-only mode.

- [ ] **Step 1: Add imports**

In `src/components/ChengYuStudyView.tsx`, add imports (check if `useState` is already imported — if so, skip it):

```typescript
import ExampleEditor from './ExampleEditor';
```

No extra state is needed — ExampleEditor manages its own display internally via its own `useState`. The TTS button in this view is for the chengyu text only, not the example.

- [ ] **Step 2: Add ExampleEditor after the textbook examples block**

Find the closing of the examples block:

```tsx
{cy.examples.length > 0 && (
  <div className="mt-3 space-y-2.5">
    {cy.examples.map((ex, i) => (
      <div key={i} className="border-t border-[#D8DEF0] pt-2.5">
        <div className="text-xs font-semibold text-[#8090C0] mb-1">
          P{ex.grade} 第{ex.lesson}课
        </div>
        <div className="text-sm text-stone-700 leading-relaxed">{ex.sentence}</div>
      </div>
    ))}
  </div>
)}
```

Add ExampleEditor directly after that closing `}`:

```tsx
<ExampleEditor
  wordId={cy.id}
  original={cy.examples[0]?.sentence ?? ''}
  addOnly={true}
/>
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/ChengYuStudyView.tsx
git commit -m "feat: integrate ExampleEditor into ChengYuStudyView"
```

---

### Task 7: Sync to device and verify

- [ ] **Step 1: Build and sync**

```bash
npm run build && npx cap sync ios && npx cap open ios
```

- [ ] **Step 2: Test in Xcode**

Press ▶ to run on device. Verify:
- Regular word in StudyListView: pencil icon appears next to example, tap → textarea opens, save → new sentence shown, TTS button reads new sentence
- Regular word in WordCard (parent mode, after tapping a word): pencil appears on example line, tap → edit inline, save → TTS plays new sentence
- Chengyu in ChengYuStudyView: "+ 自定义例句" button below textbook examples, tap → textarea, save → "自定义" label appears with pencil + trash
- Chengyu in dictation (WordCard, parent mode): pencil appears on the example; if custom exists, TTS reads custom sentence; if not, reads textbook sentence
- Restore original: for regular word with custom sentence, "恢复原句" link appears and works

- [ ] **Step 3: Final commit (if any fixes needed)**

```bash
git add -p
git commit -m "fix: example editor polish after device testing"
```
