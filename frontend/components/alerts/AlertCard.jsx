'use client'

import { ALERT_LEVEL_STYLES } from '@/lib/constants'

const levelStyles = {
  CRITICAL: { bg: 'bg-danger/20', text: 'text-danger', icon: ALERT_LEVEL_STYLES.CRITICAL.icon },
  HIGH: { bg: 'bg-danger/10', text: 'text-danger', icon: ALERT_LEVEL_STYLES.HIGH.icon },
  MEDIUM: { bg: 'bg-warning/10', text: 'text-warning', icon: ALERT_LEVEL_STYLES.MEDIUM.icon },
  LOW: { bg: 'bg-success/10', text: 'text-success', icon: ALERT_LEVEL_STYLES.LOW.icon },
}

/**
 * AlertCard - Displays a single alert card with severity level indicator.
 * @param {Object} props
 * @param {Object} props.alert - Alert object with id, name, level, delay, and utilization.
 */
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
