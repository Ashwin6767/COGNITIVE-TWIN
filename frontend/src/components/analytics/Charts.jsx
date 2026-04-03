'use client';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid
} from 'recharts';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';

const RADIAN = Math.PI / 180;
function renderLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) {
  if (percent < 0.05) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#0F172A" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs">
      {`${name} ${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

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

export default function Charts({ statusChartData, priorityChartData, portUtilData, routeData, driverData }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Shipment Status Distribution */}
      {statusChartData.length > 0 && (
        <Card>
          <CardHeader><h2 className="text-lg font-semibold text-[#0F172A]">Shipment Status</h2></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderLabel}
                  outerRadius={100}
                  dataKey="value"
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

      {/* Priority Distribution */}
      {priorityChartData.length > 0 && (
        <Card>
          <CardHeader><h2 className="text-lg font-semibold text-[#0F172A]">By Priority</h2></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={priorityChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderLabel}
                  outerRadius={100}
                  dataKey="value"
                >
                  {priorityChartData.map((entry, i) => (
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

      {/* Port Utilization */}
      {portUtilData.length > 0 && (
        <Card>
          <CardHeader><h2 className="text-lg font-semibold text-[#0F172A]">Port Utilization</h2></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={portUtilData} margin={{ top: 5, right: 20, bottom: 60, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748B', angle: -45, textAnchor: 'end' }} interval={0} height={60} />
                <YAxis tick={{ fontSize: 12, fill: '#64748B' }} domain={[0, 100]} unit="%" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="utilization" name="Utilization %" radius={[4, 4, 0, 0]}>
                  {portUtilData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Route Volume */}
      {routeData.length > 0 && (
        <Card>
          <CardHeader><h2 className="text-lg font-semibold text-[#0F172A]">Trade Route Volume</h2></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={routeData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 140 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis type="number" tick={{ fontSize: 12, fill: '#64748B' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748B' }} width={140} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="shipments" fill="#6366F1" name="Shipments" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Driver Workload */}
      {driverData.length > 0 && (
        <Card className="lg:col-span-2">
          <CardHeader><h2 className="text-lg font-semibold text-[#0F172A]">Driver Workload</h2></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={driverData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="driver" tick={{ fontSize: 12, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 12, fill: '#64748B' }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="active_assignments" fill="#8B5CF6" name="Active Assignments" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
