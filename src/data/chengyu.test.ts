import { describe, it, expect } from 'vitest';
import { chengyuToWords, filterChengyuByGrade } from './chengyu';
import type { ChengYu } from './chengyu';

const mockList: ChengYu[] = [
  {
    id: 'cy-0',
    text: '七嘴八舌',
    examples: [
      { grade: 3, lesson: 9, sentence: '猴子们七嘴八舌地商量。' },
      { grade: 5, lesson: 3, sentence: '同学们七嘴八舌地说了起来。' },
    ],
  },
  {
    id: 'cy-1',
    text: '各种各样',
    examples: [
      { grade: 4, lesson: 12, sentence: '教室里摆放着各种各样的盆景。' },
    ],
  },
  {
    id: 'cy-2',
    text: '五颜六色',
    examples: [
      { grade: 3, lesson: 5, sentence: '山上种满了五颜六色的花。' },
      { grade: 6, lesson: 2, sentence: '公园里种着五颜六色的花。' },
    ],
  },
];

describe('chengyuToWords', () => {
  it('maps each ChengYu to a Word using the first example sentence', () => {
    const words = chengyuToWords(mockList);
    expect(words).toHaveLength(3);
    expect(words[0]).toEqual({
      id: 'cy-0',
      text: '七嘴八舌',
      pinyin: undefined,
      example: '猴子们七嘴八舌地商量。',
      wordType: 'word',
      isCustom: false,
    });
    expect(words[1].example).toBe('教室里摆放着各种各样的盆景。');
  });

  it('uses empty string as example when examples array is empty', () => {
    const noExample: ChengYu[] = [{ id: 'cy-x', text: '测试', examples: [] }];
    const words = chengyuToWords(noExample);
    expect(words[0].example).toBe('');
  });
});

describe('filterChengyuByGrade', () => {
  it("returns the full list when grade is 'all'", () => {
    expect(filterChengyuByGrade('all', mockList)).toHaveLength(3);
  });

  it('returns only idioms that have at least one example in the given grade', () => {
    const p3 = filterChengyuByGrade(3, mockList);
    // 七嘴八舌 (grade 3 example) + 五颜六色 (grade 3 example) = 2
    expect(p3).toHaveLength(2);
    expect(p3.map(cy => cy.text)).toContain('七嘴八舌');
    expect(p3.map(cy => cy.text)).toContain('五颜六色');
    expect(p3.map(cy => cy.text)).not.toContain('各种各样');
  });

  it('includes a multi-grade idiom when filtering for any of its grades', () => {
    // 七嘴八舌 has grade 3 and grade 5 examples
    expect(filterChengyuByGrade(5, mockList).map(cy => cy.text)).toContain('七嘴八舌');
  });

  it('returns only the matching idiom when filtering for grade 4', () => {
    expect(filterChengyuByGrade(4, mockList).map(cy => cy.text)).toEqual(['各种各样']);
  });
});
