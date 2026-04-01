'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { StatusBadge } from '@/components/shipments/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { Truck, Package, MapPin, ArrowRight, Navigation } from 'lucide-react';

const ShipmentMap = dynamic(() => import('@/components/maps/ShipmentMap'), { ssr: false });

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

  const current = shipments.filter(s => ['DRIVER_ASSIGNED', 'PICKUP_EN_ROUTE', 'GOODS_COLLECTED', 'GOODS_RELEASED', 'IN_TRANSIT_TO_PORT', 'LAST_MILE_ASSIGNED'].includes(s.status));
  const completed = shipments.filter(s => s.status === 'DELIVERED');
  const [updatingLocation, setUpdatingLocation] = useState(false);

  const updateMyLocation = async (shipmentId) => {
    setUpdatingLocation(true);
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
          await api.put(`/shipments/${shipmentId}/location`, { lat: pos.coords.latitude, lng: pos.coords.longitude });
          setUpdatingLocation(false);
        }, () => setUpdatingLocation(false));
      }
    } catch { setUpdatingLocation(false); }
  };

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
              <div key={s.id} className="p-4 rounded-lg border border-blue-200 bg-blue-50 mb-3">
                <Link href={`/shipments/${s.id}`} className="flex items-center justify-between hover:opacity-80 transition-opacity">
                  <div>
                    <p className="font-medium text-[#0F172A]">{s.id}</p>
                    <p className="text-sm text-[#64748B]">{s.origin_port?.name || '—'} → {s.dest_port?.name || '—'}</p>
                    {s.pickup_address && <p className="text-xs text-[#64748B] mt-1">📍 {s.pickup_address}</p>}
                    {s.trucks_required && <p className="text-xs text-[#64748B]">🚛 {s.trucks_required} truck(s) · {s.cargo_weight_kg ? `${s.cargo_weight_kg} kg` : ''}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={s.status} />
                    <ArrowRight className="w-4 h-4 text-[#94A3B8]" />
                  </div>
                </Link>

                {/* Map showing where driver needs to go */}
                {(s.pickup_lat || s.origin_port?.lat || s.dest_port?.lat) && (
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <ShipmentMap
                      pickup={s.pickup_lat ? { lat: s.pickup_lat, lng: s.pickup_lng, address: s.pickup_address } : null}
                      destination={s.origin_port?.lat ? { lat: s.origin_port.lat, lng: s.origin_port.lon, name: `${s.origin_port.name} (Origin Port)` } : s.dest_port?.lat ? { lat: s.dest_port.lat, lng: s.dest_port.lon, name: `${s.dest_port.name} (Dest Port)` } : null}
                    />
                  </div>
                )}

                {/* Share location button for en-route statuses */}
                {['PICKUP_EN_ROUTE', 'GOODS_RELEASED', 'IN_TRANSIT_TO_PORT'].includes(s.status) && (
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <Button size="sm" variant="secondary" disabled={updatingLocation} onClick={() => updateMyLocation(s.id)}>
                      <Navigation className="w-3.5 h-3.5 mr-1.5" />
                      {updatingLocation ? 'Sharing...' : 'Share My Location'}
                    </Button>
                    <p className="text-xs text-[#94A3B8] mt-1">Share your location so the customer and manager can track you.</p>
                  </div>
                )}
              </div>
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
