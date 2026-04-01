'use client';
import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useWebSocket } from '@/lib/useWebSocket';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { ToastContainer } from '@/components/ui/Toast';

const NotificationContext = createContext(null);

let toastIdCounter = 0;

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState([]);
  const [latestNotification, setLatestNotification] = useState(null);
  const mountedRef = useRef(true);

  // Build WebSocket URL with JWT token
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
  const wsBase = apiBase.replace(/^http/, 'ws').replace(/\/api$/, '');
  const wsUrl = token ? `${wsBase}/api/ws/stream?token=${token}` : null;

  // Fetch initial unread count
  useEffect(() => {
    mountedRef.current = true;
    if (user) {
      api.get('/notifications/unread-count')
        .then((d) => { if (mountedRef.current) setUnreadCount(d.count || 0); })
        .catch(() => {});
    }
    return () => { mountedRef.current = false; };
  }, [user]);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleWsMessage = useCallback((data) => {
    if (data.event === 'new_notification' && data.data) {
      const notif = data.data;
      setUnreadCount((c) => c + 1);
      setLatestNotification(notif);

      // Add toast
      toastIdCounter += 1;
      const toastId = `toast-${toastIdCounter}`;
      setToasts((prev) => [
        ...prev.slice(-4), // keep max 5 toasts
        { id: toastId, ...notif },
      ]);
    }
  }, []);

  useWebSocket(wsUrl, { onMessage: handleWsMessage, enabled: !!user });

  const markRead = useCallback(() => {
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const markAllRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const refreshCount = useCallback(() => {
    api.get('/notifications/unread-count')
      .then((d) => setUnreadCount(d.count || 0))
      .catch(() => {});
  }, []);

  return (
    <NotificationContext.Provider
      value={{ unreadCount, latestNotification, markRead, markAllRead, refreshCount }}
    >
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
