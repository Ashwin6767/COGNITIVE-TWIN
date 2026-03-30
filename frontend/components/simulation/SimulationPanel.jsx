'use client'

import { useState } from 'react'
import { Activity, Play } from 'lucide-react'
import { api } from '@/lib/api'
import { SIMULATION_PORTS } from '@/lib/constants'
import { ImpactVisualization } from './ImpactVisualization'

/**
 * SimulationPanel - Controls for running delay simulations with a port
 * selector and delay slider, displaying results via ImpactVisualization.
 */
export function SimulationPanel() {
  const [portId, setPortId] = useState('P001')
  const [delayHours, setDelayHours] = useState(6)
  const [result, setResult] = useState(null)
  const [isRunning, setIsRunning] = useState(false)

  const handleSimulate = async () => {
    setIsRunning(true)
    try {
      const res = await api.simulateDelay(portId, delayHours)
      setResult(res)
    } catch (error) {
      console.error('Simulation failed:', error)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="bg-bg-secondary rounded-lg border border-border flex flex-col h-full">
      <div className="p-3 border-b border-border flex items-center gap-2">
        <Activity className="w-5 h-5 text-warning" />
        <h2 className="font-semibold text-sm">Simulation Engine</h2>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto flex-1">
        <div className="space-y-3">
          <div>
            <label className="text-xs text-text-secondary block mb-1">Port</label>
            <select
              value={portId}
              onChange={e => setPortId(e.target.value)}
              className="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm"
            >
              {SIMULATION_PORTS.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-text-secondary block mb-1">
              Delay: {delayHours} hours
            </label>
            <input
              type="range"
              min={1}
              max={24}
              value={delayHours}
              onChange={e => setDelayHours(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <button
            onClick={handleSimulate}
            disabled={isRunning}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-warning hover:bg-warning/80 text-black font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            {isRunning ? 'Simulating...' : 'Run Simulation'}
          </button>
        </div>

        {result && <ImpactVisualization result={result} />}
      </div>
    </div>
  )
}
