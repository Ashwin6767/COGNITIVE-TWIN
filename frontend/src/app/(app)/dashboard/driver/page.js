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
import { Truck, Package, MapPin, ArrowRight, Navigation, Bell, X } from 'lucide-react';

const ShipmentMap = dynamic(() => import('@/components/maps/ShipmentMap'), { ssr: false });

export default function DriverDashboard() {
  const { user } = useAuth();
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [urgentNotifications, setUrgentNotifications] = useState([]);
  const [dismissedIds, setDismissedIds] = useState(new Set());

  useEffect(() => {
    api.get('/shipments/my')
      .then(setShipments)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    api.get('/notifications/?limit=10&unread=true')
      .then((data) => {
        const items = Array.isArray(data) ? data : (data.items || data.notifications || []);
        setUrgentNotifications(items.filter(n => !n.read));
      })
      .catch(() => {});
  }, []);

  const current = shipments.filter(s => ['DRIVER_ASSIGNED', 'PICKUP_EN_ROUTE', 'GOODS_COLLECTED', 'GOODS_RELEASED', 'IN_TRANSIT_TO_PORT', 'LAST_MILE_ASSIGNED'].includes(s.status));
  const completed = shipments.filter(s => s.status === 'DELIVERED');
  const [updatingLocation, setUpdatingLocation] = useState(false);

  const dismissNotification = async (id) => {
    setDismissedIds(prev => new Set([...prev, id]));
    await api.put(`/notifications/${id}/read`, {}).catch(() => {});
  };

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

      {/* Immediate Attention Banner */}
      {urgentNotifications.filter(n => !dismissedIds.has(n.id)).length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Bell className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-amber-800">Requires Immediate Attention</h3>
          </div>
          {urgentNotifications.filter(n => !dismissedIds.has(n.id)).slice(0, 5).map(n => (
            <div key={n.id} className="flex items-start justify-between gap-3 bg-white rounded-lg border border-amber-100 p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#0F172A] truncate">{n.title || n.message || 'Action required'}</p>
                {n.shipment_id && (
                  <Link href={`/shipments/${n.shipment_id}`} className="text-xs text-blue-600 hover:underline mt-0.5 block">
                    View shipment {n.shipment_id} →
                  </Link>
                )}
                {n.body && <p className="text-xs text-[#64748B] mt-0.5 line-clamp-2">{n.body}</p>}
              </div>
              <button
                onClick={() => dismissNotification(n.id)}
                className="shrink-0 p-1 rounded hover:bg-amber-100 text-amber-600 transition-colors"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

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

                {/* Awaiting Port Entry banner — driver cannot process this anymore */}
                {s.status === 'IN_TRANSIT_TO_PORT' && (
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <Package className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-amber-800">Awaiting Port Entry Processing</p>
                        <p className="text-xs text-amber-700 mt-0.5">You have arrived at the port. A Port Officer will process your entry declaration. Please wait at the gate.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Share location button for en-route statuses (excluding IN_TRANSIT_TO_PORT handled above) */}
                {['PICKUP_EN_ROUTE', 'GOODS_RELEASED'].includes(s.status) && (
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
