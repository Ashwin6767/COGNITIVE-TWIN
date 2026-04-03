'use client';
import { useState, useEffect, use } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { StatusBadge } from '@/components/shipments/StatusBadge';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { DateTimePicker, DatePicker } from '@/components/ui/DateTimePicker';
import { FileUpload } from '@/components/ui/FileUpload';
import { CheckCircle2, Info, Clock, FileText, ArrowLeft, ChevronDown, ChevronRight, MapPin, X, AlertTriangle, Package, Users, Truck } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { formatDateTime } from '@/lib/utils';

const ShipmentMap = dynamic(() => import('@/components/maps/ShipmentMap'), { ssr: false });
const LocationPicker = dynamic(() => import('@/components/maps/LocationPicker'), { ssr: false });
const AddressAutocomplete = dynamic(() => import('@/components/maps/AddressAutocomplete').then(m => ({ default: m.AddressAutocomplete })), { ssr: false });

const TABS = ['Overview', 'Timeline', 'Documents', 'Actions'];

function toTitleCase(str) {
  return str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function ShipmentDetailPage({ params }) {
  const { id } = use(params);
  const { user } = useAuth();
  const [shipment, setShipment] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [transitions, setTransitions] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  // Form modal state
  const [formModal, setFormModal] = useState({ open: false, toStatus: '', requiredForm: null });
  const [formSchema, setFormSchema] = useState(null);
  const [formData, setFormData] = useState({});
  const [formNotes, setFormNotes] = useState('');
  const [dynamicOptions, setDynamicOptions] = useState({});
  const [expandedDoc, setExpandedDoc] = useState(null);
  const [locationData, setLocationData] = useState(null);
  const [activeTab, setActiveTab] = useState('Overview');

  const [loadError, setLoadError] = useState(null);

  const reload = async () => {
    try {
      const [ship, tl, tr, docs] = await Promise.all([
        api.get(`/shipments/${id}`),
        api.get(`/workflow/${id}/timeline`).catch(() => []),
        api.get(`/workflow/${id}/transitions`).catch(() => []),
        api.get(`/documents/shipment/${id}`).catch(() => []),
      ]);
      setShipment(ship);
      setTimeline(tl);
      setTransitions(tr);
      setDocuments(docs);
      setLoadError(null);
    } catch (err) {
      setLoadError(err.message || 'Failed to load shipment');
    }
  };

  // Poll driver location for en-route shipments
  useEffect(() => {
    if (!shipment) return;
    const enRouteStatuses = ['PICKUP_EN_ROUTE', 'GOODS_RELEASED', 'IN_TRANSIT_TO_PORT'];
    const hasLocation = shipment.pickup_lat || enRouteStatuses.includes(shipment.status);
    if (!hasLocation) return;

    const fetchLocation = () => api.get(`/shipments/${id}/location`).then(setLocationData).catch(() => {});
    fetchLocation();

    if (enRouteStatuses.includes(shipment.status)) {
      const interval = setInterval(fetchLocation, 15000);
      return () => clearInterval(interval);
    }
  }, [shipment?.status, id]);

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, [id]);

  // Resolve dynamic source fields (ports, drivers, trucks)
  const loadDynamicOptions = async (schema) => {
    const sources = new Set();
    schema.sections?.forEach(s => s.fields?.forEach(f => { if (f.source) sources.add(f.source); }));
    const opts = {};
    const sourceMap = {
      ports: '/ports/',
      available_drivers: '/users/drivers/available',
      available_trucks: '/ports/',
    };
    for (const src of sources) {
      try {
        const endpoint = sourceMap[src] || `/ports/`;
        const data = await api.get(endpoint);
        if (src === 'ports') {
          opts[src] = (Array.isArray(data) ? data : []).map(p => ({ value: p.id, label: `${p.name} (${p.country})` }));
        } else if (src === 'available_drivers') {
          opts[src] = (Array.isArray(data) ? data : []).map(d => ({ value: d.id, label: `${d.name} — ${d.license_type || 'Driver'}` }));
        } else if (src === 'available_trucks') {
          opts[src] = [{ value: 'TRK-001', label: 'TRK-001' }, { value: 'TRK-002', label: 'TRK-002' }, { value: 'TRK-003', label: 'TRK-003' }];
        }
      } catch { opts[src] = []; }
    }
    return opts;
  };

  const openTransition = async (t) => {
    if (t.required_form) {
      try {
        const schema = await api.get(`/documents/schema/${t.required_form}`);
        const opts = await loadDynamicOptions(schema);
        setDynamicOptions(opts);
        setFormSchema(schema);
        setFormNotes('');

        // Pre-fill formData from shipment context
        const prefill = {};
        const allFields = schema.sections?.flatMap(s => s.fields || []) || [];
        allFields.forEach(field => {
          const n = field.name;
          if (n === 'cargo_description' && shipment?.cargo_description) prefill[n] = shipment.cargo_description;
          else if ((n === 'weight_kg' || n === 'gross_weight_kg') && shipment?.weight_kg) prefill[n] = String(shipment.weight_kg);
          else if (n === 'declared_value_usd' && shipment?.declared_value_usd) prefill[n] = String(shipment.declared_value_usd);
          else if (n === 'cargo_type' && shipment?.cargo_type) prefill[n] = shipment.cargo_type;
          else if (n === 'container_numbers' && shipment?.container_type) prefill[n] = shipment.container_type;
          else if (n === 'shipper_name' && shipment?.origin_contact) prefill[n] = shipment.origin_contact;
          else if (n === 'consignee_name' && shipment?.dest_contact) prefill[n] = shipment.dest_contact;
          else if (n === 'origin_company' && shipment?.origin_company) prefill[n] = shipment.origin_company;
          else if (n === 'origin_address' && shipment?.origin_address) prefill[n] = shipment.origin_address;
          else if (n === 'origin_city' && shipment?.origin_city) prefill[n] = shipment.origin_city;
          else if (n === 'origin_country' && shipment?.origin_country) prefill[n] = shipment.origin_country;
        });

        // POD + RELEASE_FORM package count pre-fill
        if (t.required_form === 'PROOF_OF_DELIVERY') {
          const releaseDoc = documents.find(d => d.form_type === 'RELEASE_FORM' || d.type === 'RELEASE_FORM');
          if (releaseDoc?.data?.packages_count != null) {
            prefill['packages_received'] = String(releaseDoc.data.packages_count);
          }
        }

        setFormData(prefill);
        setFormModal({ open: true, toStatus: t.to_status, requiredForm: t.required_form });
      } catch {
        alert('Failed to load form schema');
      }
    } else {
      await executeTransition(t.to_status, null, '');
    }
  };

  const executeTransition = async (toStatus, fData, notes) => {
    setTransitioning(true);
    try {
      const body = { to_status: toStatus };
      if (fData && Object.keys(fData).length > 0) body.form_data = fData;
      if (notes) body.notes = notes;
      await api.post(`/workflow/${id}/transition`, body);
      setFormModal({ open: false, toStatus: '', requiredForm: null });
      await reload();
    } catch (err) {
      alert(err.message || 'Transition failed');
    } finally {
      setTransitioning(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const notes = formData.notes || '';
    executeTransition(formModal.toStatus, formData, notes);
  };

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full" />)}</div>;
  if (loadError) return (
    <div className="space-y-4">
      <Link href="/shipments" className="inline-flex items-center gap-2 text-[#64748B] hover:text-[#0F172A]">
        <ArrowLeft className="w-4 h-4" /> Back to Shipments
      </Link>
      <Card><CardContent>
        <div className="text-center py-8 space-y-3">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
          <p className="text-[#64748B]">{loadError}</p>
          <Button onClick={() => { setLoading(true); reload().finally(() => setLoading(false)); }}>Retry</Button>
        </div>
      </CardContent></Card>
    </div>
  );
  if (!shipment) return (
    <div className="space-y-4">
      <Link href="/shipments" className="inline-flex items-center gap-2 text-[#64748B] hover:text-[#0F172A]">
        <ArrowLeft className="w-4 h-4" /> Back to Shipments
      </Link>
      <p className="text-[#64748B]">Shipment not found.</p>
    </div>
  );

  // ─── POD banner data ──────────────────────────────────────────────────────
  const podReleaseDoc = formModal.requiredForm === 'PROOF_OF_DELIVERY'
    ? documents.find(d => d.form_type === 'RELEASE_FORM' || d.type === 'RELEASE_FORM')
    : null;

  // ─── Tab content ─────────────────────────────────────────────────────────

  const hasMap = shipment.pickup_lat || locationData?.pickup_lat || locationData?.driver_lat;
  const enRouteStatuses = ['PICKUP_EN_ROUTE', 'GOODS_RELEASED', 'IN_TRANSIT_TO_PORT'];

  const OverviewTab = (
    <div className="space-y-6">
      {/* Next-steps banner for customers */}
      {user?.role === 'CUSTOMER' && shipment.status === 'APPROVED' && transitions.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-900">Action Required</p>
            <p className="text-sm text-blue-700 mt-1">
              Your shipment has been approved! Please go to the <strong>Actions</strong> tab to fill in your shipment details so we can assign a driver.
            </p>
          </div>
        </div>
      )}
      {user?.role === 'CUSTOMER' && shipment.status === 'UNDER_REVIEW' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-900">Under Review</p>
            <p className="text-sm text-amber-700 mt-1">
              Your request is being reviewed by the logistics team. You&apos;ll be notified once it&apos;s approved.
            </p>
          </div>
        </div>
      )}
      {/* 2×2 card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Route */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-[#0F172A] flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-500" /> Route
            </h3>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm font-medium text-[#0F172A]">
              <span>{shipment.origin_port?.name || '—'}</span>
              <span className="text-[#94A3B8]">→</span>
              <span>{shipment.dest_port?.name || '—'}</span>
            </div>
            {(shipment.origin_port?.country || shipment.dest_port?.country) && (
              <p className="text-xs text-[#94A3B8] mt-1">
                {shipment.origin_port?.country || ''}{shipment.origin_port?.country && shipment.dest_port?.country ? ' → ' : ''}{shipment.dest_port?.country || ''}
              </p>
            )}
            {shipment.pickup_address && (
              <p className="text-xs text-[#64748B] mt-2 flex items-start gap-1">
                <MapPin className="w-3 h-3 mt-0.5 shrink-0 text-amber-500" />
                {shipment.pickup_address}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Cargo */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-[#0F172A] flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-500" /> Cargo
            </h3>
          </CardHeader>
          <CardContent>
            <dl className="space-y-1 text-sm">
              {shipment.cargo_description && <div><dt className="text-xs text-[#94A3B8]">Description</dt><dd className="text-[#0F172A]">{shipment.cargo_description}</dd></div>}
              {shipment.cargo_type && <div><dt className="text-xs text-[#94A3B8]">Type</dt><dd className="text-[#0F172A]">{shipment.cargo_type}</dd></div>}
              {shipment.weight_kg && <div><dt className="text-xs text-[#94A3B8]">Weight</dt><dd className="text-[#0F172A]">{shipment.weight_kg} kg</dd></div>}
              {shipment.quantity && <div><dt className="text-xs text-[#94A3B8]">Quantity</dt><dd className="text-[#0F172A]">{shipment.quantity}</dd></div>}
              {shipment.container_type && <div><dt className="text-xs text-[#94A3B8]">Container</dt><dd className="text-[#0F172A]">{shipment.container_type}</dd></div>}
            </dl>
          </CardContent>
        </Card>

        {/* Status */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-[#0F172A] flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" /> Status
            </h3>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-3">
              <StatusBadge status={shipment.status} />
              {shipment.priority && (
                <Badge variant={shipment.priority === 'HIGH' || shipment.priority === 'CRITICAL' ? 'warning' : 'default'}>
                  {shipment.priority}
                </Badge>
              )}
            </div>
            <dl className="space-y-1 text-sm">
              {shipment.eta && <div><dt className="text-xs text-[#94A3B8]">ETA</dt><dd className="text-[#0F172A]">{shipment.eta}</dd></div>}
              <div><dt className="text-xs text-[#94A3B8]">Created</dt><dd className="text-[#0F172A]">{formatDateTime(shipment.created_at)}</dd></div>
              <div><dt className="text-xs text-[#94A3B8]">Updated</dt><dd className="text-[#0F172A]">{formatDateTime(shipment.updated_at)}</dd></div>
            </dl>
          </CardContent>
        </Card>

        {/* Shipment Team */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-[#0F172A] flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" /> Shipment Team
            </h3>
          </CardHeader>
          <CardContent>
            <dl className="space-y-1 text-sm">
              {shipment.assigned_driver && (
                <div><dt className="text-xs text-[#94A3B8]">Driver</dt><dd className="text-[#0F172A]">{shipment.assigned_driver.name}</dd></div>
              )}
              {shipment.trucks_required && (
                <div className="flex items-center gap-1">
                  <Truck className="w-3 h-3 text-[#94A3B8]" />
                  <dt className="text-xs text-[#94A3B8]">Trucks</dt>
                  <dd className="text-[#0F172A] ml-1">{shipment.trucks_required}</dd>
                </div>
              )}
              {shipment.origin_contact && (
                <div><dt className="text-xs text-[#94A3B8]">Origin Contact</dt><dd className="text-[#0F172A]">{shipment.origin_contact}</dd></div>
              )}
              {shipment.dest_contact && (
                <div><dt className="text-xs text-[#94A3B8]">Dest Contact</dt><dd className="text-[#0F172A]">{shipment.dest_contact}</dd></div>
              )}
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Pickup details alert */}
      {shipment.status === 'APPROVED' && user?.role === 'CUSTOMER' && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <MapPin className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-[#0F172A]">Pickup Details Required</p>
            <p className="text-sm text-[#64748B] mt-1">Your shipment has been approved! Please provide your pickup location, cargo weight, and number of trucks needed.</p>
            <p className="text-xs text-[#94A3B8] mt-1">Use the &quot;Provide Details&quot; action in the Actions tab to submit your information.</p>
          </div>
        </div>
      )}

      {/* Live tracking map */}
      {hasMap && (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-[#0F172A] flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-500" />
              {enRouteStatuses.includes(shipment.status) ? 'Live Tracking' : 'Shipment Map'}
            </h2>
            {locationData?.updated_at && enRouteStatuses.includes(shipment.status) && (
              <p className="text-xs text-[#94A3B8]">Driver location updates every 15s</p>
            )}
          </CardHeader>
          <CardContent>
            <ShipmentMap
              pickup={shipment.pickup_lat ? { lat: shipment.pickup_lat, lng: shipment.pickup_lng, address: shipment.pickup_address } : locationData?.pickup_lat ? { lat: locationData.pickup_lat, lng: locationData.pickup_lng, address: locationData.pickup_address } : null}
              destination={shipment.origin_port?.lat ? { lat: shipment.origin_port.lat, lng: shipment.origin_port.lon, name: shipment.origin_port.name } : locationData?.origin_lat ? { lat: locationData.origin_lat, lng: locationData.origin_lng, name: locationData.origin_port_name } : null}
              driverLocation={locationData?.driver_lat ? { lat: locationData.driver_lat, lng: locationData.driver_lng } : null}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );

  const TimelineTab = (
    <div className="space-y-3">
      {timeline.length === 0 && (
        <p className="text-sm text-[#64748B] py-8 text-center">No timeline events yet.</p>
      )}
      {timeline.map((event, idx) => {
        const isDelivered = event.status === 'DELIVERED';
        return (
          <div key={idx} className="flex gap-4">
            {/* Step indicator */}
            <div className="flex flex-col items-center">
              {isDelivered ? (
                <div className="w-9 h-9 rounded-full bg-green-50 border-2 border-green-500 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-full bg-blue-50 border-2 border-blue-200 flex items-center justify-center shrink-0 text-sm font-semibold text-blue-600">
                  {idx + 1}
                </div>
              )}
              {idx < timeline.length - 1 && <div className="w-px flex-1 bg-[#E2E8F0] mt-1" />}
            </div>
            {/* Event card */}
            <div className={`flex-1 mb-4 rounded-lg border p-4 ${isDelivered ? 'bg-green-50 border-green-200' : 'bg-white border-[#E2E8F0]'}`}>
              <div className="flex items-start justify-between gap-2">
                <p className={`font-semibold text-sm ${isDelivered ? 'text-green-700' : 'text-[#0F172A]'}`}>
                  {toTitleCase(event.status || event.to_status || '')}
                </p>
                {isDelivered && (
                  <Badge variant="success">Delivery Complete</Badge>
                )}
              </div>
              <p className="text-xs text-[#64748B] mt-1">
                by <span className="font-semibold text-[#0F172A]">{event.actor_name || event.by || '—'}</span>
                {' · '}
                {formatDateTime(event.created_at || event.timestamp)}
              </p>
              {event.notes && (
                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-2">
                  <span className="text-sm">📝</span>
                  <p className="text-xs text-[#64748B]">{event.notes}</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  const DocumentsTab = (
    <div className="space-y-3">
      {documents.length === 0 && (
        <p className="text-sm text-[#64748B] py-8 text-center">No documents submitted yet.</p>
      )}
      {documents.map(d => {
        const isExpanded = expandedDoc === d.id;
        const formLabel = (d.form_type || d.type || '').replace(/_/g, ' ');
        return (
          <div key={d.id} className="border border-[#E2E8F0] rounded-lg overflow-hidden">
            <button
              onClick={() => setExpandedDoc(isExpanded ? null : d.id)}
              className="w-full flex items-center justify-between p-4 hover:bg-[#F8FAFC] transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-[#64748B] shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-[#0F172A]">{formLabel || 'Document'}</p>
                  <p className="text-xs text-[#64748B]">
                    by <span className="font-medium text-[#0F172A]">{d.submitted_by_name || d.submitted_by || '—'}</span>
                    {' · '}
                    {formatDateTime(d.submitted_at || d.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={d.status === 'APPROVED' ? 'success' : d.status === 'REJECTED' ? 'danger' : 'default'}>{d.status}</Badge>
                {isExpanded ? <ChevronDown className="w-4 h-4 text-[#94A3B8]" /> : <ChevronRight className="w-4 h-4 text-[#94A3B8]" />}
              </div>
            </button>
            {isExpanded && (
              <div className="border-t border-[#E2E8F0] bg-[#F8FAFC] p-4">
                {d.data && Object.keys(d.data).length > 0 ? (
                  <>
                    <h4 className="text-xs font-medium text-[#64748B] uppercase tracking-wider mb-3">Form Data</h4>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                      {Object.entries(d.data).map(([key, value]) => {
                        const isNoteField = /notes|instructions|description/i.test(key);
                        return (
                          <div key={key} className={`flex flex-col rounded p-2 ${isNoteField ? 'bg-amber-50 border-l-4 border-amber-400 col-span-2' : ''}`}>
                            <dt className="text-xs text-[#94A3B8] capitalize">{key.replace(/_/g, ' ')}</dt>
                            <dd className="text-sm text-[#0F172A] mt-0.5">
                              {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : (String(value) || '—')}
                            </dd>
                          </div>
                        );
                      })}
                    </dl>
                    {d.notes && (
                      <div className="mt-3 pt-3 border-t border-[#E2E8F0]">
                        <p className="text-xs text-[#94A3B8]">Notes</p>
                        <p className="text-sm text-[#0F172A]">{d.notes}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-[#94A3B8]">No form data recorded.</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const ActionsTab = (
    <div className="space-y-4">
      {transitions.length === 0 ? (
        <div className="py-12 text-center">
          <AlertTriangle className="w-8 h-8 text-[#94A3B8] mx-auto mb-3" />
          <p className="text-sm text-[#64748B]">No actions available at this stage.</p>
        </div>
      ) : (
        transitions.map(t => {
          const isDanger = t.to_status === 'REJECTED' || t.to_status === 'CANCELLED';
          return (
            <button
              key={t.to_status}
              disabled={transitioning}
              onClick={() => openTransition(t)}
              className={`w-full text-left border rounded-xl p-4 transition-colors hover:shadow-sm disabled:opacity-50 ${
                isDanger
                  ? 'border-red-200 bg-red-50 hover:bg-red-100'
                  : 'border-[#E2E8F0] bg-white hover:bg-[#F8FAFC]'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isDanger ? 'bg-red-100' : 'bg-blue-50'}`}>
                    {t.required_form
                      ? <FileText className={`w-5 h-5 ${isDanger ? 'text-red-600' : 'text-blue-600'}`} />
                      : <CheckCircle2 className={`w-5 h-5 ${isDanger ? 'text-red-600' : 'text-blue-600'}`} />
                    }
                  </div>
                  <div>
                    <p className={`font-semibold text-sm ${isDanger ? 'text-red-700' : 'text-[#0F172A]'}`}>
                      {toTitleCase(t.to_status)}
                    </p>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      {t.required_form
                        ? `Requires form · ${t.required_form.replace(/_/g, ' ')}`
                        : 'No form required — instant transition'}
                    </p>
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 shrink-0 ${isDanger ? 'text-red-400' : 'text-[#94A3B8]'}`} />
              </div>
            </button>
          );
        })
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/shipments" className="p-2 rounded-lg hover:bg-[#F1F5F9] text-[#64748B]">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold text-[#0F172A] truncate">{shipment.id}</h1>
          <p className="text-sm text-[#64748B]">
            {shipment.origin_port?.name || '—'} → {shipment.dest_port?.name || '—'}
          </p>
        </div>
        <StatusBadge status={shipment.status} />
      </div>

      {/* Tab bar */}
      <div className="border-b border-[#E2E8F0] bg-[#F8FAFC] -mx-0">
        <div className="flex gap-0">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              {tab}
              {tab === 'Documents' && documents.length > 0 && (
                <span className="ml-1.5 text-xs bg-[#E2E8F0] text-[#64748B] px-1.5 py-0.5 rounded-full">{documents.length}</span>
              )}
              {tab === 'Actions' && transitions.length > 0 && (
                <span className="ml-1.5 text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">{transitions.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'Overview' && OverviewTab}
        {activeTab === 'Timeline' && TimelineTab}
        {activeTab === 'Documents' && DocumentsTab}
        {activeTab === 'Actions' && ActionsTab}
      </div>

      {/* Transition Form Modal */}
      <Modal
        open={formModal.open}
        onClose={() => setFormModal({ open: false, toStatus: '', requiredForm: null })}
        title={`${formModal.toStatus?.replace(/_/g, ' ')} — ${formSchema?.title || 'Form'}`}
      >
        {formSchema && (
          <form onSubmit={handleFormSubmit} className="space-y-5">
            {/* POD package count banner */}
            {podReleaseDoc?.data?.packages_count != null && (
              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <Info className="w-4 h-4 mt-0.5 shrink-0 text-blue-600" />
                <span>
                  ℹ️ Customer release form reported{' '}
                  <strong>{podReleaseDoc.data.packages_count}</strong> packages. Please verify the count below.
                </span>
              </div>
            )}

            {formSchema.sections?.map((section, si) => (
              <div key={si} className="space-y-3">
                {formSchema.sections.length > 1 && (
                  <h3 className="text-sm font-medium text-[#0F172A] border-b border-[#E2E8F0] pb-2">{section.title}</h3>
                )}
                {section.fields?.map(field => {
                  if (field.type === 'hidden') return null;
                  const isPrefilled = field.name in formData && formData[field.name] !== '' && formData[field.name] != null;
                  const isNotesTextarea = field.type === 'textarea' && /notes/i.test(field.name);

                  return (
                    <div key={field.name} className="space-y-1.5">
                      <label className="block text-sm font-medium text-[#0F172A]">
                        {isNotesTextarea && <span className="mr-1 text-amber-600">📝 Note</span>}
                        {field.label || field.name.replace(/_/g, ' ')}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>

                      {field.type === 'location_search' ? (
                        <LocationPicker
                          value={formData[field.name] || ''}
                          required={field.required}
                          onChange={({ address, lat, lng }) => {
                            setFormData(d => ({
                              ...d,
                              [field.name]: address,
                              pickup_lat: String(lat),
                              pickup_lng: String(lng),
                            }));
                          }}
                        />
                      ) : field.name === 'delivery_address' ? (
                        <AddressAutocomplete
                          value={formData[field.name] || ''}
                          required={field.required}
                          placeholder="Search delivery address…"
                          onChange={({ address, lat, lng }) => {
                            setFormData(d => ({
                              ...d,
                              delivery_address: address,
                              ...(lat ? { delivery_lat: String(lat), delivery_lng: String(lng) } : {}),
                            }));
                          }}
                        />
                      ) : field.type === 'select' ? (
                        <select
                          className={`w-full border border-[#E2E8F0] rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${isPrefilled ? 'bg-blue-50' : ''}`}
                          required={field.required}
                          value={formData[field.name] || ''}
                          onChange={e => setFormData(d => ({ ...d, [field.name]: e.target.value }))}
                        >
                          <option value="">Select...</option>
                          {(field.source
                            ? (dynamicOptions[field.source] || [])
                            : (field.options || []).map(opt => typeof opt === 'string' ? { value: opt, label: opt } : opt)
                          ).map(opt => <option key={opt.value || opt} value={opt.value || opt}>{opt.label || opt}</option>)}
                        </select>
                      ) : field.type === 'textarea' ? (
                        <textarea
                          className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-14 resize-y ${
                            isNotesTextarea
                              ? 'border-amber-400 border-l-4 bg-amber-50'
                              : isPrefilled
                              ? 'border-[#E2E8F0] bg-blue-50'
                              : 'border-[#E2E8F0]'
                          }`}
                          required={field.required}
                          placeholder={field.required ? '' : 'Optional...'}
                          value={formData[field.name] || ''}
                          onChange={e => setFormData(d => ({ ...d, [field.name]: e.target.value }))}
                        />
                      ) : field.type === 'checkbox' ? (
                        <input
                          type="checkbox"
                          className="rounded border-[#E2E8F0]"
                          checked={formData[field.name] || false}
                          onChange={e => setFormData(d => ({ ...d, [field.name]: e.target.checked }))}
                        />
                      ) : field.type === 'date' ? (
                        <div className="relative">
                          <input
                            type="date"
                            className={`w-full border border-[#E2E8F0] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isPrefilled ? 'bg-blue-50' : 'bg-white'}`}
                            required={field.required}
                            value={formData[field.name] || ''}
                            onChange={e => setFormData(d => ({ ...d, [field.name]: e.target.value }))}
                          />
                        </div>
                      ) : field.type === 'datetime' ? (
                        <DateTimePicker
                          id={field.name}
                          name={field.name}
                          required={field.required}
                          value={formData[field.name] || ''}
                          onChange={e => setFormData(d => ({ ...d, [field.name]: e.target.value }))}
                          className={isPrefilled ? 'bg-blue-50' : ''}
                        />
                      ) : field.type === 'file_multiple' ? (
                        <FileUpload
                          multiple
                          required={field.required}
                          value={formData[field.name] || []}
                          onChange={files => setFormData(d => ({ ...d, [field.name]: files }))}
                          label="Upload Files · Multiple files supported"
                        />
                      ) : field.type === 'signature' ? (
                        <input
                          type="text"
                          placeholder="Signature (type full name)"
                          className={`w-full border border-[#E2E8F0] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isPrefilled ? 'bg-blue-50' : ''}`}
                          required={field.required}
                          value={formData[field.name] || ''}
                          onChange={e => setFormData(d => ({ ...d, [field.name]: e.target.value }))}
                        />
                      ) : (
                        <input
                          type={field.type === 'number' ? 'number' : field.type === 'tel' ? 'tel' : field.type === 'email' ? 'email' : 'text'}
                          className={`w-full border border-[#E2E8F0] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isPrefilled ? 'bg-blue-50' : ''}`}
                          required={field.required}
                          value={formData[field.name] || ''}
                          onChange={e => setFormData(d => ({ ...d, [field.name]: e.target.value }))}
                        />
                      )}

                      {isPrefilled && field.type !== 'checkbox' && field.type !== 'file_multiple' && (
                        <p className="text-xs text-blue-500">(Pre-filled — you can edit)</p>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setFormModal({ open: false, toStatus: '', requiredForm: null })}>Cancel</Button>
              <Button type="submit" disabled={transitioning}>{transitioning ? 'Submitting...' : 'Submit & Transition'}</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
