import { useState, useCallback, useMemo } from 'react';
import { Volume2, BookOpen, Eye, EyeOff, Pencil, Trash2 } from 'lucide-react';
import { Word, DictationMode, Subject } from '../types';
import { getWordStats, deleteCustomWord, clearWordRecord } from '../utils/storage';
import { playSound } from '../utils/sound';
import { getDisplayPinyin } from '../utils/pinyin';
import EditWordModal from './EditWordModal';
import ExampleEditor from './ExampleEditor';

interface WordCardProps {
  word: Word;
  index: number;
  dictationMode: DictationMode;
  subject: Subject;
  onMark?: (word: Word, correct: boolean) => void;
  pendingResult: boolean | null;
  locked?: boolean;
}

function speak(text: string, lang: string, rate = 0.8) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang;
  utter.rate = rate;
  window.speechSynthesis.speak(utter);
}

function formatDuration(ms: number): string {
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

function formatInterval(ms: number): string {
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}分钟`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时`;
  const days = Math.floor(hours / 24);
  return `${days}天`;
}

export default function WordCard({ word, index, dictationMode, subject, onMark, pendingResult, locked }: WordCardProps) {
  const isChinese = subject === 'chinese';
  const lang = isChinese ? 'zh-CN' : 'en-US';

  const [localWord, setLocalWord] = useState(word);
  const [deleted, setDeleted] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [statsVersion, setStatsVersion] = useState(0);
  const stats = useMemo(() => getWordStats(localWord.id), [localWord.id, statsVersion]);

  const handleMark = useCallback((correct: boolean) => {
    if (locked) return;
    if (pendingResult === correct) return;
    playSound(correct ? 'correct' : 'wrong');
    onMark?.(localWord, correct);
  }, [locked, pendingResult, localWord, onMark]);

  function playWord() { speak(localWord.text, lang); }
  function playExample() {
    if (localWord.example) speak(localWord.example, lang);
  }

  function handleDelete() {
    deleteCustomWord(localWord.id);
    setDeleted(true);
  }

  const timeSince = useMemo(() => {
    if (!stats.lastPracticed) return null;
    return formatDuration(Date.now() - new Date(stats.lastPracticed).getTime());
  }, [stats.lastPracticed, statsVersion]);

  const showText = dictationMode === 'parent' || revealed;
  const isChengyu = localWord.id.startsWith('cy-');

  // Accent colors
  const accentBg = isChinese ? 'bg-[#8090C0]' : 'bg-[#6898B8]';
  const accentBorder = isChinese ? 'border-[#B0BCDC]' : 'border-[#A0C0D8]';
  const accentText = isChinese ? 'text-[#5868A8]' : 'text-[#407898]';
  const accentLight = isChinese ? 'bg-[#F0F2FB]' : 'bg-[#EEF5FA]';
  const accentBtnBg = isChinese
    ? 'bg-[#8090C0] hover:bg-[#6878B0] active:bg-[#5060A0]'
    : 'bg-[#6898B8] hover:bg-[#507898] active:bg-[#407080]';

  if (deleted) return null;

  return (
    <>
    <div className={`bg-white rounded-2xl shadow-sm border ${accentBorder} overflow-hidden`}>
      {/* Index badge + word text area */}
      <div className={`${accentLight} px-4 pt-4 pb-3`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Index number */}
            <div className={`${accentBg} text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5`}>
              {index + 1}
            </div>

            <div className="flex-1 min-w-0">
              {/* Word display */}
              {showText ? (
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-3xl font-bold ${accentText} leading-none`}>
                      {localWord.text}
                    </span>
                    {localWord.wordType && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                        localWord.wordType === 'char'
                          ? 'bg-[#EEF5FA] text-[#407898]'
                          : localWord.wordType === 'word'
                          ? 'bg-[#EFF7EE] text-[#4A8842]'
                          : 'bg-[#F5F0FA] text-[#7060A0]'
                      }`}>
                        {localWord.wordType === 'char' ? '字' : localWord.wordType === 'word' ? '词' : '句'}
                      </span>
                    )}
                    {localWord.isCustom && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-[#FBF5E8] text-[#9A8040] font-medium">
                        自定义
                      </span>
                    )}
                  </div>
                  {showText && (
                    <div className="text-sm text-stone-400 mt-0.5 font-medium">
                      {getDisplayPinyin(localWord.text, localWord.pinyin)}
                    </div>
                  )}
                  {localWord.meaning && (
                    <div className="text-xs text-stone-500 mt-1">{localWord.meaning}</div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="h-9 w-24 rounded-lg bg-stone-200 animate-pulse" />
                  <span className="text-xs text-stone-400">（已隐藏）</span>
                </div>
              )}
            </div>
          </div>

          {/* Top-right action buttons */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {localWord.isCustom && !confirmDelete && (
              <>
                <button
                  onClick={() => setShowEdit(true)}
                  className="p-2 rounded-xl bg-white/70 hover:bg-white active:bg-stone-100 transition-colors border border-stone-200"
                  aria-label="编辑"
                >
                  <Pencil size={15} className="text-stone-400" />
                </button>
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="p-2 rounded-xl bg-white/70 hover:bg-white active:bg-stone-100 transition-colors border border-stone-200"
                  aria-label="删除"
                >
                  <Trash2 size={15} className="text-stone-400" />
                </button>
              </>
            )}
            {localWord.isCustom && confirmDelete && (
              <div className="flex gap-1">
                <button
                  onClick={handleDelete}
                  className="px-2.5 py-1 rounded-lg bg-[#D09098] text-white text-xs font-semibold"
                >
                  确认删除
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-2.5 py-1 rounded-lg bg-stone-100 text-stone-600 text-xs font-semibold"
                >
                  取消
                </button>
              </div>
            )}
            {dictationMode === 'student' && (
              <button
                onClick={() => setRevealed(r => !r)}
                className="p-2 rounded-xl bg-white/70 hover:bg-white active:bg-stone-100 transition-colors border border-stone-200"
                aria-label={revealed ? '隐藏词语' : '显示词语'}
              >
                {revealed ? (
                  <EyeOff size={18} className="text-stone-500" />
                ) : (
                  <Eye size={18} className="text-stone-500" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Audio buttons */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={playWord}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-sm font-medium ${accentBtnBg} transition-colors shadow-sm`}
          >
            <Volume2 size={16} />
            <span>朗读</span>
          </button>
          {localWord.example && (
            <button
              onClick={playExample}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-600 hover:bg-stone-700 active:bg-stone-800 text-white text-sm font-medium transition-colors shadow-sm"
            >
              <BookOpen size={16} />
              <span>例句</span>
            </button>
          )}
        </div>

        {/* Example sentence preview (in parent mode) */}
        {showText && (
          <ExampleEditor
            wordId={localWord.id}
            original={localWord.example ?? ''}
            addOnly={isChengyu}
            onSaved={sentence => setLocalWord(w => ({ ...w, example: sentence }))}
          />
        )}
      </div>

      {/* Practice area */}
      <div className="px-4 py-3">

        {/* History dots + interval */}
        {stats.recentAttempts.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-stone-500">听写记录</span>
              <div className="flex items-center gap-2 text-xs text-stone-400">
                {timeSince && <span>上次：{timeSince}</span>}
                {stats.lastIntervalMs !== null && (
                  <span className="text-stone-300">· 间隔 {formatInterval(stats.lastIntervalMs)}</span>
                )}
              </div>
            </div>
            <div className="flex gap-1 overflow-x-auto pb-0.5">
              {stats.recentAttempts.map((a, i) => (
                <div
                  key={i}
                  title={new Date(a.date).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold border-2 ${
                    a.correct
                      ? 'bg-[#D8EDD4] border-[#90BE88] text-[#4A8842]'
                      : 'bg-[#F0D0D4] border-[#D09098] text-[#B05860]'
                  }`}
                >
                  {a.correct ? '✓' : '✗'}
                </div>
              ))}
              {stats.total > 20 && (
                <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs text-stone-400 border-2 border-stone-200 bg-stone-50">
                  +{stats.total - 20}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ✓/✗ buttons */}
        {dictationMode === 'student' && !revealed ? (
          <div className="py-2.5 rounded-xl bg-stone-100 text-stone-400 text-sm text-center font-medium">
            先点眼睛看答案，再打分
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => handleMark(true)}
              disabled={locked}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xl transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                pendingResult === true
                  ? 'bg-[#4A8842] text-white'
                  : 'bg-white border-2 border-[#90BE88] text-[#4A8842]'
              }`}
            >
              ✓
            </button>
            <button
              onClick={() => handleMark(false)}
              disabled={locked}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xl transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                pendingResult === false
                  ? 'bg-[#B05860] text-white'
                  : 'bg-white border-2 border-[#D09098] text-[#B05860]'
              }`}
            >
              ✗
            </button>
          </div>
        )}

        {/* Cumulative stats */}
        <div className="flex items-center gap-3 mt-2.5 pt-2.5 border-t border-stone-100">
          <div className="text-xs text-stone-400">
            累计：<span className="font-semibold text-stone-600">{stats.total} 次</span>
          </div>
          {stats.total > 0 && (
            <>
              <div className="text-xs text-stone-400">
                准确率：
                <span className={`font-semibold ${
                  stats.accuracy >= 80
                    ? 'text-[#4A8842]'
                    : stats.accuracy >= 60
                    ? 'text-[#9A8040]'
                    : 'text-[#B05860]'
                }`}>
                  {stats.accuracy}%
                </span>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => { clearWordRecord(localWord.id); setStatsVersion(v => v + 1); }}
                  className="text-xs text-stone-300 hover:text-[#D09098] transition-colors"
                  title="清除本词记录"
                >
                  清除记录
                </button>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-1.5 h-4 rounded-sm ${
                        i < Math.round(stats.accuracy / 20)
                          ? stats.accuracy >= 80
                            ? 'bg-[#90BE88]'
                            : stats.accuracy >= 60
                            ? 'bg-[#D4BE80]'
                            : 'bg-[#D09098]'
                          : 'bg-stone-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>

    {showEdit && (
      <EditWordModal
        word={localWord}
        subject={subject}
        onClose={() => setShowEdit(false)}
        onSaved={updated => { setLocalWord(updated); setShowEdit(false); }}
      />
    )}
    </>
  );
}
