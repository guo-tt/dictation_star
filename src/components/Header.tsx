import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, BookOpen, Search, LogOut, User as UserIcon } from 'lucide-react';
import { ViewMode, Subject } from '../types';

interface HeaderProps {
  view: ViewMode;
  subject: Subject;
  title: string;
  onBack?: () => void;
  onSearch?: () => void;
  userPhotoURL?: string | null;
  userName?: string | null;
  onSignOut?: () => void;
}

export default function Header({ view, subject, title, onBack, onSearch, userPhotoURL, userName, onSignOut }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isChinese = subject === 'chinese';
  const bgClass =
    view === 'home'
      ? 'bg-gradient-to-r from-[#7888C8] to-[#A8B8DC]'
      : isChinese
      ? 'bg-gradient-to-r from-[#7888C8] to-[#A8B8DC]'
      : 'bg-gradient-to-r from-[#6090B0] to-[#8CB4CC]';

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  return (
    <header className={`${bgClass} text-white px-4 md:px-8 py-4 flex items-center gap-3 shadow-md sticky top-0 z-10`}>
      {onBack ? (
        <button
          onClick={onBack}
          className="p-1.5 rounded-full hover:bg-white/20 active:bg-white/30 transition-colors"
          aria-label="返回"
        >
          <ChevronLeft size={24} />
        </button>
      ) : (
        <BookOpen size={24} className="opacity-90" />
      )}
      <h1 className="text-xl font-bold tracking-wide flex-1">{title}</h1>
      {onSearch && (
        <button
          onClick={onSearch}
          className="p-1.5 rounded-full hover:bg-white/20 active:bg-white/30 transition-colors"
          aria-label="搜索"
        >
          <Search size={22} />
        </button>
      )}
      {onSignOut && (
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="p-0.5 rounded-full hover:ring-2 hover:ring-white/50 transition-all"
            aria-label="账号菜单"
          >
            {userPhotoURL && !imgError ? (
              <img
                src={userPhotoURL}
                alt="avatar"
                className="w-8 h-8 rounded-full object-cover"
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center text-white text-sm font-bold">
                {userName ? userName.charAt(0).toUpperCase() : <UserIcon size={18} />}
              </div>
            )}
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-stone-100 overflow-hidden z-50">
              {userName && (
                <div className="px-4 py-3 border-b border-stone-100">
                  <p className="text-xs text-stone-400">已登录</p>
                  <p className="text-sm font-medium text-stone-700 truncate">{userName}</p>
                </div>
              )}
              <button
                onClick={() => { setMenuOpen(false); onSignOut(); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-stone-600 hover:bg-stone-50 transition-colors"
              >
                <LogOut size={16} className="text-stone-400" />
                退出登录
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
