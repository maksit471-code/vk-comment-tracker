import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';

const API = 'https://functions.poehali.dev/ed7f08a0-3361-404a-8c7d-5c5398295948';

interface KeywordItem {
  id: number;
  word: string;
  active: boolean;
  hits: number;
}

export default function Notifications() {
  const [keywords, setKeywords] = useState<KeywordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newWord, setNewWord] = useState('');

  const [tgChatId, setTgChatId] = useState<string | null>(null);
  const [tgEnabled, setTgEnabled] = useState(false);
  const [minMentions, setMinMentions] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/keywords`).then(r => r.json()).catch(() => []),
      fetch(`${API}/notify`).then(r => r.json()).catch(() => ({})),
    ]).then(([kws, notify]) => {
      if (Array.isArray(kws)) setKeywords(kws);
      if (notify && typeof notify === 'object') {
        setTgChatId(notify.tg_chat_id || null);
        setTgEnabled(!!notify.tg_enabled);
        setMinMentions(notify.min_mentions || 1);
      }
    }).finally(() => setLoading(false));
  }, []);

  const toggleKeyword = async (kw: KeywordItem) => {
    setKeywords(prev => prev.map(k => k.id === kw.id ? { ...k, active: !k.active } : k));
    await fetch(`${API}/keywords`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: kw.id, active: !kw.active }),
    });
  };

  const removeKeyword = async (id: number) => {
    setKeywords(prev => prev.filter(k => k.id !== id));
    await fetch(`${API}/keywords`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
  };

  const addKeyword = async () => {
    if (!newWord.trim()) return;
    const res = await fetch(`${API}/keywords`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: newWord.trim() }),
    });
    const data = await res.json();
    if (data.id) {
      setKeywords(prev => {
        const exists = prev.find(k => k.id === data.id);
        return exists ? prev.map(k => k.id === data.id ? data : k) : [...prev, data];
      });
      setNewWord('');
    }
  };

  const saveNotifySettings = async () => {
    setSaving(true);
    await fetch(`${API}/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tg_chat_id: tgChatId, tg_enabled: tgEnabled, min_mentions: minMentions }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <span className="text-xs font-mono text-muted-foreground tracking-widest uppercase">Настройки</span>
        <h1 className="text-2xl font-semibold tracking-tight mt-1">Уведомления и фильтры</h1>
      </div>

      {/* Keywords */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Ключевые слова</h2>
          <span className="text-xs font-mono text-muted-foreground">
            {loading ? '...' : `${keywords.filter(k => k.active).length} активных`}
          </span>
        </div>

        {loading ? (
          <div className="px-6 py-8 text-sm text-muted-foreground text-center">Загрузка...</div>
        ) : (
          <div className="divide-y divide-border">
            {keywords.map(k => (
              <div key={k.id} className="px-6 py-3.5 flex items-center gap-4">
                <button
                  onClick={() => toggleKeyword(k)}
                  className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${k.active ? 'bg-primary' : 'bg-muted'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${k.active ? 'left-4' : 'left-0.5'}`} />
                </button>
                <span className={`font-medium flex-1 ${!k.active && 'text-muted-foreground line-through'}`}>{k.word}</span>
                <span className="text-xs font-mono text-muted-foreground">{k.hits} упом.</span>
                <button onClick={() => removeKeyword(k.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                  <Icon name="X" size={14} />
                </button>
              </div>
            ))}
            {keywords.length === 0 && (
              <div className="px-6 py-6 text-sm text-muted-foreground text-center">Нет ключевых слов</div>
            )}
          </div>
        )}

        <div className="px-6 py-4 border-t border-border flex gap-2">
          <input
            type="text"
            placeholder="Новое ключевое слово..."
            value={newWord}
            onChange={e => setNewWord(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addKeyword()}
            className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:border-foreground/40 transition-colors font-sans"
          />
          <button
            onClick={addKeyword}
            disabled={!newWord.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Icon name="Plus" size={15} />
          </button>
        </div>
      </div>

      {/* Telegram notify settings */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-3">
          <Icon name="Send" size={15} className="text-muted-foreground" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Telegram-уведомления</h2>
        </div>
        <div className="px-6 py-5 space-y-5">

          {/* Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Мгновенные уведомления</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {tgChatId ? `Подключено · chat_id: ${tgChatId}` : 'Настройте аккаунт в разделе Настройки'}
              </p>
            </div>
            <button
              onClick={() => setTgEnabled(v => !v)}
              disabled={!tgChatId}
              className={`w-9 h-5 rounded-full transition-colors relative shrink-0 disabled:opacity-40 ${tgEnabled ? 'bg-primary' : 'bg-muted'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${tgEnabled ? 'left-4' : 'left-0.5'}`} />
            </button>
          </div>

          {/* Min mentions */}
          <div>
            <label className="text-sm font-medium mb-2.5 flex items-center justify-between">
              Мин. упоминаний для оповещения
              <span className="font-mono text-primary">{minMentions}</span>
            </label>
            <input
              type="range" min={1} max={20} value={minMentions}
              onChange={e => setMinMentions(Number(e.target.value))}
              className="w-full accent-foreground"
            />
            <div className="flex justify-between text-xs text-muted-foreground font-mono mt-1">
              <span>1</span><span>20</span>
            </div>
          </div>

          {/* Save */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={saveNotifySettings}
              disabled={saving}
              className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? 'Сохраняю...' : 'Сохранить'}
            </button>
            {saved && (
              <div className="flex items-center gap-2 text-sm text-emerald-600 animate-fade-in">
                <Icon name="Check" size={15} />
                Сохранено
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
