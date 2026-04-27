interface ProgressBarProps {
  value: number
  max?: number
  className?: string
  showLabel?: boolean
  color?: 'primary' | 'success' | 'warning' | 'danger'
}

const colorClass = {
  primary: 'bg-primary-600',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
}

export function ProgressBar({
  value,
  max = 100,
  className = '',
  showLabel = false,
  color = 'primary',
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  const barColor = pct >= 100 ? colorClass.success : pct >= 75 ? colorClass.primary : pct >= 40 ? colorClass.warning : colorClass.danger

  return (
    <div className={`w-full ${className}`}>
      <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${colorClass[color] !== colorClass.primary ? colorClass[color] : barColor}`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
      {showLabel && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-end">{pct.toFixed(0)}%</p>
      )}
    </div>
  )
}
