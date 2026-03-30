# 07 — Frontend Components

## Overview
All interactive UI components for the Cognitive Twin dashboard. Each component is documented with its props, state management, API integration, and important implementation notes.

## Dashboard Layout (app/page.jsx)

```
┌────────────────────────────────────────────────────────────┐
│  🧠 Cognitive Twin          [Status: Live]    [Reset Demo] │
├────────────┬───────────────────────────────────────────────┤
│            │                                               │
│  ALERTS    │           MAP VIEW (Leaflet + OSM)            │
│  ────────  │   🚢 ─── ─── ─── 🏭                          │
│  ⚠ P001    │        🚢 ─── ─── ─── 🏭                     │
│    HIGH    │   🚢 ─── ─── ─── 🏭                          │
│  ⚠ P006    │                                               │
│    HIGH    │   [Vessels animate along routes]               │
│  ✓ P003    │   [Ports glow red/yellow/green]               │
│    LOW     │                                               │
│            ├───────────────────────────────────────────────┤
│            │                                               │
│  ACTIONS   │     CHAT / AI AGENT PANEL                     │
│  ────────  │   ┌─────────────────────────────────┐         │
│  Reroute   │   │ "What happens if Port Shanghai  │         │
│  S001→P002 │   │  is delayed by 6 hours?"        │         │
│  (save 4h) │   └─────────────────────────────────┘         │
│            │   [What-if P001?] [Reroute options]           │
│  Reroute   │   [Show HIGH priority] [Risk overview]        │
│  S006→P005 │                                               │
│  (save 2h) │   SIMULATION RESULTS                          │
│            │   ┌─ Before ──────┬── After ────────┐         │
│            │   │ S001: On Time │ S001: +6h delay │         │
│            │   │ S002: On Time │ S002: +6h delay │         │
│            │   └───────────────┴─────────────────┘         │
└────────────┴───────────────────────────────────────────────┘
```

```jsx
// app/page.jsx
'use client'

import dynamic from 'next/dynamic'
import { Header } from '@/components/layout/Header'
import { AlertsPanel } from '@/components/alerts/AlertsPanel'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { SimulationPanel } from '@/components/simulation/SimulationPanel'
import { RecommendationPanel } from '@/components/recommendations/RecommendationPanel'

// CRITICAL: Leaflet must be dynamically imported with ssr: false
// Issue #15: Leaflet accesses `window` which doesn't exist during SSR
const SupplyChainMap = dynamic(
  () => import('@/components/map/SupplyChainMap'),
  { ssr: false, loading: () => <div className="w-full h-96 bg-bg-secondary animate-pulse rounded-lg" /> }
)

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-bg-primary">
      <Header />
      <div className="grid grid-cols-12 gap-4 p-4 h-[calc(100vh-64px)]">
        {/* Left sidebar: Alerts + Recommendations */}
        <div className="col-span-3 space-y-4 overflow-y-auto">
          <AlertsPanel />
          <RecommendationPanel />
        </div>
        
        {/* Main area: Map + Chat/Simulation */}
        <div className="col-span-9 space-y-4">
          <div className="h-1/2">
            <SupplyChainMap />
          </div>
          <div className="grid grid-cols-2 gap-4 h-1/2">
            <ChatPanel />
            <SimulationPanel />
          </div>
        </div>
      </div>
    </div>
  )
}
```

## Component 1: Header

```jsx
// components/layout/Header.jsx
'use client'

import { useState } from 'react'
import { Brain, RefreshCw } from 'lucide-react'
import { api } from '@/lib/api'

export function Header() {
  const [isResetting, setIsResetting] = useState(false)
  
  const handleReset = async () => {
    setIsResetting(true)
    try {
      await api.reset()
      window.location.reload()
    } finally {
      setIsResetting(false)
    }
  }
  
  return (
    <header className="h-16 bg-bg-secondary border-b border-border flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <Brain className="w-8 h-8 text-info" />
        <h1 className="text-xl font-bold text-text-primary">Cognitive Twin</h1>
        <span className="px-2 py-1 bg-success/20 text-success text-xs rounded-full">● Live</span>
      </div>
      <button
        onClick={handleReset}
        disabled={isResetting}
        className="flex items-center gap-2 px-4 py-2 bg-bg-card hover:bg-border rounded-lg text-sm transition-colors"
      >
        <RefreshCw className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`} />
        Reset Demo
      </button>
    </header>
  )
}
```

## Component 2: Supply Chain Map (Leaflet)

> ⚠️ **Issue #15**: Must use `next/dynamic` with `ssr: false`. Leaflet accesses `window`.
> ⚠️ **Issue #7**: Must import `leaflet/dist/leaflet.css`.
> ⚠️ **Issue #8**: LA port longitude must be negative (-118.27).

```jsx
// components/map/SupplyChainMap.jsx
'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'  // CRITICAL: Without this, map is broken (Issue #7)
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

