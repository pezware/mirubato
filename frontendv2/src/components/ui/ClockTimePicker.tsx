import React, { useState, useRef, useEffect } from 'react'
import Button from './Button'

interface ClockTimePickerProps {
  value: string // HH:MM format
  onChange: (value: string) => void
  className?: string
}

export default function ClockTimePicker({
  value,
  onChange,
  className = '',
}: ClockTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isDragging, setIsDragging] = useState<'hour' | 'minute' | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  // Parse time value
  const [hours, minutes] = value.split(':').map(Number)
  const [tempHours, setTempHours] = useState(hours)
  const [tempMinutes, setTempMinutes] = useState(minutes)

  // Update temp values when value changes
  useEffect(() => {
    const [h, m] = value.split(':').map(Number)
    setTempHours(h)
    setTempMinutes(m)
  }, [value])

  // Format display
  const hour12 =
    tempHours === 0 ? 12 : tempHours > 12 ? tempHours - 12 : tempHours
  const ampm = tempHours >= 12 ? 'PM' : 'AM'
  const displayTime = `${hour12}:${tempMinutes.toString().padStart(2, '0')} ${ampm}`

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !triggerRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Calculate angle from coordinates
  const calculateAngle = (clientX: number, clientY: number) => {
    if (!svgRef.current) return 0
    const rect = svgRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const dx = clientX - centerX
    const dy = clientY - centerY
    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90
    if (angle < 0) angle += 360
    return angle
  }

  // Handle mouse/touch events
  const handlePointerDown = (
    e: React.PointerEvent,
    type: 'hour' | 'minute'
  ) => {
    e.preventDefault()
    setIsDragging(type)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return

    const angle = calculateAngle(e.clientX, e.clientY)

    if (isDragging === 'hour') {
      const hour = Math.round(angle / 30) % 12
      const newHour =
        tempHours >= 12 ? (hour === 0 ? 12 : hour + 12) : hour === 0 ? 0 : hour
      setTempHours(newHour)
    } else if (isDragging === 'minute') {
      const minute = Math.round(angle / 6) % 60
      setTempMinutes(minute)
    }
  }

  const handlePointerUp = () => {
    setIsDragging(null)
  }

  // Handle clock face click
  const handleClockClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const angle = calculateAngle(e.clientX, e.clientY)

    // Determine if click is closer to hour or minute hand
    const hourAngle = (hour12 * 30 - 90) % 360
    const minuteAngle = (tempMinutes * 6 - 90) % 360

    const hourDiff = Math.abs(angle - hourAngle)
    const minuteDiff = Math.abs(angle - minuteAngle)

    if (hourDiff < minuteDiff) {
      const hour = Math.round(angle / 30) % 12
      const newHour =
        tempHours >= 12 ? (hour === 0 ? 12 : hour + 12) : hour === 0 ? 0 : hour
      setTempHours(newHour)
    } else {
      const minute = Math.round(angle / 6) % 60
      setTempMinutes(minute)
    }
  }

  const handleSet = () => {
    const formattedTime = `${tempHours.toString().padStart(2, '0')}:${tempMinutes.toString().padStart(2, '0')}`
    onChange(formattedTime)
    setIsOpen(false)
  }

  const handleCancel = () => {
    const [h, m] = value.split(':').map(Number)
    setTempHours(h)
    setTempMinutes(m)
    setIsOpen(false)
  }

  const toggleAmPm = () => {
    setTempHours(tempHours >= 12 ? tempHours - 12 : tempHours + 12)
  }

  // Calculate hand positions
  const hourAngle = (hour12 * 30 + tempMinutes * 0.5) % 360
  const minuteAngle = (tempMinutes * 6) % 360

  return (
    <div className="relative">
      <div
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 bg-white border border-morandi-stone-300 rounded-lg focus:ring-2 focus:ring-morandi-sage-400 focus:border-transparent cursor-pointer hover:border-morandi-stone-400 transition-colors ${className}`}
      >
        <span className="text-morandi-stone-700 flex-1">{displayTime}</span>
        <svg
          className="w-4 h-4 text-morandi-stone-500"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
            clipRule="evenodd"
          />
        </svg>
      </div>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 mt-1 bg-gray-800 text-white rounded-lg shadow-2xl z-50 p-4"
          style={{ minWidth: '320px' }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {/* Digital display */}
          <div className="text-center mb-4 text-3xl font-light">
            {tempHours.toString().padStart(2, '0')}:
            {tempMinutes.toString().padStart(2, '0')}
          </div>

          {/* Clock face */}
          <div
            className="relative mx-auto"
            style={{ width: '240px', height: '240px' }}
          >
            <svg
              ref={svgRef}
              width="240"
              height="240"
              viewBox="0 0 240 240"
              className="cursor-pointer select-none"
              onClick={handleClockClick}
            >
              {/* Clock circle */}
              <circle
                cx="120"
                cy="120"
                r="110"
                fill="#374151"
                stroke="#4B5563"
                strokeWidth="2"
              />

              {/* Hour numbers */}
              {Array.from({ length: 12 }, (_, i) => {
                const hour = i === 0 ? 12 : i
                const angle = i * 30 - 90
                const x = 120 + 85 * Math.cos((angle * Math.PI) / 180)
                const y = 120 + 85 * Math.sin((angle * Math.PI) / 180)
                return (
                  <text
                    key={hour}
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#9CA3AF"
                    fontSize="18"
                    className="select-none"
                  >
                    {hour}
                  </text>
                )
              })}

              {/* Minute dots */}
              {Array.from({ length: 60 }, (_, i) => {
                if (i % 5 === 0) return null // Skip hour positions
                const angle = i * 6 - 90
                const x = 120 + 95 * Math.cos((angle * Math.PI) / 180)
                const y = 120 + 95 * Math.sin((angle * Math.PI) / 180)
                return (
                  <circle
                    key={`minute-${i}`}
                    cx={x}
                    cy={y}
                    r="2"
                    fill="#6B7280"
                  />
                )
              })}

              {/* Current selection indicator */}
              <circle cx="120" cy="120" r="6" fill="#60A5FA" />

              {/* Hour hand */}
              <line
                x1="120"
                y1="120"
                x2={120 + 50 * Math.cos(((hourAngle - 90) * Math.PI) / 180)}
                y2={120 + 50 * Math.sin(((hourAngle - 90) * Math.PI) / 180)}
                stroke="#60A5FA"
                strokeWidth="6"
                strokeLinecap="round"
                className="cursor-pointer"
                onPointerDown={e => handlePointerDown(e, 'hour')}
              />

              {/* Minute hand */}
              <line
                x1="120"
                y1="120"
                x2={120 + 80 * Math.cos(((minuteAngle - 90) * Math.PI) / 180)}
                y2={120 + 80 * Math.sin(((minuteAngle - 90) * Math.PI) / 180)}
                stroke="#93C5FD"
                strokeWidth="4"
                strokeLinecap="round"
                className="cursor-pointer"
                onPointerDown={e => handlePointerDown(e, 'minute')}
              />
            </svg>
          </div>

          {/* AM/PM toggle */}
          <div className="mt-4 flex justify-center">
            <button
              onClick={toggleAmPm}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              {ampm}
            </button>
          </div>

          {/* Action buttons */}
          <div className="mt-4 flex gap-2 justify-end">
            <Button
              onClick={handleCancel}
              variant="ghost"
              className="text-gray-300 hover:text-white"
            >
              Cancel
            </Button>
            <Button onClick={handleSet} variant="primary">
              Set
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
