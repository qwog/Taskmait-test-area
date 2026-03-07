import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { api } from '../hooks/useApi';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const data = await api.get('/users/me');
      setUser(data);
    } catch {
      // token may have expired
      setToken(null);
      setUser(null);
      localStorage.removeItem('token');
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (stored) {
      setToken(stored);
      api.setToken(stored);
      refreshUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [refreshUser]);

  async function login(email: string, password: string) {
    const data = await api.post('/auth/login', { email, password });
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('token', data.token);
    api.setToken(data.token);
  }

  async function register(username: string, email: string, password: string) {
    const data = await api.post('/auth/register', { username, email, password });
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('token', data.token);
    api.setToken(data.token);
  }

  function logout() {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    api.setToken(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
