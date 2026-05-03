import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { Icon } from './Icon'

interface ModalProps {
  open: boolean
  title?: ReactNode
  onClose: () => void
  footer?: ReactNode
  children: ReactNode
}

export function Modal({ open, title, onClose, footer, children }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {title ? (
          <div className="modal__header">
            <div className="modal__title">{title}</div>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
              <Icon name="x" size={14} />
            </button>
          </div>
        ) : null}
        <div className="modal__body">{children}</div>
        {footer ? <div className="modal__footer">{footer}</div> : null}
      </div>
    </div>
  )
}
