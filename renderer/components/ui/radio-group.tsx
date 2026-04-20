import * as React from 'react'
import { Circle } from 'lucide-react'
import { cn } from '../../lib/utils'

type RadioGroupContextValue = {
  value: string
  onValueChange: (value: string) => void
  name: string
}

const RadioGroupContext = React.createContext<RadioGroupContextValue | null>(
  null
)

export interface RadioGroupProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value: string
  onValueChange: (value: string) => void
  name?: string
}

export const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className, value, onValueChange, name, ...props }, ref) => {
    const generatedId = React.useId()
    const groupName = name ?? generatedId
    return (
      <RadioGroupContext.Provider
        value={{ value, onValueChange, name: groupName }}
      >
        <div
          ref={ref}
          role="radiogroup"
          className={cn('grid gap-2', className)}
          {...props}
        />
      </RadioGroupContext.Provider>
    )
  }
)
RadioGroup.displayName = 'RadioGroup'

export interface RadioGroupItemProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'value'> {
  value: string
}

export const RadioGroupItem = React.forwardRef<
  HTMLButtonElement,
  RadioGroupItemProps
>(({ className, value, disabled, ...props }, ref) => {
  const ctx = React.useContext(RadioGroupContext)
  if (!ctx) throw new Error('RadioGroupItem must be used within RadioGroup')
  const checked = ctx.value === value
  return (
    <button
      ref={ref}
      type="button"
      role="radio"
      aria-checked={checked}
      data-state={checked ? 'checked' : 'unchecked'}
      disabled={disabled}
      onClick={() => ctx.onValueChange(value)}
      className={cn(
        'aspect-square h-4 w-4 rounded-full border border-primary text-primary',
        'ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'flex items-center justify-center',
        className
      )}
      {...props}
    >
      {checked && <Circle className="h-2.5 w-2.5 fill-current text-current" />}
    </button>
  )
})
RadioGroupItem.displayName = 'RadioGroupItem'
