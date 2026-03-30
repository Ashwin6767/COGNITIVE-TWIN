'use client'

/**
 * Skeleton - Loading skeleton placeholder with a pulsing animation.
 * @param {Object} props
 * @param {string} [props.className] - Additional CSS classes.
 */
export function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse bg-bg-card rounded ${className}`} />
  )
}

/**
 * MapSkeleton - Loading placeholder shown while the map data is being fetched.
 */
export function MapSkeleton() {
  return (
    <div className="w-full h-full bg-bg-secondary rounded-lg flex items-center justify-center">
      <p className="text-text-secondary">Loading map...</p>
    </div>
  )
}
