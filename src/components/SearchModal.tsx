import { useState, useMemo } from 'react';
import { X, Search, Pencil, Trash2, Volume2, BookOpen, ChevronLeft } from 'lucide-react';
import { presetWordLists } from '../data/wordLists';
import { getCustomLists, getCustomWordsForList, deleteCustomWord, hideWord, applyOverridesAndFilter } from '../utils/storage';
import { Word, Subject } from '../types';
import EditWordModal from './EditWordModal';

interface SearchResult {
  word: Word;
  listName: string;
  subject: Subject;
  isCustom: boolean;
}

interface SearchModalProps {
  onClose: () => void;
}

function speak(text: string, lang: string) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang;
  utter.rate = 0.8;
  window.speechSynthesis.speak(utter);
}

export default function SearchModal({ onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [detailResult, setDetailResult] = useState<SearchResult | null>(null);
  const [detailWord, setDetailWord] = useState<Word | null>(null); // tracks edits in detail view
  const [editingWord, setEditingWord] = useState<{ word: Word; subject: Subject } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [updatedWords, setUpdatedWords] = useState<Map<string, Word>>(new Map());

  const allWords = useMemo<SearchResult[]>(() => {
    const results: SearchResult[] = [];
    for (const list of presetWordLists) {
      for (const word of applyOverridesAndFilter(list.words)) {
        results.push({ word, listName: list.name, subject: list.subject, isCustom: false });
      }
    }
    const customLists = getCustomLists();
    for (const meta of customLists) {
      const words = getCustomWordsForList(meta.id);
      for (const word of words) {
        results.push({ word, listName: meta.name, subject: meta.subject, isCustom: true });
      }
    }
    return results;
  }, []);

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allWords
      .filter(r => !deletedIds.has(r.word.id))
      .filter(r =>
        r.word.text.toLowerCase().includes(q) ||
        (r.word.pinyin ?? '').toLowerCase().includes(q) ||
        (r.word.meaning ?? '').toLowerCase().includes(q)
      )
      .map(r => ({ ...r, word: updatedWords.get(r.word.id) ?? r.word }));
  }, [query, allWords, deletedIds, updatedWords]);

  function handleDelete(wordId: string, isCustom: boolean) {
    if (isCustom) deleteCustomWord(wordId);
    else hideWord(wordId);
    setDeletedIds(prev => new Set(prev).add(wordId));
    setConfirmDeleteId(null);
    if (detailResult?.word.id === wordId) setDetailResult(null);
  }

  function handleSaved(updated: Word) {
    setUpdatedWords(prev => new Map(prev).set(updated.id, updated));
    setDetailWord(updated);
    setEditingWord(null);
  }

  function openDetail(r: SearchResult) {
    setDetailResult(r);
    setDetailWord(updatedWords.get(r.word.id) ?? r.word);
    setConfirmDeleteId(null);
  }

  // ── Detail view ────────────────────────────────────────────────────────────
  if (detailResult) {
    const w = detailWord ?? detailResult.word;
    const isChinese = detailResult.subject === 'chinese';
    const lang = isChinese ? 'zh-CN' : 'en-US';
    const accentText = isChinese ? 'text-[#5868A8]' : 'text-[#407898]';
    const accentLight = isChinese ? 'bg-[#F0F2FB]' : 'bg-[#EEF5FA]';
    const accentBtnBg = isChinese
      ? 'bg-[#8090C0] hover:bg-[#6878B0]'
      : 'bg-[#6898B8] hover:bg-[#507898]';
    const isConfirmingDelete = confirmDeleteId === w.id;

    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-16 px-4">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh]">

          {/* Header */}
          <div className="px-4 py-3 flex items-center gap-3 border-b border-stone-100">
            <button
              onClick={() => { setDetailResult(null); setDetailWord(null); setConfirmDeleteId(null); }}
              className="p-1 rounded-lg hover:bg-stone-100"
            >
              <ChevronLeft size={20} className="text-stone-500" />
            </button>
            <span className="flex-1 text-sm font-medium text-stone-500">
              {detailResult.listName}
            </span>
            {!isConfirmingDelete && (
              <div className="flex gap-1">
                <button
                  onClick={() => setEditingWord({ word: w, subject: detailResult.subject })}
                  className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
                  aria-label="编辑"
                >
                  <Pencil size={16} className="text-stone-400" />
                </button>
                <button
                  onClick={() => setConfirmDeleteId(w.id)}
                  className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
                  aria-label="删除"
                >
                  <Trash2 size={16} className="text-stone-400" />
                </button>
              </div>
            )}
            {isConfirmingDelete && (
              <div className="flex gap-1">
                <button
                  onClick={() => handleDelete(w.id, detailResult.isCustom)}
                  className="px-2.5 py-1 rounded-lg bg-[#D09098] text-white text-xs font-semibold"
                >
                  确认删除
                </button>
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="px-2.5 py-1 rounded-lg bg-stone-100 text-stone-600 text-xs font-semibold"
                >
                  取消
                </button>
              </div>
            )}
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-stone-100">
              <X size={18} className="text-stone-400" />
            </button>
          </div>

          {/* Word card */}
          <div className="overflow-y-auto flex-1 p-5">
            <div className={`${accentLight} rounded-2xl p-6 flex flex-col gap-4`}>

              <div className="text-center">
                <div className={`text-6xl font-bold ${accentText} leading-tight`}>
                  {w.text}
                </div>
                {w.pinyin && (
                  <div className="text-lg text-stone-400 mt-2 font-medium tracking-wide">
                    {w.pinyin}
                  </div>
                )}
                <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
                  {w.wordType && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      w.wordType === 'char'
                        ? 'bg-[#EEF5FA] text-[#407898]'
                        : w.wordType === 'word'
                        ? 'bg-[#EFF7EE] text-[#4A8842]'
                        : 'bg-[#F5F0FA] text-[#7060A0]'
                    }`}>
                      {w.wordType === 'char' ? '字' : w.wordType === 'word' ? '词' : '句'}
                    </span>
                  )}
                  {detailResult.isCustom && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#FBF5E8] text-[#9A8040]">
                      自定义
                    </span>
                  )}
                </div>
              </div>

              {w.meaning && (
                <div className="text-center text-stone-600 text-sm border-t border-white/60 pt-3">
                  {w.meaning}
                </div>
              )}

              {w.example && w.example !== w.text && (
                <div className="text-center text-stone-500 text-sm italic border-t border-white/60 pt-3">
                  例：{w.example}
                  {w.exampleMeaning && (
                    <span className="text-stone-400 not-italic block mt-0.5 text-xs">
                      {w.exampleMeaning}
                    </span>
                  )}
                </div>
              )}

              <div className="flex justify-center gap-3 border-t border-white/60 pt-3">
                <button
                  onClick={() => speak(w.text, lang)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium ${accentBtnBg} transition-colors shadow-sm`}
                >
                  <Volume2 size={16} />
                  朗读
                </button>
                {w.example && w.example !== w.text && (
                  <button
                    onClick={() => speak(w.example, lang)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-600 hover:bg-stone-700 text-white text-sm font-medium transition-colors shadow-sm"
                  >
                    <BookOpen size={16} />
                    例句
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {editingWord && (
          <EditWordModal
            word={editingWord.word}
            subject={editingWord.subject}
            onClose={() => setEditingWord(null)}
            onSaved={handleSaved}
          />
        )}
      </div>
    );
  }

  // ── Search results list ────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-16 px-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh]">

        <div className="px-4 py-3 flex items-center gap-3 border-b border-stone-100">
          <Search size={18} className="text-stone-400 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="输入汉字、拼音或英文单词…"
            className="flex-1 text-base outline-none placeholder:text-stone-300"
            autoFocus
          />
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-stone-100">
            <X size={18} className="text-stone-400" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {query.trim() === '' && (
            <div className="py-12 text-center text-stone-400 text-sm">
              搜索生字、词语或例句
            </div>
          )}

          {query.trim() !== '' && results.length === 0 && (
            <div className="py-12 text-center text-stone-400 text-sm">
              没有找到「{query.trim()}」
            </div>
          )}

          {results.map((r, i) => {
            const isConfirming = confirmDeleteId === r.word.id;
            return (
              <div
                key={`${r.word.id}-${i}`}
                className="border-b border-stone-50"
              >
                <button
                  onClick={() => openDetail(r)}
                  className="w-full px-4 py-3 text-left hover:bg-stone-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xl font-bold ${
                          r.subject === 'chinese' ? 'text-[#5868A8]' : 'text-[#407898]'
                        }`}>
                          {r.word.text}
                        </span>
                        {r.word.pinyin && (
                          <span className="text-sm text-stone-400">{r.word.pinyin}</span>
                        )}
                        {r.word.wordType && (
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                            r.word.wordType === 'char'
                              ? 'bg-[#EEF5FA] text-[#407898]'
                              : r.word.wordType === 'word'
                              ? 'bg-[#EFF7EE] text-[#4A8842]'
                              : 'bg-[#F5F0FA] text-[#7060A0]'
                          }`}>
                            {r.word.wordType === 'char' ? '字' : r.word.wordType === 'word' ? '词' : '句'}
                          </span>
                        )}
                        {r.isCustom && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-[#FBF5E8] text-[#9A8040]">
                            自定义
                          </span>
                        )}
                      </div>
                      {r.word.meaning && (
                        <div className="text-xs text-stone-500 mt-0.5">{r.word.meaning}</div>
                      )}
                      {r.word.example && r.word.example !== r.word.text && (
                        <div className="text-xs text-stone-400 mt-0.5 italic">例：{r.word.example}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        r.subject === 'chinese'
                          ? 'bg-[#F0F2FB] text-[#5868A8]'
                          : 'bg-[#EEF5FA] text-[#407898]'
                      }`}>
                        {r.listName}
                      </span>
                      {!isConfirming && (
                        <>
                          <button
                            onClick={() => setEditingWord({ word: r.word, subject: r.subject })}
                            className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
                          >
                            <Pencil size={14} className="text-stone-400" />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(r.word.id)}
                            className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
                          >
                            <Trash2 size={14} className="text-stone-400" />
                          </button>
                        </>
                      )}
                      {isConfirming && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleDelete(r.word.id, r.isCustom)}
                            className="px-2 py-1 rounded-lg bg-[#D09098] text-white text-xs font-semibold"
                          >
                            确认
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 rounded-lg bg-stone-100 text-stone-600 text-xs font-semibold"
                          >
                            取消
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              </div>
            );
          })}

          {results.length > 0 && (
            <div className="py-3 text-center text-xs text-stone-300">
              共 {results.length} 条结果
            </div>
          )}
        </div>
      </div>

      {editingWord && (
        <EditWordModal
          word={editingWord.word}
          subject={editingWord.subject}
          onClose={() => setEditingWord(null)}
          onSaved={updated => {
            setUpdatedWords(prev => new Map(prev).set(updated.id, updated));
            setEditingWord(null);
          }}
        />
      )}
    </div>
  );
}
