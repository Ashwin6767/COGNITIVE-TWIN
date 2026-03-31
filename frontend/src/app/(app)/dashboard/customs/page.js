'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { StatusBadge } from '@/components/shipments/StatusBadge';
import { Skeleton } from '@/components/ui/Skeleton';
import { ClipboardCheck, Clock, CheckCircle, ArrowRight } from 'lucide-react';

export default function CustomsDashboard() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/shipments/?page=1&limit=50').then(data => {
      setShipments(data.items || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const pending = shipments.filter(s => ['CUSTOMS_CLEARANCE_ORIGIN', 'CUSTOMS_CLEARANCE_DEST'].includes(s.status));
  const cleared = shipments.filter(s => ['IN_YARD_ORIGIN', 'AT_DESTINATION_PORT', 'LOADED_ON_VESSEL', 'IN_TRANSIT_SEA', 'LAST_MILE', 'DELIVERED'].includes(s.status));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-[#0F172A]">Customs Review Queue</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard label="Pending Review" value={pending.length} icon={Clock} color="yellow" />
        <StatCard label="Cleared" value={cleared.length} icon={CheckCircle} color="green" />
        <StatCard label="Total Processed" value={shipments.length} icon={ClipboardCheck} color="blue" />
      </div>

      <Card>
        <CardHeader><h2 className="text-lg font-semibold text-[#0F172A]">Pending ({pending.length})</h2></CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : pending.length === 0 ? (
            <p className="text-sm text-[#64748B]">No shipments awaiting customs clearance.</p>
          ) : (
            <div className="divide-y divide-[#E2E8F0]">
              {pending.map(s => (
                <Link key={s.id} href={`/shipments/${s.id}`} className="flex items-center justify-between py-4 hover:bg-[#F8FAFC] -mx-6 px-6 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-[#0F172A]">{s.id}</p>
                    <p className="text-xs text-[#64748B]">{s.origin_port?.name || '—'} → {s.dest_port?.name || '—'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={s.status} />
                    <ArrowRight className="w-4 h-4 text-blue-600" />
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
