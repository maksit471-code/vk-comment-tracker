import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';

const TG_URL = 'https://functions.poehali.dev/5dcabbf3-158f-46c1-af6b-667245e03b9b';

interface TgGroup {
  id: number;
  tg_id: number;
  username: string;
  title: string;
  photo_url: string | null;
  members_count: number;
  is_active: boolean;
  created_at: string;
}

function formatMembers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}М`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}К`;
  return String(n);
}

export default function TgGroups() {
  const [groups, setGroups] = useState<TgGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [fetching, setFetching] = useState(false);
  const [fetchResult, setFetchResult] = useState<{ saved: number } | null>(null);

  useEffect(() => {
    fetch(`${TG_URL}?action=groups_list`)
      .then(r => r.text())
      .then(text => {
        const data = JSON.parse(text);
        setGroups(Array.isArray(data) ? data : []);
      })
      .catch(() => setError('Не удалось загрузить группы'))
      .finally(() => setLoading(false));
  }, []);

  const addGroup = async () => {
    const identifier = input.trim().replace(/^https?:\/\/t\.me\//, '').replace(/^@/, '');
    if (!identifier) return;
    setAdding(true);
    setError('');
    try {
      const res = await fetch(TG_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'groups_add', username: identifier }),
      });
      const data = JSON.parse(await res.text());
      if (data.error) {
        setError(data.error);
      } else {
        setGroups(prev => {
          const exists = prev.find(g => g.tg_id === data.tg_id);
          if (exists) return prev.map(g => g.tg_id === data.tg_id ? data : g);
          return [data, ...prev];
        });
        setInput('');
      }
    } catch {
      setError('Ошибка соединения');
    } finally {
      setAdding(false);
    }
  };

  const toggleGroup = async (g: TgGroup) => {
    await fetch(TG_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'groups_toggle', id: g.id, is_active: !g.is_active }),
    });
    setGroups(prev => prev.map(x => x.id === g.id ? { ...x, is_active: !x.is_active } : x));
  };

  const deleteGroup = async (id: number) => {
    await fetch(TG_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'groups_delete', id }),
    });
    setGroups(prev => prev.filter(g => g.id !== id));
  };

  const startFetch = async () => {
    setFetching(true);
    setFetchResult(null);
    setError('');
    try {
      const res = await fetch(TG_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fetch' }),
      });
      const data = JSON.parse(await res.text());
      if (data.ok) setFetchResult({ saved: data.saved });
      else setError(data.error || 'Ошибка сбора');
    } catch {
      setError('Ошибка соединения');
    } finally {
      setFetching(false);
    }
  };

  const activeCount = groups.filter(g => g.is_active).length;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="text-xs font-mono text-muted-foreground tracking-widest uppercase">Мониторинг</span>
          <h1 className="text-2xl font-semibold tracking-tight mt-1">Группы Telegram</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {loading ? 'Загрузка...' : `${groups.length} групп · ${activeCount} активных`}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <button
            onClick={startFetch}
            disabled={fetching || activeCount === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            <Icon name={fetching ? 'Loader' : 'Play'} size={15} className={fetching ? 'animate-spin' : ''} />
            {fetching ? 'Собираю...' : 'Собрать сообщения'}
          </button>
          {fetchResult && (
            <p className="text-xs text-emerald-600 font-mono">Сохранено {fetchResult.saved} новых сообщений</p>
          )}
        </div>
      </div>

      {/* Инструкция */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-5 py-4 text-sm text-blue-800 space-y-1">
        <p className="font-medium flex items-center gap-2"><Icon name="Info" size={14} />Как добавить группу</p>
        <ol className="list-decimal list-inside space-y-1 text-xs text-blue-700 ml-1">
          <li>Добавь бота в группу/канал как администратора</li>
          <li>Вставь ссылку на группу (например <span className="font-mono">t.me/gruppaname</span> или просто <span className="font-mono">@gruppaname</span>)</li>
          <li>Нажми «Добавить»</li>
        </ol>
      </div>

      {/* Добавить группу */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Добавить группу</h2>
        </div>
        <div className="px-6 py-5">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Icon name="Send" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="t.me/название или @название"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addGroup()}
                className="w-full pl-9 pr-4 py-2.5 text-sm bg-background border border-border rounded-lg outline-none focus:border-foreground/40 transition-colors font-sans"
              />
            </div>
            <button
              onClick={addGroup}
              disabled={adding || !input.trim()}
              className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {adding ? 'Добавляю...' : 'Добавить'}
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
        </div>
      </div>

      {/* Список групп */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Отслеживаемые группы</h2>
        </div>
        {loading ? (
          <div className="px-6 py-10 flex items-center justify-center gap-2 text-muted-foreground text-sm">
            <Icon name="Loader" size={16} className="animate-spin" /> Загрузка...
          </div>
        ) : groups.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-muted-foreground">
            <Icon name="Send" size={28} className="mx-auto mb-3 opacity-30" />
            <p>Групп пока нет. Добавьте первую выше.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {groups.map(g => (
              <div key={g.id} className="px-6 py-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                  {g.photo_url ? (
                    <img src={g.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Icon name="Send" size={16} className="text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{g.title}</span>
                    {!g.is_active && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">пауза</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    {g.username && (
                      <a
                        href={`https://t.me/${g.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        @{g.username}
                      </a>
                    )}
                    {g.members_count > 0 && (
                      <span className="text-xs text-muted-foreground">{formatMembers(g.members_count)} участников</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleGroup(g)}
                    title={g.is_active ? 'Приостановить' : 'Активировать'}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                      g.is_active ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' : 'text-muted-foreground hover:bg-secondary'
                    }`}
                  >
                    <Icon name={g.is_active ? 'Pause' : 'Play'} size={14} />
                  </button>
                  <button
                    onClick={() => deleteGroup(g.id)}
                    title="Удалить"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Icon name="Trash2" size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
