import { Play, Pause, Clock } from 'lucide-react'
import { useGlobalTimer, formatTime } from '@/hooks/useGlobalTimer'

interface TimerWidgetProps {
  isCollapsed: boolean
}

export function TimerWidget({ isCollapsed }: TimerWidgetProps) {
  const { seconds, isRunning, start, pause, openModal } = useGlobalTimer()

  // Don't show widget if timer hasn't started
  if (seconds === 0 && !isRunning) {
    return null
  }

  return (
    <div className={`${isCollapsed ? 'px-2' : 'px-4'}`}>
      <button
        onClick={openModal}
        className={`
          w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'} 
          ${isCollapsed ? 'px-2 py-2' : 'px-3 py-2'} 
          rounded-lg transition-all
          ${isRunning ? 'bg-green-100 hover:bg-green-200' : 'bg-gray-100 hover:bg-gray-200'}
          group relative
        `}
        title={isCollapsed ? `Timer: ${formatTime(seconds)}` : undefined}
      >
        {/* Timer icon with pulse animation when running */}
        <div className="relative">
          <Clock
            className={`w-4 h-4 ${isRunning ? 'text-green-600' : 'text-gray-600'}`}
          />
          {isRunning && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          )}
        </div>

        {/* Time display - only show when not collapsed */}
        {!isCollapsed && (
          <>
            <span
              className={`font-inter text-sm ${isRunning ? 'text-green-700' : 'text-gray-700'} font-medium flex-1 text-left`}
            >
              {formatTime(seconds)}
            </span>

            {/* Play/Pause button */}
            <button
              onClick={e => {
                e.stopPropagation()
                isRunning ? pause() : start()
              }}
              className={`
                p-1 rounded 
                ${isRunning ? 'hover:bg-green-300' : 'hover:bg-gray-300'}
                transition-colors
              `}
              title={isRunning ? 'Pause timer' : 'Resume timer'}
            >
              {isRunning ? (
                <Pause className="w-3 h-3" />
              ) : (
                <Play className="w-3 h-3" />
              )}
            </button>
          </>
        )}
      </button>
    </div>
  )
}
