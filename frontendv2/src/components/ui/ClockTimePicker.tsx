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
  const [isDragging, setIsDragging] = useState(false)
  const [isEditingTime, setIsEditingTime] = useState(false)
  const [editingValue, setEditingValue] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const timeInputRef = useRef<HTMLInputElement>(null)

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

  // Handle mouse/touch events for hour dragging
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return

    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const distance = Math.sqrt(
      Math.pow(e.clientX - centerX, 2) + Math.pow(e.clientY - centerY, 2)
    )

    // Only start dragging if clicking near the clock face (not too close to center)
    if (distance > 30) {
      setIsDragging(true)
      handleDrag(e.clientX, e.clientY)
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    handleDrag(e.clientX, e.clientY)
  }

  const handlePointerUp = () => {
    setIsDragging(false)
  }

  const handleDrag = (clientX: number, clientY: number) => {
    const angle = calculateAngle(clientX, clientY)
    const hour = Math.round(angle / 30) % 12
    const newHour =
      tempHours >= 12 ? (hour === 0 ? 12 : hour + 12) : hour === 0 ? 0 : hour
    setTempHours(newHour)
  }

  // Handle minute click
  const handleMinuteClick = (minute: number) => {
    setTempMinutes(minute)
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

  const toggleAmPm = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setTempHours(tempHours >= 12 ? tempHours - 12 : tempHours + 12)
  }

  const handleTimeClick = () => {
    setIsEditingTime(true)
    setEditingValue(
      `${tempHours.toString().padStart(2, '0')}:${tempMinutes.toString().padStart(2, '0')}`
    )
    setTimeout(() => {
      timeInputRef.current?.focus()
      timeInputRef.current?.select()
    }, 0)
  }

  const handleTimeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Allow only numbers and colon
    if (/^[0-9:]*$/.test(value)) {
      setEditingValue(value)
    }
  }

  const handleTimeInputBlur = () => {
    const match = editingValue.match(/^(\d{1,2}):(\d{1,2})$/)
    if (match) {
      const h = parseInt(match[1], 10)
      const m = parseInt(match[2], 10)
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        setTempHours(h)
        setTempMinutes(m)
      }
    }
    setIsEditingTime(false)
  }

  const handleTimeInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleTimeInputBlur()
    } else if (e.key === 'Escape') {
      setIsEditingTime(false)
    }
  }

  // Calculate hour hand position
  const hourAngle = (hour12 * 30 + tempMinutes * 0.5) % 360

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
          className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-2xl z-50 p-4 border border-gray-200"
          style={{ minWidth: '320px' }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <h3 className="text-center text-lg font-medium text-gray-800 mb-3">
            Select Practice Time
          </h3>

          {/* Instructions */}
          <div className="text-center text-sm text-gray-600 mb-4">
            <p>
              <strong className="text-gray-700">Drag the hour hand</strong> to
              set hours
            </p>
            <p>
              <strong className="text-gray-700">Click minute numbers</strong>{' '}
              (outer ring) to set minutes
            </p>
          </div>

          {/* Clock face */}
          <div
            className="relative mx-auto mb-4"
            style={{ width: '240px', height: '240px' }}
          >
            <svg
              ref={svgRef}
              width="240"
              height="240"
              viewBox="0 0 240 240"
              className="select-none"
              onPointerDown={handlePointerDown}
              style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            >
              {/* Clock circle */}
              <circle
                cx="120"
                cy="120"
                r="110"
                fill="#f9f9f9"
                stroke="#e0e0e0"
                strokeWidth="3"
              />

              {/* Hour numbers (inner ring) */}
              {Array.from({ length: 12 }, (_, i) => {
                const hour = i === 0 ? 12 : i
                const angle = i * 30 - 90
                const x = 120 + 65 * Math.cos((angle * Math.PI) / 180)
                const y = 120 + 65 * Math.sin((angle * Math.PI) / 180)
                return (
                  <text
                    key={hour}
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#333"
                    fontSize="16"
                    fontWeight="600"
                    className="select-none pointer-events-none"
                  >
                    {hour}
                  </text>
                )
              })}

              {/* Minute numbers (outer ring - clickable) */}
              {Array.from({ length: 12 }, (_, i) => {
                const minute = i * 5
                const angle = i * 30 - 90
                const x = 120 + 95 * Math.cos((angle * Math.PI) / 180)
                const y = 120 + 95 * Math.sin((angle * Math.PI) / 180)
                const isActive = minute === tempMinutes
                return (
                  <g
                    key={`minute-${minute}`}
                    onClick={() => handleMinuteClick(minute)}
                    style={{ cursor: 'pointer' }}
                  >
                    <circle
                      cx={x}
                      cy={y}
                      r="18"
                      fill={isActive ? '#4A5568' : 'transparent'}
                      className="transition-colors hover:fill-gray-200"
                    />
                    <text
                      x={x}
                      y={y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={isActive ? 'white' : '#666'}
                      fontSize="14"
                      fontWeight={isActive ? '600' : '400'}
                      className="select-none pointer-events-none"
                    >
                      {minute.toString().padStart(2, '0')}
                    </text>
                  </g>
                )
              })}

              {/* Center dot */}
              <circle cx="120" cy="120" r="7" fill="#2D3748" />

              {/* Hour hand (only hand shown) */}
              <line
                x1="120"
                y1="120"
                x2={120 + 50 * Math.cos(((hourAngle - 90) * Math.PI) / 180)}
                y2={120 + 50 * Math.sin(((hourAngle - 90) * Math.PI) / 180)}
                stroke="#4A5568"
                strokeWidth="6"
                strokeLinecap="round"
                style={{ pointerEvents: 'none' }}
              />
            </svg>
          </div>

          {/* Legend */}
          <div className="flex justify-center gap-6 mb-4 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-800"></div>
              <span>Hours (inner)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-600"></div>
              <span>Minutes (outer, clickable)</span>
            </div>
          </div>

          {/* Digital display with AM/PM */}
          <div className="flex items-center justify-center mb-4 gap-2 bg-gray-50 rounded-lg p-3">
            {isEditingTime ? (
              <input
                ref={timeInputRef}
                type="text"
                value={editingValue}
                onChange={handleTimeInputChange}
                onBlur={handleTimeInputBlur}
                onKeyDown={handleTimeInputKeyDown}
                className="text-2xl font-light bg-white text-gray-800 text-center rounded px-2 py-1 w-28 focus:outline-none focus:ring-2 focus:ring-morandi-sage-400 border border-gray-300"
                placeholder="HH:MM"
              />
            ) : (
              <div
                onClick={handleTimeClick}
                className="text-2xl font-light cursor-pointer hover:bg-gray-200 rounded px-3 py-1 transition-colors"
                title="Click to type exact time"
              >
                {tempHours.toString().padStart(2, '0')}:
                {tempMinutes.toString().padStart(2, '0')}
              </div>
            )}
            <button
              onClick={toggleAmPm}
              onMouseDown={e => {
                e.preventDefault()
                e.stopPropagation()
              }}
              className="px-3 py-1 text-lg bg-white hover:bg-gray-100 rounded-lg transition-colors border border-gray-300"
            >
              {ampm}
            </button>
          </div>

          <div className="text-center text-xs text-gray-500 mb-4">
            Click time display to type exact time
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleCancel}
              variant="secondary"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button onClick={handleSet} variant="primary" className="flex-1">
              Confirm Time
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
