import { describe, it, expect, beforeEach } from 'vitest';
import {
  getCustomGrades, addCustomGrade, deleteCustomGrade, updateCustomGrade,
  hideWordFromLesson, getHiddenWordsForLesson, unhideWordFromLesson,
  addCustomList, getCustomListsForGrade,
} from './storage';

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
