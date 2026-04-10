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

interface HitComment {
  id: number;
  author_id: number;
  author_name: string;
  author_photo: string | null;
  text: string;
  published_at: string | null;
  group_name: string;
  vk_post_id: number;
  vk_comment_id: number;
  group_vk_id: number;
}

function HitsModal({ onClose, action, title }: { onClose: () => void; action: string; title: string }) {
  const [hits, setHits] = useState<HitComment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${COMMENTS_API}?action=${action}`)
      .then(r => r.json())
      .then(d => setHits(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, [action]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card border border-border rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-sm font-semibold">{title}</h2>
            {!loading && <p className="text-xs text-muted-foreground mt-0.5">{hits.length} комментариев</p>}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <Icon name="X" size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex justify-center py-12">
              <Icon name="Loader2" size={24} className="animate-spin text-muted-foreground" />
            </div>
          ) : hits.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center px-6">
              <Icon name="CheckCircle" size={28} className="text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Совпадений сегодня не найдено</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {hits.map(hit => (
                <div key={hit.id} className="px-5 py-4 space-y-2">
                  <div className="flex items-center gap-2">
                    {hit.author_photo ? (
                      <img src={hit.author_photo} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <Icon name="User" size={13} className="text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <a
                        href={`https://vk.com/id${hit.author_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold hover:underline truncate block"
                      >
                        {hit.author_name || `id${hit.author_id}`}
                      </a>
                      <span className="text-xs text-muted-foreground">{hit.group_name}</span>
                    </div>
                    <a
                      href={`https://vk.com/wall-${hit.group_vk_id}_${hit.vk_post_id}?reply=${hit.vk_comment_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                      title="Открыть в ВКонтакте"
                    >
                      <Icon name="ExternalLink" size={13} />
                    </a>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/90">{hit.text}</p>
                  {hit.published_at && (
                    <p className="text-xs text-muted-foreground">
                      {new Date(hit.published_at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ action: string; title: string } | null>(null);

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
      clickable: false,
      action: '',
      modalTitle: '',
    },
    {
      label: 'Совпадений сегодня',
      value: loading ? '...' : String(stats?.keyword_hits_today ?? '—'),
      icon: 'AtSign',
      clickable: true,
      action: 'keyword_hits',
      modalTitle: 'Совпадения за сегодня',
    },
    {
      label: 'Негативных',
      value: loading ? '...' : String(stats?.negative_count ?? '—'),
      icon: 'AlertTriangle',
      clickable: true,
      action: 'negative',
      modalTitle: 'Негативные комментарии',
    },
    {
      label: 'Групп отслеживается',
      value: loading ? '...' : String(stats?.active_groups ?? '—'),
      icon: 'Users',
      clickable: false,
      action: '',
      modalTitle: '',
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {modal && <HitsModal onClose={() => setModal(null)} action={modal.action} title={modal.title} />}

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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <div
            key={i}
            className={`bg-card border border-border rounded-lg p-5 flex flex-col gap-3 transition-colors ${s.clickable ? 'cursor-pointer hover:border-foreground/40' : ''}`}
            style={{ animationDelay: `${i * 60}ms` }}
            onClick={() => s.clickable && setModal({ action: s.action, title: s.modalTitle })}
          >
            <div className="flex items-start justify-between">
              <span className="text-xs text-muted-foreground font-medium leading-tight">{s.label}</span>
              <div className="flex items-center gap-1">
                <Icon name={s.icon} size={15} className="text-muted-foreground shrink-0 mt-0.5" />
                {s.clickable && <Icon name="ChevronRight" size={13} className="text-muted-foreground shrink-0 mt-0.5" />}
              </div>
            </div>
            <div className="flex items-end justify-between">
              <span className={`text-2xl font-semibold font-mono tracking-tight ${loading ? 'text-muted-foreground' : 'text-foreground'}`}>
                {s.value}
              </span>
            </div>
          </div>
        ))}
      </div>

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