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
    <header className="bg-bg-base/95 backdrop-blur-sm border-b border-border-subtle fixed top-0 left-0 right-0 z-40 h-14">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-1.5 h-5 bg-accent-primary rounded-full" />
          <span className="text-text-primary font-semibold text-[14px] tracking-tight hidden xs:block sm:block">
            Nura Space
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div
              className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors duration-500 ${
                isConnected ? 'bg-status-connected' : 'bg-status-disconnected'
              }`}
            />
            <span className="text-[11px] text-text-muted font-medium hidden sm:block">
              {isConnected ? 'Live' : 'Offline'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="relative flex items-center justify-center w-8 h-8 rounded-lg hover:bg-bg-elevated transition-colors text-text-muted hover:text-text-secondary"
            aria-label="Alert history"
          >
            <Bell size={15} strokeWidth={1.75} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-severity-critical text-white text-[9px] font-bold flex items-center justify-center leading-none tabular-nums">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <div className="w-7 h-7 rounded-lg bg-bg-elevated border border-border-subtle flex items-center justify-center shrink-0">
            <span className="text-[11px] font-semibold text-text-secondary leading-none">
              {user?.avatarInitials ?? '?'}
            </span>
          </div>

          <div className="w-px h-4 bg-border-subtle hidden sm:block" />

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-text-muted hover:text-text-secondary transition-colors"
          >
            <LogOut size={14} strokeWidth={1.75} />
            <span className="text-xs font-medium hidden sm:block">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
