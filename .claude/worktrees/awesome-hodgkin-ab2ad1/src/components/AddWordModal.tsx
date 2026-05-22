import { useState, useMemo, useId } from 'react';
import { X } from 'lucide-react';
import { pinyin } from 'pinyin-pro';
import { Subject, Word, WordType, WordList } from '../types';
import { addCustomWord } from '../utils/storage';

interface AddWordModalProps {
  subject: Subject;
  lists: WordList[];
  defaultListId: string;
  onClose: () => void;
  onAdded: () => void;
}

type InputMode = 'words' | 'sentence';

interface ParsedItem {
  text: string;
  example: string;
  pinyin?: string;
}

function autoPinyin(text: string): string {
  try { return pinyin(text, { toneType: 'symbol', separator: ' ' }); }
  catch { return ''; }
}

/** Parse lines in format  "词语|例句"  or just  "词语" */
function parseWordLines(raw: string, isChinese: boolean): ParsedItem[] {
  return raw
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)
    .map(line => {
      const idx = line.indexOf('|');
      const text = idx === -1 ? line : line.slice(0, idx).trim();
      const example = idx === -1 ? '' : line.slice(idx + 1).trim();
      return { text, example, pinyin: isChinese ? autoPinyin(text) : undefined };
    })
    .filter(item => item.text.length > 0);
}

/** Each non-empty line is one sentence */
function parseSentenceLines(raw: string): ParsedItem[] {
  return raw
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)
    .map(text => ({ text, example: text }));
}

