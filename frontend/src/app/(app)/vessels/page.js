'use client';
import { useState, useEffect, Fragment } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Search, Ship, ChevronDown, ChevronUp, Anchor, Navigation, MapPin } from 'lucide-react';

const VESSEL_STATUSES = ['All', 'DOCKED', 'IN_TRANSIT', 'ANCHORED', 'DEPARTED'];

const STATUS_STYLES = {
  DOCKED: 'bg-green-100 text-green-800',
  IN_TRANSIT: 'bg-blue-100 text-blue-800',
  ANCHORED: 'bg-yellow-100 text-yellow-800',
  DEPARTED: 'bg-purple-100 text-purple-800',
};

const STATUS_ICONS = {
  DOCKED: Anchor,
  IN_TRANSIT: Navigation,
  ANCHORED: Anchor,
  DEPARTED: Ship,
};

export default function VesselsPage() {
  const [vessels, setVessels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    setLoading(true);
    api.get('/vessels/')
      .then(data => setVessels(Array.isArray(data) ? data : data.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = vessels.filter(v => {
    const matchesSearch = !search ||
      v.name?.toLowerCase().includes(search.toLowerCase()) ||
      String(v.imo).includes(search);
    const matchesStatus = statusFilter === 'All' || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#0F172A]">Vessels</h1>
        <p className="text-sm text-[#64748B]">Monitor fleet status and vessel details</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search by name or IMO..."
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
          {VESSEL_STATUSES.map(s => (
            <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      <Card>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState title="No vessels found" description="Try adjusting your search or filter" icon={Ship} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[#64748B] border-b border-[#E2E8F0]">
                    <th className="pb-3 font-medium">Vessel</th>
                    <th className="pb-3 font-medium">IMO</th>
                    <th className="pb-3 font-medium">Flag</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Capacity (TEU)</th>
                    <th className="pb-3 font-medium">Load (TEU)</th>
                    <th className="pb-3 font-medium">Speed (kn)</th>
                    <th className="pb-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filtered.map(v => {
                    const isExpanded = expandedId === v.id;
                    const loadPercent = v.capacity_teu ? Math.round((v.current_load_teu / v.capacity_teu) * 100) : 0;
                    return (
                      <Fragment key={v.id}>
                        <tr
                          className="hover:bg-[#F8FAFC] cursor-pointer transition-colors"
                          onClick={() => setExpandedId(isExpanded ? null : v.id)}
                        >
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <Ship className="w-4 h-4 text-blue-600" />
                              <span className="font-medium text-[#0F172A]">{v.name}</span>
                            </div>
                          </td>
                          <td className="py-3 text-[#64748B] font-mono text-xs">{v.imo || '—'}</td>
                          <td className="py-3 text-[#64748B]">{v.flag || '—'}</td>
                          <td className="py-3">
                            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[v.status] || 'bg-gray-100 text-gray-700'}`}>
                              {v.status?.replace(/_/g, ' ') || '—'}
                            </span>
                          </td>
                          <td className="py-3 text-[#64748B]">{v.capacity_teu?.toLocaleString() ?? '—'}</td>
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-[#0F172A]">{v.current_load_teu?.toLocaleString() ?? '—'}</span>
                              {v.capacity_teu > 0 && (
                                <span className={`text-xs ${loadPercent > 90 ? 'text-red-600' : loadPercent > 70 ? 'text-yellow-600' : 'text-green-600'}`}>
                                  ({loadPercent}%)
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 text-[#64748B]">{v.speed_knots ?? '—'}</td>
                          <td className="py-3">
                            {isExpanded
                              ? <ChevronUp className="w-4 h-4 text-[#94A3B8]" />
                              : <ChevronDown className="w-4 h-4 text-[#94A3B8]" />}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={8} className="bg-[#F8FAFC] px-6 py-4">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <p className="text-[#94A3B8] text-xs mb-1">Latitude</p>
                                  <p className="text-[#0F172A] font-medium">{v.lat ?? '—'}</p>
                                </div>
                                <div>
                                  <p className="text-[#94A3B8] text-xs mb-1">Longitude</p>
                                  <p className="text-[#0F172A] font-medium">{v.lon ?? '—'}</p>
                                </div>
                                <div>
                                  <p className="text-[#94A3B8] text-xs mb-1">Load Utilization</p>
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${loadPercent > 90 ? 'bg-red-500' : loadPercent > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                        style={{ width: `${Math.min(loadPercent, 100)}%` }}
                                      />
                                    </div>
                                    <span className="text-xs font-medium text-[#0F172A]">{loadPercent}%</span>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-[#94A3B8] text-xs mb-1">Speed</p>
                                  <p className="text-[#0F172A] font-medium">{v.speed_knots ?? '—'} knots</p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
