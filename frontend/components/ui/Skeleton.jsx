'use client'

export function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse bg-bg-card rounded ${className}`} />
  )
}

export function MapSkeleton() {
  return (
    <div className="w-full h-full bg-bg-secondary rounded-lg flex items-center justify-center">
      <p className="text-text-secondary">Loading map...</p>
    </div>
  )
}
