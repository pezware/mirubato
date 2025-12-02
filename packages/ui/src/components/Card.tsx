import { ReactNode } from 'react'
import { cn } from '../utils/cn'

interface CardProps {
  children: ReactNode
  className?: string
  variant?: 'default' | 'bordered' | 'elevated' | 'ghost'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  onClick?: () => void
  hoverable?: boolean
}

const variantClasses = {
  default:
    'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
  bordered:
    'bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600',
  elevated: 'bg-white dark:bg-gray-800 shadow-lg',
  ghost: 'bg-transparent',
}

const paddingClasses = {
  none: '',
  sm: 'p-2 sm:p-3',
  md: 'p-4 sm:p-6',
  lg: 'p-6 sm:p-8',
}

export function Card({
  children,
  className,
  variant = 'default',
  padding = 'md',
  onClick,
  hoverable = false,
}: CardProps) {
  const isClickable = onClick || hoverable

  return (
    <div
      className={cn(
        'rounded-lg transition-all duration-200',
        variantClasses[variant],
        paddingClasses[padding],
        isClickable && [
          'cursor-pointer',
          'hover:shadow-md',
          'hover:scale-[1.01]',
          'active:scale-[0.99]',
        ],
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  children: ReactNode
  className?: string
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return <div className={cn('mb-4', className)}>{children}</div>
}

interface CardTitleProps {
  children: ReactNode
  className?: string
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'div'
}

export function CardTitle({
  children,
  className,
  as: Component = 'h3',
}: CardTitleProps) {
  return (
    <Component
      className={cn(
        'text-lg font-semibold text-gray-900 dark:text-gray-100',
        className
      )}
    >
      {children}
    </Component>
  )
}

interface CardDescriptionProps {
  children: ReactNode
  className?: string
}

export function CardDescription({ children, className }: CardDescriptionProps) {
  return (
    <p
      className={cn('mt-1 text-sm text-gray-600 dark:text-gray-400', className)}
    >
      {children}
    </p>
  )
}

interface CardContentProps {
  children: ReactNode
  className?: string
}

export function CardContent({ children, className }: CardContentProps) {
  return (
    <div className={cn('text-gray-700 dark:text-gray-300', className)}>
      {children}
    </div>
  )
}

interface CardFooterProps {
  children: ReactNode
  className?: string
}

export function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div className={cn('mt-4 flex items-center justify-between', className)}>
      {children}
    </div>
  )
}
