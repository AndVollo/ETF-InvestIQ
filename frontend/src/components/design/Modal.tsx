import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { Icon } from './Icon'

interface ModalProps {
  open: boolean
  title?: ReactNode
  onClose: () => void
  footer?: ReactNode
  children: ReactNode
  width?: string | number
  minHeight?: string | number
}

export function Modal({ open, title, onClose, footer, children, width, minHeight }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  
  const modalStyle: any = {}
  if (width) modalStyle.width = typeof width === 'number' ? `${width}px` : width
  if (minHeight) modalStyle.minHeight = typeof minHeight === 'number' ? `${minHeight}px` : minHeight
  if (width || minHeight) modalStyle.maxWidth = '100%'

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal" style={modalStyle} onClick={(e) => e.stopPropagation()}>
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
