'use client'

export function ErrorCard({ message, onRetry }) {
  return (
    <div className="bg-red-900/20 border border-danger rounded-lg p-4">
      <p className="text-danger font-medium">⚠️ {message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-2 text-sm text-info hover:underline">
          Try again
        </button>
      )}
    </div>
  )
}
