'use client';
import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Warehouse, Package, Search, ChevronDown, ChevronUp, Grid3X3 } from 'lucide-react';

const GRID_COLS = 6;

export default function YardPage() {
  const [ports, setPorts] = useState([]);
  const [selectedPort, setSelectedPort] = useState('');
  const [yard, setYard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [yardLoading, setYardLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedContainer, setExpandedContainer] = useState(null);

  useEffect(() => {
    api.get('/ports/')
      .then(data => {
        const list = Array.isArray(data) ? data : data.items || [];
        setPorts(list);
        if (list.length > 0) setSelectedPort(list[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedPort) return;
    setYardLoading(true);
    api.get(`/yard/${selectedPort}`)
      .then(data => setYard(data))
      .catch(() => setYard(null))
      .finally(() => setYardLoading(false));
  }, [selectedPort]);

  const utilization = yard?.total_slots
    ? Math.round((yard.occupied_slots / yard.total_slots) * 100)
    : 0;

  const containerMap = useMemo(() => {
    const map = {};
    if (yard?.containers) {
      yard.containers.forEach(c => {
        if (c.yard_position) map[c.yard_position] = c;
      });
    }
    return map;
  }, [yard]);

  const totalSlots = yard?.total_slots || 0;
  const gridSlots = Array.from({ length: totalSlots }, (_, i) => i + 1);

  const filteredContainers = (yard?.containers || []).filter(c => {
    if (!search) return true;
    return c.id?.toLowerCase().includes(search.toLowerCase()) ||
      c.type?.toLowerCase().includes(search.toLowerCase()) ||
      c.yard_position?.toLowerCase().includes(search.toLowerCase());
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#0F172A]">Yard Management</h1>
          <p className="text-sm text-[#64748B]">Visual yard overview and container positions</p>
        </div>
        <select
          value={selectedPort}
          onChange={e => setSelectedPort(e.target.value)}
          className="border border-[#E2E8F0] rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {ports.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {yardLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      ) : !yard ? (
        <Card>
          <CardContent>
            <EmptyState title="No yard data" description="No yard information available for this port" icon={Warehouse} />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
                  <Grid3X3 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-[#64748B]">Total Slots</p>
                  <p className="text-2xl font-semibold text-[#0F172A]">{yard.total_slots}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-green-50 text-green-600">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-[#64748B]">Occupied</p>
                  <p className="text-2xl font-semibold text-[#0F172A]">{yard.occupied_slots}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-purple-50 text-purple-600">
                  <Warehouse className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-[#64748B]">Utilization</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-semibold text-[#0F172A]">{utilization}%</p>
                    <div className="flex-1 h-2 bg-[#E2E8F0] rounded-full overflow-hidden w-16">
                      <div
                        className={`h-full rounded-full ${utilization > 90 ? 'bg-red-500' : utilization > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ width: `${utilization}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Yard Grid Visualization */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[#0F172A]">Yard Grid — {yard.name}</h2>
                  <p className="text-xs text-[#64748B] mt-1">Click a slot to see container details</p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-green-200 border border-green-400" /> Empty
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-blue-200 border border-blue-400" /> Occupied
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-red-200 border border-red-400" /> Issue
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div
                className="grid gap-2"
                style={{ gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))` }}
              >
                {gridSlots.map(slot => {
                  const posKey = `S${String(slot).padStart(3, '0')}`;
                  const container = containerMap[posKey] ||
                    Object.values(containerMap).find(c => c.yard_position === String(slot));
                  const hasIssue = container?.status === 'DAMAGED';
                  const isOccupied = !!container;

                  let bgClass = 'bg-green-100 border-green-300 hover:bg-green-200';
                  if (hasIssue) bgClass = 'bg-red-100 border-red-300 hover:bg-red-200';
                  else if (isOccupied) bgClass = 'bg-blue-100 border-blue-300 hover:bg-blue-200';

                  return (
                    <div
                      key={slot}
                      className={`border rounded-lg p-2 text-center cursor-pointer transition-colors min-h-[56px] flex flex-col items-center justify-center ${bgClass}`}
                      onClick={() => container && setExpandedContainer(expandedContainer === container.id ? null : container.id)}
                      title={container ? `${container.id} (${container.status})` : `Slot ${slot} — Empty`}
                    >
                      <span className="text-[10px] text-[#64748B]">{posKey}</span>
                      {container && (
                        <span className="text-[9px] font-medium text-[#0F172A] truncate w-full">
                          {container.id}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Container List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#0F172A]">Containers in Yard</h2>
                <Badge variant="info">{yard.containers?.length || 0} containers</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative max-w-md mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                <input
                  type="text"
                  placeholder="Search containers..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {filteredContainers.length === 0 ? (
                <EmptyState title="No containers" icon={Package} />
              ) : (
                <div className="divide-y divide-[#E2E8F0]">
                  {filteredContainers.map(c => {
                    const isExpanded = expandedContainer === c.id;
                    const statusVariant = c.status === 'DAMAGED' ? 'danger' : c.status === 'EMPTY' ? 'default' : 'info';
                    return (
                      <div key={c.id}>
                        <div
                          className="flex items-center justify-between py-3 cursor-pointer hover:bg-[#F8FAFC] -mx-6 px-6 transition-colors"
                          onClick={() => setExpandedContainer(isExpanded ? null : c.id)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-50">
                              <Package className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-[#0F172A]">{c.id}</p>
                              <p className="text-xs text-[#64748B]">{c.type || 'Standard'} • Position: {c.yard_position || '—'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={statusVariant}>{c.status || '—'}</Badge>
                            {isExpanded
                              ? <ChevronUp className="w-4 h-4 text-[#94A3B8]" />
                              : <ChevronDown className="w-4 h-4 text-[#94A3B8]" />}
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="bg-[#F8FAFC] -mx-6 px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-[#94A3B8] text-xs mb-1">Type</p>
                              <p className="text-[#0F172A] font-medium">{c.type || '—'}</p>
                            </div>
                            <div>
                              <p className="text-[#94A3B8] text-xs mb-1">Weight</p>
                              <p className="text-[#0F172A] font-medium">{c.weight_kg ? `${c.weight_kg.toLocaleString()} kg` : '—'}</p>
                            </div>
                            <div>
                              <p className="text-[#94A3B8] text-xs mb-1">Position</p>
                              <p className="text-[#0F172A] font-medium">{c.yard_position || '—'}</p>
                            </div>
                            <div>
                              <p className="text-[#94A3B8] text-xs mb-1">Status</p>
                              <p className="text-[#0F172A] font-medium">{c.status || '—'}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
