'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { formatDateTime } from '@/lib/utils';
import {
  Activity, Database, RefreshCw, Users, Ship, Anchor, Package,
  CheckCircle, XCircle, AlertTriangle, Server
} from 'lucide-react';

export default function AdminSystemPage() {
  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [counts, setCounts] = useState({ shipments: '—', users: '—', ports: '—', vessels: '—' });
  const [countsLoading, setCountsLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const fetchHealth = () => {
    setHealthLoading(true);
    api.get('/health')
      .then(data => setHealth(data))
      .catch(() => setHealth({ status: 'error', timestamp: null }))
      .finally(() => setHealthLoading(false));
  };

  const fetchCounts = () => {
    setCountsLoading(true);
    Promise.allSettled([
      api.get('/shipments/?page=1&limit=1'),
      api.get('/users/?page=1&limit=1'),
      api.get('/ports/'),
      api.get('/vessels/'),
    ]).then(([shipments, users, ports, vessels]) => {
      setCounts({
        shipments: shipments.status === 'fulfilled' ? (shipments.value.total ?? '—') : '—',
        users: users.status === 'fulfilled' ? (users.value.total ?? '—') : '—',
        ports: ports.status === 'fulfilled' ? (Array.isArray(ports.value) ? ports.value.length : ports.value.total ?? '—') : '—',
        vessels: vessels.status === 'fulfilled' ? (Array.isArray(vessels.value) ? vessels.value.length : vessels.value.total ?? '—') : '—',
      });
    }).finally(() => setCountsLoading(false));
  };

  useEffect(() => {
    fetchHealth();
    fetchCounts();
  }, []);

  const handleSeed = async () => {
    setShowConfirm(false);
    setSeeding(true);
    setSeedResult(null);
    try {
      const result = await api.post('/seed');
      setSeedResult({ success: true, message: result.message || 'Database reseeded successfully' });
      fetchHealth();
      fetchCounts();
    } catch (err) {
      setSeedResult({ success: false, message: err.message || 'Seed failed' });
    } finally {
      setSeeding(false);
    }
  };

  const isHealthy = health?.status === 'ok' || health?.status === 'healthy';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#0F172A]">System Administration</h1>
          <p className="text-sm text-[#64748B]">Monitor system health and manage database</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => { fetchHealth(); fetchCounts(); }}>
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* System Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* API Status */}
        <Card>
          <CardContent className="flex items-center gap-4">
            {healthLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <>
                <div className={`p-3 rounded-xl ${isHealthy ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                  {isHealthy ? <CheckCircle className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                </div>
                <div>
                  <p className="text-sm text-[#64748B]">API Status</p>
                  <p className={`text-lg font-semibold ${isHealthy ? 'text-green-700' : 'text-red-700'}`}>
                    {isHealthy ? 'Healthy' : 'Unhealthy'}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Database Status */}
        <Card>
          <CardContent className="flex items-center gap-4">
            {healthLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <>
                <div className={`p-3 rounded-xl ${isHealthy ? 'bg-blue-50 text-blue-600' : 'bg-yellow-50 text-yellow-600'}`}>
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-[#64748B]">Database</p>
                  <p className={`text-lg font-semibold ${isHealthy ? 'text-blue-700' : 'text-yellow-700'}`}>
                    {isHealthy ? 'Connected' : 'Unknown'}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Last Check Timestamp */}
        <Card>
          <CardContent className="flex items-center gap-4">
            {healthLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <>
                <div className="p-3 rounded-xl bg-purple-50 text-purple-600">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-[#64748B]">Last Health Check</p>
                  <p className="text-sm font-semibold text-[#0F172A]">
                    {health?.timestamp ? formatDateTime(health.timestamp) : 'Just now'}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Data Counts */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-[#0F172A]">Data Overview</h2>
        </CardHeader>
        <CardContent>
          {countsLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#F8FAFC] rounded-xl p-4 text-center">
                <div className="flex justify-center mb-2">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-2xl font-semibold text-[#0F172A]">{counts.shipments}</p>
                <p className="text-xs text-[#64748B] mt-1">Shipments</p>
              </div>
              <div className="bg-[#F8FAFC] rounded-xl p-4 text-center">
                <div className="flex justify-center mb-2">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-2xl font-semibold text-[#0F172A]">{counts.users}</p>
                <p className="text-xs text-[#64748B] mt-1">Users</p>
              </div>
              <div className="bg-[#F8FAFC] rounded-xl p-4 text-center">
                <div className="flex justify-center mb-2">
                  <Anchor className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-2xl font-semibold text-[#0F172A]">{counts.ports}</p>
                <p className="text-xs text-[#64748B] mt-1">Ports</p>
              </div>
              <div className="bg-[#F8FAFC] rounded-xl p-4 text-center">
                <div className="flex justify-center mb-2">
                  <Ship className="w-5 h-5 text-yellow-600" />
                </div>
                <p className="text-2xl font-semibold text-[#0F172A]">{counts.vessels}</p>
                <p className="text-xs text-[#64748B] mt-1">Vessels</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Database Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#0F172A]">Database Management</h2>
              <p className="text-xs text-[#64748B] mt-1">Reseed the database with fresh sample data</p>
            </div>
            <div className="p-2 rounded-xl bg-yellow-50">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-800">
              <strong>Warning:</strong> Reseeding the database will replace all existing data with fresh sample data. This action cannot be undone.
            </p>
          </div>

          {showConfirm ? (
            <div className="flex items-center gap-3">
              <p className="text-sm text-[#0F172A] font-medium">Are you sure you want to reseed?</p>
              <Button variant="danger" size="sm" onClick={handleSeed} disabled={seeding}>
                {seeding ? 'Seeding...' : 'Yes, Reseed'}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setShowConfirm(false)} disabled={seeding}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="danger"
              onClick={() => setShowConfirm(true)}
              disabled={seeding}
            >
              <Server className="w-4 h-4" />
              {seeding ? 'Reseeding...' : 'Reseed Database'}
            </Button>
          )}

          {seedResult && (
            <div className={`mt-4 p-3 rounded-lg text-sm ${seedResult.success ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
              {seedResult.success ? <CheckCircle className="w-4 h-4 inline mr-2" /> : <XCircle className="w-4 h-4 inline mr-2" />}
              {seedResult.message}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
