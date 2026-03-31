import { Card, CardContent } from './Card';

export function StatCard({ label, value, icon: Icon, color = 'blue' }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
    gray: 'bg-gray-50 text-gray-600',
  };
  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        {Icon && (
          <div className={`p-3 rounded-xl ${colors[color] || colors.blue}`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
        <div>
          <p className="text-sm text-[#64748B]">{label}</p>
          <p className="text-2xl font-semibold text-[#0F172A]">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
