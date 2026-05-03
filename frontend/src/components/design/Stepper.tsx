import { Fragment } from 'react'
import { Icon } from './Icon'

interface StepperProps {
  steps: ReadonlyArray<{ label: string }>
  current: number
}

export function Stepper({ steps, current }: StepperProps) {
  return (
    <div className="stepper">
      {steps.map((s, i) => {
        const status = current === i ? 'active' : current > i ? 'done' : 'pending'
        const cls = ['step', status === 'active' ? 'step--active' : '', status === 'done' ? 'step--done' : ''].filter(Boolean).join(' ')
        return (
          <Fragment key={i}>
            <div className={cls}>
              <div className="step__num">{status === 'done' ? <Icon name="check" size={11} /> : i + 1}</div>
              <span>{s.label}</span>
            </div>
            {i < steps.length - 1 ? <div className="step__sep" /> : null}
          </Fragment>
        )
      })}
    </div>
  )
}
