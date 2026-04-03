'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ArrowLeft, Send } from 'lucide-react';
import Link from 'next/link';
import { CongestionWarningModal } from '@/components/shipments/CongestionWarningModal';

export default function NewShipmentPage() {
  const router = useRouter();
  const [ports, setPorts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [congestionWarning, setCongestionWarning] = useState(null);
  const [checkingCongestion, setCheckingCongestion] = useState(false);
  const [form, setForm] = useState({
    origin_port_id: '',
    dest_port_id: '',
    cargo_description: '',
    cargo_weight_kg: '',
    priority: 'MEDIUM',
    notes: '',
  });

  useEffect(() => {
    api.get('/ports/').then(setPorts).catch(() => {});
  }, []);

  const portOptions = ports.map(p => ({ value: p.id, label: p.name }));
  const priorityOptions = [
    { value: 'LOW', label: 'Low' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'HIGH', label: 'High' },
    { value: 'CRITICAL', label: 'Critical' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await api.post('/shipments/request', {
        ...form,
        cargo_weight_kg: Number(form.cargo_weight_kg) || 0,
      });
      if (result.congestion_warning) {
        setCongestionWarning(result);
      } else {
        router.push(`/shipments/${result.id || result.shipment_id}`);
      }
    } catch (err) {
      alert(err.message || 'Failed to create shipment');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAlternativePort = (portId) => {
    setForm(f => ({ ...f, dest_port_id: portId }));
    setCongestionWarning(null);
  };

  const handleProceedAnyway = async () => {
    setCheckingCongestion(true);
    try {
      const result = await api.post('/shipments/request', {
        ...form,
        cargo_weight_kg: Number(form.cargo_weight_kg) || 0,
        congestion_acknowledged: true,
      });
      setCongestionWarning(null);
      router.push(`/shipments/${result.id || result.shipment_id}`);
    } catch (err) {
      alert(err.message || 'Failed to create shipment');
    } finally {
      setCheckingCongestion(false);
    }
  };

  const update = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/shipments" className="p-2 rounded-lg hover:bg-[#F1F5F9] text-[#64748B]">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-semibold text-[#0F172A]">New Shipment Request</h1>
      </div>

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <Select label="Origin Port" options={portOptions} placeholder="Select origin port" value={form.origin_port_id} onChange={update('origin_port_id')} />
            <Select label="Destination Port" options={portOptions} placeholder="Select destination port" value={form.dest_port_id} onChange={update('dest_port_id')} />
            <Input label="Cargo Description" placeholder="e.g. Electronics, Toys, etc." value={form.cargo_description} onChange={update('cargo_description')} required />
            <Input label="Cargo Weight (kg)" type="number" placeholder="0" value={form.cargo_weight_kg} onChange={update('cargo_weight_kg')} />
            <Select label="Priority" options={priorityOptions} value={form.priority} onChange={update('priority')} />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[#0F172A]">Notes</label>
              <textarea
                className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-24"
                placeholder="Additional notes..."
                value={form.notes}
                onChange={update('notes')}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Link href="/shipments">
                <Button type="button" variant="secondary">Cancel</Button>
              </Link>
              <Button type="submit" disabled={loading}>
                <Send className="w-4 h-4" /> {loading ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <CongestionWarningModal
        isOpen={!!congestionWarning}
        onClose={() => setCongestionWarning(null)}
        onSelectPort={handleSelectAlternativePort}
        onProceedAnyway={handleProceedAnyway}
        congestionInfo={congestionWarning?.congestion_info}
        alternatives={congestionWarning?.alternatives || []}
        aiSummary={congestionWarning?.ai_summary || ''}
        loading={checkingCongestion}
      />
    </div>
  );
}
