import clsx from 'clsx';

export function Badge({ children, className = '', variant = 'default' }) {
  const styles = {
    default: 'bg-gray-100 text-gray-700',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
  };
  return (
    <span className={clsx('inline-flex items-center rounded-full px-3 py-1 text-xs font-medium', styles[variant] || styles.default, className)}>
      {children}
    </span>
  );
}
