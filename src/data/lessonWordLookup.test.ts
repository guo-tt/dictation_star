import { describe, it, expect } from 'vitest';
import { lessonWords } from './lessonWordLookup';
import type { Word } from '../types';

function w(id: string, text: string): Word {
  return { id, text, example: '' };
}

describe('lessonWords', () => {
  const gradeWords = [w('g-001', 'foo'), w('g-002', 'bar'), w('g-003', 'baz')];

  it('returns words in the order of texts array', () => {
    const result = lessonWords(gradeWords, ['bar', 'foo']);
    expect(result.map(x => x.id)).toEqual(['g-002', 'g-001']);
  });

  it('skips texts not found in grade list', () => {
    const result = lessonWords(gradeWords, ['foo', 'missing', 'baz']);
    expect(result).toHaveLength(2);
    expect(result.map(x => x.text)).toEqual(['foo', 'baz']);
  });

  it('returns empty array for empty texts', () => {
    expect(lessonWords(gradeWords, [])).toEqual([]);
  });

  it('returns same Word object (shared reference)', () => {
    const result = lessonWords(gradeWords, ['foo']);
    expect(result[0]).toBe(gradeWords[0]);
  });
});
