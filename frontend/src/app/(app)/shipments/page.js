'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { StatusBadge } from '@/components/shipments/StatusBadge';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Search, Filter, ArrowRight, Ship } from 'lucide-react';

const STATUSES = [
  'All', 'REQUEST_SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'DRIVER_ASSIGNED',
  'PICKUP_EN_ROUTE', 'GOODS_COLLECTED', 'AT_ORIGIN_PORT', 'CUSTOMS_CLEARANCE_ORIGIN',
  'IN_YARD_ORIGIN', 'LOADED_ON_VESSEL', 'IN_TRANSIT_SEA', 'AT_DESTINATION_PORT',
  'CUSTOMS_CLEARANCE_DEST', 'LAST_MILE', 'DELIVERED', 'REJECTED', 'CANCELLED'
];

export default function ShipmentsPage() {
  const { user } = useAuth();
  const [shipments, setShipments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const limit = 15;

  useEffect(() => {
    setLoading(true);
    let url = `/shipments/?page=${page}&limit=${limit}`;
    if (statusFilter !== 'All') url += `&status=${statusFilter}`;
    api.get(url).then(data => {
      setShipments(data.items || []);
      setTotal(data.total || 0);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [page, statusFilter]);

  const filtered = search
    ? shipments.filter(s => s.id.toLowerCase().includes(search.toLowerCase()))
    : shipments;

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#0F172A]">Shipments</h1>
        {(user?.role === 'CUSTOMER' || user?.role === 'LOGISTICS_MANAGER' || user?.role === 'ADMIN') && (
          <Link href="/shipments/new" className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-blue-700">
            + New Request
          </Link>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search by ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="border border-[#E2E8F0] rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {STATUSES.map(s => <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      <Card>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <EmptyState title="No shipments found" icon={Ship} />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[#64748B] border-b border-[#E2E8F0]">
                      <th className="pb-3 font-medium">ID</th>
                      <th className="pb-3 font-medium">Route</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Priority</th>
                      <th className="pb-3 font-medium">ETA</th>
                      <th className="pb-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {filtered.map(s => (
                      <tr key={s.id} className="hover:bg-[#F8FAFC]">
                        <td className="py-3 font-medium text-[#0F172A]">{s.id}</td>
                        <td className="py-3 text-[#64748B]">{s.origin_port?.name || '—'} → {s.dest_port?.name || '—'}</td>
                        <td className="py-3"><StatusBadge status={s.status} /></td>
                        <td className="py-3"><Badge variant={s.priority === 'CRITICAL' ? 'danger' : s.priority === 'HIGH' ? 'warning' : 'default'}>{s.priority || '—'}</Badge></td>
                        <td className="py-3 text-[#64748B] text-xs">{s.eta || '—'}</td>
                        <td className="py-3">
                          <Link href={`/shipments/${s.id}`} className="text-blue-600 hover:text-blue-700"><ArrowRight className="w-4 h-4" /></Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#E2E8F0]">
                  <p className="text-sm text-[#64748B]">Page {page} of {totalPages} ({total} total)</p>
                  <div className="flex gap-2">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-sm disabled:opacity-50 hover:bg-[#F1F5F9]">Previous</button>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-sm disabled:opacity-50 hover:bg-[#F1F5F9]">Next</button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
