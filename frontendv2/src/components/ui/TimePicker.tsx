import { useState, useRef, useEffect } from 'react'
import { Clock } from 'lucide-react'
import Button from './Button'

interface TimePickerProps {
  value: string // HH:MM format
  onChange: (value: string) => void
  className?: string
  required?: boolean
}

export default function TimePicker({
  value,
  onChange,
  className = '',
  required = false,
}: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [tempTime, setTempTime] = useState(value)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Parse time value
  const [hours, minutes] = value.split(':').map(Number)
  const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
  const ampm = hours >= 12 ? 'PM' : 'AM'

  // Generate time options
  const hourOptions = Array.from({ length: 12 }, (_, i) => i + 1)
  const minuteOptions = Array.from({ length: 60 }, (_, i) => i)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const formatTime = (hour: number, minute: number, isPM: boolean) => {
    const hour24 = isPM
      ? hour === 12
        ? 12
        : hour + 12
      : hour === 12
        ? 0
        : hour
    return `${hour24.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  }

  const handleTimeSelect = (hour: number, minute: number, isPM: boolean) => {
    const newTime = formatTime(hour, minute, isPM)
    setTempTime(newTime)
    onChange(newTime)
    setIsOpen(false)
  }

  // Always use custom time picker on all screen sizes

  return (
    <div className="relative">
      <div
        ref={inputRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 bg-white border border-morandi-stone-300 rounded-lg focus:ring-2 focus:ring-morandi-sage-400 focus:border-transparent cursor-pointer hover:border-morandi-stone-400 transition-colors ${className}`}
      >
        <span className="text-morandi-stone-700 flex-1">
          {hour12}:{minutes.toString().padStart(2, '0')} {ampm}
        </span>
        <Clock className="w-4 h-4 text-morandi-stone-500" />
      </div>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 mt-1 bg-white border border-morandi-stone-300 rounded-lg shadow-lg z-50 p-4"
          style={{ minWidth: '280px' }}
        >
          <div className="grid grid-cols-3 gap-4">
            {/* Hours */}
            <div>
              <label className="block text-xs font-medium text-morandi-stone-600 mb-2">
                Hour
              </label>
              <div className="grid grid-cols-3 gap-1 max-h-32 overflow-y-auto">
                {hourOptions.map(hour => (
                  <Button
                    key={hour}
                    onClick={() => {
                      const currentMinute =
                        parseInt(tempTime.split(':')[1]) || 0
                      const currentHours = parseInt(tempTime.split(':')[0]) || 0
                      const isPM = currentHours >= 12
                      handleTimeSelect(hour, currentMinute, isPM)
                    }}
                    variant={hour === hour12 ? 'primary' : 'ghost'}
                    size="sm"
                    className="text-xs py-1"
                  >
                    {hour}
                  </Button>
                ))}
              </div>
            </div>

            {/* Minutes */}
            <div>
              <label className="block text-xs font-medium text-morandi-stone-600 mb-2">
                Minute
              </label>
              <div className="grid grid-cols-2 gap-1 max-h-32 overflow-y-auto">
                {minuteOptions
                  .filter(min => min % 5 === 0) // Show only 5-minute intervals
                  .map(minute => (
                    <Button
                      key={minute}
                      onClick={() => {
                        const currentHours =
                          parseInt(tempTime.split(':')[0]) || 0
                        const isPM = currentHours >= 12
                        const currentHour12 =
                          currentHours === 0
                            ? 12
                            : currentHours > 12
                              ? currentHours - 12
                              : currentHours
                        handleTimeSelect(currentHour12, minute, isPM)
                      }}
                      variant={minute === minutes ? 'primary' : 'ghost'}
                      size="sm"
                      className="text-xs py-1"
                    >
                      {minute.toString().padStart(2, '0')}
                    </Button>
                  ))}
              </div>
            </div>

            {/* AM/PM */}
            <div>
              <label className="block text-xs font-medium text-morandi-stone-600 mb-2">
                Period
              </label>
              <div className="space-y-1">
                <Button
                  onClick={() => {
                    const currentMinute = parseInt(tempTime.split(':')[1]) || 0
                    handleTimeSelect(hour12, currentMinute, false)
                  }}
                  variant={ampm === 'AM' ? 'primary' : 'ghost'}
                  size="sm"
                  className="w-full text-xs"
                >
                  AM
                </Button>
                <Button
                  onClick={() => {
                    const currentMinute = parseInt(tempTime.split(':')[1]) || 0
                    handleTimeSelect(hour12, currentMinute, true)
                  }}
                  variant={ampm === 'PM' ? 'primary' : 'ghost'}
                  size="sm"
                  className="w-full text-xs"
                >
                  PM
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
