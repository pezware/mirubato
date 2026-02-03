import { createContext, useContext, useId, type Ref } from 'react'
import { cn } from '../utils/cn'

// Context to share RadioGroup state with Radio children
interface RadioGroupContextValue {
  name: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  size: 'sm' | 'md' | 'lg'
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null)

function useRadioGroup() {
  const context = useContext(RadioGroupContext)
  if (!context) {
    throw new Error('Radio must be used within a RadioGroup')
  }
  return context
}

// RadioGroup Props
export interface RadioGroupProps {
  /** Currently selected value */
  value: string
  /** Callback when selection changes */
  onChange: (value: string) => void
  /** Group name for form submission */
  name?: string
  /** Radio children */
  children: React.ReactNode
  /** Whether all radios are disabled */
  disabled?: boolean
  /** Size variant for all radios */
  size?: 'sm' | 'md' | 'lg'
  /** Layout direction */
  orientation?: 'horizontal' | 'vertical'
  /** Label for the group */
  label?: string
  /** Additional CSS classes */
  className?: string
}

export function RadioGroup({
  value,
  onChange,
  name: providedName,
  children,
  disabled,
  size = 'md',
  orientation = 'vertical',
  label,
  className,
}: RadioGroupProps) {
  const generatedName = useId()
  const name = providedName || generatedName

  return (
    <RadioGroupContext value={{ name, value, onChange, disabled, size }}>
      <div
        role="radiogroup"
        aria-label={label}
        className={cn(
          'flex',
          orientation === 'vertical' ? 'flex-col gap-2' : 'flex-row gap-4',
          className
        )}
      >
        {label && (
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {label}
          </span>
        )}
        {children}
      </div>
    </RadioGroupContext>
  )
}

// Radio Props
export interface RadioProps {
  /** Value for this radio option */
  value: string
  /** Label text or element */
  label: React.ReactNode
  /** Description text below the label */
  description?: string
  /** Whether this specific radio is disabled */
  disabled?: boolean
  /** Additional CSS classes */
  className?: string
  ref?: Ref<HTMLInputElement>
}

const sizeClasses = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
}

const labelSizeClasses = {
  sm: 'text-sm',
  md: 'text-sm',
  lg: 'text-base',
}

export function Radio({
  value,
  label,
  description,
  disabled: radioDisabled,
  className,
  ref,
}: RadioProps) {
  const {
    name,
    value: selectedValue,
    onChange,
    disabled: groupDisabled,
    size,
  } = useRadioGroup()
  const id = useId()

  const isDisabled = radioDisabled || groupDisabled
  const isChecked = selectedValue === value

  const handleChange = () => {
    if (!isDisabled) {
      onChange(value)
    }
  }

  return (
    <label
      htmlFor={id}
      className={cn(
        'flex items-start gap-2',
        isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        className
      )}
    >
      <div className="flex h-5 items-center">
        <input
          ref={ref}
          type="radio"
          id={id}
          name={name}
          value={value}
          checked={isChecked}
          onChange={handleChange}
          disabled={isDisabled}
          className={cn(
            sizeClasses[size],
            'border-gray-300',
            'text-morandi-sage-600',
            'focus:ring-morandi-sage-500 focus:ring-2 focus:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors duration-200'
          )}
        />
      </div>
      <div className="flex flex-col">
        <span
          className={cn(
            labelSizeClasses[size],
            'font-medium text-gray-700 dark:text-gray-300'
          )}
        >
          {label}
        </span>
        {description && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {description}
          </span>
        )}
      </div>
    </label>
  )
}
