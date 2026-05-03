import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'

interface FieldProps {
  label?: ReactNode
  hint?: ReactNode
  children: ReactNode
  className?: string
}

export function Field({ label, hint, children, className = '' }: FieldProps) {
  return (
    <div className={`form-field ${className}`}>
      {label ? <label className="form-field__label">{label}</label> : null}
      {children}
      {hint ? <span className="form-field__hint">{hint}</span> : null}
    </div>
  )
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  large?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { large, className = '', ...rest },
  ref,
) {
  return <input ref={ref} className={`input ${large ? 'input--lg' : ''} ${className}`} {...rest} />
})

interface InputGroupProps {
  prefix?: ReactNode
  suffix?: ReactNode
  children: ReactNode
}

export function InputGroup({ prefix, suffix, children }: InputGroupProps) {
  return (
    <div className="input-group">
      {prefix ? <span className="input-group__prefix">{prefix}</span> : null}
      {children}
      {suffix ? <span className="input-group__suffix">{suffix}</span> : null}
    </div>
  )
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className = '', children, ...rest },
  ref,
) {
  return <select ref={ref} className={`input ${className}`} {...rest}>{children}</select>
})

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className = '', ...rest },
  ref,
) {
  return <textarea ref={ref} className={`input ${className}`} {...rest} />
})
