import { describe, it, expect, beforeEach } from 'vitest';
import {
  getCustomGrades, addCustomGrade, deleteCustomGrade, updateCustomGrade,
  hideWordFromLesson, getHiddenWordsForLesson, unhideWordFromLesson,
  addCustomList, getCustomListsForGrade, getCustomLists,
  ZUOWEN_LIST_ID, getOrCreateZuowenList,
  findWordDataInBanks,
  addCustomWord,
} from './storage';
import type { Word } from '../types';
import { presetWordLists } from '../data/wordLists';

beforeEach(() => {
  localStorage.clear();
});

describe('CustomGrade CRUD', () => {
  it('starts empty', () => {
    expect(getCustomGrades()).toEqual([]);
  });

  it('adds a grade', () => {
    const grade = addCustomGrade('P4', 'chinese');
    expect(grade.name).toBe('P4');
    expect(grade.subject).toBe('chinese');
    expect(grade.id).toMatch(/^cgrade-/);
    expect(getCustomGrades()).toHaveLength(1);
  });

  it('deletes a grade and its lessons', () => {
    const grade = addCustomGrade('P4', 'chinese');
    addCustomList('第1课', 'chinese', undefined, grade.id);
    deleteCustomGrade(grade.id);
    expect(getCustomGrades()).toHaveLength(0);
    expect(getCustomListsForGrade(grade.id)).toHaveLength(0);
  });

  it('updates grade name', () => {
    const grade = addCustomGrade('P4', 'chinese');
    updateCustomGrade(grade.id, '小学四年级');
    expect(getCustomGrades()[0].name).toBe('小学四年级');
  });
});

describe('getCustomListsForGrade', () => {
  it('returns only lists for the given gradeId', () => {
    const g1 = addCustomGrade('P4', 'chinese');
    const g2 = addCustomGrade('P5', 'chinese');
    addCustomList('课A', 'chinese', undefined, g1.id);
    addCustomList('课B', 'chinese', undefined, g2.id);
    expect(getCustomListsForGrade(g1.id)).toHaveLength(1);
    expect(getCustomListsForGrade(g1.id)[0].name).toBe('课A');
  });
});

describe('lesson-scoped word hiding', () => {
  it('starts with no hidden words', () => {
    expect(getHiddenWordsForLesson('list-1')).toEqual([]);
  });

  it('hides a word from a specific lesson', () => {
    hideWordFromLesson('list-1', 'word-1');
    expect(getHiddenWordsForLesson('list-1')).toContain('word-1');
    expect(getHiddenWordsForLesson('list-2')).not.toContain('word-1');
  });

  it('unhides a word', () => {
    hideWordFromLesson('list-1', 'word-1');
    unhideWordFromLesson('list-1', 'word-1');
    expect(getHiddenWordsForLesson('list-1')).not.toContain('word-1');
  });

  it('does not duplicate hidden entries', () => {
    hideWordFromLesson('list-1', 'word-1');
    hideWordFromLesson('list-1', 'word-1');
    expect(getHiddenWordsForLesson('list-1').filter(id => id === 'word-1')).toHaveLength(1);
  });
});

describe('getOrCreateZuowenList', () => {
  it('creates the list on first call with correct shape', () => {
    const list = getOrCreateZuowenList();
    expect(list.id).toBe(ZUOWEN_LIST_ID);
    expect(list.name).toBe('作文常错字');
    expect(list.subject).toBe('chinese');
  });

  it('is idempotent — second call returns same id without duplicating', () => {
    getOrCreateZuowenList();
    getOrCreateZuowenList();
    expect(getCustomLists().filter(l => l.id === ZUOWEN_LIST_ID)).toHaveLength(1);
  });
});

describe('findWordDataInBanks', () => {
  it('returns null when word not found', () => {
    expect(findWordDataInBanks('绝对不存在的词语XYZ', 'chinese')).toBeNull();
  });

  it('finds a word in preset lists', () => {
    const presetList = presetWordLists.find(l => l.subject === 'chinese' && l.words.length > 0)!;
    const presetWord = presetList.words[0];
    const result = findWordDataInBanks(presetWord.text, 'chinese');
    expect(result).not.toBeNull();
    expect(result!.word.text).toBe(presetWord.text);
    expect(typeof result!.location).toBe('string');
    expect(result!.location.length).toBeGreaterThan(0);
  });

  it('finds a word in custom entries', () => {
    const list = addCustomList('测试课', 'chinese');
    const word: Word = {
      id: 'tw-1',
      text: '璀璨夺目',
      pinyin: 'cuǐ càn duó mù',
      example: '夜空中的星星璀璨夺目。',
      wordType: 'word',
      isCustom: true,
    };
    addCustomWord(word, list.id, 'chinese');

    const result = findWordDataInBanks('璀璨夺目', 'chinese');
    expect(result).not.toBeNull();
    expect(result!.word.text).toBe('璀璨夺目');
    expect(result!.word.pinyin).toBe('cuǐ càn duó mù');
    expect(result!.location).toBe('测试课');
  });

  it('excludes words from the specified listId', () => {
    const list = addCustomList('当前课', 'chinese');
    const word: Word = {
      id: 'tw-2',
      text: '别开生面',
      example: '',
      wordType: 'word',
      isCustom: true,
    };
    addCustomWord(word, list.id, 'chinese');

    const result = findWordDataInBanks('别开生面', 'chinese', list.id);
    expect(result).toBeNull();
  });

  it('finds word regardless of surrounding whitespace in the search text', () => {
    const list = addCustomList('测试课2', 'chinese');
    const word: Word = {
      id: 'tw-3',
      text: '美丽',
      example: '',
      wordType: 'word',
      isCustom: true,
    };
    addCustomWord(word, list.id, 'chinese');

    expect(findWordDataInBanks('  美丽  ', 'chinese')).not.toBeNull();
  });
});
