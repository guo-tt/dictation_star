import { describe, it, expect } from 'vitest';
import { rankWords, autoSelectWords } from './autoSelect';
import type { Word } from '../types';
import type { WordStats } from './storage';

function makeWord(id: string): Word {
  return { id, text: id, example: '' };
}

function makeStats(overrides: Partial<WordStats>): WordStats {
  return {
    total: 0,
    correct: 0,
    accuracy: 0,
    lastPracticed: null,
    recentAttempts: [],
    lastIntervalMs: null,
    ...overrides,
  };
}

const words = [
  makeWord('a'), // 2 errors total
  makeWord('b'), // 5 errors total
  makeWord('c'), // 0 errors, never practiced
];

const statsMap: Record<string, WordStats> = {
  a: makeStats({ total: 10, correct: 8, accuracy: 80, lastPracticed: '2026-01-15T00:00:00.000Z' }),
  b: makeStats({ total: 10, correct: 5, accuracy: 50, lastPracticed: '2026-03-01T00:00:00.000Z' }),
  c: makeStats({ total: 0, correct: 0, accuracy: 0, lastPracticed: null }),
};

describe('rankWords', () => {
  it('most-errors: sorts by total errors descending', () => {
    const result = rankWords(words, 'most-errors', statsMap);
    expect(result.map(w => w.id)).toEqual(['b', 'a', 'c']);
  });

  it('least-recent: puts never-practiced first, then oldest date', () => {
    const result = rankWords(words, 'least-recent', statsMap);
    // c: never (null) → first; a: Jan 15 → second; b: Mar 1 → last
    expect(result.map(w => w.id)).toEqual(['c', 'a', 'b']);
  });

  it('recent-error-rate: sorts by error rate in last 10 attempts descending', () => {
    const statsWithRecent: Record<string, WordStats> = {
      a: makeStats({
        recentAttempts: [
          { date: '2026-01-01T00:00:00.000Z', correct: false },
          { date: '2026-01-02T00:00:00.000Z', correct: false },
          { date: '2026-01-03T00:00:00.000Z', correct: true },
        ],
      }),
      b: makeStats({
        recentAttempts: [
          { date: '2026-01-01T00:00:00.000Z', correct: false },
          { date: '2026-01-02T00:00:00.000Z', correct: false },
          { date: '2026-01-03T00:00:00.000Z', correct: false },
        ],
      }),
      c: makeStats({ recentAttempts: [] }),
    };
    // b: 3/3 wrong = 100%; a: 2/3 wrong ≈ 67%; c: 0 attempts = 0%
    const result = rankWords(words, 'recent-error-rate', statsWithRecent);
    expect(result.map(w => w.id)).toEqual(['b', 'a', 'c']);
  });
});

describe('autoSelectWords', () => {
  it('returns the top N words by the given rule', () => {
    const result = autoSelectWords(words, 'most-errors', 2, statsMap);
    expect(result).toHaveLength(2);
    expect(result.map(w => w.id)).toEqual(['b', 'a']);
  });

  it('returns all words if count exceeds list length', () => {
    const result = autoSelectWords(words, 'most-errors', 99, statsMap);
    expect(result).toHaveLength(3);
  });
});
