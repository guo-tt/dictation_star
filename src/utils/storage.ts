import { WordRecord, CustomWordEntry, CustomListMeta, Word, Subject, CustomGrade } from '../types';
import { findWordInPresets, presetWordLists } from '../data/wordLists';

const RECORDS_KEY = 'dictation_v1';
const CUSTOM_KEY = 'dictation_custom_v1';

// Clears all dictation_* localStorage keys on first run of this App Store build,
// so devices with leftover dev/TestFlight data start clean.
const FRESH_KEY = 'dictation_appstore_v1';
export function ensureFreshInstall(): void {
  if (!localStorage.getItem(FRESH_KEY)) {
    Object.keys(localStorage)
      .filter(k => k.startsWith('dictation_') && k !== FRESH_KEY)
      .forEach(k => localStorage.removeItem(k));
    localStorage.setItem(FRESH_KEY, '1');
  }
}

const MAX_RECENT = 50;

// ── attempt records ───────────────────────────────────────────────────────────

/** Migrate old records that lack archivedCorrect/archivedTotal */
function migrate(raw: Record<string, unknown>): Record<string, WordRecord> {
  const result: Record<string, WordRecord> = {};
  for (const [id, rec] of Object.entries(raw)) {
    const r = rec as WordRecord & { archivedCorrect?: number };
    if (r.archivedCorrect === undefined) {
      // Old format: roll all but last MAX_RECENT into archive
      const all = r.attempts ?? [];
      const keep = all.slice(-MAX_RECENT);
      const rolled = all.slice(0, all.length - keep.length);
      result[id] = {
        wordId: id,
        archivedCorrect: rolled.filter(a => a.correct).length,
        archivedTotal: rolled.length,
        attempts: keep,
      };
    } else {
      result[id] = r;
    }
  }
  return result;
}

export function clearWordRecord(wordId: string): void {
  const records = getAllRecords();
  delete records[wordId];
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}

export function clearAllRecords(): void {
  localStorage.setItem(RECORDS_KEY, JSON.stringify({}));
}

export function clearWordsRecords(wordIds: string[]): void {
  const records = getAllRecords();
  for (const id of wordIds) delete records[id];
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}

export function getAllRecords(): Record<string, WordRecord> {
  try {
    const raw = JSON.parse(localStorage.getItem(RECORDS_KEY) || '{}');
    return migrate(raw);
  } catch {
    return {};
  }
}

export function saveAttempt(wordId: string, correct: boolean): void {
  const records = getAllRecords();
  if (!records[wordId]) {
    records[wordId] = { wordId, archivedCorrect: 0, archivedTotal: 0, attempts: [] };
  }
  const rec = records[wordId];
  rec.attempts.push({ date: new Date().toISOString(), correct });

  // Roll oldest off into archive when over limit
  while (rec.attempts.length > MAX_RECENT) {
    const oldest = rec.attempts.shift()!;
    rec.archivedTotal++;
    if (oldest.correct) rec.archivedCorrect++;
  }

  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}

export interface WordStats {
  total: number;
  correct: number;
  accuracy: number;
  lastPracticed: string | null;
  /** Last 20 attempts (oldest first) for display */
  recentAttempts: { date: string; correct: boolean }[];
  /** Ms between the last two practice sessions (sessions separated by >30 min) */
  lastIntervalMs: number | null;
}

export function getWordStats(wordId: string): WordStats {
  const record = getAllRecords()[wordId];
  if (!record?.attempts.length && !record?.archivedTotal) {
    return { total: 0, correct: 0, accuracy: 0, lastPracticed: null, recentAttempts: [], lastIntervalMs: null };
  }
  const attempts = record.attempts;
  const recentCorrect = attempts.filter(a => a.correct).length;
  const total = (record.archivedTotal ?? 0) + attempts.length;
  const correct = (record.archivedCorrect ?? 0) + recentCorrect;

  // Find session boundaries (gap > 30 min = new session)
  const SESSION_GAP_MS = 30 * 60 * 1000;
  const sessionStarts: number[] = [];
  for (let i = 0; i < attempts.length; i++) {
    const t = new Date(attempts[i].date).getTime();
    if (i === 0) { sessionStarts.push(t); continue; }
    const prev = new Date(attempts[i - 1].date).getTime();
    if (t - prev > SESSION_GAP_MS) sessionStarts.push(t);
  }
  const lastIntervalMs = sessionStarts.length >= 2
    ? sessionStarts[sessionStarts.length - 1] - sessionStarts[sessionStarts.length - 2]
    : null;

  return {
    total,
    correct,
    accuracy: Math.round((correct / total) * 100),
    lastPracticed: attempts[attempts.length - 1].date,
    recentAttempts: attempts.slice(-20),
    lastIntervalMs,
  };
}

// ── custom words ──────────────────────────────────────────────────────────────

function loadCustomEntries(): CustomWordEntry[] {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveCustomEntries(entries: CustomWordEntry[]): void {
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(entries));
}

export function getCustomWordsForList(listId: string): Word[] {
  return loadCustomEntries()
    .filter(e => e.listId === listId)
    .map(e => ({ ...e.word, isCustom: true }));
}

export function getAllCustomWordsForSubject(subject: Subject): Word[] {
  return loadCustomEntries()
    .filter(e => e.subject === subject)
    .map(e => ({ ...e.word, isCustom: true }));
}

