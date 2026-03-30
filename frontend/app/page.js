'use client'

import dynamic from 'next/dynamic'
import { Header } from '@/components/layout/Header'
import { AlertsPanel } from '@/components/alerts/AlertsPanel'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { SimulationPanel } from '@/components/simulation/SimulationPanel'
import { RecommendationPanel } from '@/components/recommendations/RecommendationPanel'

const SupplyChainMap = dynamic(
  () => import('@/components/map/SupplyChainMap'),
  { ssr: false, loading: () => <div className="w-full h-full bg-bg-secondary animate-pulse rounded-lg" /> }
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
