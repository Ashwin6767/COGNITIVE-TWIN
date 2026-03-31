'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from './api';

const AuthContext = createContext(null);

const ROLE_DASHBOARD = {
  CUSTOMER: '/dashboard/customer',
  LOGISTICS_MANAGER: '/dashboard/manager',
  DRIVER: '/dashboard/driver',
  PORT_OFFICER: '/dashboard/port',
  CUSTOMS_OFFICER: '/dashboard/customs',
  YARD_MANAGER: '/dashboard/yard',
  ADMIN: '/dashboard/admin',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (stored && token) {
      setUser(JSON.parse(stored));
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.access_token);
    const me = await api.get('/auth/me');
    localStorage.setItem('user', JSON.stringify(me));
    setUser(me);
    return me;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/login';
  }, []);

  const getDashboardPath = useCallback(() => {
    if (!user) return '/login';
    return ROLE_DASHBOARD[user.role] || '/dashboard/customer';
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, getDashboardPath }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { ROLE_DASHBOARD };
