import Icon from '@/components/ui/icon';

const weekData = [
  { day: 'Пн', total: 142, positive: 89, negative: 15, neutral: 38 },
  { day: 'Вт', total: 198, positive: 124, negative: 22, neutral: 52 },
  { day: 'Ср', total: 167, positive: 98, negative: 31, neutral: 38 },
  { day: 'Чт', total: 243, positive: 151, negative: 18, neutral: 74 },
  { day: 'Пт', total: 312, positive: 195, negative: 27, neutral: 90 },
  { day: 'Сб', total: 289, positive: 178, negative: 35, neutral: 76 },
  { day: 'Вс', total: 186, positive: 112, negative: 19, neutral: 55 },
];

const brandStats = [
  { name: 'Nike', mentions: 487, positive: 78, negative: 8, neutral: 14 },
  { name: 'Adidas', mentions: 312, positive: 55, negative: 28, neutral: 17 },
  { name: 'Puma', mentions: 198, positive: 82, negative: 5, neutral: 13 },
  { name: 'Reebok', mentions: 134, positive: 71, negative: 12, neutral: 17 },
  { name: 'New Balance', mentions: 97, positive: 85, negative: 4, neutral: 11 },
];

const maxTotal = Math.max(...weekData.map(d => d.total));

export default function Analytics() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <span className="text-xs font-mono text-muted-foreground tracking-widest uppercase">Аналитика</span>
        <h1 className="text-2xl font-semibold tracking-tight mt-1">Статистика упоминаний</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Последние 7 дней</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Всего упоминаний', value: '1 537', icon: 'BarChart2', color: 'text-foreground' },
          { label: 'Позитивных', value: '947', pct: '61%', icon: 'TrendingUp', color: 'text-emerald-600' },
          { label: 'Негативных', value: '167', pct: '11%', icon: 'TrendingDown', color: 'text-red-500' },
        ].map((s, i) => (
          <div key={i} className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-start justify-between mb-3">
              <span className="text-xs text-muted-foreground font-medium">{s.label}</span>
              <Icon name={s.icon as any} size={14} className={`${s.color} shrink-0`} />
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-semibold font-mono ${s.color}`}>{s.value}</span>
              {s.pct && <span className="text-sm text-muted-foreground font-mono">{s.pct}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-6">
          Активность по дням
        </h2>
        <div className="flex items-end gap-3 h-36">
          {weekData.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground">{d.total}</span>
              <div className="w-full flex flex-col gap-0.5 rounded overflow-hidden" style={{ height: `${(d.total / maxTotal) * 100}px` }}>
                <div className="bg-emerald-400" style={{ flex: d.positive }} />
                <div className="bg-gray-200" style={{ flex: d.neutral }} />
                <div className="bg-red-400" style={{ flex: d.negative }} />
              </div>
              <span className="text-xs font-mono text-muted-foreground">{d.day}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-5 mt-5 pt-5 border-t border-border">
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-emerald-400 inline-block" /><span className="text-xs text-muted-foreground">Позитив</span></div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-gray-200 inline-block" /><span className="text-xs text-muted-foreground">Нейтрально</span></div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-red-400 inline-block" /><span className="text-xs text-muted-foreground">Негатив</span></div>
        </div>
      </div>

      {/* Brand table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Рейтинг брендов</h2>
        </div>
        <div className="divide-y divide-border">
          {brandStats.map((b, i) => (
            <div key={i} className="px-6 py-4 flex items-center gap-4 hover:bg-secondary/30 transition-colors">
              <span className="w-6 text-xs font-mono text-muted-foreground">{i + 1}</span>
              <span className="font-medium flex-1">{b.name}</span>
              <span className="font-mono text-sm font-semibold w-16 text-right">{b.mentions}</span>
              <div className="flex gap-4 w-40">
                <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                  <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${b.positive}%` }} />
                </div>
              </div>
              <div className="flex gap-3 text-xs font-mono">
                <span className="text-emerald-600">{b.positive}%</span>
                <span className="text-red-500">{b.negative}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
