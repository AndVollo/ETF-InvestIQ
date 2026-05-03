import { Toast as DesignToast } from '@/components/design'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastProps {
  message: string
  type?: ToastType
  onClose: () => void
  duration?: number
}

export function Toast({ message, type = 'success', onClose, duration = 4000 }: ToastProps) {
  const t = type === 'warning' ? 'info' : type
  return <DesignToast message={message} type={t} onClose={onClose} duration={duration} />
}
