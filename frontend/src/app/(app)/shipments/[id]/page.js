'use client';
import { useState, useEffect, use } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { StatusBadge } from '@/components/shipments/StatusBadge';
import { ShipmentTimeline } from '@/components/shipments/ShipmentTimeline';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { ArrowLeft, FileText, X, ChevronDown, ChevronRight, MapPin } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { formatDateTime } from '@/lib/utils';

const ShipmentMap = dynamic(() => import('@/components/maps/ShipmentMap'), { ssr: false });

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

  const reload = async () => {
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
    reload().catch(() => {}).finally(() => setLoading(false));
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
        setFormData({});
        setFormNotes('');
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
  if (!shipment) return <p className="text-[#64748B]">Shipment not found.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/shipments" className="p-2 rounded-lg hover:bg-[#F1F5F9] text-[#64748B]">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-[#0F172A]">{shipment.id}</h1>
          <p className="text-sm text-[#64748B]">
            {shipment.origin_port?.name || '—'} → {shipment.dest_port?.name || '—'}
          </p>
        </div>
        <StatusBadge status={shipment.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><h2 className="text-lg font-semibold text-[#0F172A]">Details</h2></CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div><dt className="text-[#64748B]">Priority</dt><dd className="font-medium mt-0.5"><Badge variant={shipment.priority === 'HIGH' || shipment.priority === 'CRITICAL' ? 'warning' : 'default'}>{shipment.priority}</Badge></dd></div>
                <div><dt className="text-[#64748B]">ETA</dt><dd className="font-medium mt-0.5">{shipment.eta || '—'}</dd></div>
                <div><dt className="text-[#64748B]">Created</dt><dd className="font-medium mt-0.5">{formatDateTime(shipment.created_at)}</dd></div>
                <div><dt className="text-[#64748B]">Updated</dt><dd className="font-medium mt-0.5">{formatDateTime(shipment.updated_at)}</dd></div>
                {shipment.cargo_description && <div className="col-span-2"><dt className="text-[#64748B]">Cargo</dt><dd className="font-medium mt-0.5">{shipment.cargo_description}</dd></div>}
                {shipment.current_location && <div className="col-span-2"><dt className="text-[#64748B]">Current Location</dt><dd className="font-medium mt-0.5">{shipment.current_location}</dd></div>}
                {shipment.pickup_address && <div className="col-span-2"><dt className="text-[#64748B]">Pickup Address</dt><dd className="font-medium mt-0.5">{shipment.pickup_address}</dd></div>}
                {shipment.trucks_required && <div><dt className="text-[#64748B]">Trucks Required</dt><dd className="font-medium mt-0.5">{shipment.trucks_required}</dd></div>}
                {shipment.assigned_driver && <div><dt className="text-[#64748B]">Assigned Driver</dt><dd className="font-medium mt-0.5">{shipment.assigned_driver.name}</dd></div>}
              </dl>
            </CardContent>
          </Card>

          {/* Customer prompt to provide pickup details after approval */}
          {shipment.status === 'APPROVED' && user?.role === 'CUSTOMER' && (
            <Card>
              <CardContent>
                <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <MapPin className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-[#0F172A]">Pickup Details Required</p>
                    <p className="text-sm text-[#64748B] mt-1">Your shipment has been approved! Please provide your pickup location, cargo weight, and number of trucks needed.</p>
                    <p className="text-xs text-[#94A3B8] mt-1">Use the &quot;Provide Details&quot; action below to submit your information.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Map section — shown when pickup location exists or driver is en route */}
          {(shipment.pickup_lat || locationData?.pickup_lat || locationData?.driver_lat) && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-[#0F172A] flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-500" />
                  {['PICKUP_EN_ROUTE', 'GOODS_RELEASED', 'IN_TRANSIT_TO_PORT'].includes(shipment.status) ? 'Live Tracking' : 'Shipment Map'}
                </h2>
                {locationData?.updated_at && ['PICKUP_EN_ROUTE', 'GOODS_RELEASED', 'IN_TRANSIT_TO_PORT'].includes(shipment.status) && (
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

          {transitions.length > 0 && (
            <Card>
              <CardHeader><h2 className="text-lg font-semibold text-[#0F172A]">Available Actions</h2></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {transitions.map(t => (
                    <Button
                      key={t.to_status}
                      variant={t.to_status === 'REJECTED' || t.to_status === 'CANCELLED' ? 'danger' : 'secondary'}
                      size="sm"
                      disabled={transitioning}
                      onClick={() => openTransition(t)}
                    >
                      → {t.to_status.replace(/_/g, ' ')}
                      {t.required_form && <FileText className="w-3 h-3 ml-1" />}
                    </Button>
                  ))}
                </div>
                {transitions.some(t => t.required_form) && (
                  <p className="text-xs text-[#94A3B8] mt-2"><FileText className="w-3 h-3 inline" /> = requires form</p>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-[#0F172A]">Documents ({documents.length})</h2>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <p className="text-sm text-[#64748B]">No documents submitted yet.</p>
              ) : (
                <div className="space-y-3">
                  {documents.map(d => {
                    const isExpanded = expandedDoc === d.id;
                    return (
                      <div key={d.id} className="border border-[#E2E8F0] rounded-lg overflow-hidden">
                        <button
                          onClick={() => setExpandedDoc(isExpanded ? null : d.id)}
                          className="w-full flex items-center justify-between p-3 hover:bg-[#F8FAFC] transition-colors text-left"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="w-4 h-4 text-[#64748B]" />
                            <div>
                              <p className="text-sm font-medium text-[#0F172A]">{d.form_type?.replace(/_/g, ' ') || d.type?.replace(/_/g, ' ')}</p>
                              <p className="text-xs text-[#64748B]">{formatDateTime(d.submitted_at || d.created_at)} · by {d.submitted_by_name || d.submitted_by || '—'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={d.status === 'APPROVED' ? 'success' : d.status === 'REJECTED' ? 'danger' : 'default'}>{d.status}</Badge>
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-[#94A3B8]" /> : <ChevronRight className="w-4 h-4 text-[#94A3B8]" />}
                          </div>
                        </button>
                        {isExpanded && d.data && (
                          <div className="border-t border-[#E2E8F0] bg-[#F8FAFC] p-4">
                            <h4 className="text-xs font-medium text-[#64748B] uppercase tracking-wider mb-3">Form Data</h4>
                            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                              {Object.entries(d.data).map(([key, value]) => (
                                <div key={key} className="flex flex-col">
                                  <dt className="text-xs text-[#94A3B8]">{key.replace(/_/g, ' ')}</dt>
                                  <dd className="text-sm text-[#0F172A]">
                                    {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : (String(value) || '—')}
                                  </dd>
                                </div>
                              ))}
                            </dl>
                            {d.notes && (
                              <div className="mt-3 pt-3 border-t border-[#E2E8F0]">
                                <p className="text-xs text-[#94A3B8]">Notes</p>
                                <p className="text-sm text-[#0F172A]">{d.notes}</p>
                              </div>
                            )}
                          </div>
                        )}
                        {isExpanded && !d.data && (
                          <div className="border-t border-[#E2E8F0] bg-[#F8FAFC] p-4">
                            <p className="text-sm text-[#94A3B8]">No form data recorded.</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><h2 className="text-lg font-semibold text-[#0F172A]">Timeline</h2></CardHeader>
            <CardContent>
              <ShipmentTimeline events={timeline} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Transition Form Modal */}
      <Modal open={formModal.open} onClose={() => setFormModal({ open: false, toStatus: '', requiredForm: null })} title={`${formModal.toStatus?.replace(/_/g, ' ')} — ${formSchema?.title || 'Form'}`}>
        {formSchema && (
          <form onSubmit={handleFormSubmit} className="space-y-5">
            {formSchema.sections?.map((section, si) => (
              <div key={si} className="space-y-3">
                {formSchema.sections.length > 1 && <h3 className="text-sm font-medium text-[#0F172A] border-b border-[#E2E8F0] pb-2">{section.title}</h3>}
                {section.fields?.map(field => (
                  <div key={field.name} className="space-y-1.5">
                    <label className="block text-sm font-medium text-[#0F172A]">
                      {field.label || field.name.replace(/_/g, ' ')}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {field.type === 'select' ? (
                      <select
                        className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-14 resize-y"
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
                    ) : (
                      <input
                        type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                        className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required={field.required}
                        value={formData[field.name] || ''}
                        onChange={e => setFormData(d => ({ ...d, [field.name]: e.target.value }))}
                      />
                    )}
                  </div>
                ))}
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
