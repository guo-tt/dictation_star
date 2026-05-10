# Grade Management, Word Addition & Common Mistakes Design

## Goal

Allow users to create custom grade levels, add words (with pinyin, example sentences, and voice) to any grade, and maintain a separate "常错字" (common mistakes) list that fuzzy-matches against existing dictation words.

## Architecture

Three new capabilities are layered on top of the existing custom-list infrastructure:

1. **Grade management** — create/delete custom grades; home screen shows all grades as cards
2. **Word addition** — add words to any grade with auto-pinyin, optional example sentence, TTS + optional recorded audio
3. **常错字 system** — standalone input list; fuzzy-matched against all dictation words; participates in the same dictation flow

Existing `dictation_custom_lists_v1` and `dictation_custom_v1` localStorage stores are reused for grades and words. Two new stores are added for audio and common-mistake entries.

---

## Section 1: Home Screen

### Current → New

| Before | After |
|--------|-------|
| 4 fixed buttons: 按课听写 / 五年级 / 六年级 / 全部 | Scrollable card list: 五年级 / 六年级 / custom grades / 常错字 |
| 按课听写 is a top-level entry | 按课 moves inside each preset grade card |
| 全部 is a top-level button | Removed |

### Card Layout

Each grade card shows:
- Grade name (e.g. "五年级", "三年级", "校本词语")
- Word count and practiced-this-month count as a subtitle
- Tap → GradeView for that grade

A fixed 常错字 card appears last in the list (cannot be deleted or reordered):
- Shows total entries + how many overlap with existing dictation words
- Tap → MistakeView

A "+" button in the top-right corner of the home screen opens a "新建年级" sheet.

---

## Section 2: Grade View

Reached by tapping any grade card (preset or custom).

### Layout

Header: grade name + back button
Two entry buttons:
- **全部词语** → WordSelectorView. For preset grades 5/6, uses the existing `grade: GradeFilter` prop. For custom grades, a new `customListId` prop is passed; WordSelectorView loads words from that list directly (bypassing the grade filter).
- **按课选词** → LessonSelectorView (only shown for preset grades 5 and 6 which have lesson data)

Below the entry buttons: a scrollable word list showing all words in this grade (text + pinyin, no stats).

Bottom: **＋ 添加词语** button → opens AddWordSheet.

For custom grades, each word row has a swipe-to-delete action. Preset grade words cannot be deleted (they can only be hidden via the existing hide mechanism).

---

## Section 3: Add Word Sheet

Bottom sheet (modal) with the following fields:

| Field | Required | Behaviour |
|-------|----------|-----------|
| 词语 | Yes | Free text input |
| 拼音 | No | Auto-generated via `pinyin-pro` when 词语 changes; user can edit |
| 例句 | No | Free text; empty is fine |
| 发音 | — | TTS button plays system TTS preview; "录音" button records and stores audio |

### Pinyin Auto-Detection

Use the `pinyin-pro` npm package (already a common choice for browser-side Chinese pinyin). Called on every change to the 词语 field; output written to the 拼音 field only if the user has not manually edited it (track a `pinyinManuallyEdited` flag).

### Voice

Two states for voice:

1. **TTS only (default)** — when word is played in WordCard, use `window.speechSynthesis` with `lang: 'zh-CN'`
2. **Recorded** — user taps "录音", app records via `MediaRecorder` API, stores the result as a base64 data URL in `dictation_audio_v1` keyed by `wordId`. Playback uses an `<audio>` element with the stored data URL.

TTS is always available as fallback; if a recording exists it takes precedence.

### Storage

On save:
- Word is written to `dictation_custom_v1` (existing `addCustomWord` function), associated with the grade's list ID.
- If audio was recorded, also write to `dictation_audio_v1`.

---

## Section 4: Common Mistakes (常错字)

### Entry Point

A fixed card "常错字" on the home screen. Tapping opens MistakeView.

### MistakeView

Top: a text input + "添加" button.

Input accepts any string (single character, word, or short phrase). On submit:

1. **Fuzzy match** — check if any character in the input string appears in any existing dictation word's `text` field (across all preset and custom grades). Collect all matching words.
2. **If matches found** — show a confirmation sheet listing the matched words with their grade labels. User can choose: "合并统计（使用已有词语）" or "单独添加（新建条目）".
   - 合并统计: the matched dictation word is added to the 常错字 list as a reference (no duplicate storage; identified by `wordId`).
   - 单独添加: a new standalone entry is created even though a similar word exists.
3. **If no match** — entry is saved directly as a standalone 常错字 entry.

Standalone entries stored in `dictation_mistake_chars_v1` as:
```ts
interface MistakeEntry {
  id: string;
  text: string;
  pinyin?: string;        // auto-generated
  example?: string;
  linkedWordId?: string;  // set when "合并统计" is chosen
  createdAt: string;
}
```

### MistakeView List

Below the input, all 常错字 entries are shown:
- Linked entries show the matched word text + grade badge
- Standalone entries show the raw input text

Each entry can be deleted (swipe).

Bottom: **开始听写** button → WordSelectorView with the resolved word list (linked entries resolve to their dictation Word objects; standalone entries are treated as ad-hoc Word objects with the entry's text/pinyin/example).

---

## Section 5: Storage Schema

| Key | New? | Contents |
|-----|------|----------|
| `dictation_custom_lists_v1` | existing | Custom grade metadata (CustomListMeta[]) |
| `dictation_custom_v1` | existing | Custom word entries (CustomWordEntry[]) |
| `dictation_audio_v1` | **new** | `Record<wordId, base64DataUrl>` |
| `dictation_mistake_chars_v1` | **new** | `MistakeEntry[]` |

---

## Section 6: Components

| Component | New/Modified | Responsibility |
|-----------|-------------|----------------|
| `WordListView` | **modified** | Render grade cards + 常错字 card + "+" button; remove old 4-button layout |
| `GradeView` | **new** | Grade header, 全部/按课 entry buttons, word list, add-word button |
| `AddWordSheet` | **new** | Bottom sheet form for adding a word with pinyin/example/voice |
| `MistakeView` | **new** | 常错字 input, fuzzy match flow, list, start-dictation button |
| `NewGradeSheet` | **new** | Bottom sheet for creating a custom grade |
| `App.tsx` | **modified** | Add `'gradeView'` and `'mistakeView'` to ViewMode; wire navigation |
| `src/types/index.ts` | **modified** | Add `MistakeEntry`; extend `ViewMode` with `'gradeView'` and `'mistakeView'`; add optional `customListId` to `WordSelectorViewProps` |
| `src/utils/storage.ts` | **modified** | Add audio CRUD and mistake CRUD functions |
| `WordCard` | **modified** | Play recorded audio (from `dictation_audio_v1`) if available, else TTS |

---

## Out of Scope

- Syncing data across devices
- Editing existing preset words (pinyin overrides already handled by existing `saveWordOverride`)
- Auto-generating example sentences
- Reordering grade cards
