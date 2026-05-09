export type Subject = 'chinese' | 'english';
export type ViewMode = 'wordlists' | 'wordSelector' | 'dictation' | 'study';
export type GradeFilter = 'all' | 5 | 6;

export interface SessionConfig {
  words: Word[];
  grade: string;  // '全部' | '五年级' | '六年级' — display label only
}
export type DictationMode = 'parent' | 'student';
export type FilterMode = 'all' | 'error-rate' | 'not-practiced';
export type WordType = 'char' | 'word' | 'sentence';

export interface Word {
  id: string;
  text: string;
  pinyin?: string;
  meaning?: string;
  example: string;
  exampleMeaning?: string;
  wordType?: WordType;
  isCustom?: boolean;
}

export interface WordList {
  id: string;
  name: string;
  subject: Subject;
  grade?: number;
  words: Word[];
  isVirtual?: boolean;
}

export interface Attempt {
  date: string;
  correct: boolean;
}

export interface WordRecord {
  wordId: string;
  /** Counts rolled off from the recent window */
  archivedCorrect: number;
  archivedTotal: number;
  /** Most recent MAX_RECENT attempts (with timestamps) */
  attempts: Attempt[];
}

export interface CustomWordEntry {
  word: Word;
  listId: string;
  subject: Subject;
  createdAt: string;
}

export interface CustomListMeta {
  id: string;
  name: string;
  subject: Subject;
  grade?: number;
  createdAt: string;
}
