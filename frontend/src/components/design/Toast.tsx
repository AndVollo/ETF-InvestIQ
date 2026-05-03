import { useEffect } from 'react'

interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'info'
  onClose: () => void
  duration?: number
}

export function Toast({ message, type = 'info', onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    const id = window.setTimeout(onClose, duration)
    return () => window.clearTimeout(id)
  }, [onClose, duration])

  const cls = ['toast', type === 'success' ? 'toast--success' : '', type === 'error' ? 'toast--error' : ''].filter(Boolean).join(' ')
  return (
    <div className="toast-stack">
      <div className={cls} role="status">{message}</div>
    </div>
  )
}
