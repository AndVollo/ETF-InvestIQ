import type { HTMLAttributes, ReactNode } from 'react'

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'muted'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  dot?: boolean
  children: ReactNode
}

export function Badge({ variant = 'muted', dot = true, className = '', children, ...rest }: BadgeProps) {
  const cls = ['badge', `badge--${variant}`, className].filter(Boolean).join(' ')
  return (
    <span className={cls} {...rest}>
      {dot && <span className="badge__dot" />}
      {children}
    </span>
  )
}
