# 听写结果可修改 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace immediate-write dictation scoring with a draft model — ✓/✗ marks are held in memory and only written to localStorage when the user clicks "完成听写".

**Architecture:** `DictationView` owns a `Map<wordId, boolean>` draft state; `WordCard` receives its current draft result as a prop and renders selected/unselected button styles; on submit, `DictationView` flushes the map to localStorage in one pass. Both files change together, but `WordCard` is updated first (additive) and `DictationView` second (wires it all up).

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Vitest (no new dependencies).

---

## File Map

| File | Change |
|------|--------|
| `src/components/WordCard.tsx` | Remove `saveAttempt` immediate call; add `pendingResult`/`locked` props; rename `onAttempt`→`onMark`; add button highlight styles |
| `src/components/DictationView.tsx` | Replace 3 session states with `sessionMarks: Map`; add `handleMark`/`handleComplete`; derive stats from map; pass new props to WordCard; add `saveAttempt` import |

---

## Task 1: Update `WordCard.tsx`

**Files:**
- Modify: `src/components/WordCard.tsx`

After this task TypeScript will complain that `DictationView` still passes the old `onAttempt` prop — that's expected and fixed in Task 2. Do **not** run `npx tsc --noEmit` after Task 1.

- [ ] **Step 1: Read the file**

Read `src/components/WordCard.tsx` in full before editing.

- [ ] **Step 2: Update the props interface**

Find `interface WordCardProps` and make these changes:

Remove:
```typescript
onAttempt?: (word: Word, correct: boolean) => void;
```

Add in its place:
```typescript
onMark?: (word: Word, correct: boolean) => void;
pendingResult: boolean | null;
locked?: boolean;
```

Full updated interface:
```typescript
interface WordCardProps {
  word: Word;
  index: number;
  dictationMode: DictationMode;
  subject: Subject;
  onMark?: (word: Word, correct: boolean) => void;
  pendingResult: boolean | null;
  locked?: boolean;
}
```

- [ ] **Step 3: Update the function signature**

Find the line:
```typescript
export default function WordCard({ word, index, dictationMode, subject, onAttempt }: WordCardProps) {
```

Change to:
```typescript
export default function WordCard({ word, index, dictationMode, subject, onMark, pendingResult, locked }: WordCardProps) {
```

- [ ] **Step 4: Remove `saveAttempt` from the storage import**

Find:
```typescript
import { saveAttempt, getWordStats, deleteCustomWord, clearWordRecord } from '../utils/storage';
```

Change to:
```typescript
import { getWordStats, deleteCustomWord, clearWordRecord } from '../utils/storage';
```

- [ ] **Step 5: Replace `handleAttempt` with `handleMark`**

Find the existing `handleAttempt`:
```typescript
const handleAttempt = useCallback((correct: boolean) => {
  playSound(correct ? 'correct' : 'wrong');
  saveAttempt(word.id, correct);
  setStatsVersion(v => v + 1);
  onAttempt?.(localWord, correct);
}, [word.id, onAttempt, localWord]);
```

Replace with:
```typescript
const handleMark = useCallback((correct: boolean) => {
  if (locked) return;
  if (pendingResult === correct) return;
  playSound(correct ? 'correct' : 'wrong');
  onMark?.(localWord, correct);
}, [locked, pendingResult, localWord, onMark]);
```

Note: `statsVersion` state and its usage in the "清除记录" button stay unchanged — removing `setStatsVersion` from `handleMark` is intentional (stats update from localStorage, which only changes at submission).

- [ ] **Step 6: Update the ✓/✗ button section**

