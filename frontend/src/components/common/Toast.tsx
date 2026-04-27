import { useEffect } from 'react'

type ToastType = 'success' | 'error' | 'warning'

interface ToastProps {
  message: string
  type?: ToastType
  onClose: () => void
  duration?: number
}

const typeClass: Record<ToastType, string> = {
  success: 'bg-success text-white',
  error: 'bg-danger text-white',
  warning: 'bg-warning text-gray-900',
}

export function Toast({ message, type = 'success', onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, duration)
    return () => clearTimeout(t)
  }, [onClose, duration])

  return (
    <div
      className={`fixed bottom-6 start-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-lg shadow-lg text-sm font-medium ${typeClass[type]}`}
      role="alert"
    >
      {message}
    </div>
  )
}
