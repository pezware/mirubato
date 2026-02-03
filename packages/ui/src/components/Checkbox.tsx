import { type InputHTMLAttributes, type Ref, useId } from 'react'
import { cn } from '../utils/cn'

export interface CheckboxProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    'type' | 'onChange' | 'size'
  > {
  /** Whether the checkbox is checked */
  checked: boolean
  /** Callback when the checkbox state changes */
  onChange: (checked: boolean) => void
  /** Label text or element to display next to the checkbox */
  label?: React.ReactNode
  /** Additional description text below the label */
  description?: string
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
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

function Checkbox({
  checked,
  onChange,
  label,
  description,
  size = 'md',
  disabled,
  className,
  id: providedId,
  ref,
  ...props
}: CheckboxProps) {
  const generatedId = useId()
  const id = providedId || generatedId

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.checked)
  }

  const checkbox = (
    <input
      ref={ref}
      type="checkbox"
      id={id}
      checked={checked}
      onChange={handleChange}
      disabled={disabled}
      className={cn(
        sizeClasses[size],
        'rounded border-gray-300',
        'text-morandi-sage-600',
        'focus:ring-morandi-sage-500 focus:ring-2 focus:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'transition-colors duration-200',
        className
      )}
      {...props}
    />
  )

  if (!label && !description) {
    return checkbox
  }

  return (
    <div className="flex items-start gap-2">
      <div className="flex h-5 items-center">{checkbox}</div>
      <div className="flex flex-col">
        {label && (
          <label
            htmlFor={id}
            className={cn(
              labelSizeClasses[size],
              'font-medium text-gray-700 dark:text-gray-300',
              disabled && 'opacity-50 cursor-not-allowed',
              !disabled && 'cursor-pointer'
            )}
          >
            {label}
          </label>
        )}
        {description && (
          <span
            className={cn(
              'text-xs text-gray-500 dark:text-gray-400',
              disabled && 'opacity-50'
            )}
          >
            {description}
          </span>
        )}
      </div>
    </div>
  )
}

export default Checkbox
