import { cn } from '../utils/cn'

export interface LoadingProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'spinner' | 'dots' | 'pulse'
  color?: 'primary' | 'white' | 'gray'
  className?: string
  text?: string
  fullScreen?: boolean
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
}

const colorClasses = {
  primary: 'text-morandi-sage-600',
  white: 'text-white',
  gray: 'text-gray-400',
}

export function Loading({
  size = 'md',
  variant = 'spinner',
  color = 'primary',
  className,
  text,
  fullScreen = false,
}: LoadingProps) {
  const loadingContent = (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3',
        className
      )}
    >
      {variant === 'spinner' && (
        <svg
          className={cn('animate-spin', sizeClasses[size], colorClasses[color])}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}

      {variant === 'dots' && (
        <div className="flex space-x-1">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className={cn(
                'rounded-full',
                size === 'sm' && 'h-2 w-2',
                size === 'md' && 'h-3 w-3',
                size === 'lg' && 'h-4 w-4',
                size === 'xl' && 'h-5 w-5',
                colorClasses[color],
                'animate-pulse'
              )}
              style={{
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </div>
      )}

      {variant === 'pulse' && (
        <div
          className={cn(
            'rounded-full bg-current animate-pulse',
            sizeClasses[size],
            colorClasses[color]
          )}
        />
      )}

      {text && (
        <p className={cn('text-sm font-medium', colorClasses[color])}>{text}</p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm dark:bg-gray-900/80">
        {loadingContent}
      </div>
    )
  }

  return loadingContent
}

export interface LoadingSkeletonProps {
  className?: string
  animate?: boolean
}

export function LoadingSkeleton({
  className,
  animate = true,
}: LoadingSkeletonProps) {
  return (
    <div
      className={cn(
        'bg-gray-200 dark:bg-gray-700 rounded',
        animate && 'animate-pulse',
        className
      )}
    />
  )
}

export interface LoadingOverlayProps {
  isLoading: boolean
  children: React.ReactNode
  text?: string
}

export function LoadingOverlay({
  isLoading,
  children,
  text,
}: LoadingOverlayProps) {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-sm dark:bg-gray-900/70">
          <Loading text={text} />
        </div>
      )}
    </div>
  )
}
