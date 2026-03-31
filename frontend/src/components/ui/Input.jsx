import clsx from 'clsx';

export function Input({ label, error, className = '', ...props }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-[#0F172A]">{label}</label>}
      <input
        className={clsx(
          'w-full bg-white border rounded-lg px-3 py-2.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
          error ? 'border-red-500' : 'border-[#E2E8F0]',
          className
        )}
        {...props}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
