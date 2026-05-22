import { ChevronLeft, BookOpen, Search } from 'lucide-react';

interface HeaderProps {
  title: string;
  onBack?: () => void;
  onSearch?: () => void;
}

export default function Header({ title, onBack, onSearch }: HeaderProps) {
  return (
    <header className="bg-gradient-to-r from-[#7888C8] to-[#A8B8DC] text-white px-4 py-4 flex items-center gap-3 shadow-md">
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
    </header>
  );
}
