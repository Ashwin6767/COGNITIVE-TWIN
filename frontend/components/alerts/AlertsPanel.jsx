'use client'

import { useQuery } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { api } from '@/lib/api'
import { AlertCard } from './AlertCard'

export function AlertsPanel() {
  const { data: ports, isLoading } = useQuery({
    queryKey: ['ports'],
    queryFn: api.getPorts,
    refetchInterval: 30000,
  })

  const alerts = ports
    ?.map(({ p }) => ({
      id: p.id,
      name: p.name,
      level: p.congestion_level,
      delay: p.avg_delay_hours,
      utilization: p.current_utilization,
    }))
    .sort((a, b) => {
      const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
      return (order[a.level] ?? 4) - (order[b.level] ?? 4)
    }) || []

  return (
    <div className="bg-bg-secondary rounded-lg border border-border">
      <div className="p-3 border-b border-border flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-warning" />
        <h2 className="font-semibold text-sm">Alerts</h2>
        <span className="ml-auto text-xs bg-danger/20 text-danger px-2 py-0.5 rounded-full">
          {alerts.filter(a => a.level === 'HIGH' || a.level === 'CRITICAL').length}
        </span>
      </div>
      <div className="p-2 space-y-2 max-h-60 overflow-y-auto">
        {isLoading ? (
          <div className="animate-pulse space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-12 bg-bg-card rounded" />)}
          </div>
        ) : (
          alerts.map(alert => <AlertCard key={alert.id} alert={alert} />)
        )}
      </div>
    </div>
  )
}
