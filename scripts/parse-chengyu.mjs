import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const docxPath = join(root, 'data', '小学高级华文成语表.docx');

// DOCX is a ZIP; extract word/document.xml
const xmlBuf = execSync(`unzip -p "${docxPath}" "word/document.xml"`);
const xml = xmlBuf.toString('utf-8');

// Each <w:p> is one paragraph in the Word doc
const paragraphs = xml.split('</w:p>').map(p =>
  p.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
).filter(Boolean);

// Normalize full-width digits to ASCII
function normalizeDigits(s) {
  return s.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFF10 + 0x30));
}

// Grade/lesson marker: digits（digits[)）]
// Handles full-width digits and mixed closing brackets
const GRADE_LESSON_RE = /^([0-9]+)（([0-9]+)[)）]$/;

// Try to parse a paragraph as a grade/lesson marker after normalizing digits
function parseGradeLesson(text) {
  const normalized = normalizeDigits(text);
  const m = normalized.match(GRADE_LESSON_RE);
  if (!m) return null;
  const grade = parseInt(m[1], 10);
  const lesson = parseInt(m[2], 10);
  if (grade < 3 || grade > 6) return null;
  return { grade, lesson };
}

// Detect if a paragraph is an idiom (not a grade/lesson marker and not a sentence)
// An idiom: Chinese characters (possibly with a mid-word comma like 人非圣贤，谁能无过),
// but never contains sentence-ending punctuation (。！？) or Chinese quotation marks (""'').
// Must be followed immediately by a grade/lesson marker.
function isIdiom(text, nextText) {
  // If it's a grade/lesson marker itself, it's not an idiom
  if (parseGradeLesson(normalizeDigits(text)) !== null) return false;
  // Sentences contain punctuation that idioms never have
  if (/[。！？""''…]/.test(text)) return false;
  // Next paragraph must be a grade/lesson marker
  if (!nextText) return false;
  return parseGradeLesson(normalizeDigits(nextText)) !== null;
}

// Build idiom list by sequential state machine
const idiomMap = new Map(); // idiom text -> { grade, lesson, sentence }[]
const idiomOrder = [];

let currentIdiom = null;
let pendingGradeLesson = null; // { grade, lesson } waiting for a sentence

for (let i = 0; i < paragraphs.length; i++) {
  const text = paragraphs[i];
  const nextText = paragraphs[i + 1] || '';

  // Check if this paragraph is a grade/lesson marker
  const gl = parseGradeLesson(normalizeDigits(text));
  if (gl) {
    // Set pending grade/lesson for the next sentence
    pendingGradeLesson = gl;
    continue;
  }

  // Check if this paragraph is an idiom line
  if (isIdiom(text, nextText)) {
    // If there was a pending grade/lesson with no sentence, discard it (no example available)
    pendingGradeLesson = null;
    currentIdiom = text;
    if (!idiomMap.has(currentIdiom)) {
      idiomMap.set(currentIdiom, []);
      idiomOrder.push(currentIdiom);
    }
    continue;
  }

  // Otherwise, treat as an example sentence
  if (pendingGradeLesson && currentIdiom) {
    const sentence = text.trim();
    if (sentence) {
      idiomMap.get(currentIdiom).push({
        grade: pendingGradeLesson.grade,
        lesson: pendingGradeLesson.lesson,
        sentence,
      });
    }
    pendingGradeLesson = null;
  }
}

// Build ChengYu[] with sequential IDs; skip idioms with no examples
const chengyuList = idiomOrder
  .map((text, i) => ({ id: `cy-${i}`, text, examples: idiomMap.get(text) }))
  .filter(cy => cy.examples.length > 0);

// Serialize each idiom to TypeScript
function serializeExamples(examples) {
  return examples.map(e =>
    `      { grade: ${e.grade}, lesson: ${e.lesson}, sentence: ${JSON.stringify(e.sentence)} }`
  ).join(',\n');
}

const entries = chengyuList.map(cy =>
  `  {\n    id: ${JSON.stringify(cy.id)},\n    text: ${JSON.stringify(cy.text)},\n    examples: [\n${serializeExamples(cy.examples)},\n    ],\n  }`
).join(',\n');

const output = `import type { Word } from '../types';

export interface ChengYuExample {
  grade: 3 | 4 | 5 | 6;
  lesson: number;
  sentence: string;
}

export interface ChengYu {
  id: string;
  text: string;
  examples: ChengYuExample[];
}

export function chengyuToWords(list: ChengYu[]): Word[] {
  return list.map(cy => ({
    id: cy.id,
    text: cy.text,
    pinyin: undefined,
    example: cy.examples[0]?.sentence ?? '',
    wordType: 'word' as const,
    isCustom: false,
  }));
}

export function filterChengyuByGrade(
  grade: 3 | 4 | 5 | 6 | 'all',
  list: ChengYu[] = chengyuList,
): ChengYu[] {
  if (grade === 'all') return list;
  return list.filter(cy => cy.examples.some(e => e.grade === grade));
}

export const chengyuList: ChengYu[] = [
${entries},
];
`;

const outPath = join(root, 'src', 'data', 'chengyu.ts');
writeFileSync(outPath, output, 'utf-8');
console.log(`Wrote ${chengyuList.length} idioms to ${outPath}`);
