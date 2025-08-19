import React from 'react'
import { cn } from '@/utils/cn'

interface DateSeparatorProps {
  date: string
  totalDuration: string
  className?: string
}

export const DateSeparator: React.FC<DateSeparatorProps> = ({
  date,
  totalDuration,
  className,
}) => {
  return (
    <div className={cn('px-4 py-2 bg-gray-50', className)}>
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold text-gray-600 whitespace-nowrap">
          {date}
        </span>
        <span className="text-sm text-gray-500 whitespace-nowrap">
          {totalDuration}
        </span>
        <div className="flex-1 h-px bg-gray-300"></div>
      </div>
    </div>
  )
}

export default DateSeparator
