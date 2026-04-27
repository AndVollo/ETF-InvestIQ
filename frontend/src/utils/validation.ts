export function isPositiveNumber(value: unknown): boolean {
  return typeof value === 'number' && isFinite(value) && value > 0
}

export function isValidTicker(ticker: string): boolean {
  return /^[A-Z]{1,6}$/.test(ticker.trim().toUpperCase())
}

export function allocationSumsTo100(allocation: Record<string, number>, tolerance = 0.01): boolean {
  const total = Object.values(allocation).reduce((s, v) => s + v, 0)
  return Math.abs(total - 100) <= tolerance
}

export function isValidDate(dateStr: string): boolean {
  const d = new Date(dateStr)
  return !isNaN(d.getTime())
}

export function isFutureDate(dateStr: string): boolean {
  return isValidDate(dateStr) && new Date(dateStr) > new Date()
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
