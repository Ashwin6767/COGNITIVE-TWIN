'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Users, Ship, Anchor, Container, Settings, Bell, X } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, shipments: 0, ports: 0, vessels: 0 });
  const [loading, setLoading] = useState(true);
  const [urgentNotifications, setUrgentNotifications] = useState([]);
  const [dismissedIds, setDismissedIds] = useState(new Set());

  useEffect(() => {
    Promise.all([
      api.get('/users/').catch(() => ({ total: 0 })),
      api.get('/shipments/?page=1&limit=1').catch(() => ({ total: 0 })),
      api.get('/ports/').catch(() => []),
      api.get('/vessels/').catch(() => []),
    ]).then(([users, shipments, ports, vessels]) => {
      setStats({
        users: users.total || 0,
        shipments: shipments.total || 0,
        ports: Array.isArray(ports) ? ports.length : 0,
        vessels: Array.isArray(vessels) ? vessels.length : 0,
      });
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    api.get('/notifications/?limit=10&unread=true')
      .then((data) => {
        const items = Array.isArray(data) ? data : (data.items || data.notifications || []);
        setUrgentNotifications(items.filter(n => !n.read));
      })
      .catch(() => {});
  }, []);

  const dismissNotification = async (id) => {
    setDismissedIds(prev => new Set([...prev, id]));
    await api.put(`/notifications/${id}/read`, {}).catch(() => {});
  };

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-[#0F172A]">Admin Dashboard</h1>

      {/* Immediate Attention Banner */}
      {urgentNotifications.filter(n => !dismissedIds.has(n.id)).length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Bell className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-amber-800">Requires Immediate Attention</h3>
          </div>
          {urgentNotifications.filter(n => !dismissedIds.has(n.id)).slice(0, 5).map(n => (
            <div key={n.id} className="flex items-start justify-between gap-3 bg-white rounded-lg border border-amber-100 p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#0F172A] truncate">{n.title || n.message || 'Action required'}</p>
                {n.shipment_id && (
                  <Link href={`/shipments/${n.shipment_id}`} className="text-xs text-blue-600 hover:underline mt-0.5 block">
                    View shipment {n.shipment_id} →
                  </Link>
                )}
                {n.body && <p className="text-xs text-[#64748B] mt-0.5 line-clamp-2">{n.body}</p>}
              </div>
              <button
                onClick={() => dismissNotification(n.id)}
                className="shrink-0 p-1 rounded hover:bg-amber-100 text-amber-600 transition-colors"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Users" value={stats.users} icon={Users} color="blue" />
        <StatCard label="Shipments" value={stats.shipments} icon={Ship} color="purple" />
        <StatCard label="Ports" value={stats.ports} icon={Anchor} color="green" />
        <StatCard label="Vessels" value={stats.vessels} icon={Container} color="yellow" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Link href="/admin/users">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-50 text-blue-600"><Users className="w-6 h-6" /></div>
              <div>
                <p className="font-medium text-[#0F172A]">User Management</p>
                <p className="text-sm text-[#64748B]">Manage users, roles, and permissions</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/shipments">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-50 text-purple-600"><Ship className="w-6 h-6" /></div>
              <div>
                <p className="font-medium text-[#0F172A]">All Shipments</p>
                <p className="text-sm text-[#64748B]">View and manage all shipments</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
