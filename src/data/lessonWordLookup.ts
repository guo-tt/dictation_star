import type { Word } from '../types';

export function lessonWords(gradeWords: Word[], texts: string[]): Word[] {
  return texts
    .map(t => gradeWords.find(w => w.text === t))
    .filter((w): w is Word => w !== undefined);
}
