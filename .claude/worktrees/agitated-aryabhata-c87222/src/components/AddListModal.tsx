import { useState, useId } from 'react';
import { X } from 'lucide-react';
import { addCustomList } from '../utils/storage';
import { CustomListMeta } from '../types';

interface AddListModalProps {
  onClose: () => void;
  onAdded: (list: CustomListMeta) => void;
}

const GRADE_OPTIONS = [
  { value: undefined, label: '不分年级' },
  { value: 0, label: '学前' },
  { value: 1, label: '一年级' },
  { value: 2, label: '二年级' },
  { value: 3, label: '三年级' },
  { value: 4, label: '四年级' },
  { value: 5, label: '五年级' },
  { value: 6, label: '六年级' },
] as const;

export default function AddListModal({ onClose, onAdded }: AddListModalProps) {
  const uid = useId();
  const [name, setName] = useState('');
  const [grade, setGrade] = useState<number | undefined>(undefined);
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('请输入词单名称'); return; }
    const entry = addCustomList(name.trim(), 'chinese', grade);
    onAdded(entry);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#7888C8] to-[#A8B8DC] px-5 py-4 flex items-center justify-between">
          <h2 className="text-white font-bold text-lg">新建词单</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30 active:bg-white/40"
          >
            <X size={18} className="text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          {/* Name */}
          <div>
            <label htmlFor={`${uid}-name`} className="block text-sm font-semibold text-stone-600 mb-1">
              词单名称 *
            </label>
            <input
              id={`${uid}-name`}
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              placeholder="如：期末复习、老师布置的生字…"
              className="w-full border-2 rounded-xl px-4 py-2.5 text-base outline-none transition focus:ring-2 ring-[#8090C0] border-stone-200 focus:border-transparent"
              autoFocus
            />
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
          </div>

          {/* Grade */}
          <div>
            <label className="block text-sm font-semibold text-stone-600 mb-1">所属年级</label>
            <div className="grid grid-cols-4 gap-2">
              {GRADE_OPTIONS.map(opt => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => setGrade(opt.value)}
                  className={`py-2.5 rounded-xl text-sm font-medium border-2 transition ${
                    grade === opt.value
                      ? 'border-[#B0BCDC] bg-[#F0F2FB] text-[#5868A8]'
                      : 'border-stone-200 text-stone-500'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-stone-400 -mt-1">
            创建后可在该词单里添加生字
          </p>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl border-2 border-stone-200 text-stone-600 font-semibold active:bg-stone-50"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-2xl text-white font-bold shadow-sm bg-gradient-to-r from-[#7888C8] to-[#A8B8DC] active:opacity-90"
            >
              创建词单
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
