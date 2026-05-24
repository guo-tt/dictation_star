import { useState } from 'react';
import { Pencil, X, Plus, Trash2 } from 'lucide-react';
import { getCustomExample, setCustomExample, clearCustomExample } from '../utils/storage';

interface ExampleEditorProps {
  wordId: string;
  original: string;       // textbook/preset sentence (may be empty string)
  addOnly: boolean;       // true = chengyu: cannot replace original, only add custom
  onSaved?: (effectiveSentence: string) => void; // called after save so parent can update TTS
}

export default function ExampleEditor({ wordId, original, addOnly, onSaved }: ExampleEditorProps) {
  const [custom, setCustom] = useState<string | null>(() => getCustomExample(wordId));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const effective = addOnly ? original : (custom ?? original);

  function startEdit() {
    setDraft(custom ?? (addOnly ? '' : original));
    setEditing(true);
  }

  function save() {
    const trimmed = draft.trim();
    if (trimmed === '') {
      handleClear();
      return;
    }
    setCustomExample(wordId, trimmed);
    setCustom(trimmed);
    setEditing(false);
    onSaved?.(addOnly ? trimmed : trimmed);
  }

  function handleClear() {
    clearCustomExample(wordId);
    setCustom(null);
    setEditing(false);
    onSaved?.(original);
  }

  // ── add-only mode (chengyu) ───────────────────────────────────────────────
  if (addOnly) {
    if (editing) {
      return (
        <div className="mt-2">
          <textarea
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            rows={3}
            placeholder="输入自定义例句…"
            className="w-full text-sm text-stone-700 border border-[#B0BCDC] rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#8090C0]"
          />
          <div className="flex gap-2 mt-1.5">
            <button
              onClick={save}
              className="px-3 py-1 rounded-lg bg-[#8090C0] text-white text-xs font-semibold"
            >
              保存
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-3 py-1 rounded-lg bg-stone-100 text-stone-600 text-xs font-semibold"
            >
              取消
            </button>
          </div>
        </div>
      );
    }

    if (custom) {
      return (
        <div className="mt-2 border-t border-[#D8DEF0] pt-2">
          <div className="flex items-start gap-1.5">
            <span className="text-xs font-semibold text-[#8090C0] flex-shrink-0 mt-0.5">自定义</span>
            <span className="text-sm text-stone-700 leading-relaxed flex-1">{custom}</span>
            <button onClick={startEdit} className="text-stone-300 hover:text-[#8090C0] flex-shrink-0">
              <Pencil size={13} />
            </button>
            <button onClick={handleClear} className="text-stone-300 hover:text-[#D09098] flex-shrink-0">
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      );
    }

    return (
      <button
        onClick={startEdit}
        className="mt-2 flex items-center gap-1 text-xs text-stone-300 hover:text-[#8090C0] transition-colors"
      >
        <Plus size={13} />
        <span>自定义例句</span>
      </button>
    );
  }

  // ── replace mode (regular words) ─────────────────────────────────────────
  if (editing) {
    return (
      <div className="mt-2 text-xs italic pl-1">
        <textarea
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          rows={3}
          placeholder="输入例句…"
          className="w-full text-sm text-stone-700 border border-[#B0BCDC] rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#8090C0] not-italic"
        />
        <div className="flex gap-2 mt-1.5 not-italic">
          <button
            onClick={save}
            className="px-3 py-1 rounded-lg bg-[#8090C0] text-white text-xs font-semibold"
          >
            保存
          </button>
          <button
            onClick={() => setEditing(false)}
            className="px-3 py-1 rounded-lg bg-stone-100 text-stone-600 text-xs font-semibold"
          >
            取消
          </button>
        </div>
      </div>
    );
  }

  if (!effective && !original) return null;

  return (
    <div className="mt-2 text-xs text-stone-500 italic pl-1 flex items-start gap-1.5">
      <span className="flex-1 leading-relaxed">
        例：{effective}
        {custom && original && custom !== original && (
          <button
            onClick={handleClear}
            className="ml-2 not-italic text-stone-300 hover:text-[#D09098] text-xs transition-colors"
          >
            恢复原句
          </button>
        )}
      </span>
      <button
        onClick={startEdit}
        className="text-stone-300 hover:text-[#8090C0] flex-shrink-0 mt-0.5 transition-colors"
      >
        <Pencil size={12} />
      </button>
      {custom && (
        <button
          onClick={handleClear}
          className="text-stone-300 hover:text-[#D09098] flex-shrink-0 mt-0.5 transition-colors"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}
