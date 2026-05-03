import type { ReactNode } from 'react'
import { Badge as DesignBadge, type BadgeVariant } from '@/components/design/Badge'

type BadgeColor = 'green' | 'yellow' | 'red' | 'blue' | 'gray'

interface BadgeProps {
  color?: BadgeColor
  children: ReactNode
  className?: string
}

const COLOR_MAP: Record<BadgeColor, BadgeVariant> = {
  green: 'success',
  yellow: 'warning',
  red: 'danger',
  blue: 'info',
  gray: 'muted',
}

export function Badge({ color = 'gray', children, className = '' }: BadgeProps) {
  return (
    <DesignBadge variant={COLOR_MAP[color]} className={className}>
      {children}
    </DesignBadge>
  )
}
