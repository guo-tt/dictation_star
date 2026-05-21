import { pinyin } from 'pinyin-pro';

export function getDisplayPinyin(text: string, storedPinyin?: string): string {
  if (storedPinyin) return storedPinyin;
  if (!text) return '';
  try {
    return pinyin(text, { toneType: 'symbol', separator: ' ' });
  } catch {
    return '';
  }
}
