'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { StatusBadge } from '@/components/shipments/StatusBadge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Anchor, Container, Ship, BarChart3, AlertTriangle, Package, ClipboardList, FileText, ArrowRight } from 'lucide-react';

const CONGESTION_STYLES = {
  HIGH: 'bg-red-50 text-red-700 border-red-200',
  MEDIUM: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  LOW: 'bg-green-50 text-green-700 border-green-200',
};

const ACTION_GROUPS = [
  { status: 'IN_TRANSIT_TO_PORT', label: 'Gate Entries', desc: 'Trucks arriving — record port entry', color: 'bg-amber-50 border-amber-200', icon: '🚛', action: 'Record Entry' },
  { status: 'PORT_ENTRY', label: 'Customs Declarations', desc: 'Issue customs declaration for clearance', color: 'bg-blue-50 border-blue-200', icon: '📋', action: 'Issue Declaration' },
  { status: 'IN_YARD', label: 'Loading Operations', desc: 'Load containers onto vessels', color: 'bg-purple-50 border-purple-200', icon: '🏗️', action: 'Load Vessel' },
  { status: 'LOADED_ON_VESSEL', label: 'Departure Clearances', desc: 'Clear vessels for departure', color: 'bg-cyan-50 border-cyan-200', icon: '🚢', action: 'Clear Departure' },
  { status: 'IN_TRANSIT_SEA', label: 'Arrival Confirmations', desc: 'Confirm vessel arrivals at destination', color: 'bg-green-50 border-green-200', icon: '⚓', action: 'Confirm Arrival' },
];

