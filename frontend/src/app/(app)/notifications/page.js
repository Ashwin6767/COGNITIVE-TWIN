'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Bell, Check, Circle, Ship } from 'lucide-react';
import { timeAgo } from '@/lib/utils';

const TYPE_BADGE = {
  INFO:    'bg-blue-100 text-blue-700',
  WARNING: 'bg-yellow-100 text-yellow-800',
  ERROR:   'bg-red-100 text-red-700',
  SUCCESS: 'bg-green-100 text-green-700',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/notifications/')
      .then(data => setNotifications(data.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const markRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch {}
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    await Promise.allSettled(unread.map(n => api.post(`/notifications/${n.id}/read`)));
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#0F172A]">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-[#64748B] mt-1">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Mark all read
          </button>
        )}
      </div>

      <Card>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : notifications.length === 0 ? (
            <EmptyState title="No notifications" description="You're all caught up!" icon={Bell} />
          ) : (
            <div className="divide-y divide-[#E2E8F0]">
              {notifications.map(n => (
                <div key={n.id} className={`flex items-start gap-3 py-4 ${!n.read ? 'bg-blue-50/50 -mx-6 px-6' : ''}`}>
                  <div className="mt-1">
                    {n.read ? (
                      <Check className="w-4 h-4 text-[#94A3B8]" />
                    ) : (
                      <Circle className="w-4 h-4 text-blue-600 fill-blue-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {n.title && (
                        <p className="text-sm font-medium text-[#0F172A]">{n.title}</p>
                      )}
                      {n.type && (
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${TYPE_BADGE[n.type] || TYPE_BADGE.INFO}`}>
                          {n.type}
                        </span>
                      )}
                    </div>
                    {n.message && n.title && (
                      <p className="text-sm text-[#334155] mt-0.5">{n.message}</p>
                    )}
                    {n.message && !n.title && (
                      <p className="text-sm text-[#0F172A]">{n.message}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5">
                      <p className="text-xs text-[#94A3B8]">{timeAgo(n.created_at)}</p>
                      {n.shipment_id && (
                        <Link
                          href={`/shipments/${n.shipment_id}`}
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                          <Ship className="w-3 h-3" />
                          View Shipment
                        </Link>
                      )}
                    </div>
                  </div>
                  {!n.read && (
                    <button
                      onClick={() => markRead(n.id)}
                      className="text-xs text-blue-600 hover:text-blue-700 shrink-0"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
