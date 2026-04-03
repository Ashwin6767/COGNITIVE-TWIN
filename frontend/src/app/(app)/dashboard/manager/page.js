'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { StatusBadge } from '@/components/shipments/StatusBadge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import {
  Ship, ClipboardList, Truck, Anchor, CheckCircle, AlertTriangle, ArrowRight, Bell, X,
  Users, UserCircle
} from 'lucide-react';

export default function ManagerDashboard() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ pending: 0, approved: 0, transit: 0, atPort: 0, delivered: 0 });
  const [urgentNotifications, setUrgentNotifications] = useState([]);
  const [dismissedIds, setDismissedIds] = useState(new Set());
  const [activeTab, setActiveTab] = useState('shipments');
  const [drivers, setDrivers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [teamLoading, setTeamLoading] = useState(false);

  useEffect(() => {
    api.get('/shipments/?page=1&limit=50').then(data => {
      const items = data.items || [];
      setShipments(items);
      setStats({
        pending: items.filter(s => ['REQUEST_SUBMITTED', 'UNDER_REVIEW'].includes(s.status)).length,
        approved: items.filter(s => s.status === 'APPROVED').length,
        transit: items.filter(s => ['IN_TRANSIT_SEA', 'PICKUP_EN_ROUTE', 'LAST_MILE'].includes(s.status)).length,
        atPort: items.filter(s => ['AT_ORIGIN_PORT', 'AT_DESTINATION_PORT', 'IN_YARD_ORIGIN'].includes(s.status)).length,
        delivered: items.filter(s => s.status === 'DELIVERED').length,
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    api.get('/notifications/?limit=10&unread=true')
      .then((data) => {
        const items = Array.isArray(data) ? data : (data.items || data.notifications || []);
        setUrgentNotifications(items.filter(n => !n.read));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab !== 'team') return;
    setTeamLoading(true);
    Promise.all([
      api.get('/users/?role=DRIVER&limit=50').catch(() => ({ items: [] })),
      api.get('/users/?role=CUSTOMER&limit=50').catch(() => ({ items: [] })),
    ]).then(([driverData, customerData]) => {
      setDrivers(driverData.items || driverData || []);
      setCustomers(customerData.items || customerData || []);
    }).finally(() => setTeamLoading(false));
  }, [activeTab]);

  const dismissNotification = async (id) => {
    setDismissedIds(prev => new Set([...prev, id]));
    await api.put(`/notifications/${id}/read`, {}).catch(() => {});
  };

  const needsAttention = shipments.filter(s =>
    ['REQUEST_SUBMITTED', 'UNDER_REVIEW', 'CUSTOMS_CLEARANCE_ORIGIN', 'CUSTOMS_CLEARANCE_DEST'].includes(s.status)
  );

  const tabs = [
    { id: 'shipments', label: 'Shipments' },
    { id: 'team', label: 'Team', icon: Users },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-[#0F172A]">Operations Overview</h1>

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

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <StatCard label="Pending" value={stats.pending} icon={ClipboardList} color="yellow" />
        <StatCard label="Approved" value={stats.approved} icon={CheckCircle} color="green" />
        <StatCard label="In Transit" value={stats.transit} icon={Truck} color="purple" />
        <StatCard label="At Port" value={stats.atPort} icon={Anchor} color="blue" />
        <StatCard label="Delivered" value={stats.delivered} icon={CheckCircle} color="green" />
      </div>

      {needsAttention.length > 0 && (
        <Card>
          <CardContent className="flex items-start gap-3 bg-yellow-50 border-yellow-200">
            <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800">Needs Attention</p>
              <p className="text-xs text-yellow-700 mt-1">{needsAttention.length} shipment(s) require your action</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab bar */}
      <div className="flex border-b border-[#E2E8F0]">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            {tab.icon && <tab.icon className="w-4 h-4" />}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Shipments Tab */}
      {activeTab === 'shipments' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#0F172A]">All Shipments</h2>
              <Link href="/shipments" className="text-sm text-blue-600 hover:text-blue-700">View all →</Link>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[#64748B] border-b border-[#E2E8F0]">
                      <th className="pb-3 font-medium">ID</th>
                      <th className="pb-3 font-medium">Route</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Priority</th>
                      <th className="pb-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {shipments.slice(0, 10).map(s => (
                      <tr key={s.id} className="hover:bg-[#F8FAFC]">
                        <td className="py-3 font-medium text-[#0F172A]">{s.id}</td>
                        <td className="py-3 text-[#64748B]">{s.origin_port?.name || '—'} → {s.dest_port?.name || '—'}</td>
                        <td className="py-3"><StatusBadge status={s.status} /></td>
                        <td className="py-3">
                          <Badge variant={s.priority === 'HIGH' || s.priority === 'CRITICAL' ? 'danger' : 'default'}>{s.priority}</Badge>
                        </td>
                        <td className="py-3">
                          <Link href={`/shipments/${s.id}`} className="text-blue-600 hover:text-blue-700">
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Team Tab */}
      {activeTab === 'team' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-[#0F172A] flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#64748B]" />
                Drivers ({drivers.length})
              </h2>
            </CardHeader>
            <CardContent>
              {teamLoading ? (
                <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
              ) : drivers.length === 0 ? (
                <p className="text-sm text-[#64748B]">No drivers found.</p>
              ) : (
                <div className="space-y-2">
                  {drivers.map(d => (
                    <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC]">
                      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm shrink-0">
                        {(d.name || d.email || 'D')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#0F172A] truncate">{d.name || d.email}</p>
                        <p className="text-xs text-[#64748B]">{d.license_type || 'Driver'}{d.license_number ? ` · ${d.license_number}` : ''}</p>
                      </div>
                      <Badge variant="default">{d.status || 'Active'}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-[#0F172A] flex items-center gap-2">
                <UserCircle className="w-5 h-5 text-[#64748B]" />
                Customers ({customers.length})
              </h2>
            </CardHeader>
            <CardContent>
              {teamLoading ? (
                <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
              ) : customers.length === 0 ? (
                <p className="text-sm text-[#64748B]">No customers found.</p>
              ) : (
                <div className="space-y-2">
                  {customers.map(c => (
                    <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC]">
                      <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold text-sm shrink-0">
                        {(c.name || c.email || 'C')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#0F172A] truncate">{c.name || c.email}</p>
                        <p className="text-xs text-[#64748B]">{c.email}{c.company ? ` · ${c.company}` : ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

  useEffect(() => {
    api.get('/shipments/?page=1&limit=50').then(data => {
      const items = data.items || [];
      setShipments(items);
      setStats({
        pending: items.filter(s => ['REQUEST_SUBMITTED', 'UNDER_REVIEW'].includes(s.status)).length,
        approved: items.filter(s => s.status === 'APPROVED').length,
        transit: items.filter(s => ['IN_TRANSIT_SEA', 'PICKUP_EN_ROUTE', 'LAST_MILE'].includes(s.status)).length,
        atPort: items.filter(s => ['AT_ORIGIN_PORT', 'AT_DESTINATION_PORT', 'IN_YARD_ORIGIN'].includes(s.status)).length,
        delivered: items.filter(s => s.status === 'DELIVERED').length,
      });
    }).catch(() => {}).finally(() => setLoading(false));
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

  const needsAttention = shipments.filter(s =>
    ['REQUEST_SUBMITTED', 'UNDER_REVIEW', 'CUSTOMS_CLEARANCE_ORIGIN', 'CUSTOMS_CLEARANCE_DEST'].includes(s.status)
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-[#0F172A]">Operations Overview</h1>

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

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <StatCard label="Pending" value={stats.pending} icon={ClipboardList} color="yellow" />
        <StatCard label="Approved" value={stats.approved} icon={CheckCircle} color="green" />
        <StatCard label="In Transit" value={stats.transit} icon={Truck} color="purple" />
        <StatCard label="At Port" value={stats.atPort} icon={Anchor} color="blue" />
        <StatCard label="Delivered" value={stats.delivered} icon={CheckCircle} color="green" />
      </div>

      {needsAttention.length > 0 && (
        <Card>
          <CardContent className="flex items-start gap-3 bg-yellow-50 border-yellow-200">
            <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800">Needs Attention</p>
              <p className="text-xs text-yellow-700 mt-1">{needsAttention.length} shipment(s) require your action</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#0F172A]">All Shipments</h2>
            <Link href="/shipments" className="text-sm text-blue-600 hover:text-blue-700">View all →</Link>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[#64748B] border-b border-[#E2E8F0]">
                    <th className="pb-3 font-medium">ID</th>
                    <th className="pb-3 font-medium">Route</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Priority</th>
                    <th className="pb-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {shipments.slice(0, 10).map(s => (
                    <tr key={s.id} className="hover:bg-[#F8FAFC]">
                      <td className="py-3 font-medium text-[#0F172A]">{s.id}</td>
                      <td className="py-3 text-[#64748B]">{s.origin_port?.name || '—'} → {s.dest_port?.name || '—'}</td>
                      <td className="py-3"><StatusBadge status={s.status} /></td>
                      <td className="py-3">
                        <Badge variant={s.priority === 'HIGH' || s.priority === 'CRITICAL' ? 'danger' : 'default'}>{s.priority}</Badge>
                      </td>
                      <td className="py-3">
                        <Link href={`/shipments/${s.id}`} className="text-blue-600 hover:text-blue-700">
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
