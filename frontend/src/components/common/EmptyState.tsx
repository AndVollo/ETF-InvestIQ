import type { ReactNode } from 'react'

interface EmptyStateProps {
  title?: ReactNode
  message: ReactNode
  action?: ReactNode
}

export function EmptyState({ title, message, action }: EmptyStateProps) {
  return (
    <div className="empty">
      {title ? <div className="empty__title">{title}</div> : null}
      <div className="empty__body">{message}</div>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  )
}