export default function PortDashboard() {
  const { user } = useAuth();
  const [portData, setPortData] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const portId = user?.assigned_port_id || 'P001';
    Promise.all([
      api.get(`/ports/${portId}`).catch(() => null),
      api.get(`/ports/${portId}/dashboard`).catch(() => null),
    ]).then(([pd, db]) => {
      setPortData(pd);
      setDashboard(db);
    }).finally(() => setLoading(false));
  }, [user]);

  if (loading) return <div className="space-y-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>;

  const portInfo = portData?.port;
  const vessels = portData?.vessels || [];
  const congestion = portInfo?.congestion || 'LOW';
  const utilization = portInfo?.utilization ? Math.round(portInfo.utilization * 100) : 0;
  const yardUtil = dashboard?.yard_utilization || {};
  const yardPct = yardUtil.capacity > 0 ? Math.round((yardUtil.occupied / yardUtil.capacity) * 100) : 0;
  const shipments = dashboard?.shipments || [];
  const statusBreakdown = dashboard?.status_breakdown || [];
  const congestionReports = dashboard?.congestion_reports || [];

  // Group shipments by action type
  const actionItems = ACTION_GROUPS.map(group => ({
    ...group,
    shipments: shipments.filter(s => s.status === group.status),
  })).filter(g => g.shipments.length > 0);

  const totalPendingActions = actionItems.reduce((sum, g) => sum + g.shipments.length, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-[#0F172A]">{portInfo?.name || 'Port'} — Dashboard</h1>

      {/* Congestion Alert Banner */}
      {congestion === 'HIGH' && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-800">High Congestion Alert</p>
            <p className="text-xs text-red-600">Port utilization is at {utilization}%. Average delay: {portInfo?.avg_delay_hours || 0}h</p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Action Required" value={totalPendingActions} icon={ClipboardList} color={totalPendingActions > 0 ? 'red' : 'green'} />
        <StatCard label="Docked Vessels" value={vessels.length} icon={Ship} color="purple" />
        <StatCard label="Yard Utilization" value={`${yardPct}%`} icon={Container} color={yardPct > 80 ? 'red' : 'yellow'} />
        <StatCard label="Active Shipments" value={portData?.active_shipments || 0} icon={Package} color="blue" />
      </div>

      {/* ACTION REQUIRED SECTION */}
      {actionItems.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-[#0F172A]">Action Required</h2>
              <Badge variant="warning">{totalPendingActions} pending</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {actionItems.map(group => (
                <div key={group.status} className={`rounded-lg border p-4 ${group.color}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{group.icon}</span>
                      <div>
                        <h3 className="text-sm font-semibold text-[#0F172A]">{group.label}</h3>
                        <p className="text-xs text-[#64748B]">{group.desc}</p>
                      </div>
                    </div>
                    <Badge variant="default">{group.shipments.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {group.shipments.map(s => (
                      <div key={s.id} className="flex items-center justify-between bg-white/80 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-3">
                          <Link href={`/shipments/${s.id}`} className="text-sm font-medium text-blue-600 hover:underline">{s.id}</Link>
                          <span className="text-xs text-[#64748B]">{s.origin_port || '—'} → {s.dest_port || '—'}</span>
                          <Badge variant={s.priority === 'HIGH' || s.priority === 'CRITICAL' ? 'warning' : 'default'}>{s.priority || 'MEDIUM'}</Badge>
                        </div>
                        <Link href={`/shipments/${s.id}`}>
                          <Button variant="secondary" size="sm">
                            {group.action} <ArrowRight className="w-3 h-3 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No pending actions state */}
      {actionItems.length === 0 && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <ClipboardList className="w-10 h-10 text-green-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-[#0F172A]">All caught up!</p>
              <p className="text-xs text-[#64748B]">No shipments require your action at this time.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Congestion Badge + Utilization */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-medium text-[#64748B] mb-2">Congestion Level</p>
            <span className={`inline-block px-3 py-1.5 rounded-full text-sm font-semibold border ${CONGESTION_STYLES[congestion] || CONGESTION_STYLES.LOW}`}>
              {congestion}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-medium text-[#64748B] mb-2">Port Utilization</p>
            <p className="text-2xl font-bold text-[#0F172A]">{utilization}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-medium text-[#64748B] mb-2">Avg Delay</p>
            <p className="text-2xl font-bold text-[#0F172A]">{portInfo?.avg_delay_hours || 0}h</p>
          </CardContent>
        </Card>
      </div>

      {/* Shipments at Port */}
      <Card>
        <CardHeader><h2 className="text-lg font-semibold text-[#0F172A]">All Shipments at Port</h2></CardHeader>
        <CardContent>
          {shipments.length === 0 ? (
            <EmptyState title="No active shipments" description="No shipments are currently at this port." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[#64748B] border-b border-[#E2E8F0]">
                    <th className="pb-3 font-medium">Shipment</th>
                    <th className="pb-3 font-medium">Route</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Priority</th>
                    <th className="pb-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {shipments.map(s => (
                    <tr key={s.id} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC]">
                      <td className="py-3">
                        <Link href={`/shipments/${s.id}`} className="text-blue-600 hover:underline font-medium">{s.id}</Link>
                      </td>
                      <td className="py-3 text-[#64748B]">{s.origin_port || '—'} → {s.dest_port || '—'}</td>
                      <td className="py-3"><StatusBadge status={s.status} /></td>
                      <td className="py-3">
                        <Badge variant={s.priority === 'HIGH' || s.priority === 'CRITICAL' ? 'warning' : 'default'}>{s.priority || 'MEDIUM'}</Badge>
                      </td>
                      <td className="py-3">
                        <Link href={`/shipments/${s.id}`} className="text-[#94A3B8] hover:text-blue-600"><ArrowRight className="w-4 h-4" /></Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Breakdown */}
      {statusBreakdown.length > 0 && (
        <Card>
          <CardHeader><h2 className="text-lg font-semibold text-[#0F172A]">Status Breakdown</h2></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {statusBreakdown.map(sb => (
                <div key={sb.status} className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                  <p className="text-xs text-[#64748B]">{(sb.status || '').replace(/_/g, ' ')}</p>
                  <p className="text-lg font-bold text-[#0F172A]">{sb.count}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vessels at Port */}
      <Card>
        <CardHeader><h2 className="text-lg font-semibold text-[#0F172A]">Vessels at Port</h2></CardHeader>
        <CardContent>
          {vessels.length === 0 ? (
            <p className="text-sm text-[#64748B]">No vessels currently at this port.</p>
          ) : (
            <div className="divide-y divide-[#E2E8F0]">
              {vessels.map(v => (
                <div key={v.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-[#0F172A]">{v.name}</p>
                    <p className="text-xs text-[#64748B]">IMO: {v.imo || '—'} | {v.current_load_teu || 0}/{v.capacity_teu || 0} TEU</p>
                  </div>
                  <Badge variant={v.status === 'IN_PORT' ? 'info' : 'default'}>{v.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Congestion Reports */}
      {congestionReports.length > 0 && (
        <Card>
          <CardHeader><h2 className="text-lg font-semibold text-[#0F172A]">Active Congestion Reports</h2></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {congestionReports.map(cr => (
                <div key={cr.id} className={`p-3 rounded-lg border ${CONGESTION_STYLES[cr.severity] || CONGESTION_STYLES.LOW}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{cr.congestion_type?.replace(/_/g, ' ')}</span>
                    <Badge variant={cr.severity === 'HIGH' ? 'warning' : 'default'}>{cr.severity}</Badge>
                  </div>
                  <p className="text-xs mt-1">{cr.description}</p>
                  <p className="text-xs text-[#94A3B8] mt-1">By: {cr.reporter_name} {cr.estimated_delay_hours ? `| Est. delay: ${cr.estimated_delay_hours}h` : ''}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
