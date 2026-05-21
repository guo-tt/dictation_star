import { useState, useMemo } from 'react';
import { Pencil, X, Plus, Volume2 } from 'lucide-react';
import { Word } from '../types';
import { presetWordLists } from '../data/wordLists';
import {
  getCustomWordsForList,
  applyOverridesAndFilter,
  getHiddenWordsForLesson,
  hideWordFromLesson,
  deleteCustomWord,
  addCustomWord,
  getCustomLists,
} from '../utils/storage';
import { getDisplayPinyin } from '../utils/pinyin';
import EditWordModal from './EditWordModal';

interface LessonEditViewProps {
  listId: string;
  onBack: () => void;
}

function speakText(text: string) {
  if (!text || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'zh-CN';
  utter.rate = 0.8;
  window.speechSynthesis.speak(utter);
}

export default function LessonEditView({ listId, onBack: _onBack }: LessonEditViewProps) {
  const [version, setVersion] = useState(0);
  const [editingWord, setEditingWord] = useState<Word | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addText, setAddText] = useState('');
  const [addExample, setAddExample] = useState('');
  const [addError, setAddError] = useState('');

  const presetList = useMemo(
    () => presetWordLists.find(l => l.id === listId),
    [listId],
  );
  const isPreset = Boolean(presetList);

  const customListName = useMemo(
    () => getCustomLists().find(l => l.id === listId)?.name ?? '自定义课',
    [listId],
  );

  const lessonName = presetList
    ? `${presetList.name}${presetList.lessonTitle ?? ''}`
    : customListName;

  const words = useMemo(() => {
    const hidden = new Set(getHiddenWordsForLesson(listId));
    if (isPreset && presetList) {
      return applyOverridesAndFilter(presetList.words).filter(w => !hidden.has(w.id));
    }
    return getCustomWordsForList(listId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listId, isPreset, presetList, version]);

  function handleDelete(word: Word) {
    if (isPreset) {
      hideWordFromLesson(listId, word.id);
    } else {
      deleteCustomWord(word.id);
    }
    setVersion(v => v + 1);
  }

  function handleAddWord() {
    if (!addText.trim()) { setAddError('请输入词语'); return; }
    const word: Word = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      text: addText.trim(),
      pinyin: undefined,
      example: addExample.trim(),
      wordType: addText.trim().length === 1 ? 'char' : 'word',
      isCustom: true,
    };
    addCustomWord(word, listId, 'chinese');
    setAddText('');
    setAddExample('');
    setAddError('');
    setShowAddForm(false);
    setVersion(v => v + 1);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Lesson name header */}
      <div className="px-4 pt-3 pb-2 bg-stone-50 border-b border-stone-100">
        <div className="text-xs text-stone-400 font-medium">{lessonName}</div>
        <div className="text-sm text-stone-500 mt-0.5">{words.length} 个词语</div>
      </div>

      {/* Word list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
        {words.length === 0 && !showAddForm && (
          <div className="text-center py-12 text-stone-400 text-sm">
            暂无词语，点击下方「添加词语」开始
          </div>
        )}
        {words.map(word => (
          <div
            key={word.id}
            className="flex items-center gap-3 p-3 bg-white rounded-2xl border-2 border-stone-200"
          >
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-stone-800 text-base">{word.text}</div>
              <div className="text-xs text-stone-400 mt-0.5">
                {getDisplayPinyin(word.text, word.pinyin)}
              </div>
              {word.example && (
                <div className="text-xs text-stone-500 mt-1 italic truncate">
                  例：{word.example}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {word.example && (
                <button
                  onClick={() => speakText(word.example)}
                  className="p-2 rounded-xl bg-stone-50 border border-stone-200 text-stone-400 hover:text-stone-600"
                  aria-label="朗读例句"
                >
                  <Volume2 size={14} />
                </button>
              )}
              <button
                onClick={() => setEditingWord(word)}
                className="p-2 rounded-xl bg-stone-50 border border-stone-200 text-stone-400 hover:text-[#8090C0]"
                aria-label="编辑"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => handleDelete(word)}
                className="p-2 rounded-xl bg-stone-50 border border-stone-200 text-stone-400 hover:text-red-400"
                aria-label="删除"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ))}

        {/* Inline add form */}
        {showAddForm && (
          <div className="p-4 bg-[#F0F2FB] rounded-2xl border-2 border-[#B0BCDC] flex flex-col gap-3">
            <input
              autoFocus
              type="text"
              placeholder="词语（必填）"
              value={addText}
              onChange={e => { setAddText(e.target.value); setAddError(''); }}
              className="w-full border-2 border-stone-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 ring-[#8090C0] focus:border-transparent"
            />
            <input
              type="text"
              placeholder="例句（可选）"
              value={addExample}
              onChange={e => setAddExample(e.target.value)}
              className="w-full border-2 border-stone-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 ring-[#8090C0] focus:border-transparent"
            />
            {addError && <p className="text-red-500 text-xs">{addError}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => { setShowAddForm(false); setAddText(''); setAddExample(''); setAddError(''); }}
                className="flex-1 py-2 rounded-xl border-2 border-stone-200 text-stone-600 text-sm font-semibold"
              >
                取消
              </button>
              <button
                onClick={handleAddWord}
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-[#7888C8] to-[#A8B8DC] text-white text-sm font-bold"
              >
                确认添加
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom add button */}
      {!showAddForm && (
        <div className="px-4 py-3 border-t border-stone-100 bg-white">
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-[#7888C8] to-[#A8B8DC] text-white font-bold text-sm"
          >
            <Plus size={18} />
            添加词语
          </button>
        </div>
      )}

      {/* Edit word modal */}
      {editingWord && (
        <EditWordModal
          word={editingWord}
          subject="chinese"
          onClose={() => setEditingWord(null)}
          onSaved={() => { setEditingWord(null); setVersion(v => v + 1); }}
        />
      )}
    </div>
  );
}
