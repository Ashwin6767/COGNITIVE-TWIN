'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Ship, Truck, Anchor, CheckCircle, Clock, BarChart3, TrendingUp, Users, Brain
} from 'lucide-react';

const Charts = dynamic(() => import('@/components/analytics/Charts'), { ssr: false });

const STATUS_GROUPS = {
  'Pending': ['REQUEST_SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'AWAITING_CUSTOMER_DETAILS'],
  'Pickup': ['DRIVER_ASSIGNED', 'PICKUP_EN_ROUTE', 'GOODS_RELEASED'],
  'To Port': ['IN_TRANSIT_TO_PORT', 'PORT_ENTRY'],
  'Customs': ['CUSTOMS_CLEARANCE'],
  'Yard': ['IN_YARD', 'LOADED_ON_VESSEL'],
  'Sea Transit': ['IN_TRANSIT_SEA'],
  'Delivery': ['ARRIVED_DEST_PORT', 'LAST_MILE_ASSIGNED'],
  'Complete': ['DELIVERED'],
  'Cancelled': ['REJECTED', 'CANCELLED'],
};

const STATUS_COLORS = {
  'Pending': '#F59E0B',
  'Pickup': '#8B5CF6',
  'To Port': '#3B82F6',
  'Customs': '#EF4444',
  'Yard': '#06B6D4',
  'Sea Transit': '#6366F1',
  'Delivery': '#10B981',
  'Complete': '#22C55E',
  'Cancelled': '#94A3B8',
};

const PRIORITY_COLORS = {
  'CRITICAL': '#EF4444',
  'EXPRESS': '#F59E0B',
  'STANDARD': '#3B82F6',
  'ECONOMY': '#94A3B8',
};

const CONGESTION_COLORS = {
  'HIGH': '#EF4444',
  'MEDIUM': '#F59E0B',
  'LOW': '#22C55E',
};

export default function AnalyticsPage() {
  const [overview, setOverview] = useState(null);
  const [shipmentData, setShipmentData] = useState(null);
  const [portData, setPortData] = useState(null);
  const [perfData, setPerfData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [predictions, setPredictions] = useState({});
  const [loadingPredictions, setLoadingPredictions] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/analytics/overview').catch(() => null),
      api.get('/analytics/shipments').catch(() => null),
      api.get('/analytics/ports').catch(() => null),
      api.get('/analytics/performance').catch(() => null),
    ]).then(([ov, sh, po, pe]) => {
      setOverview(ov);
      setShipmentData(sh);
      setPortData(po);
      setPerfData(pe);
    }).finally(() => setLoading(false));
  }, []);

  const fetchPredictions = async () => {
    if (!portData?.ports?.length) return;
    setLoadingPredictions(true);
    const results = {};
    await Promise.all(
      portData.ports.map(p =>
        api.get(`/congestion/predict/${p.id}`)
          .then(pred => { results[p.id] = pred; })
          .catch(() => {})
      )
    );
    setPredictions(results);
    setLoadingPredictions(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-[#0F172A]">Analytics</h1>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-72 w-full rounded-xl" />)}
        </div>
      </div>
    );
  }

  // Build chart data from API responses
  const statusChartData = buildStatusChart(shipmentData?.status_distribution);
  const priorityChartData = (shipmentData?.priority_distribution || []).map(d => ({
    name: d.priority || 'Unknown', value: d.count, fill: PRIORITY_COLORS[d.priority] || '#94A3B8'
  }));
  const portUtilData = (portData?.ports || []).map(p => ({
    name: (p.name || '').replace('Port of ', ''),
    utilization: Math.round((p.utilization || 0) * 100),
    congestion: p.congestion,
    inbound: p.inbound || 0,
    outbound: p.outbound || 0,
    fill: CONGESTION_COLORS[p.congestion] || '#94A3B8',
  }));
  const routeData = (shipmentData?.top_routes || []).map(r => ({
    name: `${(r.origin || '').replace('Port of ', '')} → ${(r.destination || '').replace('Port of ', '')}`,
    shipments: r.shipments,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#0F172A]">Analytics & Reporting</h1>
        <span className="text-sm text-[#64748B]">Real-time data from supply chain graph</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Shipments" value={overview?.total_shipments || 0} icon={Ship} color="blue" />
        <StatCard label="In Transit" value={overview?.in_transit || 0} icon={Truck} color="purple" />
        <StatCard label="At Port" value={overview?.at_port || 0} icon={Anchor} color="yellow" />
        <StatCard label="Delivered" value={overview?.delivered || 0} icon={CheckCircle} color="green" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Pending Requests" value={overview?.pending || 0} icon={Clock} color="yellow" />
        <StatCard label="Active Drivers" value={overview?.active_drivers || 0} icon={Users} color="blue" />
        <StatCard label="Port Utilization" value={`${overview?.avg_port_utilization || 0}%`} icon={BarChart3} color="purple" />
        <StatCard label="Customs Queue" value={perfData?.pending_customs || 0} icon={TrendingUp} color="red" />
      </div>

      {/* Charts */}
      <Charts
        statusChartData={statusChartData}
        priorityChartData={priorityChartData}
        portUtilData={portUtilData}
        routeData={routeData}
        driverData={perfData?.driver_workload || []}
      />

      {/* Top Routes Table */}
      {routeData.length > 0 && (
        <Card>
          <CardHeader><h2 className="text-lg font-semibold text-[#0F172A]">Top Trade Routes</h2></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[#64748B] border-b border-[#E2E8F0]">
                  <th className="pb-3 font-medium">Route</th>
                  <th className="pb-3 font-medium text-right">Shipments</th>
                </tr>
              </thead>
              <tbody>
                {routeData.map((r, i) => (
                  <tr key={i} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC]">
                    <td className="py-3 text-[#0F172A]">{r.name}</td>
                    <td className="py-3 text-right font-medium text-[#0F172A]">{r.shipments}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Port Details Table */}
      {portUtilData.length > 0 && (
        <Card>
          <CardHeader><h2 className="text-lg font-semibold text-[#0F172A]">Port Status</h2></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[#64748B] border-b border-[#E2E8F0]">
                  <th className="pb-3 font-medium">Port</th>
                  <th className="pb-3 font-medium">Congestion</th>
                  <th className="pb-3 font-medium text-right">Utilization</th>
                  <th className="pb-3 font-medium text-right">Inbound</th>
                  <th className="pb-3 font-medium text-right">Outbound</th>
                </tr>
              </thead>
              <tbody>
                {portUtilData.map((p, i) => (
                  <tr key={i} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC]">
                    <td className="py-3 text-[#0F172A] font-medium">{p.name}</td>
                    <td className="py-3">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
                        p.congestion === 'HIGH' ? 'bg-red-50 text-red-700' :
                        p.congestion === 'MEDIUM' ? 'bg-yellow-50 text-yellow-700' :
                        'bg-green-50 text-green-700'
                      }`}>{p.congestion}</span>
                    </td>
                    <td className="py-3 text-right font-medium text-[#0F172A]">{p.utilization}%</td>
                    <td className="py-3 text-right text-[#64748B]">{p.inbound}</td>
                    <td className="py-3 text-right text-[#64748B]">{p.outbound}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
      {/* Predictive Congestion Analysis */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-[#0F172A]">Predictive Congestion Analysis</h2>
            </div>
            <button
              onClick={fetchPredictions}
              disabled={loadingPredictions || !portData?.ports?.length}
              className="inline-flex items-center gap-2 bg-purple-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              <Brain className="w-4 h-4" />
              {loadingPredictions ? 'Analyzing...' : 'Run AI Prediction'}
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {Object.keys(predictions).length === 0 ? (
            <p className="text-sm text-[#64748B]">
              Click &quot;Run AI Prediction&quot; to analyze congestion forecasts for all ports using Gemini AI.
            </p>
          ) : (
            <div className="space-y-4">
              {Object.entries(predictions).map(([portId, pred]) => (
                <div key={portId} className="rounded-xl border border-[#E2E8F0] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-[#0F172A]">{pred.port_name}</h3>
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
                      pred.current_state?.congestion === 'HIGH' ? 'bg-red-50 text-red-700' :
                      pred.current_state?.congestion === 'MEDIUM' ? 'bg-yellow-50 text-yellow-700' :
                      'bg-green-50 text-green-700'
                    }`}>Current: {pred.current_state?.congestion || 'N/A'}</span>
                  </div>

                  {/* Prediction Timeline */}
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    {['6h', '12h', '24h'].map(window => {
                      const p = pred.predictions?.[window];
                      if (!p) return null;
                      return (
                        <div key={window} className="text-center p-2 rounded-lg bg-[#F8FAFC]">
                          <p className="text-xs text-[#64748B] mb-1">{window} Forecast</p>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                            p.level === 'HIGH' ? 'bg-red-100 text-red-700' :
                            p.level === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>{p.level}</span>
                          <p className="text-xs text-[#94A3B8] mt-1">{p.confidence}% confidence</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Risk Factors */}
                  {pred.risk_factors?.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs font-medium text-[#64748B] mb-1">Risk Factors:</p>
                      <div className="flex flex-wrap gap-1">
                        {pred.risk_factors.map((f, i) => (
                          <span key={i} className="inline-block px-2 py-0.5 rounded bg-red-50 text-red-600 text-xs">{f}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Analysis */}
                  {pred.ai_analysis && (
                    <p className="text-xs text-[#64748B] italic mt-2">{pred.ai_analysis}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function buildStatusChart(statusDist) {
  if (!statusDist) return [];
  const grouped = {};
  for (const [groupName, statuses] of Object.entries(STATUS_GROUPS)) {
    const count = statusDist.reduce((sum, d) => {
      return statuses.includes(d.status) ? sum + d.count : sum;
    }, 0);
    if (count > 0) grouped[groupName] = count;
  }
  return Object.entries(grouped).map(([name, value]) => ({
    name, value, fill: STATUS_COLORS[name] || '#94A3B8'
  }));
}
