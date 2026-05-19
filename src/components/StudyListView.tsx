import { Word } from '../types';
import { Volume2, BookOpen } from 'lucide-react';

interface StudyListViewProps {
  words: Word[];
}

function speak(text: string) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'zh-CN';
  utter.rate = 0.8;
  window.speechSynthesis.speak(utter);
}

export default function StudyListView({ words }: StudyListViewProps) {
  if (words.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-10 text-center">
        <div className="text-5xl mb-4">📚</div>
        <h3 className="text-xl font-bold text-stone-700">暂无词语</h3>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="text-sm text-stone-400 px-1 mb-3">共 {words.length} 个词语</div>
        <div className="flex flex-col gap-3">
          {words.map((word, index) => (
            <div
              key={word.id}
              className="bg-white rounded-2xl shadow-sm border border-[#B0BCDC] overflow-hidden"
            >
              <div className="bg-[#F0F2FB] px-4 pt-4 pb-3">
                <div className="flex items-start gap-3">
                  <div className="bg-[#8090C0] text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-3xl font-bold text-[#5868A8] leading-none">
                        {word.text}
                      </span>
                      {word.wordType && (
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                            word.wordType === 'char'
                              ? 'bg-[#EEF5FA] text-[#407898]'
                              : word.wordType === 'word'
                              ? 'bg-[#EFF7EE] text-[#4A8842]'
                              : 'bg-[#F5F0FA] text-[#7060A0]'
                          }`}
                        >
                          {word.wordType === 'char' ? '字' : word.wordType === 'word' ? '词' : '句'}
                        </span>
                      )}
                    </div>
                    {word.pinyin && (
                      <div className="text-sm text-stone-400 mt-0.5 font-medium">
                        {word.pinyin}
                      </div>
                    )}
                    {word.meaning && (
                      <div className="text-xs text-stone-500 mt-1">{word.meaning}</div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => speak(word.text)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-sm font-medium bg-[#8090C0] hover:bg-[#6878B0] active:bg-[#5060A0] transition-colors shadow-sm"
                  >
                    <Volume2 size={16} />
                    <span>朗读</span>
                  </button>
                  <button
                    onClick={() => speak(word.example)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-600 hover:bg-stone-700 active:bg-stone-800 text-white text-sm font-medium transition-colors shadow-sm"
                  >
                    <BookOpen size={16} />
                    <span>例句</span>
                  </button>
                </div>

                {word.example && (
                  <div className="mt-2 text-xs text-stone-500 italic pl-1">
                    例：{word.example}
                    {word.exampleMeaning && (
                      <span className="text-stone-400 not-italic">
                        {' '}— {word.exampleMeaning}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
