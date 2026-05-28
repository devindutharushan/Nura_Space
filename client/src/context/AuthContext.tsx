import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import api from '../services/api';
import type { AuthContextValue, User, LoginCredentials, AuthResponse } from '../types';

const AuthContext = createContext<AuthContextValue | null>(null);

// The client never trusts the JWT — the server re-verifies every request.
// This local decode exists only to skip a guaranteed-failed boot-time API
// call when the stored token is obviously expired (e.g. user returned after
// the 24h TTL elapsed). If decoding fails for any reason we treat the token
// as invalid and drop it.
function decodeToken(token: string): { exp: number } | null {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

function isTokenValid(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded) return false;
  return decoded.exp * 1000 > Date.now();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate from localStorage on mount so a returning user doesn't have to
  // re-authenticate inside the JWT's lifetime. Any failure — missing data,
  // expired token, corrupted JSON — clears both keys together so we never
  // end up with a half-restored session.
  useEffect(() => {
    const stored = localStorage.getItem('nura_token');
    const userData = localStorage.getItem('nura_user');
    if (stored && isTokenValid(stored) && userData) {
      try {
        setUser(JSON.parse(userData));
        setToken(stored);
      } catch {
        localStorage.removeItem('nura_token');
        localStorage.removeItem('nura_user');
      }
    } else {
      localStorage.removeItem('nura_token');
      localStorage.removeItem('nura_user');
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (credentials: LoginCredentials): Promise<void> => {
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    const { token: newToken, user: newUser } = response.data;
    localStorage.setItem('nura_token', newToken);
    localStorage.setItem('nura_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback((): void => {
    localStorage.removeItem('nura_token');
    localStorage.removeItem('nura_user');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
