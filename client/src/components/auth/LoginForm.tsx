import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
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
          'Something went wrong. Please try again.',
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
    <div className="w-full max-w-[420px] mx-auto">
      <div className="mb-7">
        <div className="flex items-center gap-2.5 mb-7">
          <div className="w-2 h-7 bg-accent-primary rounded-full shrink-0" />
          <div className="flex flex-col leading-tight">
            <span className="text-text-primary font-semibold text-[16px] tracking-tight">
              Nura Space
            </span>
            <span className="text-[11px] text-accent-primary font-medium">Southbank Calm</span>
          </div>
        </div>
        <h1 className="text-[26px] font-semibold text-text-primary tracking-tight">Welcome back</h1>
        <p className="text-text-secondary text-sm mt-1.5">
          Sign in to keep an eye on the weather and stay in the loop on live alerts.
        </p>
      </div>

      <div className="bg-bg-surface border border-border-subtle rounded-2xl p-6 shadow-card">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="username" className="text-xs font-semibold text-text-secondary">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              disabled={isSubmitting}
              className="w-full bg-bg-surface border border-border-subtle rounded-xl px-3.5 py-2.5 text-text-primary text-sm outline-none transition-colors hover:border-border-muted focus:border-accent-primary/40 focus:ring-2 focus:ring-accent-primary/15 disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-text-muted"
              placeholder="your username"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-xs font-semibold text-text-secondary">
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
                className="w-full bg-bg-surface border border-border-subtle rounded-xl px-3.5 py-2.5 pr-10 text-text-primary text-sm outline-none transition-colors hover:border-border-muted focus:border-accent-primary/40 focus:ring-2 focus:ring-accent-primary/15 disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-text-muted"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-xs text-severity-critical px-3 py-2.5 bg-severity-critical/8 border border-severity-critical/25 rounded-xl">
              <AlertCircle size={13} strokeWidth={2} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !username.trim() || !password}
            className="w-full h-11 rounded-xl bg-accent-primary text-white text-sm font-semibold shadow-card disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-accent-primary hover:bg-accent-hover active:scale-[0.99] transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"
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
          <p className="text-[11px] text-text-secondary mb-2 font-medium">Demo accounts</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fillDemo('admin', 'admin123')}
              className="flex-1 py-2 rounded-lg border border-border-subtle text-[11px] text-text-secondary hover:text-accent-primary hover:border-accent-primary/30 hover:bg-accent-soft transition-all font-mono"
            >
              admin / admin123
            </button>
            <button
              type="button"
              onClick={() => fillDemo('demo', 'password')}
              className="flex-1 py-2 rounded-lg border border-border-subtle text-[11px] text-text-secondary hover:text-accent-primary hover:border-accent-primary/30 hover:bg-accent-soft transition-all font-mono"
            >
              demo / password
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
