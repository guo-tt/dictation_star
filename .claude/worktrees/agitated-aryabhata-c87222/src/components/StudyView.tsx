import { useState } from 'react';
import { ChevronLeft, ChevronRight, Volume2, BookOpen, Pencil, Trash2 } from 'lucide-react';
import { Word, WordList, DictationMode, FilterMode, Subject } from '../types';
import { getWordStats, deleteCustomWord } from '../utils/storage';
import EditWordModal from './EditWordModal';

interface StudyViewProps {
  wordList: WordList;
  filterMode: FilterMode;
  subject: Subject;
  dictationMode: DictationMode;
  onStartDictation: () => void;
}

function speak(text: string, lang: string) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang;
  utter.rate = 0.8;
  window.speechSynthesis.speak(utter);
}

function buildWordList(wordList: WordList, filterMode: FilterMode): Word[] {
  const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;
  let ws = [...wordList.words];
  if (filterMode === 'error-rate') {
    ws.sort((a, b) => {
      const sa = getWordStats(a.id);
      const sb = getWordStats(b.id);
      const errA = sa.total === 0 ? 0 : (sa.total - sa.correct) / sa.total;
      const errB = sb.total === 0 ? 0 : (sb.total - sb.correct) / sb.total;
      return errB - errA;
    });
  } else if (filterMode === 'not-practiced') {
    const cutoff = Date.now() - ONE_MONTH_MS;
    ws = ws.filter(w => {
      const stats = getWordStats(w.id);
      if (!stats.lastPracticed) return true;
      return new Date(stats.lastPracticed).getTime() < cutoff;
    });
  }
  return ws;
}

