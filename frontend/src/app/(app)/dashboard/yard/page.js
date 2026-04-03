'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Container, Grid3X3, BarChart3, Bell, X } from 'lucide-react';

export default function YardDashboard() {
  const { user } = useAuth();
  const [yard, setYard] = useState(null);
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [urgentNotifications, setUrgentNotifications] = useState([]);
  const [dismissedIds, setDismissedIds] = useState(new Set());

  useEffect(() => {
    const portId = user?.assigned_port_id || 'P001';
    Promise.all([
      api.get(`/yard/${portId}`).catch(() => null),
      api.get(`/yard/${portId}/containers`).catch(() => []),
    ]).then(([yardData, containerData]) => {
      setYard(yardData);
      setContainers(containerData);
    }).finally(() => setLoading(false));
  }, [user]);

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

  const yardInfo = yard?.yard;
  const utilization = yardInfo ? Math.round((yardInfo.occupied_slots / yardInfo.total_slots) * 100) : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-[#0F172A]">Yard — {yard?.port?.name || 'Port'}</h1>

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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard label="Total Slots" value={yardInfo?.total_slots || 0} icon={Grid3X3} color="blue" />
        <StatCard label="Occupied" value={yardInfo?.occupied_slots || 0} icon={Container} color="yellow" />
        <StatCard label="Utilization" value={`${utilization}%`} icon={BarChart3} color={utilization > 80 ? 'red' : 'green'} />
      </div>

      <Card>
        <CardHeader><h2 className="text-lg font-semibold text-[#0F172A]">Containers in Yard</h2></CardHeader>
        <CardContent>
          {containers.length === 0 ? (
            <p className="text-sm text-[#64748B]">No containers in yard.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {containers.map(c => (
                <div key={c.id} className="p-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]">
                  <p className="text-xs font-medium text-[#0F172A]">{c.id}</p>
                  <p className="text-xs text-[#64748B]">Pos: {c.yard_position || '—'}</p>
                  <Badge variant={c.status === 'IN_YARD' ? 'info' : 'default'}>{c.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
