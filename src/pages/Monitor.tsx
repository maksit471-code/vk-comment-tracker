import { useState, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/icon';

const VK_API = 'https://functions.poehali.dev/1ba8f77d-759f-4bd4-bfc3-bd43b661451d';
const TG_API = 'https://functions.poehali.dev/5dcabbf3-158f-46c1-af6b-667245e03b9b';

interface VkComment {
  id: number;
  group_id: number;
  group_name: string;
  vk_post_id: number;
  vk_comment_id: number;
  author_id: number;
  author_name: string;
  author_photo: string | null;
  text: string;
  published_at: string | null;
  fetched_at: string | null;
  sentiment: string;
  source: 'vk';
}

interface TgMessage {
  id: number;
  group_id: number;
  group_title: string;
  tg_message_id: number;
  author_id: number;
  author_name: string;
  author_username: string;
  text: string;
  published_at: string | null;
  fetched_at: string | null;
  source: 'telegram';
}

type FeedItem = (VkComment | TgMessage) & { _sortTime: number };

function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}с назад`;
  if (diff < 3600) return `${Math.floor(diff / 60)}м назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}ч назад`;
  return `${Math.floor(diff / 86400)}д назад`;
}

export default function Monitor() {
  const [vkComments, setVkComments] = useState<VkComment[]>([]);
  const [tgMessages, setTgMessages] = useState<TgMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [source, setSource] = useState<'all' | 'vk' | 'telegram'>('all');

  const load = useCallback(async () => {
    try {
      const [vkRes, tgRes] = await Promise.all([
        fetch(`${VK_API}?limit=100`).then(r => r.text()),
        fetch(`${TG_API}?action=messages&limit=100`).then(r => r.text()),
      ]);
      const vkData = JSON.parse(vkRes);
      const tgData = JSON.parse(tgRes);
      if (Array.isArray(vkData)) setVkComments(vkData.map(c => ({ ...c, source: 'vk' as const })));
      if (Array.isArray(tgData)) setTgMessages(tgData);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const allItems: FeedItem[] = [
    ...( source !== 'telegram' ? vkComments : []),
    ...( source !== 'vk' ? tgMessages : []),
  ]
    .map(item => ({
      ...item,
      _sortTime: new Date(item.published_at || item.fetched_at || 0).getTime(),
    }))
    .sort((a, b) => b._sortTime - a._sortTime);

  const filtered = allItems.filter(item => {
    if (!search) return true;
    const text = item.text?.toLowerCase() || '';
    const author = item.source === 'vk'
      ? (item as VkComment).author_name.toLowerCase()
      : (item as TgMessage).author_name.toLowerCase();
    return text.includes(search.toLowerCase()) || author.includes(search.toLowerCase());
  });

  const totalCount = vkComments.length + tgMessages.length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-dot inline-block" />
            <span className="text-xs font-mono text-muted-foreground tracking-widest uppercase">Мониторинг</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Лента сообщений</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {loading ? 'Загрузка...' : `${totalCount} сообщений · VK ${vkComments.length} · TG ${tgMessages.length}`}
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-lg hover:bg-secondary transition-colors shrink-0"
        >
          <Icon name="RefreshCw" size={14} />
          Обновить
        </button>
      </div>

      {/* Фильтры */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'vk', 'telegram'] as const).map(s => (
          <button
            key={s}
            onClick={() => setSource(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              source === s
                ? 'bg-primary text-primary-foreground'
                : 'bg-card border border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {s === 'all' ? 'Все' : s === 'vk' ? 'ВКонтакте' : 'Telegram'}
          </button>
        ))}
        <div className="relative flex-1 min-w-48">
          <Icon name="Search" size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Поиск по тексту или автору..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-4 py-1.5 text-sm bg-card border border-border rounded-lg outline-none focus:border-foreground/40 transition-colors font-sans"
          />
        </div>
      </div>

      {/* Лента */}
      {loading ? (
        <div className="bg-card border border-border rounded-lg px-6 py-16 flex flex-col items-center gap-3">
          <Icon name="Loader" size={24} className="text-muted-foreground animate-spin" />
          <p className="text-sm text-muted-foreground">Загрузка...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-lg px-6 py-16 flex flex-col items-center text-center gap-3">
          <Icon name="Activity" size={32} className="text-muted-foreground" />
          <p className="text-sm font-medium">{search ? 'Ничего не найдено' : 'Лента пуста'}</p>
          <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
            {search ? 'Попробуй другой запрос' : 'Добавь группы ВК или Telegram и нажми «Собрать» — сообщения появятся здесь'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => {
            const isVk = item.source === 'vk';
            const vk = isVk ? item as VkComment : null;
            const tg = !isVk ? item as TgMessage : null;
            const groupName = isVk ? vk!.group_name : tg!.group_title;
            const authorName = isVk ? vk!.author_name : tg!.author_name;

            return (
              <div key={`${item.source}-${item.id}`} className="bg-card border border-border rounded-lg p-4 hover:border-foreground/20 transition-colors">
                <div className="flex items-start gap-3">
                  {isVk && vk!.author_photo ? (
                    <img src={vk!.author_photo} alt="" className="w-8 h-8 rounded-full shrink-0 object-cover" />
                  ) : (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isVk ? 'bg-blue-100' : 'bg-sky-100'}`}>
                      <Icon name={isVk ? 'User' : 'Send'} size={14} className={isVk ? 'text-blue-500' : 'text-sky-500'} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {isVk ? (
                        <a
                          href={`https://vk.com/id${vk!.author_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium hover:underline"
                        >
                          {authorName}
                        </a>
                      ) : (
                        <span className="text-sm font-medium">
                          {tg!.author_username ? (
                            <a href={`https://t.me/${tg!.author_username}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                              {authorName}
                            </a>
                          ) : authorName}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">в</span>
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${isVk ? 'text-blue-600 bg-blue-50' : 'text-sky-600 bg-sky-50'}`}>
                        {isVk ? '⚡' : '✈️'} {groupName}
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground font-mono shrink-0">
                        {timeAgo(item.published_at || item.fetched_at)}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed break-words">{item.text}</p>
                    {isVk && (
                      <a
                        href={`https://vk.com/wall-${vk!.group_id}_${vk!.vk_post_id}?reply=${vk!.vk_comment_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-1.5 transition-colors"
                      >
                        <Icon name="ExternalLink" size={11} />
                        Открыть в ВК
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
