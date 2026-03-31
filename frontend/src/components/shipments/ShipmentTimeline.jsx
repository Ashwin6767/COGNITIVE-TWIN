'use client';
import { CheckCircle, Circle, Clock } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

export function ShipmentTimeline({ events = [] }) {
  if (!events.length) {
    return <p className="text-sm text-[#64748B]">No timeline events yet.</p>;
  }

  return (
    <div className="space-y-0">
      {events.map((event, i) => (
        <div key={i} className="flex gap-4">
          <div className="flex flex-col items-center">
            {i < events.length - 1 ? (
              <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
            ) : (
              <Clock className="w-5 h-5 text-blue-500 shrink-0" />
            )}
            {i < events.length - 1 && <div className="w-0.5 h-full bg-[#E2E8F0] min-h-8" />}
          </div>
          <div className="pb-6">
            <p className="text-sm font-medium text-[#0F172A]">
              {event.to_status?.replace(/_/g, ' ') || event.status?.replace(/_/g, ' ')}
            </p>
            <p className="text-xs text-[#64748B]">
              {formatDateTime(event.timestamp || event.transitioned_at)}
              {event.triggered_by && ` — by ${event.triggered_by}`}
            </p>
            {event.notes && <p className="text-xs text-[#94A3B8] mt-0.5">{event.notes}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
