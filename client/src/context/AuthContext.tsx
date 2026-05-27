import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import api from '../services/api';
import type { AuthContextValue, User, LoginCredentials, AuthResponse } from '../types';

const AuthContext = createContext<AuthContextValue | null>(null);

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

  useEffect(() => {
    const stored = localStorage.getItem('nura_token');
    if (stored && isTokenValid(stored)) {
      setToken(stored);
      const userData = localStorage.getItem('nura_user');
      if (userData) {
        try {
          setUser(JSON.parse(userData));
        } catch {
          localStorage.removeItem('nura_user');
        }
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
