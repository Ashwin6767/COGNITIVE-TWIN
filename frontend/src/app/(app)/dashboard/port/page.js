'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Anchor, Container, Ship, BarChart3, Bell, X, Clock, ArrowRight } from 'lucide-react';

export default function PortDashboard() {
  const { user } = useAuth();
  const [port, setPort] = useState(null);
  const [vessels, setVessels] = useState([]);
  const [pendingPortEntry, setPendingPortEntry] = useState([]);
  const [loading, setLoading] = useState(true);
  const [urgentNotifications, setUrgentNotifications] = useState([]);
  const [dismissedIds, setDismissedIds] = useState(new Set());

  useEffect(() => {
    const portId = user?.assigned_port_id || 'P001';
    Promise.all([
      api.get(`/ports/${portId}`).catch(() => null),
      api.get('/vessels/').catch(() => []),
      api.get('/shipments/?page=1&limit=50').catch(() => ({ items: [] })),
    ]).then(([portData, vesselData, shipData]) => {
      setPort(portData);
      setVessels(vesselData);
      const items = shipData.items || shipData || [];
      setPendingPortEntry(items.filter(s => s.status === 'IN_TRANSIT_TO_PORT'));
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

  const portInfo = port?.port;
  const dockedVessels = vessels.filter(v => v.port?.id === (user?.assigned_port_id || 'P001'));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-[#0F172A]">{portInfo?.name || 'Port'} — Dashboard</h1>

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
        <StatCard label="Docked Vessels" value={dockedVessels.length} icon={Ship} color="blue" />
        <StatCard label="Yard Utilization" value={`${portInfo?.utilization || 0}%`} icon={Container} color="yellow" />
        <StatCard label="Congestion" value={`${portInfo?.congestion || 0}%`} icon={BarChart3} color={portInfo?.congestion > 70 ? 'red' : 'green'} />
        <StatCard label="Active Shipments" value={port?.active_shipments || 0} icon={Anchor} color="purple" />
      </div>

      {/* Pending Port Entry Queue */}
      {pendingPortEntry.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-semibold text-[#0F172A]">Awaiting Port Entry ({pendingPortEntry.length})</h2>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">Drivers are at the gate — process their entry declarations</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingPortEntry.map(s => (
                <Link
                  key={s.id}
                  href={`/shipments/${s.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors"
                >
                  <div>
                    <p className="text-sm font-semibold text-[#0F172A]">{s.id}</p>
                    <p className="text-xs text-[#64748B]">{s.origin_port?.name || '—'} → {s.dest_port?.name || '—'}</p>
                    {s.assigned_driver?.name && <p className="text-xs text-amber-700 mt-0.5">Driver: {s.assigned_driver.name}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-amber-700 bg-amber-100 border border-amber-300 rounded-full px-2 py-0.5">Process Entry</span>
                    <ArrowRight className="w-4 h-4 text-amber-600" />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><h2 className="text-lg font-semibold text-[#0F172A]">Vessels at Port</h2></CardHeader>
        <CardContent>
          {dockedVessels.length === 0 ? (
            <p className="text-sm text-[#64748B]">No vessels currently docked.</p>
          ) : (
            <div className="divide-y divide-[#E2E8F0]">
              {dockedVessels.map(v => (
                <div key={v.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-[#0F172A]">{v.name}</p>
                    <p className="text-xs text-[#64748B]">IMO: {v.imo} | {v.current_load_teu || 0}/{v.capacity_teu || 0} TEU</p>
                  </div>
                  <Badge variant={v.status === 'DOCKED' ? 'info' : 'default'}>{v.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
