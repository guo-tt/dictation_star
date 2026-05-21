import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { pinyin } from 'pinyin-pro';
import { Word, Subject } from '../types';
import { updateCustomWord, saveWordOverride } from '../utils/storage';

interface EditWordModalProps {
  word: Word;
  subject: Subject;
  onClose: () => void;
  onSaved: (updated: Word) => void;
}

function autoPinyin(text: string): string {
  try { return pinyin(text, { toneType: 'symbol', separator: ' ' }); }
  catch { return ''; }
}

function speakText(text: string) {
  if (!text || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'zh-CN';
  utter.rate = 0.8;
  window.speechSynthesis.speak(utter);
}

export default function EditWordModal({ word, subject, onClose, onSaved }: EditWordModalProps) {
  const isChinese = subject === 'chinese';

  const [text, setText] = useState(word.text);
  const [pinyinVal, setPinyinVal] = useState(word.pinyin ?? '');
  const [example, setExample] = useState(word.example);
  const [exampleMeaning, setExampleMeaning] = useState(word.exampleMeaning ?? '');

  // Auto-update pinyin when text changes
  useEffect(() => {
    if (isChinese && text.trim()) {
      setPinyinVal(autoPinyin(text.trim()));
    }
  }, [text, isChinese]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    const updates: Partial<Word> = {
      text: text.trim(),
      example: example.trim(),
      pinyin: isChinese ? pinyinVal.trim() || undefined : undefined,
      exampleMeaning: exampleMeaning.trim() || undefined,
    };
    if (word.isCustom) updateCustomWord(word.id, updates);
    else saveWordOverride(word.id, updates);
    onSaved({ ...word, ...updates });
  }

  const accentBg = isChinese
    ? 'bg-gradient-to-r from-[#7888C8] to-[#A8B8DC]'
    : 'bg-gradient-to-r from-[#6090B0] to-[#8CB4CC]';
  const accentRing = isChinese ? 'ring-[#8090C0]' : 'ring-[#6898B8]';
  const accentBtn = isChinese ? 'from-[#7888C8] to-[#A8B8DC]' : 'from-[#6090B0] to-[#8CB4CC]';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">

        <div className={`${accentBg} px-5 py-4 flex items-center justify-between flex-shrink-0`}>
          <h2 className="text-white font-bold text-lg">编辑词语</h2>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30">
            <X size={18} className="text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4 overflow-y-auto">

          <div>
            <label className="block text-sm font-semibold text-stone-600 mb-1">
              {isChinese ? '词语' : '单词'}
            </label>
            <input
              type="text"
              value={text}
              onChange={e => setText(e.target.value)}
              className={`w-full border-2 rounded-xl px-4 py-2.5 text-sm outline-none transition focus:ring-2 ${accentRing} border-stone-200 focus:border-transparent`}
              autoFocus
            />
          </div>

          {isChinese && (
            <div>
              <label className="block text-sm font-semibold text-stone-600 mb-1">拼音</label>
              <input
                type="text"
                value={pinyinVal}
                onChange={e => setPinyinVal(e.target.value)}
                className={`w-full border-2 rounded-xl px-4 py-2.5 text-sm outline-none transition focus:ring-2 ${accentRing} border-stone-200 focus:border-transparent`}
              />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-semibold text-stone-600">例句 <span className="font-normal text-stone-400">（可选）</span></label>
              {example.trim() && (
                <button
                  type="button"
                  onClick={() => speakText(example)}
                  className="text-xs text-[#8090C0] hover:text-[#5868A8] flex items-center gap-1"
                >
                  ▶ 试听
                </button>
              )}
            </div>
            <textarea
              rows={3}
              value={example}
              onChange={e => setExample(e.target.value)}
              className={`w-full border-2 rounded-xl px-4 py-3 text-sm outline-none transition resize-none focus:ring-2 ${accentRing} border-stone-200 focus:border-transparent`}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-600 mb-1">
              例句释义 <span className="font-normal text-stone-400">（可选）</span>
            </label>
            <input
              type="text"
              value={exampleMeaning}
              onChange={e => setExampleMeaning(e.target.value)}
              className={`w-full border-2 rounded-xl px-4 py-2.5 text-sm outline-none transition focus:ring-2 ${accentRing} border-stone-200 focus:border-transparent`}
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button" onClick={onClose}
              className="flex-1 py-3 rounded-2xl border-2 border-stone-200 text-stone-600 font-semibold"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!text.trim()}
              className={`flex-1 py-3 rounded-2xl text-white font-bold bg-gradient-to-r ${accentBtn} disabled:opacity-40`}
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
