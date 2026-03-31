'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Bell, Check, Circle } from 'lucide-react';
import { timeAgo } from '@/lib/utils';

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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold text-[#0F172A]">Notifications</h1>

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
                  <div className="flex-1">
                    <p className="text-sm text-[#0F172A]">{n.message || n.title}</p>
                    <p className="text-xs text-[#94A3B8] mt-1">{timeAgo(n.created_at)}</p>
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
