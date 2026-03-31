'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Search, Package, ChevronDown, ChevronUp, Weight, MapPin } from 'lucide-react';

const CONTAINER_STATUSES = ['All', 'EMPTY', 'LOADED', 'IN_TRANSIT', 'IN_YARD', 'DAMAGED'];

const STATUS_STYLES = {
  EMPTY: { variant: 'default', color: 'bg-gray-100 text-gray-700' },
  LOADED: { variant: 'info', color: 'bg-blue-100 text-blue-800' },
  IN_TRANSIT: { variant: 'info', color: 'bg-purple-100 text-purple-800' },
  IN_YARD: { variant: 'success', color: 'bg-green-100 text-green-800' },
  DAMAGED: { variant: 'danger', color: 'bg-red-100 text-red-800' },
};

export default function ContainersPage() {
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    setLoading(true);
    api.get('/containers/')
      .then(data => setContainers(Array.isArray(data) ? data : data.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = containers.filter(c => {
    const matchesSearch = !search ||
      c.id?.toLowerCase().includes(search.toLowerCase()) ||
      c.type?.toLowerCase().includes(search.toLowerCase()) ||
      c.port?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#0F172A]">Containers</h1>
        <p className="text-sm text-[#64748B]">Track and manage all containers across ports</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search by ID, type, or port..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-[#E2E8F0] rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {CONTAINER_STATUSES.map(s => (
            <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <Card key={i}><CardContent><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState title="No containers found" description="Try adjusting your search or filter" icon={Package} />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => {
            const isExpanded = expandedId === c.id;
            const style = STATUS_STYLES[c.status] || STATUS_STYLES.EMPTY;
            const weightPercent = c.max_weight_kg ? Math.round((c.weight_kg / c.max_weight_kg) * 100) : 0;

            return (
              <Card key={c.id}>
                <CardContent className="p-0">
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#F8FAFC] transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : c.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2.5 rounded-xl ${c.status === 'DAMAGED' ? 'bg-red-50' : c.status === 'IN_TRANSIT' ? 'bg-purple-50' : 'bg-blue-50'}`}>
                        <Package className={`w-5 h-5 ${c.status === 'DAMAGED' ? 'text-red-600' : c.status === 'IN_TRANSIT' ? 'text-purple-600' : 'text-blue-600'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-[#0F172A]">{c.id}</p>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style.color}`}>
                            {c.status?.replace(/_/g, ' ') || '—'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-[#64748B]">
                          <span>{c.type || 'Standard'}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Weight className="w-3 h-3" />
                            {c.weight_kg ? `${c.weight_kg.toLocaleString()} kg` : '—'}
                          </span>
                          {c.port?.name && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {c.port.name}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {c.yard_position && (
                        <Badge variant="default">{c.yard_position}</Badge>
                      )}
                      {isExpanded
                        ? <ChevronUp className="w-4 h-4 text-[#94A3B8]" />
                        : <ChevronDown className="w-4 h-4 text-[#94A3B8]" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-[#E2E8F0] bg-[#F8FAFC] p-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-[#94A3B8] text-xs mb-1">Container ID</p>
                          <p className="text-[#0F172A] font-medium font-mono text-xs">{c.id}</p>
                        </div>
                        <div>
                          <p className="text-[#94A3B8] text-xs mb-1">Type</p>
                          <p className="text-[#0F172A] font-medium">{c.type || '—'}</p>
                        </div>
                        <div>
                          <p className="text-[#94A3B8] text-xs mb-1">Yard Position</p>
                          <p className="text-[#0F172A] font-medium">{c.yard_position || '—'}</p>
                        </div>
                        <div>
                          <p className="text-[#94A3B8] text-xs mb-1">Port</p>
                          <p className="text-[#0F172A] font-medium">{c.port?.name || '—'}</p>
                        </div>
                        <div>
                          <p className="text-[#94A3B8] text-xs mb-1">Weight</p>
                          <p className="text-[#0F172A] font-medium">{c.weight_kg ? `${c.weight_kg.toLocaleString()} kg` : '—'}</p>
                        </div>
                        <div>
                          <p className="text-[#94A3B8] text-xs mb-1">Max Weight</p>
                          <p className="text-[#0F172A] font-medium">{c.max_weight_kg ? `${c.max_weight_kg.toLocaleString()} kg` : '—'}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-[#94A3B8] text-xs mb-1">Weight Utilization</p>
                          {c.max_weight_kg ? (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${weightPercent > 90 ? 'bg-red-500' : weightPercent > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                  style={{ width: `${Math.min(weightPercent, 100)}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium text-[#0F172A]">{weightPercent}%</span>
                            </div>
                          ) : (
                            <p className="text-[#0F172A] font-medium">—</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
