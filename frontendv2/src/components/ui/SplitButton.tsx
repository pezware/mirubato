import { cn } from '../../utils/cn'

export interface Option<T extends string = string> {
  value: T
  label: string
  icon?: React.ReactNode
}

interface SplitButtonProps<T extends string = string> {
  options: Option<T>[]
  value: T | undefined
  onChange: (value: T) => void
  orientation?: 'horizontal' | 'vertical'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  allowDeselect?: boolean
}

export default function SplitButton<T extends string = string>({
  options,
  value,
  onChange,
  orientation = 'horizontal',
  size = 'md',
  className,
  allowDeselect = false,
}: SplitButtonProps<T>) {
  const baseStyles =
    'border border-morandi-stone-300 bg-white text-morandi-stone-600 font-medium transition-all duration-200 cursor-pointer'

  const activeStyles =
    'bg-morandi-sage-500 text-white border-morandi-sage-500 shadow-sm'

  const hoverStyles = 'hover:bg-morandi-stone-100'

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  }

  const containerStyles = cn(
    'inline-flex',
    orientation === 'horizontal' ? 'flex-row' : 'flex-col',
    orientation === 'horizontal' ? 'gap-px' : 'gap-px',
    className
  )

  const getButtonStyles = (index: number, isActive: boolean) => {
    const isFirst = index === 0
    const isLast = index === options.length - 1

    let borderRadius = ''
    if (orientation === 'horizontal') {
      if (isFirst) borderRadius = 'rounded-l-lg'
      if (isLast) borderRadius = 'rounded-r-lg'
      if (options.length === 1) borderRadius = 'rounded-lg'
    } else {
      if (isFirst) borderRadius = 'rounded-t-lg'
      if (isLast) borderRadius = 'rounded-b-lg'
      if (options.length === 1) borderRadius = 'rounded-lg'
    }

    return cn(
      baseStyles,
      sizes[size],
      isActive ? activeStyles : hoverStyles,
      borderRadius,
      orientation === 'horizontal' && !isLast && 'border-r-0',
      orientation === 'vertical' && !isLast && 'border-b-0'
    )
  }

  return (
    <div className={containerStyles}>
      {options.map((option, index) => (
        <button
          key={option.value}
          type="button"
          onClick={() => {
            if (allowDeselect && value === option.value) {
              onChange(undefined as any)
            } else {
              onChange(option.value)
            }
          }}
          className={getButtonStyles(index, value === option.value)}
        >
          <span className="flex items-center justify-center gap-2">
            {option.icon && <span>{option.icon}</span>}
            {option.label}
          </span>
        </button>
      ))}
    </div>
  )
}
