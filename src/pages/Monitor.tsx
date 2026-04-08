import { useState } from 'react';
import Icon from '@/components/ui/icon';

export default function Monitor() {
  const [search, setSearch] = useState('');

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-dot inline-block" />
          <span className="text-xs font-mono text-muted-foreground tracking-widest uppercase">Мониторинг</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Лента комментариев</h1>
      </div>

      {/* Search */}
      <div className="relative">
        <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Поиск по тексту или автору..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-border rounded-lg outline-none focus:border-foreground/40 transition-colors font-sans"
        />
      </div>

      {/* Empty state */}
      <div className="bg-card border border-border rounded-lg px-6 py-16 flex flex-col items-center text-center gap-3">
        <Icon name="Activity" size={32} className="text-muted-foreground" />
        <p className="text-sm font-medium">Лента пуста</p>
        <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
          После подключения VK API комментарии из 9 групп начнут поступать сюда в реальном времени
        </p>
      </div>
    </div>
  );
}
