import Icon from '@/components/ui/icon';

const stats = [
  { label: 'Комментариев сегодня', value: '—', delta: null, icon: 'MessageSquare', positive: true },
  { label: 'Найдено совпадений', value: '—', delta: null, icon: 'AtSign', positive: true },
  { label: 'Негативных', value: '—', delta: null, icon: 'AlertTriangle', positive: false },
  { label: 'Групп отслеживается', value: '9', delta: null, icon: 'Users', positive: true },
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
        <p className="text-sm text-muted-foreground mt-0.5">Ожидание данных · подключите VK API для старта</p>
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
              <span className="text-2xl font-semibold font-mono tracking-tight text-muted-foreground">{s.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      <div className="bg-card border border-border rounded-lg px-6 py-12 flex flex-col items-center text-center gap-3">
        <Icon name="Radar" size={32} className="text-muted-foreground" />
        <p className="text-sm font-medium">Нет данных для отображения</p>
        <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
          Добавьте токен VK API в настройках — и мониторинг 9 групп запустится автоматически
        </p>
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
