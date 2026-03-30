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
