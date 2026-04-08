import { useEffect, useState } from 'react';
import Icon from '@/components/ui/icon';

const COMMENTS_API = 'https://functions.poehali.dev/1ba8f77d-759f-4bd4-bfc3-bd43b661451d';

interface Stats {
  today_count: number;
  negative_count: number;
  active_keywords: number;
  active_groups: number;
  total_count: number;
  keyword_hits_today: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${COMMENTS_API}?action=stats`)
      .then(r => r.json())
      .then(d => {
        if (typeof d === 'string') setStats(JSON.parse(d));
        else setStats(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const isEmpty = !loading && stats && stats.total_count === 0;

  const statCards = [
    {
      label: 'Комментариев сегодня',
      value: loading ? '...' : String(stats?.today_count ?? '—'),
      icon: 'MessageSquare',
    },
    {
      label: 'Совпадений сегодня',
      value: loading ? '...' : String(stats?.keyword_hits_today ?? '—'),
      icon: 'AtSign',
    },
    {
      label: 'Негативных',
      value: loading ? '...' : String(stats?.negative_count ?? '—'),
      icon: 'AlertTriangle',
    },
    {
      label: 'Групп отслеживается',
      value: loading ? '...' : String(stats?.active_groups ?? '—'),
      icon: 'Users',
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-dot inline-block" />
          <span className="text-xs font-mono text-muted-foreground tracking-widest uppercase">Live</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Обзор</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {loading
            ? 'Загрузка...'
            : stats && stats.total_count > 0
            ? `Всего собрано ${stats.total_count} комментариев`
            : 'Ожидание данных · запустите сбор в разделе Группы'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-lg p-5 flex flex-col gap-3"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-start justify-between">
              <span className="text-xs text-muted-foreground font-medium leading-tight">{s.label}</span>
              <Icon name={s.icon} size={15} className="text-muted-foreground shrink-0 mt-0.5" />
            </div>
            <div className="flex items-end justify-between">
              <span className={`text-2xl font-semibold font-mono tracking-tight ${loading ? 'text-muted-foreground' : 'text-foreground'}`}>
                {s.value}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state or success */}
      {isEmpty ? (
        <div className="bg-card border border-border rounded-lg px-6 py-12 flex flex-col items-center text-center gap-3">
          <Icon name="Radar" size={32} className="text-muted-foreground" />
          <p className="text-sm font-medium">Нет данных для отображения</p>
          <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
            Перейдите в раздел «Группы» и нажмите «Начать мониторинг» — комментарии появятся здесь
          </p>
        </div>
      ) : !loading && stats && stats.today_count > 0 ? (
        <div className="bg-card border border-border rounded-lg px-6 py-4 flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0" />
          <p className="text-sm text-muted-foreground">
            Мониторинг активен · сегодня собрано <span className="font-semibold text-foreground">{stats.today_count}</span> комментариев из <span className="font-semibold text-foreground">{stats.active_groups}</span> групп
          </p>
        </div>
      ) : null}

      {/* Quick keywords */}
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Ключевые слова
            {stats ? <span className="ml-2 text-foreground">{stats.active_keywords}</span> : null}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {['угроза городу', 'взорвать', 'удар по', 'экстремизм', 'теракт', 'радикальный'].map(kw => (
            <span
              key={kw}
              className="px-3 py-1 rounded-full border border-border text-sm hover:border-foreground/40 transition-colors cursor-pointer"
            >
              {kw}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}