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
import { FileText, ArrowRight, Search } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

export default function DocumentsPage() {
  const { user } = useAuth();
  const [shipments, setShipments] = useState([]);
  const [docCounts, setDocCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/shipments/?page=1&limit=50')
      .then(async (data) => {
        const items = data.items || [];
        setShipments(items);
        // Fetch doc counts for each shipment
        const counts = {};
        await Promise.all(items.map(async (s) => {
          try {
            const docs = await api.get(`/documents/shipment/${s.id}`);
            counts[s.id] = Array.isArray(docs) ? docs.length : 0;
          } catch { counts[s.id] = 0; }
        }));
        setDocCounts(counts);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = search
    ? shipments.filter(s => s.id.toLowerCase().includes(search.toLowerCase()))
    : shipments;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#0F172A]">Documents</h1>
          <p className="text-sm text-[#64748B]">View and manage documents for each shipment</p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
        <input
          type="text"
          placeholder="Search by shipment ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <Card>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <EmptyState title="No shipments found" icon={FileText} />
          ) : (
            <div className="divide-y divide-[#E2E8F0]">
              {filtered.map(s => (
                <Link
                  key={s.id}
                  href={`/documents/${s.id}`}
                  className="flex items-center justify-between py-4 hover:bg-[#F8FAFC] -mx-6 px-6 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-blue-50">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#0F172A]">{s.id}</p>
                      <p className="text-xs text-[#64748B]">
                        {s.origin_port?.name || '—'} → {s.dest_port?.name || '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={s.status} />
                    {docCounts[s.id] > 0 && (
                      <Badge variant="info">{docCounts[s.id]} doc{docCounts[s.id] > 1 ? 's' : ''}</Badge>
                    )}
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
