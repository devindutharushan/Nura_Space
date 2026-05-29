import { Bell, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToasts } from '../../hooks/useToasts';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useNavigate } from 'react-router-dom';

export function TopNav() {
  const { user, logout } = useAuth();
  const { unreadCount, setHistoryOpen } = useToasts();
  const { isConnected } = useWebSocket();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header className="bg-bg-surface/90 backdrop-blur-md border-b border-border-subtle fixed top-0 left-0 right-0 z-40 h-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-2 h-6 bg-accent-primary rounded-full" />
          <div className="flex flex-col leading-tight">
            <span className="text-text-primary font-semibold text-[15px] tracking-tight">
              Nura Space
            </span>
            <span className="text-[10px] text-text-secondary hidden sm:block">Southbank Calm</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3">
          <div
            className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full border transition-colors ${
              isConnected
                ? 'bg-accent-soft border-accent-primary/20 text-accent-primary'
                : 'bg-bg-soft border-border-subtle text-text-secondary'
            }`}
            role="status"
            aria-label={isConnected ? 'Live connection active' : 'Reconnecting'}
            title={isConnected ? 'Live connection active' : 'Reconnecting…'}
          >
            <span className="relative flex h-2 w-2 shrink-0">
              {isConnected && (
                <span className="absolute inline-flex h-full w-full rounded-full bg-accent-primary/40 opacity-75 animate-ping" />
              )}
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${
                  isConnected ? 'bg-accent-primary' : 'bg-text-muted'
                }`}
              />
            </span>
            <span className="text-[11px] font-medium hidden sm:block">
              {isConnected ? 'Live connection active' : 'Offline'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="relative flex items-center justify-center w-10 h-10 sm:w-9 sm:h-9 rounded-xl hover:bg-bg-soft transition-colors text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/30"
            aria-label={unreadCount > 0 ? `Alert history, ${unreadCount} unread` : 'Alert history'}
          >
            <Bell size={16} strokeWidth={1.75} />
            {unreadCount > 0 && (
              <span
                className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-severity-critical text-white text-[10px] font-bold flex items-center justify-center leading-none tabular-nums"
                aria-hidden="true"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <div
            className="w-9 h-9 sm:w-8 sm:h-8 rounded-full bg-accent-soft border border-accent-primary/15 flex items-center justify-center shrink-0"
            aria-label={user?.displayName ? `Signed in as ${user.displayName}` : undefined}
            title={user?.displayName}
          >
            <span className="text-[11px] font-semibold text-accent-primary leading-none">
              {user?.avatarInitials ?? '?'}
            </span>
          </div>

          <div className="w-px h-5 bg-border-subtle hidden sm:block" />

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center justify-center sm:justify-start gap-1.5 text-text-secondary hover:text-text-primary transition-colors w-10 h-10 sm:w-auto sm:h-auto sm:px-2 sm:py-1 rounded-lg hover:bg-bg-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/30"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut size={15} strokeWidth={1.75} />
            <span className="text-xs font-medium hidden sm:block">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
