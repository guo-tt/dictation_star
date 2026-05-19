import type { Word } from '../types';
import type { WordStats } from './storage';
import { getWordStats } from './storage';

export type AutoSelectRule = 'most-errors' | 'least-recent' | 'recent-error-rate' | 'random-errors';

function scoreWord(rule: AutoSelectRule, stats: WordStats): number {
  if (rule === 'most-errors') {
    return stats.total - stats.correct;
  }
  if (rule === 'least-recent') {
    return stats.lastPracticed === null
      ? Infinity
      : -new Date(stats.lastPracticed).getTime();
  }
  if (rule === 'recent-error-rate') {
    const recent = stats.recentAttempts.slice(-10);
    if (recent.length === 0) return 0;
    return recent.filter(a => !a.correct).length / recent.length;
  }
  return 0;
}

/** Pure ranking function — accepts a statsMap so it can be tested without localStorage. */
export function rankWords(
  words: Word[],
  rule: AutoSelectRule,
  statsMap: Record<string, WordStats>,
): Word[] {
  const defaultStats: WordStats = {
    total: 0,
    correct: 0,
    accuracy: 0,
    lastPracticed: null,
    recentAttempts: [],
    lastIntervalMs: null,
  };
  return [...words].sort((a, b) => {
    const sa = scoreWord(rule, statsMap[a.id] ?? defaultStats);
    const sb = scoreWord(rule, statsMap[b.id] ?? defaultStats);
    if (sa === Infinity && sb === Infinity) return 0;
    if (sa === Infinity) return -1;
    if (sb === Infinity) return 1;
    return sb - sa;
  });
}

/** Pick random words from the errors+unpracticed pool. Falls back to all words if pool is empty. */
export function randomWordsFromErrorsAndUnpracticed(
  words: Word[],
  count: number,
  statsMap?: Record<string, WordStats>,
): Word[] {
  const map = statsMap ?? Object.fromEntries(words.map(w => [w.id, getWordStats(w.id)]));
  const pool = words.filter(w => {
    const s = map[w.id];
    if (!s) return true;
    return s.total === 0 || s.total > s.correct;
  });
  const source = pool.length > 0 ? pool : words;
  const shuffled = [...source].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/** Select top `count` words by `rule`, reading stats from localStorage. */
export function autoSelectWords(
  words: Word[],
  rule: AutoSelectRule,
  count: number,
  statsMap?: Record<string, WordStats>,
): Word[] {
  if (rule === 'random-errors') {
    return randomWordsFromErrorsAndUnpracticed(words, count, statsMap);
  }
  const map = statsMap ?? Object.fromEntries(words.map(w => [w.id, getWordStats(w.id)]));
  return rankWords(words, rule, map).slice(0, count);
}
