import type { ReactNode } from 'react'

interface SegProps<T extends string | number> {
  value: T
  onChange: (v: T) => void
  options: ReadonlyArray<{ value: T; label: ReactNode }>
  fullWidth?: boolean
  ariaLabel?: string
}

export function Seg<T extends string | number>({
  value,
  onChange,
  options,
  fullWidth,
  ariaLabel,
}: SegProps<T>) {
  return (
    <div className={`seg${fullWidth ? ' seg--full' : ''}`} role="tablist" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="tab"
          className="seg__opt"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
