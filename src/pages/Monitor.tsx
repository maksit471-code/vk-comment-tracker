import { useState } from 'react';
import Icon from '@/components/ui/icon';

const comments = [
  { id: 1, author: 'Алексей М.', avatar: 'АМ', text: 'Купил Nike Air Max неделю назад — качество огонь, советую всем! 🔥', keyword: 'Nike', time: '12:34', source: 'vk.com/sport_news', sentiment: 'positive' },
  { id: 2, author: 'Марина К.', avatar: 'МК', text: 'Adidas снова поднял цены. Уже не та компания, что раньше...', keyword: 'Adidas', time: '12:31', source: 'vk.com/fashion', sentiment: 'negative' },
  { id: 3, author: 'Dmitry P.', avatar: 'DP', text: 'Кто-нибудь знает, где в Москве можно купить Nike со скидкой?', keyword: 'Nike', time: '12:28', source: 'vk.com/deals', sentiment: 'neutral' },
  { id: 4, author: 'Светлана О.', avatar: 'СО', text: 'Новая коллекция Puma 2026 — просто шедевр! Уже заказала три пары.', keyword: 'Puma', time: '12:25', source: 'vk.com/sneakers', sentiment: 'positive' },
  { id: 5, author: 'Иван Р.', avatar: 'ИР', text: 'Reebok держит качество на уровне, в отличие от конкурентов', keyword: 'Reebok', time: '12:20', source: 'vk.com/reviews', sentiment: 'positive' },
  { id: 6, author: 'Анна Ф.', avatar: 'АФ', text: 'Adidas прислал брак, возврат занял месяц. Больше не куплю.', keyword: 'Adidas', time: '12:15', source: 'vk.com/complaints', sentiment: 'negative' },
  { id: 7, author: 'Олег Г.', avatar: 'ОГ', text: 'Nike запустили приложение для тренировок — уже второй месяц пользуюсь', keyword: 'Nike', time: '12:10', source: 'vk.com/running', sentiment: 'positive' },
  { id: 8, author: 'Катя С.', avatar: 'КС', text: 'New Balance — отличная поддержка для бега, стопа не устаёт', keyword: 'New Balance', time: '12:05', source: 'vk.com/sport', sentiment: 'positive' },
];

const sentimentConfig = {
  positive: { color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', label: '↑ позитив' },
  negative: { color: 'text-red-500', bg: 'bg-red-50 border-red-200', label: '↓ негатив' },
  neutral: { color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200', label: '→ нейтрально' },
};

const filters = ['Все', 'Nike', 'Adidas', 'Puma', 'Reebok', 'New Balance'];

export default function Monitor() {
  const [activeFilter, setActiveFilter] = useState('Все');
  const [search, setSearch] = useState('');

  const filtered = comments.filter(c => {
    const matchFilter = activeFilter === 'Все' || c.keyword === activeFilter;
    const matchSearch = !search || c.text.toLowerCase().includes(search.toLowerCase()) || c.author.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-dot inline-block" />
          <span className="text-xs font-mono text-muted-foreground tracking-widest uppercase">Мониторинг</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Лента комментариев</h1>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Поиск по тексту или автору..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-border rounded-lg outline-none focus:border-foreground/40 transition-colors font-sans"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-3 py-2 text-xs rounded-lg border transition-colors font-medium ${
                activeFilter === f
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card border-border text-foreground hover:border-foreground/30'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      <p className="text-xs text-muted-foreground font-mono">
        {filtered.length} комментари{filtered.length === 1 ? 'й' : 'ев'} · обновлено только что
      </p>

      {/* Feed */}
      <div className="space-y-3">
        {filtered.map((c, i) => {
          const cfg = sentimentConfig[c.sentiment as keyof typeof sentimentConfig];
          return (
            <div
              key={c.id}
              className={`border rounded-lg p-5 flex gap-4 transition-colors ${cfg.bg}`}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold shrink-0 font-mono">
                {c.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <span className="text-sm font-semibold">{c.author}</span>
                    <span className="text-xs text-muted-foreground ml-2 font-mono">{c.source}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-mono font-medium ${cfg.color}`}>{cfg.label}</span>
                    <span className="text-xs text-muted-foreground font-mono">{c.time}</span>
                  </div>
                </div>
                <p className="text-sm leading-relaxed">{c.text}</p>
                <div className="mt-2.5 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                    {c.keyword}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
