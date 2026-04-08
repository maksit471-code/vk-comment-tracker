import { useState } from 'react';
import Icon from '@/components/ui/icon';

interface KeywordItem {
  id: number;
  word: string;
  active: boolean;
  hits: number;
}

interface NotifChannel {
  id: string;
  label: string;
  icon: string;
  enabled: boolean;
  desc: string;
}

const initialKeywords: KeywordItem[] = [
  { id: 1, word: 'угроза городу', active: true, hits: 0 },
  { id: 2, word: 'взорвать', active: true, hits: 0 },
  { id: 3, word: 'удар по', active: true, hits: 0 },
  { id: 4, word: 'экстремизм', active: true, hits: 0 },
  { id: 5, word: 'теракт', active: true, hits: 0 },
  { id: 6, word: 'радикальный', active: false, hits: 0 },
];

const initialChannels: NotifChannel[] = [
  { id: 'email', label: 'Email', icon: 'Mail', enabled: true, desc: 'Ежедневный отчёт на vkrsamara2026@mail.ru' },
  { id: 'telegram', label: 'Telegram', icon: 'Send', enabled: false, desc: 'Мгновенные уведомления в бот' },
  { id: 'push', label: 'Push-уведомления', icon: 'Bell', enabled: true, desc: 'В браузере' },
];

const sentimentFilters = ['Все', 'Только негативные', 'Только позитивные'];

export default function Notifications() {
  const [keywords, setKeywords] = useState(initialKeywords);
  const [channels, setChannels] = useState(initialChannels);
  const [newWord, setNewWord] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState('Все');
  const [minMentions, setMinMentions] = useState(1);

  const toggleKeyword = (id: number) => {
    setKeywords(prev => prev.map(k => k.id === id ? { ...k, active: !k.active } : k));
  };

  const removeKeyword = (id: number) => {
    setKeywords(prev => prev.filter(k => k.id !== id));
  };

  const addKeyword = () => {
    if (!newWord.trim()) return;
    setKeywords(prev => [...prev, { id: Date.now(), word: newWord.trim(), active: true, hits: 0 }]);
    setNewWord('');
  };

  const toggleChannel = (id: string) => {
    setChannels(prev => prev.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c));
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
          <span className="text-xs font-mono text-muted-foreground">{keywords.filter(k => k.active).length} активных</span>
        </div>

        <div className="divide-y divide-border">
          {keywords.map(k => (
            <div key={k.id} className="px-6 py-3.5 flex items-center gap-4">
              <button
                onClick={() => toggleKeyword(k.id)}
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
        </div>

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
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Icon name="Plus" size={15} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Фильтры</h2>
        </div>
        <div className="px-6 py-5 space-y-5">
          <div>
            <label className="text-sm font-medium mb-2.5 block">Тональность</label>
            <div className="flex gap-2 flex-wrap">
              {sentimentFilters.map(f => (
                <button
                  key={f}
                  onClick={() => setSentimentFilter(f)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    sentimentFilter === f
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border hover:border-foreground/30'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
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
        </div>
      </div>

      {/* Channels */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Каналы уведомлений</h2>
        </div>
        <div className="divide-y divide-border">
          {channels.map(c => (
            <div key={c.id} className="px-6 py-4 flex items-center gap-4">
              <Icon name={c.icon as any} size={18} className="text-muted-foreground shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">{c.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{c.desc}</p>
              </div>
              <button
                onClick={() => toggleChannel(c.id)}
                className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${c.enabled ? 'bg-primary' : 'bg-muted'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${c.enabled ? 'left-4' : 'left-0.5'}`} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}