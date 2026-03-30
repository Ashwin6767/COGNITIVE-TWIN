'use client'

import { useState } from 'react'
import { Brain, RefreshCw } from 'lucide-react'
import { api } from '@/lib/api'

/**
 * Header - Top navigation bar with logo, live-status indicator, and reset button.
 */
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
