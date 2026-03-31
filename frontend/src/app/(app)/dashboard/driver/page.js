'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { StatusBadge } from '@/components/shipments/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Truck, Package, MapPin, ArrowRight } from 'lucide-react';

export default function DriverDashboard() {
  const { user } = useAuth();
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/shipments/my')
      .then(setShipments)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const current = shipments.filter(s => ['DRIVER_ASSIGNED', 'PICKUP_EN_ROUTE', 'GOODS_COLLECTED', 'LAST_MILE'].includes(s.status));
  const completed = shipments.filter(s => s.status === 'DELIVERED');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-[#0F172A]">My Assignments</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard label="Active Jobs" value={current.length} icon={Truck} color="blue" />
        <StatCard label="Total Assigned" value={shipments.length} icon={Package} color="purple" />
        <StatCard label="Completed" value={completed.length} icon={MapPin} color="green" />
      </div>

      {current.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-[#0F172A]">Current Assignment</h2>
          </CardHeader>
          <CardContent>
            {current.map(s => (
              <Link key={s.id} href={`/shipments/${s.id}`} className="block p-4 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors mb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-[#0F172A]">{s.id}</p>
                    <p className="text-sm text-[#64748B]">{s.origin_port?.name || '—'} → {s.dest_port?.name || '—'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={s.status} />
                    <ArrowRight className="w-4 h-4 text-[#94A3B8]" />
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-[#0F172A]">All Assignments</h2>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : shipments.length === 0 ? (
            <EmptyState title="No assignments" description="You don't have any assigned shipments yet." />
          ) : (
            <div className="divide-y divide-[#E2E8F0]">
              {shipments.map(s => (
                <Link key={s.id} href={`/shipments/${s.id}`} className="flex items-center justify-between py-4 hover:bg-[#F8FAFC] -mx-6 px-6 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-[#0F172A]">{s.id}</p>
                    <p className="text-xs text-[#64748B]">{s.origin_port?.name || '—'} → {s.dest_port?.name || '—'}</p>
                  </div>
                  <StatusBadge status={s.status} />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