Find the existing button pair (inside the `{dictationMode === 'student' && !revealed ? … : (…)}` block):
```tsx
<div className="flex gap-2">
  <button
    onClick={() => handleAttempt(true)}
    className="flex-1 py-2.5 rounded-xl bg-[#90BE88] hover:bg-[#78A870] active:bg-[#608858] text-white font-bold text-xl transition-colors shadow-sm"
  >
    ✓
  </button>
  <button
    onClick={() => handleAttempt(false)}
    className="flex-1 py-2.5 rounded-xl bg-[#D09098] hover:bg-[#B87880] active:bg-[#A06870] text-white font-bold text-xl transition-colors shadow-sm"
  >
    ✗
  </button>
</div>
```

Replace with:
```tsx
<div className="flex gap-2">
  <button
    onClick={() => handleMark(true)}
    disabled={locked}
    className={`flex-1 py-2.5 rounded-xl font-bold text-xl transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
      pendingResult === true
        ? 'bg-[#4A8842] text-white'
        : 'bg-white border-2 border-[#90BE88] text-[#4A8842]'
    }`}
  >
    ✓
  </button>
  <button
    onClick={() => handleMark(false)}
    disabled={locked}
    className={`flex-1 py-2.5 rounded-xl font-bold text-xl transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
      pendingResult === false
        ? 'bg-[#B05860] text-white'
        : 'bg-white border-2 border-[#D09098] text-[#B05860]'
    }`}
  >
    ✗
  </button>
</div>
```

Visual behaviour:
- `pendingResult === null` (no mark yet): both buttons show as outline (border only, coloured text)
- `pendingResult === true` (marked correct): ✓ solid dark green, ✗ outline red
- `pendingResult === false` (marked wrong): ✓ outline green, ✗ solid dark red
- `locked === true`: both buttons 50% opacity, cursor not-allowed, clicks ignored

- [ ] **Step 7: Commit**

```bash
git add src/components/WordCard.tsx
git commit -m "feat: add pendingResult/locked props to WordCard, defer score write to submission"
```

---

## Task 2: Update `DictationView.tsx`

**Files:**
- Modify: `src/components/DictationView.tsx`

After this task `npx tsc --noEmit` must pass with zero errors.

- [ ] **Step 1: Read the file**

Read `src/components/DictationView.tsx` in full before editing.

- [ ] **Step 2: Add `saveAttempt` to the storage import**

Find:
```typescript
import { getWordStats, clearAllRecords, clearWordsRecords } from '../utils/storage';
```

Change to:
```typescript
import { getWordStats, clearAllRecords, clearWordsRecords, saveAttempt } from '../utils/storage';
```

- [ ] **Step 3: Replace the three session state declarations**

Find and remove these three lines:
```typescript
const [sessionCorrect, setSessionCorrect] = useState(0);
const [sessionTotal, setSessionTotal] = useState(0);
const [sessionWrongWords, setSessionWrongWords] = useState<Word[]>([]);
```

Add in their place:
```typescript
const [sessionMarks, setSessionMarks] = useState<Map<string, boolean>>(new Map());
```

- [ ] **Step 4: Replace `handleSessionAttempt` with `handleMark`**

Find:
```typescript
const handleSessionAttempt = useCallback((word: Word, correct: boolean) => {
  setSessionTotal(t => t + 1);
  if (correct) {
    setSessionCorrect(c => c + 1);
  } else {
    setSessionWrongWords(prev =>
      prev.find(w => w.id === word.id) ? prev : [...prev, word],
    );
  }
}, []);
```

Replace with:
```typescript
const handleMark = useCallback((word: Word, correct: boolean) => {
  setSessionMarks(prev => {
    const next = new Map(prev);
    next.set(word.id, correct);
    return next;
  });
}, []);
```

- [ ] **Step 5: Add `handleComplete`**

Add this function directly after `handleMark`:
```typescript
function handleComplete() {
  sessionMarks.forEach((correct, wordId) => {
    saveAttempt(wordId, correct);
  });
  setShowCompletion(true);
}
```

- [ ] **Step 6: Update `handleClearAll` to clear the draft**

