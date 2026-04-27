import type { ReactNode } from 'react'

type BadgeColor = 'green' | 'yellow' | 'red' | 'blue' | 'gray'

interface BadgeProps {
  color?: BadgeColor
  children: ReactNode
  className?: string
}

const colorClass: Record<BadgeColor, string> = {
  green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  gray: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
}

export function Badge({ color = 'gray', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass[color]} ${className}`}
    >
      {children}
    </span>
  )
}
