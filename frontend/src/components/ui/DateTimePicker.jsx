'use client';
import { Calendar } from 'lucide-react';
import clsx from 'clsx';

export function DateTimePicker({ label, error, className = '', value, onChange, required, disabled, id, name }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id || name} className="block text-sm font-medium text-[#0F172A]">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          id={id || name}
          name={name}
          type="datetime-local"
          value={value || ''}
          onChange={onChange}
          required={required}
          disabled={disabled}
          className={clsx(
            'w-full bg-white border rounded-lg px-3 py-2.5 text-sm text-[#0F172A] transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            'disabled:bg-[#F8FAFC] disabled:cursor-not-allowed',
            error ? 'border-red-500' : 'border-[#E2E8F0]',
            className
          )}
        />
        <Calendar className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function DatePicker({ label, error, className = '', value, onChange, required, disabled, id, name }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id || name} className="block text-sm font-medium text-[#0F172A]">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          id={id || name}
          name={name}
          type="date"
          value={value || ''}
          onChange={onChange}
          required={required}
          disabled={disabled}
          className={clsx(
            'w-full bg-white border rounded-lg px-3 py-2.5 text-sm text-[#0F172A] transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            'disabled:bg-[#F8FAFC] disabled:cursor-not-allowed',
            error ? 'border-red-500' : 'border-[#E2E8F0]',
            className
          )}
        />
        <Calendar className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