Find `handleClearAll`. It currently ends with `setConfirmClear(false);`. Add one line after it:
```typescript
function handleClearAll() {
  if (sessionConfig) {
    clearWordsRecords(sessionConfig.words.map(w => w.id));
  } else {
    clearAllRecords();
  }
  setCleared(c => !c);
  setConfirmClear(false);
  setSessionMarks(new Map()); // clear draft alongside stored records
}
```

- [ ] **Step 7: Add derived stats before the return statement**

Find the `return (` line that starts the JSX. Immediately before it, add:
```typescript
const sessionTotal = sessionMarks.size;
const sessionCorrect = [...sessionMarks.values()].filter(Boolean).length;
const sessionWrongWords = filteredWords.filter(w => sessionMarks.get(w.id) === false);
```

These replace the three state variables that were removed. The completion modal's JSX already references `sessionTotal`, `sessionCorrect`, and `sessionWrongWords` by name — no change needed there.

- [ ] **Step 8: Update the "完成听写" button's onClick**

Find:
```tsx
<button
  onClick={() => setShowCompletion(true)}
  className="w-full py-3 rounded-2xl text-white font-bold text-base shadow-md active:scale-[0.98] transition bg-gradient-to-r from-[#7888C8] to-[#A8B8DC]"
>
  完成听写 ✓
</button>
```

Change `onClick`:
```tsx
<button
  onClick={handleComplete}
  className="w-full py-3 rounded-2xl text-white font-bold text-base shadow-md active:scale-[0.98] transition bg-gradient-to-r from-[#7888C8] to-[#A8B8DC]"
>
  完成听写 ✓
</button>
```

- [ ] **Step 9: Update WordCard props**

Find the `<WordCard … />` element inside the `filteredWords.map(...)`. Currently it has:
```tsx
<WordCard
  key={word.id}
  word={word}
  index={index}
  dictationMode={dictationMode}
  subject={subject}
  onAttempt={handleSessionAttempt}
/>
```

Replace with:
```tsx
<WordCard
  key={word.id}
  word={word}
  index={index}
  dictationMode={dictationMode}
  subject={subject}
  pendingResult={sessionMarks.get(word.id) ?? null}
  locked={showCompletion}
  onMark={handleMark}
/>
```

- [ ] **Step 10: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: zero errors. If there are errors, they will be about either:
- A remaining reference to `sessionCorrect`/`sessionTotal`/`sessionWrongWords` as state setters (fix: those are now derived constants, not state)
- A remaining `onAttempt` reference (fix: rename to `onMark`)
- A missing import

- [ ] **Step 11: Run the test suite**

```bash
npm test
```

Expected: all tests pass (the existing tests cover storage and pinyin — none test DictationView or WordCard directly).

- [ ] **Step 12: Commit**

```bash
git add src/components/DictationView.tsx
git commit -m "feat: use sessionMarks draft map in DictationView, flush to storage on submit"
```

---

## Self-Review

**Spec coverage:**
- ✓ Draft marks held in `sessionMarks` Map until submission
- ✓ Clicking same button twice is a no-op (`pendingResult === correct` guard in `handleMark`)
- ✓ Changing answer (✓→✗ or ✗→✓) updates Map, only final value saved
- ✓ Visual: selected button solid, other button outline
- ✓ Locked after "完成听写" (`locked={showCompletion}` prop)
- ✓ Reset (`handleClearAll`) clears `sessionMarks`
- ✓ Unmarked words not saved (only `sessionMarks` entries saved, not all `filteredWords`)
- ✓ Stats in completion modal derived from Map (`sessionTotal`, `sessionCorrect`, `sessionWrongWords`)
- ✓ Student mode "先点眼睛" guard unchanged

**Type consistency:**
- `handleMark(word: Word, correct: boolean)` — consistent in Task 1 and Task 2
- `pendingResult: boolean | null` — consistent in both tasks
- `sessionMarks: Map<string, boolean>` — declared in Task 2, accessed in Task 2 only
- `saveAttempt(wordId: string, correct: boolean)` — matches existing signature in `storage.ts`
