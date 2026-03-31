'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Users, Ship, Anchor, Container, Settings } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, shipments: 0, ports: 0, vessels: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/users/').catch(() => ({ total: 0 })),
      api.get('/shipments/?page=1&limit=1').catch(() => ({ total: 0 })),
      api.get('/ports/').catch(() => []),
      api.get('/vessels/').catch(() => []),
    ]).then(([users, shipments, ports, vessels]) => {
      setStats({
        users: users.total || 0,
        shipments: shipments.total || 0,
        ports: Array.isArray(ports) ? ports.length : 0,
        vessels: Array.isArray(vessels) ? vessels.length : 0,
      });
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-[#0F172A]">Admin Dashboard</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Users" value={stats.users} icon={Users} color="blue" />
        <StatCard label="Shipments" value={stats.shipments} icon={Ship} color="purple" />
        <StatCard label="Ports" value={stats.ports} icon={Anchor} color="green" />
        <StatCard label="Vessels" value={stats.vessels} icon={Container} color="yellow" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Link href="/admin/users">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-50 text-blue-600"><Users className="w-6 h-6" /></div>
              <div>
                <p className="font-medium text-[#0F172A]">User Management</p>
                <p className="text-sm text-[#64748B]">Manage users, roles, and permissions</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/shipments">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-50 text-purple-600"><Ship className="w-6 h-6" /></div>
              <div>
                <p className="font-medium text-[#0F172A]">All Shipments</p>
                <p className="text-sm text-[#64748B]">View and manage all shipments</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
