import { useState } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Icon from '@/components/ui/icon';
import Dashboard from '@/pages/Dashboard';
import Monitor from '@/pages/Monitor';
import Analytics from '@/pages/Analytics';
import Notifications from '@/pages/Notifications';
import Settings from '@/pages/Settings';

type Page = 'dashboard' | 'monitor' | 'analytics' | 'notifications' | 'settings';

const nav: { id: Page; label: string; icon: string; badge?: string }[] = [
  { id: 'dashboard', label: 'Главная', icon: 'LayoutDashboard' },
  { id: 'monitor', label: 'Мониторинг', icon: 'Activity', badge: 'Live' },
  { id: 'analytics', label: 'Аналитика', icon: 'BarChart2' },
  { id: 'notifications', label: 'Уведомления', icon: 'Bell' },
  { id: 'settings', label: 'Настройки', icon: 'Settings' },
];

function AppContent() {
  const [page, setPage] = useState<Page>('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <Dashboard />;
      case 'monitor': return <Monitor />;
      case 'analytics': return <Analytics />;
      case 'notifications': return <Notifications />;
      case 'settings': return <Settings />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-56 bg-card border-r border-border flex flex-col
        transition-transform duration-300
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:flex
      `}>
        {/* Logo */}
        <div className="px-5 py-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center">
              <Icon name="Radar" size={14} className="text-primary-foreground" />
            </div>
            <div>
              <span className="text-sm font-semibold tracking-tight">Комментарий</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-dot inline-block" />
                <span className="text-[10px] text-muted-foreground font-mono">live</span>
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5">
          {nav.map(item => (
            <button
              key={item.id}
              onClick={() => { setPage(item.id); setMobileOpen(false); }}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left
                ${page === item.id
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'text-foreground/70 hover:text-foreground hover:bg-secondary'
                }
              `}
            >
              <Icon name={item.icon as any} size={16} className="shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium ${
                  page === item.id ? 'bg-white/20 text-primary-foreground' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* User footer */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold font-mono">
              ИП
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">Иван Петров</p>
              <p className="text-[10px] text-muted-foreground truncate">SportBrand Co.</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile topbar */}
        <header className="lg:hidden sticky top-0 z-20 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
          >
            <Icon name="Menu" size={18} />
          </button>
          <span className="text-sm font-semibold">Комментарий</span>
          <div className="w-7" />
        </header>

        <main className="flex-1 p-6 lg:p-8 max-w-5xl w-full mx-auto">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <TooltipProvider>
      <Toaster />
      <AppContent />
    </TooltipProvider>
  );
}
