'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { StatusBadge } from '@/components/shipments/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Container, Grid3X3, BarChart3, TrendingUp, ClipboardList, Ship, ArrowRight, Package } from 'lucide-react';

const YardCharts = dynamic(() => import('@/components/analytics/YardCharts'), { ssr: false });

export default function YardDashboard() {
  const { user } = useAuth();
  const [yard, setYard] = useState(null);
  const [containers, setContainers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [portShipments, setPortShipments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const portId = user?.assigned_port_id || 'P001';
    Promise.all([
      api.get(`/yard/${portId}`).catch(() => null),
      api.get(`/yard/${portId}/containers`).catch(() => []),
      api.get(`/yard/${portId}/analytics`).catch(() => null),
      api.get(`/ports/${portId}/dashboard`).catch(() => null),
    ]).then(([yardData, containerData, analyticsData, dashData]) => {
      setYard(yardData);
      setContainers(containerData);
      setAnalytics(analyticsData);
      setPortShipments(dashData?.shipments || []);
    }).finally(() => setLoading(false));
  }, [user]);

  if (loading) return <div className="space-y-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>;

  const yardInfo = yard?.yard;
  const totalSlots = yardInfo?.total_slots || 0;
  const occupiedSlots = yardInfo?.occupied_slots || 0;
  const utilization = totalSlots ? Math.round((occupiedSlots / totalSlots) * 100) : 0;

  // Group shipments needing yard manager action
  const inYardShipments = portShipments.filter(s => s.status === 'IN_YARD');
  const customsClearedShipments = portShipments.filter(s => s.status === 'CUSTOMS_CLEARANCE');
  const loadedShipments = portShipments.filter(s => s.status === 'LOADED_ON_VESSEL');
  const containersNeedingSlot = containers.filter(c => !c.yard_position || c.yard_position === '—');

  const totalPendingActions = inYardShipments.length + containersNeedingSlot.length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-[#0F172A]">Yard — {yard?.port?.name || 'Port'}</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Action Required" value={totalPendingActions} icon={ClipboardList} color={totalPendingActions > 0 ? 'red' : 'green'} />
        <StatCard label="Occupied" value={occupiedSlots} icon={Container} color="yellow" />
        <StatCard label="Available" value={totalSlots - occupiedSlots} icon={TrendingUp} color="green" />
        <StatCard label="Utilization" value={`${utilization}%`} icon={BarChart3} color={utilization > 80 ? 'red' : 'green'} />
      </div>

      {/* ACTION REQUIRED SECTION */}
      {(inYardShipments.length > 0 || containersNeedingSlot.length > 0) && (
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
              {/* Loading Operations */}
              {inYardShipments.length > 0 && (
                <div className="rounded-lg border p-4 bg-purple-50 border-purple-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🏗️</span>
                      <div>
                        <h3 className="text-sm font-semibold text-[#0F172A]">Ready for Vessel Loading</h3>
                        <p className="text-xs text-[#64748B]">Containers in yard ready to be loaded onto vessels</p>
                      </div>
                    </div>
                    <Badge variant="default">{inYardShipments.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {inYardShipments.map(s => (
                      <div key={s.id} className="flex items-center justify-between bg-white/80 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-3">
                          <Link href={`/shipments/${s.id}`} className="text-sm font-medium text-blue-600 hover:underline">{s.id}</Link>
                          <span className="text-xs text-[#64748B]">{s.origin_port || '—'} → {s.dest_port || '—'}</span>
                          <Badge variant={s.priority === 'HIGH' || s.priority === 'CRITICAL' ? 'warning' : 'default'}>{s.priority || 'MEDIUM'}</Badge>
                        </div>
                        <Link href={`/shipments/${s.id}`}>
                          <Button variant="secondary" size="sm">
                            Load Vessel <ArrowRight className="w-3 h-3 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Containers Needing Slot Assignment */}
              {containersNeedingSlot.length > 0 && (
                <div className="rounded-lg border p-4 bg-amber-50 border-amber-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📦</span>
                      <div>
                        <h3 className="text-sm font-semibold text-[#0F172A]">Containers Awaiting Slot Assignment</h3>
                        <p className="text-xs text-[#64748B]">Assign yard positions to these containers</p>
                      </div>
                    </div>
                    <Badge variant="default">{containersNeedingSlot.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {containersNeedingSlot.map(c => (
                      <div key={c.id} className="flex items-center justify-between bg-white/80 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-mono font-medium text-[#0F172A]">{c.id}</span>
                          <span className="text-xs text-[#64748B]">{c.type || '—'} · {c.weight_kg ? `${c.weight_kg}kg` : '—'}</span>
                          <Badge variant={c.status === 'IN_YARD' ? 'info' : 'default'}>{c.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No pending actions */}
      {totalPendingActions === 0 && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <ClipboardList className="w-10 h-10 text-green-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-[#0F172A]">All caught up!</p>
              <p className="text-xs text-[#64748B]">No containers or shipments require your action at this time.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shipments at Port Overview */}
      {portShipments.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#0F172A]">Shipments at Port</h2>
              <Link href="/shipments">
                <Button variant="secondary" size="sm">View All <ArrowRight className="w-3 h-3 ml-1" /></Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
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
                  {portShipments.slice(0, 10).map(s => (
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
          </CardContent>
        </Card>
      )}

      {/* Analytics Charts */}
      {analytics && (
        <YardCharts
          typeData={analytics.container_type_distribution}
          statusData={analytics.container_status_distribution}
          slotGrid={analytics.slot_grid}
          totalSlots={analytics.total_slots}
          occupiedSlots={analytics.occupied_slots}
          yardActivity={analytics.yard_activity}
        />
      )}

      {/* Container Grid */}
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
                  <p className="text-xs text-[#64748B]">{c.type || '—'} · {c.weight_kg ? `${c.weight_kg}kg` : '—'}</p>
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
