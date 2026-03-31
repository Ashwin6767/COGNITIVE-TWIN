'use client';
import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { StatusBadge } from '@/components/shipments/StatusBadge';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ArrowLeft, FileText, Plus } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

const FORM_TYPES = [
  { value: 'SHIPMENT_REQUEST', label: 'Shipment Request' },
  { value: 'APPROVAL_FORM', label: 'Approval Form' },
  { value: 'RELEASE_FORM', label: 'Release Form' },
  { value: 'DRIVER_PICKUP_FORM', label: 'Driver Pickup' },
  { value: 'PORT_ENTRY_FORM', label: 'Port Entry' },
  { value: 'CUSTOMS_DECLARATION', label: 'Customs Declaration' },
  { value: 'CUSTOMS_REVIEW', label: 'Customs Review' },
  { value: 'YARD_RECEIPT', label: 'Yard Receipt' },
  { value: 'LOADING_CONFIRMATION', label: 'Loading Confirmation' },
  { value: 'BILL_OF_LADING', label: 'Bill of Lading' },
  { value: 'ARRIVAL_NOTICE', label: 'Arrival Notice' },
  { value: 'DELIVERY_CONFIRMATION', label: 'Delivery Confirmation' },
  { value: 'DAMAGE_REPORT', label: 'Damage Report' },
  { value: 'INSPECTION_CHECKLIST', label: 'Inspection Checklist' },
];

export default function ShipmentDocumentsPage({ params }) {
  const { shipmentId } = use(params);
  const [shipment, setShipment] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [selectedFormType, setSelectedFormType] = useState('');
  const [formSchema, setFormSchema] = useState(null);
  const [formData, setFormData] = useState({});
  const [dynamicOptions, setDynamicOptions] = useState({});

  useEffect(() => {
    Promise.all([
      api.get(`/shipments/${shipmentId}`).catch(() => null),
      api.get(`/documents/shipment/${shipmentId}`).catch(() => []),
    ]).then(([ship, docs]) => {
      setShipment(ship);
      setDocuments(docs);
    }).finally(() => setLoading(false));
  }, [shipmentId]);

  const loadFormSchema = async (type) => {
    setSelectedFormType(type);
    if (!type) { setFormSchema(null); return; }
    try {
      const schema = await api.get(`/documents/schema/${type}`);
      setFormSchema(schema);
      setFormData({});
      // Load dynamic sources
      const sources = new Set();
      schema.sections?.forEach(s => s.fields?.forEach(f => { if (f.source) sources.add(f.source); }));
      const opts = {};
      for (const src of sources) {
        try {
          if (src === 'ports') {
            const data = await api.get('/ports/');
            opts[src] = data.map(p => ({ value: p.id, label: `${p.name} (${p.country})` }));
          } else if (src === 'available_drivers') {
            const data = await api.get('/users/drivers/available');
            opts[src] = data.map(d => ({ value: d.id, label: d.name }));
          } else if (src === 'available_trucks') {
            opts[src] = [{ value: 'TRK-001', label: 'TRK-001' }, { value: 'TRK-002', label: 'TRK-002' }, { value: 'TRK-003', label: 'TRK-003' }];
          }
        } catch { opts[src] = []; }
      }
      setDynamicOptions(opts);
    } catch {
      alert('Failed to load form schema');
    }
  };

  const handleSubmitDocument = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/documents/submit', {
        shipment_id: shipmentId,
        form_type: selectedFormType,
        data: formData,
      });
      const docs = await api.get(`/documents/shipment/${shipmentId}`).catch(() => []);
      setDocuments(docs);
      setShowNewForm(false);
      setFormSchema(null);
      setSelectedFormType('');
    } catch (err) {
      alert(err.message || 'Failed to submit document');
    } finally {
      setSubmitting(false);
    }
  };

  const getFieldOptions = (field) => {
    if (field.source) return dynamicOptions[field.source] || [];
    return (field.options || []).map(opt => typeof opt === 'string' ? { value: opt, label: opt } : opt);
  };

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/documents" className="p-2 rounded-lg hover:bg-[#F1F5F9] text-[#64748B]">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-[#0F172A]">Documents — {shipmentId}</h1>
          {shipment && (
            <p className="text-sm text-[#64748B]">
              {shipment.origin_port?.name || '—'} → {shipment.dest_port?.name || '—'} · <StatusBadge status={shipment.status} />
            </p>
          )}
        </div>
        <Button onClick={() => setShowNewForm(!showNewForm)} variant={showNewForm ? 'secondary' : 'primary'} size="sm">
          {showNewForm ? 'Cancel' : <><Plus className="w-4 h-4" /> New Document</>}
        </Button>
      </div>

      {showNewForm && (
        <Card>
          <CardHeader><h2 className="text-lg font-semibold text-[#0F172A]">Submit New Document</h2></CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-[#0F172A]">Document Type</label>
                <select
                  className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedFormType}
                  onChange={e => loadFormSchema(e.target.value)}
                >
                  <option value="">Select document type...</option>
                  {FORM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              {formSchema && (
                <form onSubmit={handleSubmitDocument} className="space-y-4 pt-4 border-t border-[#E2E8F0]">
                  <h3 className="text-sm font-medium text-[#64748B]">{formSchema.title}</h3>
                  {formSchema.sections?.map((section, si) => (
                    <div key={si} className="space-y-3">
                      {formSchema.sections.length > 1 && (
                        <h4 className="text-xs font-medium text-[#94A3B8] uppercase tracking-wider">{section.title}</h4>
                      )}
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
                              {getFieldOptions(field).map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          ) : field.type === 'textarea' ? (
                            <textarea
                              className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-20"
                              required={field.required}
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
                  <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={submitting}>
                      {submitting ? 'Submitting...' : 'Submit Document'}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><h2 className="text-lg font-semibold text-[#0F172A]">Submitted Documents ({documents.length})</h2></CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <EmptyState title="No documents yet" description="Submit a document using the button above." icon={FileText} />
          ) : (
            <div className="divide-y divide-[#E2E8F0]">
              {documents.map(d => (
                <div key={d.id} className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-50">
                      <FileText className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#0F172A]">{d.form_type?.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-[#64748B]">{formatDateTime(d.created_at)} · Submitted by {d.submitted_by || '—'}</p>
                    </div>
                  </div>
                  <Badge variant={d.status === 'APPROVED' ? 'success' : d.status === 'REJECTED' ? 'danger' : 'info'}>
                    {d.status || 'SUBMITTED'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
