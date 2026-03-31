import clsx from 'clsx';

export function Select({ label, error, options = [], placeholder, className = '', ...props }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-[#0F172A]">{label}</label>}
      <select
        className={clsx(
          'w-full bg-white border rounded-lg px-3 py-2.5 text-sm text-[#0F172A] transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
          error ? 'border-red-500' : 'border-[#E2E8F0]',
          className
        )}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
