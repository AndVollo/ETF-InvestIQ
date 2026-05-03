interface ProgressBarProps {
  value: number
  max?: number
  className?: string
  showLabel?: boolean
  color?: 'primary' | 'success' | 'warning' | 'danger'
}

const COLOR_VAR = {
  primary: 'var(--accent)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
}

export function ProgressBar({
  value,
  max = 100,
  className = '',
  showLabel = false,
  color = 'primary',
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className={className}>
      <div
        style={{
          height: 4,
          background: 'var(--bg-elevated)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <div
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
          style={{
            height: '100%',
            width: `${pct}%`,
            background: COLOR_VAR[color],
            transition: 'width 180ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </div>
      {showLabel && (
        <p className="tnum" style={{ marginTop: 4, fontSize: 11, color: 'var(--text-muted)', textAlign: 'end' }}>
          {pct.toFixed(0)}%
        </p>
      )}
    </div>
  )
}
