import { describe, it, expect } from 'vitest';
import { getDisplayPinyin } from './pinyin';

describe('getDisplayPinyin', () => {
  it('returns stored pinyin when provided', () => {
    expect(getDisplayPinyin('齐心协力', 'qí xīn xié lì')).toBe('qí xīn xié lì');
  });

  it('auto-generates pinyin when no stored value', () => {
    const result = getDisplayPinyin('你好');
    expect(result).toBeTruthy();
    expect(result).toContain('nǐ');
  });

  it('returns empty string for empty text', () => {
    expect(getDisplayPinyin('')).toBe('');
  });

  it('stored pinyin takes priority over auto-generated', () => {
    expect(getDisplayPinyin('长大', 'zhǎng dà')).toBe('zhǎng dà');
  });
});
