import { LogOut } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

export type NavSection = 'grid' | 'progress' | 'backup';

interface TopBarProps {
  activeSection: NavSection;
  onNavigate: (section: NavSection) => void;
  userEmail?: string | null;
  onSignOut?: () => void;
}

const NAV_ITEMS: Array<{ id: NavSection; label: string }> = [
  { id: 'grid', label: 'Weekly Grid' },
  { id: 'progress', label: 'Progress' },
  { id: 'backup', label: 'Backup' },
];

export function TopBar({ activeSection, onNavigate, userEmail, onSignOut }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-4 sm:gap-8">
        <a
          href="#grid"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('grid');
          }}
          className="font-display text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-orange-600 rounded"
        >
          LoadLog
        </a>

        <nav className="hidden md:flex items-center gap-7" aria-label="Primary navigation">
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(item.id);
                }}
                className={`text-sm font-medium whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors focus-visible:outline-2 focus-visible:outline-orange-600 ${
                  isActive
                    ? 'text-slate-900 border-orange-600'
                    : 'text-slate-600 border-transparent hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <PWAInstallButton />
          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              title={userEmail ? `Cerrar sesión (${userEmail})` : 'Cerrar sesión'}
              aria-label="Cerrar sesión"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 min-h-[36px] text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
