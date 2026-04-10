import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';

const COMMENTS_URL = 'https://functions.poehali.dev/1ba8f77d-759f-4bd4-bfc3-bd43b661451d';

interface GroupRating {
  id: number;
  name: string;
  members_count: number;
  comments_count: number;
  negative_count: number;
}

interface DayData {
  day: string;
  total: number;
  positive: number;
  negative: number;
}

interface Analytics {
  groups_rating: GroupRating[];
  days_data: DayData[];
}

const DAYS_RU = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

function formatDay(dateStr: string) {
  const d = new Date(dateStr);
  return DAYS_RU[d.getDay()];
}

function formatNumber(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(0) + 'к';
  return String(n);
}

export default function Analytics() {
  const [data, setData] = useState<Analytics | null>(null);
  const [stats, setStats] = useState<{ today_count: number; negative_count: number; keyword_hits_today: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${COMMENTS_URL}?action=analytics`).then(r => r.json()),
      fetch(`${COMMENTS_URL}?action=stats`).then(r => r.json()),
    ]).then(([analytics, statsData]) => {
      setData(analytics);
      setStats(statsData);
    }).finally(() => setLoading(false));
  }, []);

  const last7Days = (() => {
    const result: { label: string; day: string; total: number; positive: number; negative: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().split('T')[0];
      const found = data?.days_data.find(x => x.day === dayStr);
      result.push({ label: DAYS_RU[d.getDay()], day: dayStr, total: found?.total ?? 0, positive: found?.positive ?? 0, negative: found?.negative ?? 0 });
    }
    return result;
  })();

  const maxTotal = Math.max(...last7Days.map(d => d.total), 1);

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <span className="text-xs font-mono text-muted-foreground tracking-widest uppercase">Аналитика</span>
        <h1 className="text-2xl font-semibold tracking-tight mt-1">Статистика упоминаний</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Последние 7 дней</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Собрано сегодня', value: loading ? '…' : String(stats?.today_count ?? 0), icon: 'BarChart2' },
          { label: 'Совпадений', value: loading ? '…' : String(stats?.keyword_hits_today ?? 0), icon: 'TrendingUp' },
          { label: 'Негативных', value: loading ? '…' : String(stats?.negative_count ?? 0), icon: 'TrendingDown' },
        ].map((s, i) => (
          <div key={i} className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-start justify-between mb-3">
              <span className="text-xs text-muted-foreground font-medium">{s.label}</span>
              <Icon name={s.icon} size={14} className="text-muted-foreground shrink-0" />
            </div>
            <span className="text-2xl font-semibold font-mono">{s.value}</span>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-6">
          Активность по дням
        </h2>
        <div className="flex items-end gap-3 h-36">
          {last7Days.map((day, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex flex-col justify-end rounded overflow-hidden" style={{ height: '100%' }}>
                {day.total > 0 ? (
                  <div
                    className="w-full rounded flex flex-col justify-end overflow-hidden"
                    style={{ height: `${Math.max((day.total / maxTotal) * 100, 8)}%` }}
                  >
                    <div className="bg-red-400 w-full" style={{ height: `${day.total > 0 ? Math.round((day.negative / day.total) * 100) : 0}%`, minHeight: day.negative > 0 ? 3 : 0 }} />
                    <div className="bg-emerald-400 w-full" style={{ height: `${day.total > 0 ? Math.round((day.positive / day.total) * 100) : 0}%`, minHeight: day.positive > 0 ? 3 : 0 }} />
                    <div className="bg-muted w-full flex-1" />
                  </div>
                ) : (
                  <div className="w-full bg-muted rounded opacity-30" style={{ height: '8%' }} />
                )}
              </div>
              <span className="text-xs font-mono text-muted-foreground">{day.label}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-5 mt-5 pt-5 border-t border-border">
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-emerald-400 inline-block" /><span className="text-xs text-muted-foreground">Позитив</span></div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-muted inline-block" /><span className="text-xs text-muted-foreground">Нейтрально</span></div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-red-400 inline-block" /><span className="text-xs text-muted-foreground">Негатив</span></div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Рейтинг групп</h2>
        </div>
        {loading ? (
          <div className="px-6 py-12 flex justify-center">
            <Icon name="Loader2" size={24} className="text-muted-foreground animate-spin" />
          </div>
        ) : !data || data.groups_rating.length === 0 ? (
          <div className="px-6 py-12 flex flex-col items-center text-center gap-3">
            <Icon name="BarChart2" size={32} className="text-muted-foreground" />
            <p className="text-sm font-medium">Нет данных</p>
            <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
              Запустите сбор комментариев на главной странице
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {data.groups_rating.map((g, i) => {
              const maxComments = data.groups_rating[0].comments_count || 1;
              const pct = Math.round((g.comments_count / maxComments) * 100);
              return (
                <div key={g.id} className="px-6 py-4 flex items-center gap-4">
                  <span className="text-xs font-mono text-muted-foreground w-5 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium truncate">{g.name}</span>
                      <span className="text-xs font-mono text-muted-foreground ml-3 shrink-0">{g.comments_count} ком.</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-muted-foreground">{formatNumber(g.members_count)} подписчиков</span>
                      {g.negative_count > 0 && (
                        <span className="text-xs text-red-500">{g.negative_count} негативных</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}