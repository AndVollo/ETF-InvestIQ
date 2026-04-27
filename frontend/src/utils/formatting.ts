export function formatCurrency(
  amount: number,
  currency: 'USD' | 'ILS' = 'USD',
  locale = 'he-IL',
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatPercent(value: number, fractionDigits = 1): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(fractionDigits)}%`
}

export function formatDate(iso: string, locale = 'he-IL'): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(iso))
}

export function formatNumber(value: number, fractionDigits = 2): string {
  return value.toFixed(fractionDigits)
}
