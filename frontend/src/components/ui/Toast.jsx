'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { X, Bell, AlertTriangle, CheckCircle, Info, Ship } from 'lucide-react';

const SEVERITY_STYLES = {
  LOW:      { bg: 'bg-blue-50 border-blue-200',   icon: Info,          iconColor: 'text-blue-600' },
  MEDIUM:   { bg: 'bg-yellow-50 border-yellow-200', icon: Bell,        iconColor: 'text-yellow-600' },
  HIGH:     { bg: 'bg-orange-50 border-orange-200', icon: AlertTriangle, iconColor: 'text-orange-600' },
  CRITICAL: { bg: 'bg-red-50 border-red-200',     icon: AlertTriangle, iconColor: 'text-red-600' },
};

function ToastItem({ toast, onDismiss }) {
  const router = useRouter();
  const style = SEVERITY_STYLES[toast.severity] || SEVERITY_STYLES.LOW;
  const Icon = style.icon;

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg ${style.bg} animate-slide-in cursor-pointer max-w-sm`}
      onClick={() => {
        if (toast.shipment_id) router.push(`/shipments/${toast.shipment_id}`);
        onDismiss(toast.id);
      }}
    >
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${style.iconColor}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#0F172A] truncate">{toast.title}</p>
        <p className="text-xs text-[#475569] mt-0.5 line-clamp-2">{toast.message}</p>
        {toast.shipment_id && (
          <span className="inline-flex items-center gap-1 text-[10px] text-blue-600 mt-1">
            <Ship className="w-3 h-3" /> View Shipment
          </span>
        )}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDismiss(toast.id); }}
        className="shrink-0 p-0.5 rounded hover:bg-black/5"
      >
        <X className="w-4 h-4 text-[#94A3B8]" />
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, onDismiss }) {
  if (!toasts.length) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