export default function AddWordModal({
  subject, lists, defaultListId, onClose, onAdded,
}: AddWordModalProps) {
  const uid = useId();
  const isChinese = subject === 'chinese';

  const [inputMode, setInputMode] = useState<InputMode>('words');
  const [rawInput, setRawInput] = useState('');
  const [listId, setListId] = useState(defaultListId || lists[0]?.id || '');
  const [error, setError] = useState('');

  const isSentenceMode = isChinese && inputMode === 'sentence';

  const parsed = useMemo<ParsedItem[]>(() => {
    if (!rawInput.trim()) return [];
    return isSentenceMode
      ? parseSentenceLines(rawInput)
      : parseWordLines(rawInput, isChinese);
  }, [rawInput, isSentenceMode, isChinese]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (parsed.length === 0) { setError('请输入内容'); return; }

    parsed.forEach((item, i) => {
      const wordType: WordType = isSentenceMode
        ? 'sentence'
        : isChinese
        ? (item.text.length === 1 ? 'char' : 'word')
        : 'word';

      const word: Word = {
        id: `custom-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 5)}`,
        text: item.text,
        pinyin: item.pinyin || undefined,
        example: item.example || item.text,
        wordType,
        isCustom: true,
      };
      addCustomWord(word, listId, subject);
    });

    onAdded();
    onClose();
  }

  const accentBg = isChinese
    ? 'bg-gradient-to-r from-[#7888C8] to-[#A8B8DC]'
    : 'bg-gradient-to-r from-[#6090B0] to-[#8CB4CC]';
  const accentRing = isChinese ? 'ring-[#8090C0]' : 'ring-[#6898B8]';
  const accentTabActive = isChinese ? 'bg-[#8090C0] text-white' : 'bg-[#6898B8] text-white';
  const accentBtnBg = isChinese ? 'from-[#7888C8] to-[#A8B8DC]' : 'from-[#6090B0] to-[#8CB4CC]';

  const placeholder = isSentenceMode
    ? '春天来了，花儿都开了。\n我爱我的家人和朋友。'
    : isChinese
    ? '苹果|我喜欢吃苹果。\n香蕉|香蕉是黄色的。\n梨子'
    : 'apple|I eat an apple every day.\nbeautiful|The flower is beautiful.\njump';

  const submitLabel = parsed.length > 1
    ? `导入 ${parsed.length} 个${isSentenceMode ? '句子' : isChinese ? '词语' : '单词'}`
    : isSentenceMode ? '添加句子' : isChinese ? '添加词语' : 'Add Word';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className={`${accentBg} px-5 py-4 flex items-center justify-between flex-shrink-0`}>
          <h2 className="text-white font-bold text-lg">
            {isChinese ? '添加生字 / 词语 / 句子' : 'Add Words'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30">
            <X size={18} className="text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4 overflow-y-auto">

          {/* Chinese type tabs */}
          {isChinese && (
            <div>
              <div className="bg-stone-100 rounded-xl p-1 flex gap-1">
                {(['words', 'sentence'] as InputMode[]).map(m => (
                  <button
                    key={m} type="button"
                    onClick={() => { setInputMode(m); setRawInput(''); setError(''); }}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                      inputMode === m ? accentTabActive : 'text-stone-500'
                    }`}
                  >
                    {m === 'words' ? '生字 / 词语' : '句子'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Format guide */}
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs text-stone-500 leading-relaxed">
            {isSentenceMode ? (
              <>
                <p className="font-semibold text-stone-600 mb-1">格式：每行一个句子</p>
                <p className="font-mono text-stone-400">春天来了，花儿都开了。</p>
                <p className="font-mono text-stone-400">我爱我的家人和朋友。</p>
              </>
            ) : isChinese ? (
              <>
                <p className="font-semibold text-stone-600 mb-1">格式：每行一条，词语和例句用 <code className="bg-stone-200 px-1 rounded">|</code> 分隔（例句可省略）</p>
                <p className="font-mono text-stone-400">苹果|我喜欢吃苹果。</p>
                <p className="font-mono text-stone-400">香蕉|香蕉是黄色的。</p>
                <p className="font-mono text-stone-400">梨子</p>
              </>
            ) : (
              <>
                <p className="font-semibold text-stone-600 mb-1">Format: one per line, word and example separated by <code className="bg-stone-200 px-1 rounded">|</code> (example optional)</p>
                <p className="font-mono text-stone-400">apple|I eat an apple every day.</p>
                <p className="font-mono text-stone-400">beautiful|The flower is beautiful.</p>
                <p className="font-mono text-stone-400">jump</p>
              </>
            )}
          </div>

          {/* Input */}
          <div>
            <label htmlFor={`${uid}-input`} className="block text-sm font-semibold text-stone-600 mb-1">
              {isSentenceMode ? '输入句子' : isChinese ? '输入词语' : 'Enter words'}
            </label>
            <textarea
              id={`${uid}-input`}
              rows={5}
              value={rawInput}
              onChange={e => { setRawInput(e.target.value); setError(''); }}
              placeholder={placeholder}
              className={`w-full border-2 rounded-xl px-4 py-3 text-sm outline-none transition resize-none focus:ring-2 ${accentRing} border-stone-200 focus:border-transparent font-mono leading-relaxed`}
              autoFocus
            />
          </div>

          {/* Preview */}
          {parsed.length > 0 && (
            <div className="bg-stone-50 rounded-xl p-3 max-h-44 overflow-y-auto">
              <p className="text-xs text-stone-400 mb-2">
                预览 · {parsed.length} 条
              </p>
              <div className="flex flex-col gap-1.5">
                {parsed.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-stone-400 text-xs w-5 text-right flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-stone-800">{item.text}</span>
                      {item.pinyin && (
                        <span className="text-stone-400 text-xs ml-1.5">{item.pinyin}</span>
                      )}
                      {item.example && item.example !== item.text && (
                        <span className="text-stone-500 text-xs ml-1.5">— {item.example}</span>
                      )}
                      {!item.example && !isSentenceMode && (
                        <span className="text-amber-400 text-xs ml-1.5">（无例句）</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Target list */}
          <div>
            <label htmlFor={`${uid}-list`} className="block text-sm font-semibold text-stone-600 mb-1">
              添加到词单
            </label>
            <select
              id={`${uid}-list`}
              value={listId}
              onChange={e => setListId(e.target.value)}
              className={`w-full border-2 rounded-xl px-4 py-2.5 outline-none transition focus:ring-2 ${accentRing} border-stone-200 focus:border-transparent bg-white`}
            >
              {lists.filter(l => !l.isVirtual).map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button" onClick={onClose}
              className="flex-1 py-3 rounded-2xl border-2 border-stone-200 text-stone-600 font-semibold"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={parsed.length === 0}
              className={`flex-1 py-3 rounded-2xl text-white font-bold bg-gradient-to-r ${accentBtnBg} disabled:opacity-40`}
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
