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
  Ship, ClipboardList, Truck, Anchor, CheckCircle, AlertTriangle, ArrowRight
} from 'lucide-react';

export default function ManagerDashboard() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ pending: 0, approved: 0, transit: 0, atPort: 0, delivered: 0 });

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

  const needsAttention = shipments.filter(s =>
    ['REQUEST_SUBMITTED', 'UNDER_REVIEW', 'CUSTOMS_CLEARANCE_ORIGIN', 'CUSTOMS_CLEARANCE_DEST'].includes(s.status)
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-[#0F172A]">Operations Overview</h1>

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
