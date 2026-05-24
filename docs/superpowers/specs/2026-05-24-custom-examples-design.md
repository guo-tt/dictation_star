# Custom Example Sentences Design

**Goal:** Allow users to add/edit example sentences wherever they appear in the app.

**Architecture:** Custom examples stored in localStorage, merged with base data at read time. Edit UI appears inline wherever an example sentence is displayed. Two rules: regular words allow replacing the original; chengyu only allow adding alongside the original.

**Tech Stack:** React, TypeScript, localStorage, existing Web Speech API TTS

---

## Data Layer

### Storage key: `dictation_custom_examples`

```json
{
  "word-id-abc": "自定义例句",
  "cy-0": "成语自定义例句"
}
```

One custom example per word/chengyu ID. New functions in `src/utils/storage.ts`:

- `getCustomExample(id: string): string | null`
- `setCustomExample(id: string, sentence: string): void`
- `clearCustomExample(id: string): void`

### How base data is affected

**Regular words:** `applyOverridesAndFilter` (already exists) — extend to also merge custom examples. When displaying or doing TTS, if a custom example exists, use it instead of the original. Original is still accessible via `getCustomExample` absence check.

**Chengyu:** `chengyuToWords()` reads `getCustomExample(cy.id)` and sets it as `word.example` if present; otherwise falls back to `cy.examples[0].sentence`. The raw `cy.examples` array (textbook sentences) is never modified.

---

## UI: Inline Edit Pattern

A shared `ExampleEditor` component used everywhere:

```
Props:
  wordId: string
  currentExample: string | null   // what's shown now (custom or original)
  originalExample: string | null  // base sentence (null if none)
  isChengyu: boolean              // false = replace mode, true = add-only mode
  onSave: (newSentence: string) => void
  onClear: () => void             // restore original (regular words only)
```

**States:**
- **Display:** shows example text + pencil icon (edit) or + icon (chengyu with no custom yet)
- **Editing:** inline text area replaces example line, with Save / Cancel buttons
- **Chengyu with custom:** shows textbook examples (read-only, labeled 课文), then custom example with pencil + trash icon

**No modal** — editing happens inline in place, consistent with the rest of the app's style.

---

## Component Changes

### `src/utils/storage.ts`
Add `getCustomExample`, `setCustomExample`, `clearCustomExample`. Touch `ensureFreshInstall` to include the new key in the clear list only on truly fresh installs (key name `dictation_custom_examples`).

### `src/utils/chengyu.ts`
`chengyuToWords()`: read custom example via `getCustomExample(cy.id)`, use as `word.example` if present.

### `src/components/WordCard.tsx`
Below the existing example sentence display, add `ExampleEditor`. On save, call `setCustomExample` and update local word state so TTS and display reflect the change immediately without remount.

### `src/components/StudyListView.tsx`
Each word row: append `ExampleEditor` below the word text/pinyin line.

### `src/components/ChengYuStudyView.tsx`
Each chengyu block: textbook examples shown as-is (labeled 课文, no edit icon). Below them, `ExampleEditor` in chengyu (add-only) mode.

### `src/components/ExampleEditor.tsx` (new)
Self-contained inline editor. Manages its own `editing: boolean` state. Calls `onSave` / `onClear` from props.

---

## TTS Priority

In `WordCard`, the sentence passed to `speak()` is already `localWord.example`. Since `chengyuToWords` now returns the custom example as `word.example` when present, TTS priority is automatic — no special casing needed in WordCard.

For regular words, same: once user saves custom example, `localWord.example` is updated in local state → TTS reads it.

---

## Edge Cases

- Empty custom example on save → treated as clear (restore original)
- No original and no custom → no example section shown, no edit icon
- `ensureFreshInstall` already only runs once; new key is just ignored on existing installs (no data loss)
