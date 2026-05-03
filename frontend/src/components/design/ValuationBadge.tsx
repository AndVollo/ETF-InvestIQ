import { useTranslation } from 'react-i18next'
import { Badge, type BadgeVariant } from './Badge'

export type ValuationClass = 'CHEAP' | 'FAIR' | 'EXPENSIVE' | 'INSUFFICIENT_HISTORY'

interface ValuationBadgeProps {
  classification: ValuationClass | string | null | undefined
}

const MAP: Record<string, { variant: BadgeVariant; key: string }> = {
  CHEAP:                { variant: 'success', key: 'valuation.cheap' },
  FAIR:                 { variant: 'muted',   key: 'valuation.fair' },
  EXPENSIVE:            { variant: 'warning', key: 'valuation.expensive' },
  INSUFFICIENT_HISTORY: { variant: 'info',    key: 'valuation.insufficient_history' },
}

export function ValuationBadge({ classification }: ValuationBadgeProps) {
  const { t } = useTranslation()
  const cfg = MAP[classification ?? 'FAIR'] ?? MAP.FAIR
  return <Badge variant={cfg.variant}>{t(cfg.key as Parameters<typeof t>[0])}</Badge>
}
