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
import { Truck, Package, MapPin, ArrowRight, Navigation, CheckCircle, AlertTriangle } from 'lucide-react';

const ShipmentMap = dynamic(() => import('@/components/maps/ShipmentMap'), { ssr: false });

export default function DriverDashboard() {
  const { user } = useAuth();
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [congestionAlerts, setCongestionAlerts] = useState([]);

  useEffect(() => {
    api.get('/shipments/my')
      .then(setShipments)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const portIds = [...new Set(shipments.flatMap(s => [s.origin_port?.id, s.dest_port?.id]).filter(Boolean))];
    Promise.all(portIds.map(pid => api.get(`/congestion/${pid}`).catch(() => null)))
      .then(results => {
        const alerts = results.filter(r => r && r.congestion_level === 'HIGH');
        setCongestionAlerts(alerts);
      });
  }, [shipments]);

  // Fetch re-route events for current shipments
  const [rerouteAlerts, setRerouteAlerts] = useState([]);
  useEffect(() => {
    const activeIds = shipments
      .filter(s => ['GOODS_COLLECTED', 'IN_TRANSIT_TO_PORT', 'PICKUP_EN_ROUTE'].includes(s.status))
      .map(s => s.id);
    if (activeIds.length === 0) return;
    // Check notifications for reroute alerts
    api.get('/notifications/?page=1&limit=20').then(data => {
      const items = data.items || [];
      const reroutes = items.filter(n =>
        n.title?.includes('Re-Route') && !n.is_read
      );
      setRerouteAlerts(reroutes);
    }).catch(() => {});
  }, [shipments]);

  const current = shipments.filter(s => ['DRIVER_ASSIGNED', 'PICKUP_EN_ROUTE', 'GOODS_COLLECTED', 'GOODS_RELEASED', 'IN_TRANSIT_TO_PORT', 'LAST_MILE_ASSIGNED'].includes(s.status));
  const completed = shipments.filter(s => s.status === 'DELIVERED');
  const [updatingLocation, setUpdatingLocation] = useState(false);
  const [showHandoverForm, setShowHandoverForm] = useState(null); // shipment ID or null
  const [handoverData, setHandoverData] = useState({ packages_verified: '', condition_on_receipt: 'GOOD', driver_notes: '', confirmation_time: '' });
  const [submittingHandover, setSubmittingHandover] = useState(false);

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

  const confirmHandover = async (shipmentId) => {
    setSubmittingHandover(true);
    try {
      await api.post(`/workflow/${shipmentId}/transition`, {
        to_status: 'GOODS_COLLECTED',
        form_data: {
          ...handoverData,
          confirmation_time: handoverData.confirmation_time || new Date().toISOString(),
        },
      });
      // Refresh shipments
      const updated = await api.get('/shipments/my');
      setShipments(updated);
      setShowHandoverForm(null);
      setHandoverData({ packages_verified: '', condition_on_receipt: 'GOOD', driver_notes: '', confirmation_time: '' });
    } catch (e) {
      alert(e?.response?.data?.detail || 'Failed to confirm handover');
    } finally {
      setSubmittingHandover(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-[#0F172A]">My Assignments</h1>

      {congestionAlerts.length > 0 && (
        <div className="space-y-2">
          {congestionAlerts.map(alert => (
            <div key={alert.port_id} className="flex items-center gap-3 p-3 rounded-xl bg-red-50 border border-red-200">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-800">Congestion Alert: {alert.port_name}</p>
                <p className="text-xs text-red-600">High congestion detected. Utilization: {alert.utilization ? Math.round(alert.utilization * 100) : '—'}%</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {rerouteAlerts.length > 0 && (
        <div className="space-y-2">
          {rerouteAlerts.map(alert => (
            <div key={alert.id} className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-300">
              <Navigation className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-900">🔄 Re-Route Required</p>
                <p className="text-sm text-amber-800 mt-1">{alert.message}</p>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" onClick={() => api.put(`/notifications/${alert.id}/read`).then(() => setRerouteAlerts(prev => prev.filter(a => a.id !== alert.id)))}>
                    ✅ Acknowledge
                  </Button>
                  {alert.shipment_id && (
                    <Link href={`/shipments/${alert.shipment_id}`}>
                      <Button size="sm" variant="secondary">View Shipment</Button>
                    </Link>
                  )}
                </div>
              </div>
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

                {s.status === 'GOODS_RELEASED' && (
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    {showHandoverForm === s.id ? (
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-[#0F172A]">Confirm Goods Handover</h3>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-[#64748B] mb-1">Packages Verified</label>
                            <input type="number" className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm"
                              value={handoverData.packages_verified}
                              onChange={e => setHandoverData(prev => ({...prev, packages_verified: e.target.value}))}
                              placeholder="Number of packages"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-[#64748B] mb-1">Condition</label>
                            <select className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm"
                              value={handoverData.condition_on_receipt}
                              onChange={e => setHandoverData(prev => ({...prev, condition_on_receipt: e.target.value}))}
                            >
                              <option value="GOOD">Good</option>
                              <option value="MINOR_DAMAGE">Minor Damage</option>
                              <option value="DAMAGED">Damaged</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[#64748B] mb-1">Notes (optional)</label>
                          <textarea className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm" rows={2}
                            value={handoverData.driver_notes}
                            onChange={e => setHandoverData(prev => ({...prev, driver_notes: e.target.value}))}
                            placeholder="Any notes about the goods..."
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => confirmHandover(s.id)} disabled={submittingHandover || !handoverData.packages_verified}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            {submittingHandover ? 'Confirming...' : '✅ Confirm Handover'}
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => setShowHandoverForm(null)}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <Button size="sm" onClick={() => setShowHandoverForm(s.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        ✅ Confirm Goods Handover
                      </Button>
                    )}
                    <p className="text-xs text-[#94A3B8] mt-1">Confirm you have safely received the goods from the customer.</p>
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
