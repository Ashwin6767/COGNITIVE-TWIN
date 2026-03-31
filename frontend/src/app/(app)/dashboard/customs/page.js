'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { StatusBadge } from '@/components/shipments/StatusBadge';
import { Skeleton } from '@/components/ui/Skeleton';
import { ClipboardCheck, Clock, CheckCircle, ArrowRight, FileText } from 'lucide-react';

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#0F172A]">Customs Review Queue</h1>
        <Link
          href="/documents"
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
        >
          <FileText className="w-4 h-4" /> All Documents
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard label="Pending Review" value={pending.length} icon={Clock} color="yellow" />
        <StatCard label="Cleared" value={cleared.length} icon={CheckCircle} color="green" />
        <StatCard label="Total Processed" value={shipments.length} icon={ClipboardCheck} color="blue" />
      </div>

      <Card>
        <CardHeader><h2 className="text-lg font-semibold text-[#0F172A]">Pending Review ({pending.length})</h2></CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : pending.length === 0 ? (
            <p className="text-sm text-[#64748B]">No shipments awaiting customs clearance.</p>
          ) : (
            <div className="divide-y divide-[#E2E8F0]">
              {pending.map(s => (
                <div key={s.id} className="flex items-center justify-between py-4 hover:bg-[#F8FAFC] -mx-6 px-6 transition-colors">
                  <Link href={`/shipments/${s.id}`} className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#0F172A]">{s.id}</p>
                    <p className="text-xs text-[#64748B]">{s.origin_port?.name || '—'} → {s.dest_port?.name || '—'}</p>
                  </Link>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={s.status} />
                    <Link
                      href={`/documents/${s.id}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                      title="View Documents"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Docs
                    </Link>
                    <Link href={`/shipments/${s.id}`}>
                      <ArrowRight className="w-4 h-4 text-blue-600" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><h2 className="text-lg font-semibold text-[#0F172A]">Recently Cleared ({cleared.length})</h2></CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : cleared.length === 0 ? (
            <p className="text-sm text-[#64748B]">No cleared shipments yet.</p>
          ) : (
            <div className="divide-y divide-[#E2E8F0]">
              {cleared.slice(0, 10).map(s => (
                <div key={s.id} className="flex items-center justify-between py-4 hover:bg-[#F8FAFC] -mx-6 px-6 transition-colors">
                  <Link href={`/shipments/${s.id}`} className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#0F172A]">{s.id}</p>
                    <p className="text-xs text-[#64748B]">{s.origin_port?.name || '—'} → {s.dest_port?.name || '—'}</p>
                  </Link>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={s.status} />
                    <Link
                      href={`/documents/${s.id}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                      title="View Documents"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Docs
                    </Link>
                    <Link href={`/shipments/${s.id}`}>
                      <ArrowRight className="w-4 h-4 text-[#94A3B8]" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