export default function StudyView({
  wordList, filterMode, subject, onStartDictation,
}: StudyViewProps) {
  const isChinese = subject === 'chinese';
  const lang = isChinese ? 'zh-CN' : 'en-US';

  const [words, setWords] = useState<Word[]>(() => buildWordList(wordList, filterMode));
  const [index, setIndex] = useState(0);
  const [showEdit, setShowEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const word = words[index];

  function handleDelete() {
    deleteCustomWord(word.id);
    const next = words.filter((_, i) => i !== index);
    setWords(next);
    setConfirmDelete(false);
    if (index >= next.length && next.length > 0) setIndex(next.length - 1);
  }

  function handleSaved(updated: Word) {
    const next = [...words];
    next[index] = updated;
    setWords(next);
    setShowEdit(false);
  }

  const accentText = isChinese ? 'text-[#5868A8]' : 'text-[#407898]';
  const accentBg = isChinese ? 'bg-[#8090C0]' : 'bg-[#6898B8]';
  const accentLight = isChinese ? 'bg-[#F0F2FB]' : 'bg-[#EEF5FA]';
  const accentBtnBg = isChinese
    ? 'bg-[#8090C0] hover:bg-[#6878B0]'
    : 'bg-[#6898B8] hover:bg-[#507898]';
  const accentGradient = isChinese
    ? 'from-[#7888C8] to-[#A8B8DC]'
    : 'from-[#6090B0] to-[#8CB4CC]';

  if (words.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-10 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h3 className="text-xl font-bold text-stone-700">没有符合条件的词语</h3>
        <p className="text-stone-400 text-sm mt-2">请返回调整筛选条件</p>
      </div>
    );
  }

  return (
    <>
    <div className="p-4 md:p-8 pb-8 flex flex-col gap-4 max-w-xl mx-auto">

      {/* Progress bar + 开始听写 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-stone-500">
            {index + 1} / {words.length}
          </span>
          <div className="w-32 h-1.5 bg-stone-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${accentGradient} transition-all duration-300`}
              style={{ width: `${((index + 1) / words.length) * 100}%` }}
            />
          </div>
        </div>
        <button
          onClick={onStartDictation}
          className={`px-4 py-2 rounded-xl text-white text-sm font-bold bg-gradient-to-r ${accentGradient} shadow-sm`}
        >
          开始听写 →
        </button>
      </div>

      {/* Word card */}
      <div className={`${accentLight} rounded-2xl p-6 flex flex-col gap-4`}>

        {/* Word + badges + edit/delete */}
        <div className="text-center relative">
          {word.isCustom && (
            <div className="absolute top-0 right-0 flex gap-1">
              {!confirmDelete ? (
                <>
                  <button
                    onClick={() => setShowEdit(true)}
                    className="p-1.5 rounded-xl bg-white/70 hover:bg-white border border-stone-200 transition-colors"
                    aria-label="编辑"
                  >
                    <Pencil size={14} className="text-stone-400" />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="p-1.5 rounded-xl bg-white/70 hover:bg-white border border-stone-200 transition-colors"
                    aria-label="删除"
                  >
                    <Trash2 size={14} className="text-stone-400" />
                  </button>
                </>
              ) : (
                <div className="flex gap-1">
                  <button
                    onClick={handleDelete}
                    className="px-2.5 py-1 rounded-lg bg-[#D09098] text-white text-xs font-semibold"
                  >
                    确认删除
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="px-2.5 py-1 rounded-lg bg-stone-200 text-stone-600 text-xs font-semibold"
                  >
                    取消
                  </button>
                </div>
              )}
            </div>
          )}

          <div className={`text-6xl font-bold ${accentText} leading-tight`}>
            {word.text}
          </div>
          {word.pinyin && (
            <div className="text-lg text-stone-400 mt-2 font-medium tracking-wide">
              {word.pinyin}
            </div>
          )}
          <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
            {word.wordType && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                word.wordType === 'char'
                  ? 'bg-[#EEF5FA] text-[#407898]'
                  : word.wordType === 'word'
                  ? 'bg-[#EFF7EE] text-[#4A8842]'
                  : 'bg-[#F5F0FA] text-[#7060A0]'
              }`}>
                {word.wordType === 'char' ? '字' : word.wordType === 'word' ? '词' : '句'}
              </span>
            )}
            {word.isCustom && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#FBF5E8] text-[#9A8040]">
                自定义
              </span>
            )}
          </div>
        </div>

        {/* Meaning */}
        {word.meaning && (
          <div className="text-center text-stone-600 text-sm border-t border-white/60 pt-3">
            {word.meaning}
          </div>
        )}

        {/* Example */}
        {word.example && word.example !== word.text && (
          <div className="text-center text-stone-500 text-sm italic border-t border-white/60 pt-3">
            例：{word.example}
            {word.exampleMeaning && (
              <span className="text-stone-400 not-italic block mt-0.5 text-xs">
                {word.exampleMeaning}
              </span>
            )}
          </div>
        )}

        {/* Audio buttons */}
        <div className="flex justify-center gap-3 border-t border-white/60 pt-3">
          <button
            onClick={() => speak(word.text, lang)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium ${accentBtnBg} transition-colors shadow-sm`}
          >
            <Volume2 size={16} />
            朗读
          </button>
          {word.example && word.example !== word.text && (
            <button
              onClick={() => speak(word.example, lang)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-600 hover:bg-stone-700 text-white text-sm font-medium transition-colors shadow-sm"
            >
              <BookOpen size={16} />
              例句
            </button>
          )}
        </div>
      </div>

      {/* Number badge */}
      <div className="flex justify-center">
        <div className={`${accentBg} text-white text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center`}>
          {index + 1}
        </div>
      </div>

      {/* Prev / Next */}
      <div className="flex gap-3">
        <button
          onClick={() => { setIndex(i => Math.max(0, i - 1)); setConfirmDelete(false); }}
          disabled={index === 0}
          className="flex-1 py-3 rounded-2xl border-2 border-stone-200 text-stone-600 font-semibold flex items-center justify-center gap-1 disabled:opacity-30 hover:bg-stone-50 transition-colors"
        >
          <ChevronLeft size={18} />
          上一个
        </button>
        {index < words.length - 1 ? (
          <button
            onClick={() => { setIndex(i => i + 1); setConfirmDelete(false); }}
            className={`flex-1 py-3 rounded-2xl text-white font-bold bg-gradient-to-r ${accentGradient} flex items-center justify-center gap-1 shadow-sm`}
          >
            下一个
            <ChevronRight size={18} />
          </button>
        ) : (
          <button
            onClick={onStartDictation}
            className={`flex-1 py-3 rounded-2xl text-white font-bold bg-gradient-to-r ${accentGradient} shadow-sm`}
          >
            开始听写 →
          </button>
        )}
      </div>
    </div>

    {showEdit && (
      <EditWordModal
        word={word}
        subject={subject}
        onClose={() => setShowEdit(false)}
        onSaved={handleSaved}
      />
    )}
    </>
  );
}
