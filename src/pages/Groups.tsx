import { useState, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/icon';

const API_URL = 'https://functions.poehali.dev/529e9199-86a8-4edf-b41b-2622cfde311b';
const COMMENTS_URL = 'https://functions.poehali.dev/1ba8f77d-759f-4bd4-bfc3-bd43b661451d';

interface Group {
  id: number;
  vk_id: number;
  screen_name: string;
  name: string;
  photo_url: string | null;
  members_count: number;
  is_active: boolean;
  created_at: string;
}

interface SearchResult {
  vk_id: number;
  screen_name: string;
  name: string;
  photo_url: string | null;
  members_count: number;
}

function formatMembers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}М`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}К`;
  return String(n);
}

export default function Groups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [addingManual, setAddingManual] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [fetchResult, setFetchResult] = useState<{ fetched: number; groups: number } | null>(null);
  const [fetchError, setFetchError] = useState('');

  const loadGroups = useCallback(async () => {
    setLoading(true);
    const res = await fetch(API_URL);
    const data = JSON.parse(await res.json ? res.json() : res.text());
    setGroups(Array.isArray(data) ? data : JSON.parse(data));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch(API_URL)
      .then(r => r.text())
      .then(text => {
        const data = JSON.parse(text);
        setGroups(Array.isArray(data) ? data : []);
      })
      .catch(() => setError('Не удалось загрузить группы'))
      .finally(() => setLoading(false));
  }, []);

  const searchGroups = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setError('');
    setSearchResults([]);
    try {
      const res = await fetch(`${API_URL}/search?q=${encodeURIComponent(query)}`);
      const text = await res.text();
      const data = JSON.parse(text);
      if (Array.isArray(data)) {
        setSearchResults(data);
      } else {
        setError(data.error || 'Ошибка поиска');
      }
    } catch {
      setError('Ошибка соединения');
    } finally {
      setSearching(false);
    }
  };

  const addGroup = async (identifier: string | number) => {
    const key = typeof identifier === 'number' ? identifier : identifier;
    setAdding(typeof key === 'number' ? key : -1);
    setAddingManual(typeof identifier === 'string');
    setError('');
    try {
      const body = typeof identifier === 'number'
        ? { vk_id: identifier }
        : { screen_name: identifier };
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      const data = JSON.parse(text);
      if (data.error) {
        setError(data.error);
      } else {
        setGroups(prev => {
          const exists = prev.find(g => g.vk_id === data.vk_id);
          if (exists) return prev.map(g => g.vk_id === data.vk_id ? data : g);
          return [data, ...prev];
        });
        setSearchResults(prev => prev.filter(r => r.vk_id !== data.vk_id));
        setManualInput('');
      }
    } catch {
      setError('Ошибка добавления');
    } finally {
      setAdding(null);
      setAddingManual(false);
    }
  };

  const toggleGroup = async (g: Group) => {
    await fetch(API_URL, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: g.id, is_active: !g.is_active }),
    });
    setGroups(prev => prev.map(x => x.id === g.id ? { ...x, is_active: !x.is_active } : x));
  };

  const deleteGroup = async (id: number) => {
    await fetch(API_URL, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setGroups(prev => prev.filter(g => g.id !== id));
  };

  const startFetch = async () => {
    setFetching(true);
    setFetchResult(null);
    setFetchError('');
    try {
      const res = await fetch(`${COMMENTS_URL}/fetch`, { method: 'POST' });
      const text = await res.text();
      const data = JSON.parse(text);
      if (data.error) {
        setFetchError(data.error);
      } else {
        setFetchResult({ fetched: data.fetched, groups: data.groups });
        // Обновляем данные групп после сбора
        const gr = await fetch(API_URL);
        const gtext = await gr.text();
        const gdata = JSON.parse(gtext);
        if (Array.isArray(gdata)) setGroups(gdata);
      }
    } catch {
      setFetchError('Ошибка соединения');
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
          <h1 className="text-2xl font-semibold tracking-tight mt-1">Группы ВКонтакте</h1>
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
            {fetching ? 'Собираю...' : 'Начать мониторинг'}
          </button>
          {fetchResult && (
            <p className="text-xs text-emerald-600 font-mono">
              Собрано {fetchResult.fetched} комментариев из {fetchResult.groups} групп
            </p>
          )}
          {fetchError && (
            <p className="text-xs text-red-500 font-mono">{fetchError}</p>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Найти и добавить группу</h2>
        </div>
        <div className="px-6 py-5 space-y-4">
          {/* Search by name */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
              Поиск по названию
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Название группы..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchGroups()}
                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-background border border-border rounded-lg outline-none focus:border-foreground/40 transition-colors font-sans"
                />
              </div>
              <button
                onClick={searchGroups}
                disabled={searching || !query.trim()}
                className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {searching ? 'Ищу...' : 'Найти'}
              </button>
            </div>
          </div>

          {/* Manual add by link or screen_name */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
              Или вставь ссылку / короткое имя
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="vk.com/sportclub или sportclub"
                value={manualInput}
                onChange={e => setManualInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && manualInput.trim() && addGroup(manualInput.replace(/.*vk\.com\//, '').replace(/\/$/, '').trim())}
                className="flex-1 px-3 py-2.5 text-sm bg-background border border-border rounded-lg outline-none focus:border-foreground/40 transition-colors font-sans"
              />
              <button
                onClick={() => addGroup(manualInput.replace(/.*vk\.com\//, '').replace(/\/$/, '').trim())}
                disabled={addingManual || !manualInput.trim()}
                className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {addingManual ? '...' : <Icon name="Plus" size={15} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <Icon name="AlertCircle" size={14} />
              {error}
            </div>
          )}

          {/* Search results */}
          {searchResults.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground font-mono">Результаты поиска — нажми + чтобы добавить</p>
              {searchResults.map(r => (
                <div key={r.vk_id} className="flex items-center gap-3 p-3 border border-border rounded-lg hover:border-foreground/20 transition-colors">
                  {r.photo_url
                    ? <img src={r.photo_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                    : <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0"><Icon name="Users" size={16} className="text-muted-foreground" /></div>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">vk.com/{r.screen_name} · {formatMembers(r.members_count)} подписчиков</p>
                  </div>
                  <button
                    onClick={() => addGroup(r.vk_id)}
                    disabled={adding === r.vk_id || groups.some(g => g.vk_id === r.vk_id)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                      groups.some(g => g.vk_id === r.vk_id)
                        ? 'bg-emerald-100 text-emerald-700 cursor-default'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    }`}
                  >
                    {adding === r.vk_id
                      ? <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" />
                      : groups.some(g => g.vk_id === r.vk_id)
                        ? <Icon name="Check" size={13} />
                        : <Icon name="Plus" size={13} />
                    }
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Groups list */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Отслеживаемые группы</h2>
          <span className="text-xs font-mono text-muted-foreground">{activeCount} из {groups.length}</span>
        </div>

        {loading ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">Загрузка...</div>
        ) : groups.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Icon name="Users" size={32} className="text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Пока нет групп. Найди и добавь первую выше.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {groups.map(g => (
              <div key={g.id} className={`px-6 py-4 flex items-center gap-4 transition-colors ${!g.is_active ? 'opacity-50' : ''}`}>
                {g.photo_url
                  ? <img src={g.photo_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                  : <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0"><Icon name="Users" size={16} className="text-muted-foreground" /></div>
                }
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{g.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-muted-foreground font-mono">vk.com/{g.screen_name}</span>
                    <span className="text-xs text-muted-foreground font-mono">{formatMembers(g.members_count)} подписчиков</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-mono px-2 py-0.5 rounded ${g.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                    {g.is_active ? 'активна' : 'пауза'}
                  </span>
                  <button
                    onClick={() => toggleGroup(g)}
                    className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${g.is_active ? 'bg-primary' : 'bg-muted'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${g.is_active ? 'left-4' : 'left-0.5'}`} />
                  </button>
                  <button
                    onClick={() => deleteGroup(g.id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-red-50 transition-colors"
                  >
                    <Icon name="Trash2" size={13} />
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