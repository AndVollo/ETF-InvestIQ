interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const cls = ['spinner', size === 'lg' || size === 'md' ? 'spinner--lg' : '', className]
    .filter(Boolean)
    .join(' ')
  return (
    <div className="center-fill">
      <span className={cls} />
    </div>
  )
}
