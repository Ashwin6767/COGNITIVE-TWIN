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
import { Ship, Package, CheckCircle, Plus, ArrowRight } from 'lucide-react';

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/shipments/my')
      .then(setShipments)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const active = shipments.filter(s => !['DELIVERED', 'REJECTED', 'CANCELLED'].includes(s.status));
  const inTransit = shipments.filter(s => s.status === 'IN_TRANSIT_SEA');
  const delivered = shipments.filter(s => s.status === 'DELIVERED');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#0F172A]">Welcome, {user?.name}</h1>
          <p className="text-sm text-[#64748B]">Track and manage your shipments</p>
        </div>
        <Link
          href="/shipments/new"
          className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Request
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard label="Active Requests" value={active.length} icon={Ship} color="blue" />
        <StatCard label="In Transit" value={inTransit.length} icon={Package} color="purple" />
        <StatCard label="Delivered" value={delivered.length} icon={CheckCircle} color="green" />
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-[#0F172A]">My Shipments</h2>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : shipments.length === 0 ? (
            <EmptyState title="No shipments yet" description="Create your first shipment request to get started." />
          ) : (
            <div className="divide-y divide-[#E2E8F0]">
              {shipments.map(s => (
                <Link key={s.id} href={`/shipments/${s.id}`} className="flex items-center justify-between py-4 hover:bg-[#F8FAFC] -mx-6 px-6 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-[#0F172A]">{s.id}</p>
                    <p className="text-xs text-[#64748B]">
                      {s.origin_port?.name || '—'} → {s.dest_port?.name || '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={s.status} />
                    <ArrowRight className="w-4 h-4 text-[#94A3B8]" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
