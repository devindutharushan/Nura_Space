import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await login({ username, password });
      navigate('/home');
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          'Something went wrong. Try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function fillDemo(u: string, p: string) {
    setUsername(u);
    setPassword(p);
    setError(null);
  }

  return (
    <div className="w-full max-w-[400px] mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-1.5 h-6 bg-accent-primary rounded-full shrink-0" />
          <span className="text-text-primary font-semibold text-[15px] tracking-tight">
            Nura Space
          </span>
        </div>
        <h1 className="text-2xl font-semibold text-text-primary tracking-tight">Sign in</h1>
        <p className="text-text-muted text-sm mt-1">
          Real-time weather and city alert dashboard.
        </p>
      </div>

      <div className="bg-bg-surface border border-border-muted rounded-xl p-6 shadow-card-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="username" className="text-xs font-medium text-text-secondary">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              disabled={isSubmitting}
              className="w-full bg-bg-elevated border border-border-subtle rounded-lg px-3 py-2.5 text-text-primary text-sm outline-none transition-colors hover:border-border-muted focus:border-border-strong disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-xs font-medium text-text-secondary">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={isSubmitting}
                className="w-full bg-bg-elevated border border-border-subtle rounded-lg px-3 py-2.5 pr-10 text-text-primary text-sm outline-none transition-colors hover:border-border-muted focus:border-border-strong disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting || !username.trim() || !password}
            className="w-full h-10 rounded-lg bg-accent-primary text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-400 transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-border-subtle">
          <p className="text-[11px] text-text-muted mb-2">Demo accounts</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fillDemo('admin', 'admin123')}
              className="flex-1 py-1.5 rounded-lg border border-border-subtle text-[11px] text-text-muted hover:text-text-secondary hover:border-border-muted hover:bg-bg-elevated transition-all font-mono"
            >
              admin / admin123
            </button>
            <button
              type="button"
              onClick={() => fillDemo('demo', 'password')}
              className="flex-1 py-1.5 rounded-lg border border-border-subtle text-[11px] text-text-muted hover:text-text-secondary hover:border-border-muted hover:bg-bg-elevated transition-all font-mono"
            >
              demo / password
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
