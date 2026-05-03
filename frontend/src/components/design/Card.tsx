import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevated?: boolean
  interactive?: boolean
}

export function Card({ elevated, interactive, className = '', children, ...rest }: CardProps) {
  const cls = [
    'card',
    elevated ? 'card--elevated' : '',
    interactive ? 'card--interactive' : '',
    className,
  ].filter(Boolean).join(' ')
  return <div className={cls} {...rest}>{children}</div>
}

interface CardHeaderProps {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
}

Card.Header = function CardHeader({ title, subtitle, actions }: CardHeaderProps) {
  return (
    <div className="card__header">
      <div>
        <div className="card__title">{title}</div>
        {subtitle ? <div className="card__subtitle">{subtitle}</div> : null}
      </div>
      {actions ? <div className="flex-row gap-2">{actions}</div> : null}
    </div>
  )
}

Card.Body = function CardBody({
  children,
  flush,
  className = '',
}: { children: ReactNode; flush?: boolean; className?: string }) {
  const cls = ['card__body', flush ? 'card__body--flush' : '', className].filter(Boolean).join(' ')
  return <div className={cls}>{children}</div>
}
