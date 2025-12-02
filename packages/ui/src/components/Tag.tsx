import { cn } from '../utils/cn'

interface TagProps {
  children: React.ReactNode
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  onRemove?: () => void
  onClick?: () => void
  className?: string
  icon?: React.ReactNode
}

export default function Tag({
  children,
  variant = 'default',
  size = 'md',
  onRemove,
  onClick,
  className,
  icon,
}: TagProps) {
  const baseStyles =
    'inline-flex items-center font-medium rounded-full transition-all'

  const variants = {
    default:
      'bg-morandi-stone-100 text-morandi-stone-700 hover:bg-morandi-stone-200',
    primary:
      'bg-morandi-sage-100 text-morandi-sage-700 hover:bg-morandi-sage-200',
    success: 'bg-green-100 text-green-700 hover:bg-green-200',
    warning: 'bg-amber-100 text-amber-700 hover:bg-amber-200',
    danger: 'bg-red-100 text-red-700 hover:bg-red-200',
  }

  const sizes = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-3 py-1 gap-1.5',
    lg: 'text-base px-4 py-1.5 gap-2',
  }

  const isClickable = onClick || onRemove

  return (
    <span
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        isClickable && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
      {onRemove && (
        <button
          onClick={e => {
            e.stopPropagation()
            onRemove()
          }}
          className="flex-shrink-0 ml-1 -mr-1 hover:text-current opacity-60 hover:opacity-100 transition-opacity"
        >
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </span>
  )
}
