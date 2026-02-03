import { type InputHTMLAttributes, type Ref } from 'react'
import { cn } from '../utils/cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
  ref?: Ref<HTMLInputElement>
}

export function Input({
  className,
  type = 'text',
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  fullWidth = false,
  ref,
  ...props
}: InputProps) {
  const hasError = Boolean(error)

  return (
    <div className={cn('space-y-1', fullWidth && 'w-full')}>
      {label && (
        <label
          htmlFor={props.id}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
          {props.required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <span className="text-gray-500 sm:text-sm">{leftIcon}</span>
          </div>
        )}
        <input
          type={type}
          className={cn(
            'block w-full rounded-md border px-3 py-2 text-gray-900',
            'placeholder:text-gray-400',
            'focus:outline-none focus:ring-2 focus:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'transition-colors duration-200',
            'bg-white',
            hasError
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-morandi-sage-500 focus:ring-morandi-sage-500',
            leftIcon && 'pl-10',
            rightIcon && 'pr-10',
            className
          )}
          ref={ref}
          aria-invalid={hasError}
          aria-describedby={
            hasError
              ? `${props.id}-error`
              : helperText
                ? `${props.id}-description`
                : undefined
          }
          {...props}
        />
        {rightIcon && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <span className="text-gray-500 sm:text-sm">{rightIcon}</span>
          </div>
        )}
      </div>
      {error && (
        <p className="text-sm text-red-600" id={`${props.id}-error`}>
          {error}
        </p>
      )}
      {helperText && !error && (
        <p className="text-sm text-gray-500" id={`${props.id}-description`}>
          {helperText}
        </p>
      )}
    </div>
  )
}

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
  fullWidth?: boolean
  ref?: Ref<HTMLTextAreaElement>
}

export function Textarea({
  className,
  label,
  error,
  helperText,
  fullWidth = false,
  ref,
  ...props
}: TextareaProps) {
  const hasError = Boolean(error)

  return (
    <div className={cn('space-y-1', fullWidth && 'w-full')}>
      {label && (
        <label
          htmlFor={props.id}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
          {props.required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}
      <textarea
        className={cn(
          'block w-full rounded-md border px-3 py-2 text-gray-900',
          'placeholder:text-gray-400',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'transition-colors duration-200',
          'bg-white',
          'resize-y min-h-[80px]',
          hasError
            ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
            : 'border-gray-300 focus:border-morandi-sage-500 focus:ring-morandi-sage-500',
          className
        )}
        ref={ref}
        aria-invalid={hasError}
        aria-describedby={
          hasError
            ? `${props.id}-error`
            : helperText
              ? `${props.id}-description`
              : undefined
        }
        {...props}
      />
      {error && (
        <p className="text-sm text-red-600" id={`${props.id}-error`}>
          {error}
        </p>
      )}
      {helperText && !error && (
        <p className="text-sm text-gray-500" id={`${props.id}-description`}>
          {helperText}
        </p>
      )}
    </div>
  )
}
