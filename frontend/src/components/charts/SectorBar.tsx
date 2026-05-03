import { useTranslation } from 'react-i18next'
import type { SectorExposureItem, CapWarning } from '@/types/api'

interface SectorBarProps {
  exposures: SectorExposureItem[]
  warnings: CapWarning[]
  compact?: boolean
}

const SOFT_CAP = 30
const HARD_CAP = 35

export function SectorBar({ exposures, warnings, compact = false }: SectorBarProps) {
  const { t } = useTranslation()
  const warned = new Set(warnings.map((w) => w.cap_type))
  const list = compact ? exposures.slice(0, 6) : exposures
  const hard = HARD_CAP

  return (
    <div>
      {list.map((s) => {
        const isWarn = warned.has(s.sector)
        const fillPct = Math.min((s.pct / hard) * 100, 100)
        const cls = isWarn || s.pct > hard
          ? 'sector-track__bar sector-track__bar--danger'
          : s.pct > SOFT_CAP
          ? 'sector-track__bar sector-track__bar--warn'
          : 'sector-track__bar'
        return (
          <div key={s.sector} className="sector-row">
            <div className="sector-row__name">{s.sector}</div>
            <div className="sector-track">
              <div className={cls} style={{ width: `${fillPct}%` }} />
              <div className="sector-track__cap" style={{ insetInlineStart: `${(SOFT_CAP / hard) * 100}%` }} />
              <div className="sector-track__cap sector-track__cap--hard" style={{ insetInlineEnd: 0 }} />
            </div>
            <div className="sector-row__pct">
              {s.pct.toFixed(1)}%
              {s.data_estimated ? <span className="text-muted"> · {t('sectors.data_estimated')}</span> : null}
            </div>
            <div className="sector-row__cap">{t('sectors.cap')} {hard}%</div>
          </div>
        )
      })}
    </div>
  )
}
