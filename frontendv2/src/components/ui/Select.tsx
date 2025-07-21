import { Fragment } from 'react'
import { Listbox, Transition } from '@headlessui/react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '../../utils/cn'

export interface SelectOption {
  value: string | number
  label: string
  disabled?: boolean
}

interface SelectProps {
  value: string | number | undefined
  onChange: (value: string | number) => void
  options: SelectOption[]
  label?: string
  placeholder?: string
  error?: string
  helperText?: string
  disabled?: boolean
  fullWidth?: boolean
  className?: string
}

export function Select({
  value,
  onChange,
  options,
  label,
  placeholder,
  error,
  helperText,
  disabled = false,
  fullWidth = false,
  className,
}: SelectProps) {
  const selectedOption = options.find(option => option.value === value)
  const hasError = Boolean(error)

  return (
    <div className={cn('space-y-1', fullWidth && 'w-full', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <Listbox value={value} onChange={onChange} disabled={disabled}>
        <div className="relative">
          <Listbox.Button
            className={cn(
              'relative w-full cursor-default rounded-md border bg-white dark:bg-gray-800',
              'py-2 pl-3 pr-10 text-left shadow-sm',
              'focus:outline-none focus:ring-2 focus:ring-offset-2',
              'transition-colors duration-200',
              hasError
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 dark:border-gray-600 focus:border-morandi-sage-500 focus:ring-morandi-sage-500',
              disabled && 'cursor-not-allowed opacity-50'
            )}
          >
            <span
              className={cn(
                'block truncate',
                !selectedOption && 'text-gray-400 dark:text-gray-500'
              )}
            >
              {selectedOption?.label || placeholder}
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronDown
                className="h-5 w-5 text-gray-400"
                aria-hidden="true"
              />
            </span>
          </Listbox.Button>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-gray-800 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
              {options.map(option => (
                <Listbox.Option
                  key={option.value}
                  className={({ active }: { active: boolean }) =>
                    cn(
                      'relative cursor-default select-none py-2 pl-10 pr-4',
                      active
                        ? 'bg-morandi-sage-100 dark:bg-morandi-sage-900'
                        : '',
                      option.disabled && 'cursor-not-allowed opacity-50'
                    )
                  }
                  value={option.value}
                  disabled={option.disabled}
                >
                  {({
                    selected,
                    active,
                  }: {
                    selected: boolean
                    active: boolean
                  }) => (
                    <>
                      <span
                        className={cn(
                          'block truncate',
                          selected ? 'font-medium' : 'font-normal'
                        )}
                      >
                        {option.label}
                      </span>
                      {selected && (
                        <span
                          className={cn(
                            'absolute inset-y-0 left-0 flex items-center pl-3',
                            active
                              ? 'text-morandi-sage-600'
                              : 'text-morandi-sage-600'
                          )}
                        >
                          <Check className="h-5 w-5" aria-hidden="true" />
                        </span>
                      )}
                    </>
                  )}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {helperText && !error && (
        <p className="text-sm text-gray-500 dark:text-gray-400">{helperText}</p>
      )}
    </div>
  )
}

interface MultiSelectProps extends Omit<SelectProps, 'value' | 'onChange'> {
  value: (string | number)[]
  onChange: (value: (string | number)[]) => void
}

export function MultiSelect({
  value,
  onChange,
  options,
  label,
  placeholder,
  error,
  helperText,
  disabled = false,
  fullWidth = false,
  className,
}: MultiSelectProps) {
  const hasError = Boolean(error)
  const selectedOptions = options.filter(option => value.includes(option.value))

  const handleToggle = (optionValue: string | number) => {
    if (value.includes(optionValue)) {
      onChange(value.filter(v => v !== optionValue))
    } else {
      onChange([...value, optionValue])
    }
  }

  return (
    <div className={cn('space-y-1', fullWidth && 'w-full', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <Listbox value={value} onChange={() => {}} disabled={disabled} multiple>
        <div className="relative">
          <Listbox.Button
            className={cn(
              'relative w-full cursor-default rounded-md border bg-white dark:bg-gray-800',
              'py-2 pl-3 pr-10 text-left shadow-sm',
              'focus:outline-none focus:ring-2 focus:ring-offset-2',
              'transition-colors duration-200',
              hasError
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 dark:border-gray-600 focus:border-morandi-sage-500 focus:ring-morandi-sage-500',
              disabled && 'cursor-not-allowed opacity-50'
            )}
          >
            <span
              className={cn(
                'block truncate',
                selectedOptions.length === 0 &&
                  'text-gray-400 dark:text-gray-500'
              )}
            >
              {selectedOptions.length > 0
                ? `${selectedOptions.length} selected`
                : placeholder}
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronDown
                className="h-5 w-5 text-gray-400"
                aria-hidden="true"
              />
            </span>
          </Listbox.Button>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-gray-800 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
              {options.map(option => (
                <Listbox.Option
                  key={option.value}
                  className={({ active }: { active: boolean }) =>
                    cn(
                      'relative cursor-default select-none py-2 pl-10 pr-4',
                      active
                        ? 'bg-morandi-sage-100 dark:bg-morandi-sage-900'
                        : '',
                      option.disabled && 'cursor-not-allowed opacity-50'
                    )
                  }
                  value={option.value}
                  disabled={option.disabled}
                  onClick={() => !option.disabled && handleToggle(option.value)}
                >
                  {() => {
                    const isSelected = value.includes(option.value)
                    return (
                      <>
                        <span
                          className={cn(
                            'block truncate',
                            isSelected ? 'font-medium' : 'font-normal'
                          )}
                        >
                          {option.label}
                        </span>
                        {isSelected && (
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-morandi-sage-600">
                            <Check className="h-5 w-5" aria-hidden="true" />
                          </span>
                        )}
                      </>
                    )
                  }}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {helperText && !error && (
        <p className="text-sm text-gray-500 dark:text-gray-400">{helperText}</p>
      )}
    </div>
  )
}
