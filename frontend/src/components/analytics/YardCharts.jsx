'use client';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid
} from 'recharts';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';

const TYPE_COLORS = {
  '20FT': '#3B82F6',
  '40FT': '#8B5CF6',
  '40FT_HC': '#EC4899',
  'REEFER': '#06B6D4',
};

const STATUS_COLORS = {
  'IN_YARD': '#22C55E',
  'ON_VESSEL': '#3B82F6',
  'LOADED': '#F59E0B',
  'EMPTY': '#94A3B8',
  'IN_TRANSIT': '#8B5CF6',
  'DAMAGED': '#EF4444',
  'DELIVERED': '#10B981',
};

const HEATMAP_COLORS = {
  'IN_YARD': '#22C55E',
  'ON_VESSEL': '#60A5FA',
  'LOADED': '#FBBF24',
  'EMPTY': '#D1D5DB',
  'IN_TRANSIT': '#A78BFA',
  'DAMAGED': '#F87171',
};

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium text-[#0F172A]">{label || payload[0]?.name}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill }}>
          {p.dataKey || p.name}: <span className="font-semibold">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

export default function YardCharts({ typeData, statusData, slotGrid, totalSlots, occupiedSlots, yardActivity }) {
  const typeChartData = (typeData || []).map(d => ({
    name: d.type || 'Unknown', value: d.count, fill: TYPE_COLORS[d.type] || '#94A3B8',
  }));

  const statusChartData = (statusData || []).map(d => ({
    name: d.status || 'Unknown', value: d.count, fill: STATUS_COLORS[d.status] || '#94A3B8',
  }));

  const activityChartData = (yardActivity || []).map(d => ({
    name: (d.status || '').replace(/_/g, ' '),
    count: d.count,
    fill: STATUS_COLORS[d.status] || '#6366F1',
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Container Type Distribution */}
        {typeChartData.length > 0 && (
          <Card>
            <CardHeader><h2 className="text-lg font-semibold text-[#0F172A]">Container Types</h2></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={typeChartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    dataKey="value"
                    label={({ name, percent }) => percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
                    labelLine={false}
                  >
                    {typeChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Container Status Distribution */}
        {statusChartData.length > 0 && (
          <Card>
            <CardHeader><h2 className="text-lg font-semibold text-[#0F172A]">Container Status</h2></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    dataKey="value"
                    label={({ name, percent }) => percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
                    labelLine={false}
                  >
                    {statusChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Yard Activity */}
      {activityChartData.length > 0 && (
        <Card>
          <CardHeader><h2 className="text-lg font-semibold text-[#0F172A]">Shipment Activity at Yard</h2></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={activityChartData} margin={{ top: 5, right: 20, bottom: 30, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748B', angle: -30, textAnchor: 'end' }} interval={0} height={50} />
                <YAxis tick={{ fontSize: 12, fill: '#64748B' }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Shipments" radius={[4, 4, 0, 0]}>
                  {activityChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Heatmap Grid */}
      {slotGrid && slotGrid.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-[#0F172A]">Yard Slot Occupancy</h2>
            <p className="text-xs text-[#64748B]">{occupiedSlots}/{totalSlots} slots occupied</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-1.5">
              {slotGrid.map((slot, i) => (
                <div
                  key={slot.container_id || i}
                  className="relative group aspect-square rounded-md border border-[#E2E8F0] flex items-center justify-center text-[8px] font-medium cursor-default transition-transform hover:scale-110"
                  style={{ backgroundColor: HEATMAP_COLORS[slot.status] || '#F1F5F9' }}
                  title={`${slot.container_id} | ${slot.position || '—'} | ${slot.type} | ${slot.status}`}
                >
                  <span className="truncate px-0.5">{slot.position || '—'}</span>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-[#0F172A] text-white text-[10px] rounded px-2 py-1 whitespace-nowrap z-10">
                    {slot.container_id}<br/>{slot.type} · {slot.status}
                  </div>
                </div>
              ))}
              {/* Empty slots */}
              {Array.from({ length: Math.max(0, (totalSlots || 0) - (slotGrid?.length || 0)) }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="aspect-square rounded-md border border-dashed border-[#D1D5DB] bg-[#F9FAFB]"
                />
              ))}
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-[#E2E8F0]">
              {Object.entries(HEATMAP_COLORS).map(([status, color]) => (
                <div key={status} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                  <span className="text-xs text-[#64748B]">{status.replace(/_/g, ' ')}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm border border-dashed border-[#D1D5DB] bg-[#F9FAFB]" />
                <span className="text-xs text-[#64748B]">Empty</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
