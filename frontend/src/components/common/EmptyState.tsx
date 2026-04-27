import type { ReactNode } from 'react'

interface EmptyStateProps {
  message: string
  action?: ReactNode
}

export function EmptyState({ message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center text-gray-500 dark:text-gray-400">
      <p className="text-base">{message}</p>
      {action}
    </div>
  )
}
