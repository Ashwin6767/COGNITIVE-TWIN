'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Anchor, Container, Ship, BarChart3 } from 'lucide-react';

export default function PortDashboard() {
  const { user } = useAuth();
  const [port, setPort] = useState(null);
  const [vessels, setVessels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const portId = user?.assigned_port_id || 'P001';
    Promise.all([
      api.get(`/ports/${portId}`).catch(() => null),
      api.get('/vessels/').catch(() => []),
    ]).then(([portData, vesselData]) => {
      setPort(portData);
      setVessels(vesselData);
    }).finally(() => setLoading(false));
  }, [user]);

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>;

  const portInfo = port?.port;
  const dockedVessels = vessels.filter(v => v.port?.id === (user?.assigned_port_id || 'P001'));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-[#0F172A]">{portInfo?.name || 'Port'} — Dashboard</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Docked Vessels" value={dockedVessels.length} icon={Ship} color="blue" />
        <StatCard label="Yard Utilization" value={`${portInfo?.utilization || 0}%`} icon={Container} color="yellow" />
        <StatCard label="Congestion" value={`${portInfo?.congestion || 0}%`} icon={BarChart3} color={portInfo?.congestion > 70 ? 'red' : 'green'} />
        <StatCard label="Active Shipments" value={port?.active_shipments || 0} icon={Anchor} color="purple" />
      </div>

      <Card>
        <CardHeader><h2 className="text-lg font-semibold text-[#0F172A]">Vessels at Port</h2></CardHeader>
        <CardContent>
          {dockedVessels.length === 0 ? (
            <p className="text-sm text-[#64748B]">No vessels currently docked.</p>
          ) : (
            <div className="divide-y divide-[#E2E8F0]">
              {dockedVessels.map(v => (
                <div key={v.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-[#0F172A]">{v.name}</p>
                    <p className="text-xs text-[#64748B]">IMO: {v.imo} | {v.current_load_teu || 0}/{v.capacity_teu || 0} TEU</p>
                  </div>
                  <Badge variant={v.status === 'DOCKED' ? 'info' : 'default'}>{v.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
