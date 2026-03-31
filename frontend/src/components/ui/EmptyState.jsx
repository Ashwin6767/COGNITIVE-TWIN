import { Inbox } from 'lucide-react';

export function EmptyState({ title = 'No data', description = '', icon: Icon = Inbox }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon className="w-12 h-12 text-[#94A3B8] mb-4" />
      <h3 className="text-lg font-medium text-[#0F172A] mb-1">{title}</h3>
      {description && <p className="text-sm text-[#64748B] max-w-sm">{description}</p>}
    </div>
  );
}