// Fix Leaflet marker icons for Next.js
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
})

// Custom port icon based on congestion
const getPortIcon = (congestionLevel) => {
  const colors = {
    LOW: '#22C55E',
    MEDIUM: '#F59E0B',
    HIGH: '#EF4444',
    CRITICAL: '#DC2626',
  }
  return L.divIcon({
    html: `<div style="width: 20px; height: 20px; border-radius: 50%; background: ${colors[congestionLevel] || '#3B82F6'}; border: 2px solid white; box-shadow: 0 0 8px ${colors[congestionLevel]}40;"></div>`,
    className: '',
    iconSize: [20, 20],
  })
}

// Vessel icon
const vesselIcon = L.divIcon({
  html: '🚢',
  className: 'text-2xl',
  iconSize: [30, 30],
})

export default function SupplyChainMap() {
  const { data: ports, isLoading: portsLoading } = useQuery({
    queryKey: ['ports'],
    queryFn: api.getPorts,
  })
  
  const { data: vessels, isLoading: vesselsLoading } = useQuery({
    queryKey: ['vessels'],
    queryFn: api.getVessels,
  })
  
  if (portsLoading || vesselsLoading) {
    return <div className="w-full h-full bg-bg-secondary rounded-lg animate-pulse" />
  }
  
  return (
    <MapContainer
      center={[20, 80]}
      zoom={3}
      className="w-full h-full rounded-lg"
      style={{ background: '#0F172A' }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; OpenStreetMap'
      />
      
      {/* Port markers */}
      {ports?.map(({ p: port }) => (
        <Marker
          key={port.id}
          position={[port.lat, port.lng]}
          icon={getPortIcon(port.congestion_level)}
        >
          <Popup>
            <div className="text-sm">
              <strong>{port.name}</strong><br />
              Congestion: {port.congestion_level}<br />
              Avg Delay: {port.avg_delay_hours}h<br />
              Utilization: {(port.current_utilization * 100).toFixed(0)}%
            </div>
          </Popup>
        </Marker>
      ))}
      
      {/* Vessel markers */}
      {vessels?.map(({ v: vessel }) => (
        <Marker
          key={vessel.id}
          position={[vessel.current_lat, vessel.current_lng]}
          icon={vesselIcon}
        >
          <Popup>
            <div className="text-sm">
              <strong>{vessel.name}</strong><br />
              Status: {vessel.status}<br />
              Load: {vessel.current_load_teu}/{vessel.capacity_teu} TEU<br />
              Speed: {vessel.speed_knots} knots
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
```

**Setup required**: Copy marker icons to public/:
```bash
cp node_modules/leaflet/dist/images/marker-icon.png public/leaflet/
cp node_modules/leaflet/dist/images/marker-shadow.png public/leaflet/
```

## Component 3: Chat Panel

```jsx
// components/chat/ChatPanel.jsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User } from 'lucide-react'
import { api } from '@/lib/api'
import { ChatMessage } from './ChatMessage'
import { SuggestionChips } from './SuggestionChips'

export function ChatPanel() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const debounceRef = useRef(null)
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  
  useEffect(() => scrollToBottom(), [messages])
  
  const handleSend = async (message = input) => {
    if (!message.trim() || isLoading) return
    
    const userMsg = { role: 'user', content: message }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsLoading(true)
    
    try {
      const result = await api.chat(message)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: result.response,
        tools: result.tools_called,
        cached: result.cached,
      }])
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Failed to get response. Backend may be warming up — try again in a moment.',
        error: true,
      }])
    } finally {
      setIsLoading(false)
    }
  }
  
  const suggestions = [
    "What happens if Port Shanghai is delayed by 6 hours?",
    "What are the highest risk ports?",
    "Suggest reroute options for S001",
    "Give me a supply chain overview",
  ]
  
  return (
    <div className="bg-bg-secondary rounded-lg border border-border flex flex-col h-full">
      <div className="p-3 border-b border-border flex items-center gap-2">
        <Bot className="w-5 h-5 text-info" />
        <h2 className="font-semibold text-sm">AI Decision Agent</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-text-secondary text-sm py-8">
            <p>Ask about your supply chain...</p>
            <SuggestionChips suggestions={suggestions} onSelect={handleSend} />
          </div>
        )}
        
        {messages.map((msg, i) => (
          <ChatMessage key={i} message={msg} />
        ))}
        
        {isLoading && (
          <div className="flex items-center gap-2 text-text-secondary text-sm">
            <div className="animate-pulse">●●●</div>
            Analyzing supply chain...
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Ask about disruptions, reroutes, risks..."
            className="flex-1 bg-bg-card border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-info"
            disabled={isLoading}
          />
          <button
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-info hover:bg-info/80 rounded-lg transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
```

```jsx
// components/chat/ChatMessage.jsx
'use client'

import { Bot, User } from 'lucide-react'

export function ChatMessage({ message }) {
  const isUser = message.role === 'user'
  
  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : ''}`}>
      {!isUser && <Bot className="w-6 h-6 text-info mt-1 flex-shrink-0" />}
      <div className={`max-w-[85%] rounded-lg p-3 text-sm ${
        isUser 
          ? 'bg-info/20 text-text-primary' 
          : message.error
            ? 'bg-danger/20 text-danger'
            : 'bg-bg-card text-text-primary'
      }`}>
        <div className="whitespace-pre-wrap">{message.content}</div>
        {message.tools && message.tools.length > 0 && (
          <div className="mt-2 text-xs text-text-secondary">
            Tools used: {message.tools.join(', ')}
          </div>
        )}
        {message.cached && (
          <div className="mt-1 text-xs text-text-secondary">⚡ Cached response</div>
        )}
      </div>
      {isUser && <User className="w-6 h-6 text-text-secondary mt-1 flex-shrink-0" />}
    </div>
  )
}
```

```jsx
// components/chat/SuggestionChips.jsx
'use client'

export function SuggestionChips({ suggestions, onSelect }) {
  return (
    <div className="flex flex-wrap gap-2 mt-4 justify-center">
      {suggestions.map((s, i) => (
        <button
          key={i}
          onClick={() => onSelect(s)}
          className="px-3 py-1.5 bg-bg-card hover:bg-border rounded-full text-xs text-text-secondary hover:text-text-primary transition-colors"
        >
          {s}
        </button>
      ))}
    </div>
  )
}
```

## Component 4: Simulation Panel

```jsx
// components/simulation/SimulationPanel.jsx
'use client'

import { useState } from 'react'
import { Activity, Play } from 'lucide-react'
import { api } from '@/lib/api'
import { ImpactVisualization } from './ImpactVisualization'

export function SimulationPanel() {
  const [portId, setPortId] = useState('P001')
  const [delayHours, setDelayHours] = useState(6)
  const [result, setResult] = useState(null)
  const [isRunning, setIsRunning] = useState(false)
  
  const ports = [
    { id: 'P001', name: 'Shanghai' },
    { id: 'P002', name: 'Singapore' },
    { id: 'P003', name: 'Los Angeles' },
    { id: 'P004', name: 'Rotterdam' },
    { id: 'P005', name: 'Dubai' },
    { id: 'P006', name: 'Mumbai' },
  ]
  
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
        {/* Controls */}
        <div className="space-y-3">
          <div>
            <label className="text-xs text-text-secondary block mb-1">Port</label>
            <select
              value={portId}
              onChange={e => setPortId(e.target.value)}
              className="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm"
            >
              {ports.map(p => (
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
        
        {/* Results */}
        {result && <ImpactVisualization result={result} />}
      </div>
    </div>
  )
}
```

```jsx
// components/simulation/ImpactVisualization.jsx
'use client'

export function ImpactVisualization({ result }) {
  const priorityColors = {
    CRITICAL: 'text-danger',
    HIGH: 'text-danger',
    MEDIUM: 'text-warning',
    LOW: 'text-success',
  }
  
  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-bg-card rounded-lg p-3">
        <div className="text-xs text-text-secondary">Total Impact</div>
        <div className="text-2xl font-bold text-danger">
          {result.total_impact_hours}h
        </div>
        <div className="text-xs text-text-secondary">
          {result.affected_shipments.length} shipments affected
        </div>
      </div>
      
      {/* Affected Shipments */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-text-secondary uppercase">Affected Shipments</h3>
        {result.affected_shipments.map(s => (
          <div key={s.shipment_id} className="bg-bg-card rounded p-2 flex justify-between items-center">
            <div>
              <span className="font-mono text-sm">{s.shipment_id}</span>
              <span className={`ml-2 text-xs ${priorityColors[s.priority_impact]}`}>
                {s.priority_impact}
              </span>
            </div>
            <span className="text-danger text-sm font-medium">+{s.delay_hours}h</span>
          </div>
        ))}
      </div>
      
      {/* Recommendations */}
      {result.recommendations.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-text-secondary uppercase">Recommendations</h3>
          {result.recommendations.map((rec, i) => (
            <div key={i} className="bg-rerouted/10 border border-rerouted/30 rounded p-2">
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 bg-rerouted/20 text-rerouted rounded">
                  {rec.action}
                </span>
                <span className="text-xs font-mono">{rec.shipment_id}</span>
              </div>
              <p className="text-xs text-text-secondary mt-1">{rec.description}</p>
              {rec.time_saved_hours > 0 && (
                <p className="text-xs text-success mt-1">
                  Saves {rec.time_saved_hours}h • Confidence: {(rec.confidence * 100).toFixed(0)}%
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

## Component 5: Alerts Panel

```jsx
// components/alerts/AlertsPanel.jsx
'use client'

import { useQuery } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { api } from '@/lib/api'
import { AlertCard } from './AlertCard'

export function AlertsPanel() {
  const { data: ports, isLoading } = useQuery({
    queryKey: ['ports'],
    queryFn: api.getPorts,
    refetchInterval: 30000, // Refresh every 30s
  })
  
  // Generate alerts from port congestion data
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
```

```jsx
// components/alerts/AlertCard.jsx
'use client'

const levelStyles = {
  CRITICAL: { bg: 'bg-danger/20', text: 'text-danger', icon: '🔴' },
  HIGH: { bg: 'bg-danger/10', text: 'text-danger', icon: '⚠️' },
  MEDIUM: { bg: 'bg-warning/10', text: 'text-warning', icon: '🟡' },
  LOW: { bg: 'bg-success/10', text: 'text-success', icon: '✓' },
}

export function AlertCard({ alert }) {
  const style = levelStyles[alert.level] || levelStyles.LOW
  
  return (
    <div className={`${style.bg} rounded-lg p-2 flex items-center gap-2`}>
      <span>{style.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium truncate">{alert.name}</div>
        <div className={`text-xs ${style.text}`}>
          {alert.level} • {alert.delay}h avg delay
        </div>
      </div>
    </div>
  )
}
```

## Component 6: Recommendation Panel

```jsx
// components/recommendations/RecommendationPanel.jsx
'use client'

import { Lightbulb } from 'lucide-react'
import { ActionCard } from './ActionCard'

export function RecommendationPanel() {
  // In a full implementation, recommendations come from the latest simulation
  // For now, this is populated when a simulation is run
  
  return (
    <div className="bg-bg-secondary rounded-lg border border-border">
      <div className="p-3 border-b border-border flex items-center gap-2">
        <Lightbulb className="w-5 h-5 text-rerouted" />
        <h2 className="font-semibold text-sm">Actions</h2>
      </div>
      <div className="p-2 space-y-2 max-h-60 overflow-y-auto">
        <p className="text-xs text-text-secondary text-center py-4">
          Run a simulation to see recommendations
        </p>
      </div>
    </div>
  )
}
```

## Custom Hooks

```jsx
// hooks/useGraph.js
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function usePorts() {
  return useQuery({ queryKey: ['ports'], queryFn: api.getPorts })
}

export function useVessels() {
  return useQuery({ queryKey: ['vessels'], queryFn: api.getVessels })
}

export function useShipments() {
  return useQuery({ queryKey: ['shipments'], queryFn: api.getShipments })
}

export function useOverview() {
  return useQuery({ queryKey: ['overview'], queryFn: api.getOverview })
}
```

## Checklist
- [ ] Dashboard page with grid layout
- [ ] Header with Reset Demo button
- [ ] SupplyChainMap with dynamic import (ssr: false)
- [ ] Leaflet CSS imported
- [ ] Leaflet marker icons in public/leaflet/
- [ ] Port markers colored by congestion
- [ ] Vessel markers positioned on map
- [ ] ChatPanel with message history and suggestions
- [ ] ChatMessage with user/assistant styling
- [ ] SuggestionChips for quick queries
- [ ] SimulationPanel with port/delay controls
- [ ] ImpactVisualization showing affected shipments
- [ ] AlertsPanel with sorted alerts from port data
- [ ] AlertCard with congestion level styling
- [ ] RecommendationPanel skeleton
- [ ] Custom hooks (usePorts, useVessels, useShipments)
- [ ] All 'use client' directives in place
- [ ] Loading states for all data-fetching components
- [ ] Error handling for API failures

## Common Pitfalls
1. ⚠️ Leaflet MUST use dynamic import with ssr: false (Issue #15)
2. ⚠️ Must import leaflet/dist/leaflet.css (Issue #7)
3. ⚠️ Copy marker icons to public/leaflet/ directory
4. ⚠️ All interactive components need 'use client' directive
5. ⚠️ Handle Render cold start (60+ second loading) with loading states (Issue #11)
6. ⚠️ LA port at -118.27 (negative), not 118.27 (Issue #8)
