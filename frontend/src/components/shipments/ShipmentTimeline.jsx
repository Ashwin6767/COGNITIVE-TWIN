'use client';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

function toTitleCase(str) {
  return str
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ShipmentTimeline({ events = [] }) {
  if (!events.length) {
    return <p className="text-sm text-[#64748B]">No timeline events yet.</p>;
  }

  const isDelivered = events.some(
    (e) => (e.to_status || e.status) === 'DELIVERED'
  );

  return (
    <div className="space-y-0">
      {events.map((event, i) => {
        const status = event.to_status || event.status || '';
        const isLast = i === events.length - 1;
        const isDone = !isLast || isDelivered;
        const isDeliveredEvent = status === 'DELIVERED';

        const actorName = event.triggered_by && event.triggered_by !== 'System'
          ? event.triggered_by
          : event.triggered_by || 'System';

        return (
          <div key={i} className="flex gap-4">
            <div className="flex flex-col items-center">
              {isDeliveredEvent ? (
                <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0 drop-shadow-sm" />
              ) : isDone ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
              ) : (
                <Clock className="w-5 h-5 text-blue-500 shrink-0" />
              )}
              {!isLast && <div className="w-0.5 h-full bg-[#E2E8F0] min-h-8" />}
            </div>
            <div className="pb-6 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className={`text-sm font-semibold ${isDeliveredEvent ? 'text-green-700' : 'text-[#0F172A]'}`}>
                  {toTitleCase(status)}
                </p>
                {isDeliveredEvent && (
                  <span className="text-xs bg-green-100 text-green-700 font-medium px-2 py-0.5 rounded-full border border-green-200">
                    Delivery Complete
                  </span>
                )}
              </div>
              <p className="text-xs text-[#64748B] mt-0.5">
                <span className="font-medium text-[#475569]">{actorName}</span>
                {' · '}
                {formatDateTime(event.timestamp || event.transitioned_at)}
              </p>
              {event.notes && (
                <div className="mt-1.5 flex items-start gap-1.5 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">{event.notes}</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
