'use client'

import { Lightbulb } from 'lucide-react'

export function RecommendationPanel() {
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
