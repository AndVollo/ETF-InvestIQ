interface SpinnerProps {
  size?: 'sm' | 'lg'
  className?: string
  label?: string
}

export function Spinner({ size = 'sm', className = '', label }: SpinnerProps) {
  if (label) {
    return (
      <div className={`flex-row gap-2 ${className}`}>
        <span className={`spinner${size === 'lg' ? ' spinner--lg' : ''}`} />
        <span className="text-muted" style={{ fontSize: 13 }}>{label}</span>
      </div>
    )
  }
  return <span className={`spinner${size === 'lg' ? ' spinner--lg' : ''} ${className}`} />
}
