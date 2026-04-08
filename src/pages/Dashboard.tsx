import Icon from '@/components/ui/icon';

const stats = [
  { label: 'Комментариев сегодня', value: '1 284', delta: '+12%', icon: 'MessageSquare', positive: true },
  { label: 'Упоминаний бренда', value: '347', delta: '+8%', icon: 'AtSign', positive: true },
  { label: 'Негативных', value: '23', delta: '-4%', icon: 'AlertTriangle', positive: false },
  { label: 'Отслеживаемых слов', value: '16', delta: null, icon: 'Tag', positive: true },
];

const recentAlerts = [
  { id: 1, keyword: 'Nike', text: 'Отличные кроссовки от Nike, рекомендую всем!', source: 'ВКонтакте', time: '2 мин назад', sentiment: 'positive' },
  { id: 2, keyword: 'Adidas', text: 'Adidas снова разочаровал качеством, возврат...', source: 'ВКонтакте', time: '7 мин назад', sentiment: 'negative' },
  { id: 3, keyword: 'Nike', text: 'Где купить Nike дешевле? Подскажите магазин', source: 'ВКонтакте', time: '15 мин назад', sentiment: 'neutral' },
  { id: 4, keyword: 'Puma', text: 'Puma выпустила новую коллекцию, очень стильно', source: 'ВКонтакте', time: '23 мин назад', sentiment: 'positive' },
];

const sentimentColor = {
  positive: 'bg-emerald-100 text-emerald-700',
  negative: 'bg-red-100 text-red-700',
  neutral: 'bg-gray-100 text-gray-600',
};

const sentimentLabel = {
  positive: 'позитив',
  negative: 'негатив',
  neutral: 'нейтрально',
};

export default function Dashboard() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-dot inline-block" />
          <span className="text-xs font-mono text-muted-foreground tracking-widest uppercase">Live</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Обзор</h1>
        <p className="text-sm text-muted-foreground mt-0.5">8 апреля 2026 · обновлено только что</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="bg-card border border-border rounded-lg p-5 flex flex-col gap-3" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-start justify-between">
              <span className="text-xs text-muted-foreground font-medium leading-tight">{s.label}</span>
              <Icon name={s.icon as any} size={15} className="text-muted-foreground shrink-0 mt-0.5" />
            </div>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-semibold font-mono tracking-tight">{s.value}</span>
              {s.delta && (
                <span className={`text-xs font-mono font-medium ${s.positive ? 'text-emerald-600' : 'text-red-500'}`}>
                  {s.delta}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Recent alerts */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Последние совпадения</h2>
          <button className="text-xs text-muted-foreground hover:text-foreground transition-colors">все →</button>
        </div>
        <div className="space-y-2">
          {recentAlerts.map((a, i) => (
            <div
              key={a.id}
              className="bg-card border border-border rounded-lg px-5 py-4 flex items-start gap-4 hover:border-foreground/20 transition-colors"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <span className="mt-0.5 px-2 py-0.5 rounded text-xs font-medium bg-primary text-primary-foreground shrink-0">
                {a.keyword}
              </span>
              <p className="text-sm leading-relaxed flex-1 text-foreground/80">{a.text}</p>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${sentimentColor[a.sentiment as keyof typeof sentimentColor]}`}>
                  {sentimentLabel[a.sentiment as keyof typeof sentimentLabel]}
                </span>
                <span className="text-xs text-muted-foreground font-mono">{a.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick keywords */}
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Ключевые слова</h2>
          <button className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            <Icon name="Plus" size={12} /> добавить
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {['угроза городу', 'взорвать', 'удар по', 'экстремизм', 'теракт', 'радикальный'].map(kw => (
            <span key={kw} className="px-3 py-1 rounded-full border border-border text-sm hover:border-foreground/40 transition-colors cursor-pointer">
              {kw}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}