/** Check whether a word text already exists (preset or custom). Returns location info if found. */
export function findExistingWord(
  text: string,
  subject: Subject,
): { found: true; location: string; isCustom: boolean } | { found: false } {
  const trimmed = text.trim();

  // check presets
  const preset = findWordInPresets(trimmed, subject);
  if (preset) return { found: true, location: preset.listName, isCustom: false };

  // check custom
  const entries = loadCustomEntries();
  const custom = entries.find(
    e => e.subject === subject && e.word.text.toLowerCase() === trimmed.toLowerCase(),
  );
  if (custom) {
    const listName = presetWordLists.find(l => l.id === custom.listId)?.name ?? custom.listId;
    return { found: true, location: listName, isCustom: true };
  }

  return { found: false };
}

export function addCustomWord(word: Word, listId: string, subject: Subject): void {
  const entries = loadCustomEntries();
  const entry: CustomWordEntry = {
    word: { ...word, isCustom: true },
    listId,
    subject,
    createdAt: new Date().toISOString(),
  };
  entries.push(entry);
  saveCustomEntries(entries);
}

export function deleteCustomWord(wordId: string): void {
  const entries = loadCustomEntries().filter(e => e.word.id !== wordId);
  saveCustomEntries(entries);
}

export function updateCustomWord(wordId: string, updates: Partial<Word>): void {
  const entries = loadCustomEntries();
  const idx = entries.findIndex(e => e.word.id === wordId);
  if (idx === -1) return;
  entries[idx].word = { ...entries[idx].word, ...updates };
  saveCustomEntries(entries);
}

// ── preset word overrides & hidden words ──────────────────────────────────────

const WORD_OVERRIDES_KEY = 'dictation_word_overrides_v1';
const HIDDEN_WORDS_KEY = 'dictation_hidden_words_v1';

export function getWordOverrides(): Record<string, Partial<Word>> {
  try { return JSON.parse(localStorage.getItem(WORD_OVERRIDES_KEY) || '{}'); }
  catch { return {}; }
}

export function saveWordOverride(wordId: string, updates: Partial<Word>): void {
  const overrides = getWordOverrides();
  overrides[wordId] = { ...(overrides[wordId] ?? {}), ...updates };
  localStorage.setItem(WORD_OVERRIDES_KEY, JSON.stringify(overrides));
}

export function getHiddenWordIds(): string[] {
  try { return JSON.parse(localStorage.getItem(HIDDEN_WORDS_KEY) || '[]'); }
  catch { return []; }
}

export function hideWord(wordId: string): void {
  const hidden = getHiddenWordIds();
  if (!hidden.includes(wordId)) {
    hidden.push(wordId);
    localStorage.setItem(HIDDEN_WORDS_KEY, JSON.stringify(hidden));
  }
}

/** Apply stored overrides and remove hidden words from any word array. */
export function applyOverridesAndFilter(words: Word[]): Word[] {
  const overrides = getWordOverrides();
  const hidden = new Set(getHiddenWordIds());
  return words
    .filter(w => !hidden.has(w.id))
    .map(w => overrides[w.id] ? { ...w, ...overrides[w.id] } : w);
}

// ── custom word lists ─────────────────────────────────────────────────────────

const CUSTOM_LISTS_KEY = 'dictation_custom_lists_v1';
const HIDDEN_LISTS_KEY = 'dictation_hidden_lists_v1';

export function getCustomLists(subject?: Subject): CustomListMeta[] {
  try {
    const all: CustomListMeta[] = JSON.parse(localStorage.getItem(CUSTOM_LISTS_KEY) || '[]');
    return subject ? all.filter(l => l.subject === subject) : all;
  } catch {
    return [];
  }
}

export function addCustomList(name: string, subject: Subject, grade?: number, gradeId?: string): CustomListMeta {
  const all = getCustomLists();
  const entry: CustomListMeta = {
    id: `clist-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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

export function deleteCustomList(id: string): void {
  // Remove list meta
  const lists = getCustomLists().filter(l => l.id !== id);
  localStorage.setItem(CUSTOM_LISTS_KEY, JSON.stringify(lists));
  const words = loadCustomEntries().filter(e => e.listId !== id);
  saveCustomEntries(words);
}

// Preset lists that the user has chosen to hide
export function getHiddenListIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(HIDDEN_LISTS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function hidePresetList(id: string): void {
  const hidden = getHiddenListIds();
  if (!hidden.includes(id)) {
    hidden.push(id);
    localStorage.setItem(HIDDEN_LISTS_KEY, JSON.stringify(hidden));
  }
}

export function unhidePresetList(id: string): void {
  const hidden = getHiddenListIds().filter(h => h !== id);
  localStorage.setItem(HIDDEN_LISTS_KEY, JSON.stringify(hidden));
}

// ── custom grades ─────────────────────────────────────────────────────────────

const CUSTOM_GRADES_KEY = 'dictation_custom_grades_v1';
const LESSON_HIDDEN_KEY = 'dictation_lesson_hidden_v1';

export function getCustomGrades(): CustomGrade[] {
  try { return JSON.parse(localStorage.getItem(CUSTOM_GRADES_KEY) || '[]'); }
  catch { return []; }
}

export function addCustomGrade(name: string, subject: Subject): CustomGrade {
  const grades = getCustomGrades();
  const grade: CustomGrade = {
    id: `cgrade-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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
      const listName = customLists.find(l => l.id === entry.listId)?.name ?? '未知课';
      return { location: listName, word: entry.word };
    }
  }

  return null;
}
