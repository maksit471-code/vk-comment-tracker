import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';

const TG_API = 'https://functions.poehali.dev/5dcabbf3-158f-46c1-af6b-667245e03b9b';
const SETTINGS_API = 'https://functions.poehali.dev/ed7f08a0-3361-404a-8c7d-5c5398295948';

export default function Settings() {
  const [name, setName] = useState('BSF');
  const [email, setEmail] = useState('vkrsamara2026@mail.ru');
  const [company, setCompany] = useState('BSF');
  const [timezone, setTimezone] = useState('Europe/Moscow');
  const [refreshInterval, setRefreshInterval] = useState(() => localStorage.getItem('monitor_interval') || '5');
  const [saved, setSaved] = useState(false);

  const [vkToken, setVkToken] = useState('');
  const [vkMasked, setVkMasked] = useState<string | null>(null);
  const [vkHasToken, setVkHasToken] = useState(false);
  const [vkSaving, setVkSaving] = useState(false);
  const [vkStatus, setVkStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [vkError, setVkError] = useState('');
  const [vkShowInput, setVkShowInput] = useState(false);

  useEffect(() => {
    fetch(`${SETTINGS_API}?action=vk_token_get`)
      .then(r => r.text())
      .then(t => {
        const d = JSON.parse(t);
        setVkHasToken(d.has_token);
        setVkMasked(d.masked || null);
        if (!d.has_token) setVkShowInput(true);
      })
      .catch(() => setVkShowInput(true));
  }, []);

  const saveVkToken = async () => {
    if (!vkToken.trim()) return;
    setVkSaving(true);
    setVkError('');
    try {
      const res = await fetch(SETTINGS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'vk_token_save', token: vkToken.trim() }),
      });
      const d = JSON.parse(await res.text());
      if (d.ok) {
        setVkStatus('ok');
        setVkHasToken(true);
        const v = vkToken.trim();
        setVkMasked(v.slice(0, 8) + '...' + v.slice(-4));
        setVkToken('');
        setVkShowInput(false);
      } else {
        setVkError(d.error || 'Ошибка');
        setVkStatus('error');
      }
    } catch {
      setVkError('Ошибка соединения');
      setVkStatus('error');
    } finally {
      setVkSaving(false);
    }
  };

  const [tgUsername, setTgUsername] = useState('Vkr163sm');
  const [tgChatId, setTgChatId] = useState<number | null>(null);
  const [tgStatus, setTgStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
  const [tgError, setTgError] = useState('');

  const connectTelegram = async () => {
    const username = tgUsername.trim().replace(/^@/, '');
    if (!username) return;
    setTgStatus('sending');
    setTgError('');
    try {
      const res = await fetch(TG_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', username, chat_id: 8798783497 }),
      });
      const data = JSON.parse(await res.text());
      if (data.ok) {
        setTgChatId(data.chat_id);
        setTgStatus('ok');
        // Сохраняем chat_id в БД для автоматических уведомлений
        await fetch(SETTINGS_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'notify_save', tg_chat_id: data.chat_id, tg_enabled: true }),
        });
      } else {
        setTgError(data.error || 'Ошибка');
        setTgStatus('error');
      }
    } catch {
      setTgError('Ошибка соединения');
      setTgStatus('error');
    }
  };

  const save = () => {
    localStorage.setItem('monitor_interval', refreshInterval);
    // Уведомляем useAutoFetch об изменении интервала
    window.dispatchEvent(new StorageEvent('storage', { key: 'monitor_interval', newValue: refreshInterval }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl">
      <div>
        <span className="text-xs font-mono text-muted-foreground tracking-widest uppercase">Настройки</span>
        <h1 className="text-2xl font-semibold tracking-tight mt-1">Профиль и приложение</h1>
      </div>

      {/* Profile */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-3">
          <Icon name="User" size={15} className="text-muted-foreground" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Профиль</h2>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center gap-4 pb-4 border-b border-border">
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Coat_of_arms_of_Russia.svg/200px-Coat_of_arms_of_Russia.svg.png" alt="Герб России" className="w-14 h-14 rounded-full object-contain bg-white p-1" />
            <div>
              <p className="font-medium">{name}</p>
              <p className="text-sm text-muted-foreground">{email}</p>
            </div>
          </div>
          {[
            { label: 'Имя', value: name, onChange: setName, type: 'text' },
            { label: 'Email', value: email, onChange: setEmail, type: 'email' },
            { label: 'Компания', value: company, onChange: setCompany, type: 'text' },
          ].map((f, i) => (
            <div key={i}>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">{f.label}</label>
              <input
                type={f.type}
                value={f.value}
                onChange={e => f.onChange(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg outline-none focus:border-foreground/40 transition-colors font-sans"
              />
            </div>
          ))}
        </div>
      </div>

      {/* VK API */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Icon name="Key" size={15} className="text-muted-foreground" />
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">ВКонтакте API</h2>
          </div>
          {vkHasToken && !vkShowInput && (
            <button
              onClick={() => { setVkShowInput(true); setVkStatus('idle'); }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Заменить токен
            </button>
          )}
        </div>
        <div className="px-6 py-5 space-y-4">
          {vkHasToken && !vkShowInput ? (
            <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <div>
                <span className="text-xs text-emerald-700 font-medium">Токен подключён · API v5.199</span>
                {vkMasked && <p className="text-xs text-emerald-600 font-mono mt-0.5">{vkMasked}</p>}
              </div>
            </div>
          ) : (
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Токен доступа VK
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={vkToken}
                  onChange={e => { setVkToken(e.target.value); setVkStatus('idle'); }}
                  placeholder="vk1.a.XXXXXXXXXXXX..."
                  className="flex-1 px-3 py-2.5 text-sm bg-background border border-border rounded-lg outline-none focus:border-foreground/40 transition-colors font-mono"
                />
                <button
                  onClick={saveVkToken}
                  disabled={vkSaving || !vkToken.trim()}
                  className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {vkSaving ? 'Сохраняю...' : 'Сохранить'}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                Получите токен на{' '}
                <a
                  href="https://vkhost.github.io/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2 hover:opacity-75 transition-opacity"
                >
                  vkhost.github.io
                </a>{' '}
                — выберите «Kate Mobile», разрешите доступ и скопируйте токен из адресной строки
              </p>
              {vkStatus === 'ok' && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 font-medium mt-2">
                  <Icon name="CheckCircle" size={13} /> Токен сохранён — мониторинг запущен
                </div>
              )}
              {vkStatus === 'error' && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 mt-2">
                  <Icon name="AlertCircle" size={13} /> {vkError}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Telegram */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-3">
          <Icon name="Send" size={15} className="text-muted-foreground" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Telegram-уведомления</h2>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Telegram username
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                <input
                  type="text"
                  value={tgUsername}
                  onChange={e => { setTgUsername(e.target.value.replace(/^@/, '')); setTgStatus('idle'); }}
                  placeholder="username"
                  className="w-full pl-7 pr-4 py-2.5 text-sm bg-background border border-border rounded-lg outline-none focus:border-foreground/40 transition-colors font-mono"
                />
              </div>
              <button
                onClick={connectTelegram}
                disabled={tgStatus === 'sending' || !tgUsername.trim()}
                className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {tgStatus === 'sending' ? 'Отправляю...' : 'Подключить'}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Сначала напишите боту любое сообщение, затем нажмите «Подключить»
            </p>
          </div>

          {tgStatus === 'ok' && (
            <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-xs text-emerald-700 font-medium">
                Подключено · @{tgUsername} · chat_id: {tgChatId}
              </span>
            </div>
          )}
          {tgStatus === 'error' && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <Icon name="AlertCircle" size={14} />
              {tgError}
            </div>
          )}
        </div>
      </div>

      {/* App settings */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-3">
          <Icon name="Settings" size={15} className="text-muted-foreground" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Приложение</h2>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Часовой пояс</label>
            <select
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg outline-none focus:border-foreground/40 transition-colors font-sans"
            >
              <option value="Europe/Moscow">Москва (UTC+3)</option>
              <option value="Europe/Kaliningrad">Калининград (UTC+2)</option>
              <option value="Asia/Yekaterinburg">Екатеринбург (UTC+5)</option>
              <option value="Asia/Novosibirsk">Новосибирск (UTC+7)</option>
              <option value="Asia/Vladivostok">Владивосток (UTC+10)</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center justify-between">
              Интервал обновления
              <span className="font-mono text-primary normal-case">{refreshInterval} мин</span>
            </label>
            <div className="flex gap-2">
              {['1', '5', '10', '30', '60'].map(v => (
                <button
                  key={v}
                  onClick={() => setRefreshInterval(v)}
                  className={`flex-1 py-2 text-sm rounded-lg border transition-colors font-mono ${
                    refreshInterval === v
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border hover:border-foreground/30'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Сохранить изменения
        </button>
        {saved && (
          <div className="flex items-center gap-2 text-sm text-emerald-600 animate-fade-in">
            <Icon name="Check" size={15} />
            Сохранено
          </div>
        )}
      </div>
    </div>
  );
}