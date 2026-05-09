import type { Word } from '../types';
import type { WordStats } from './storage';
import { getWordStats } from './storage';

export type AutoSelectRule = 'most-errors' | 'least-recent' | 'recent-error-rate';

function scoreWord(rule: AutoSelectRule, stats: WordStats): number {
  if (rule === 'most-errors') {
    return stats.total - stats.correct;
  }
  if (rule === 'least-recent') {
    // null (never practiced) → Infinity so it sorts first
    return stats.lastPracticed === null
      ? Infinity
      : -new Date(stats.lastPracticed).getTime();
  }
  // recent-error-rate: error rate over last 10 attempts
  const recent = stats.recentAttempts.slice(-10);
  if (recent.length === 0) return 0;
  return recent.filter(a => !a.correct).length / recent.length;
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

/** Select top `count` words by `rule`, reading stats from localStorage. */
export function autoSelectWords(
  words: Word[],
  rule: AutoSelectRule,
  count: number,
  statsMap?: Record<string, WordStats>,
): Word[] {
  const map = statsMap ?? Object.fromEntries(words.map(w => [w.id, getWordStats(w.id)]));
  return rankWords(words, rule, map).slice(0, count);
}
