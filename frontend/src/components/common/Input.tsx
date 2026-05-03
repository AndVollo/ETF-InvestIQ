import { type InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, id, className = '', ...props },
  ref,
) {
  return (
    <div className="form-field">
      {label && <label htmlFor={id} className="form-field__label">{label}</label>}
      <input
        ref={ref}
        id={id}
        className={`input ${error ? 'input--error' : ''} ${className}`}
        {...props}
      />
      {error && <span className="form-field__hint" style={{ color: 'var(--danger)' }}>{error}</span>}
    </div>
  )
})
