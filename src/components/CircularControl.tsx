import React, { useState, useRef, useEffect, useCallback } from 'react'

interface CircularControlProps {
  value: number // 0-100
  onChange: (value: number) => void
  label?: string
  size?: number
  disabled?: boolean
  className?: string
  ghost?: boolean // For mock controls
}

export const CircularControl: React.FC<CircularControlProps> = ({
  value,
  onChange,
  label = 'Volume',
  size = 80,
  disabled = false,
  className = '',
  ghost = false,
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)

  // Convert value (0-100) to angle (-135 to 135 degrees)
  const valueToAngle = (val: number) => {
    return (val / 100) * 270 - 135
  }

  // Convert angle to value
  const angleToValue = (angle: number) => {
    const normalized = angle + 135
    return Math.max(0, Math.min(100, (normalized / 270) * 100))
  }

  // Get angle from mouse position
  const getAngleFromEvent = useCallback(
    (e: MouseEvent | React.MouseEvent | TouchEvent | React.TouchEvent) => {
      if (!svgRef.current) return 0

      const rect = svgRef.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2

      let clientX, clientY
      if ('touches' in e) {
        clientX = e.touches[0].clientX
        clientY = e.touches[0].clientY
      } else {
        clientX = e.clientX
        clientY = e.clientY
      }

      const angle =
        (Math.atan2(clientY - centerY, clientX - centerX) * 180) / Math.PI
      return angle
    },
    []
  )

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return
    e.preventDefault()
    setIsDragging(true)
  }

  const handleMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isDragging || disabled) return

      const angle = getAngleFromEvent(e)
      // Limit to -135 to 135 degrees (270 degree range)
      const limitedAngle = Math.max(-135, Math.min(135, angle))
      const newValue = angleToValue(limitedAngle)
      onChange(newValue)
    },
    [isDragging, disabled, onChange, getAngleFromEvent]
  )

  const handleEnd = () => {
    setIsDragging(false)
  }

  useEffect(() => {
    if (isDragging) {
      const mouseMoveHandler = (e: MouseEvent) => handleMove(e)
      const touchMoveHandler = (e: TouchEvent) => handleMove(e)
      const endHandler = () => handleEnd()

      document.addEventListener('mousemove', mouseMoveHandler)
      document.addEventListener('touchmove', touchMoveHandler)
      document.addEventListener('mouseup', endHandler)
      document.addEventListener('touchend', endHandler)

      return () => {
        document.removeEventListener('mousemove', mouseMoveHandler)
        document.removeEventListener('touchmove', touchMoveHandler)
        document.removeEventListener('mouseup', endHandler)
        document.removeEventListener('touchend', endHandler)
      }
    }
  }, [isDragging, handleMove])

  const angle = valueToAngle(value)
  const opacity = ghost ? (isDragging ? 0.15 : 0.05) : 1

  return (
    <div className={`relative inline-block ${className}`}>
      <svg
        ref={svgRef}
        width={size}
        height={size}
        className={`cursor-pointer select-none ${disabled ? 'opacity-50' : ''}`}
        onMouseDown={handleStart}
        onTouchStart={handleStart}
        style={{ opacity }}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 10}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-mirubato-wood-200"
        />

        {/* Track arc */}
        <path
          d={`M ${size / 2 + (size / 2 - 15) * Math.cos((-135 * Math.PI) / 180)} ${size / 2 + (size / 2 - 15) * Math.sin((-135 * Math.PI) / 180)} A ${size / 2 - 15} ${size / 2 - 15} 0 1 1 ${size / 2 + (size / 2 - 15) * Math.cos((135 * Math.PI) / 180)} ${size / 2 + (size / 2 - 15) * Math.sin((135 * Math.PI) / 180)}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          className="text-mirubato-wood-100"
        />

        {/* Value arc */}
        <path
          d={`M ${size / 2 + (size / 2 - 15) * Math.cos((-135 * Math.PI) / 180)} ${size / 2 + (size / 2 - 15) * Math.sin((-135 * Math.PI) / 180)} A ${size / 2 - 15} ${size / 2 - 15} 0 ${angle > -135 + 180 ? 1 : 0} 1 ${size / 2 + (size / 2 - 15) * Math.cos((angle * Math.PI) / 180)} ${size / 2 + (size / 2 - 15) * Math.sin((angle * Math.PI) / 180)}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          className="text-mirubato-leaf-400"
        />

        {/* Pointer */}
        <line
          x1={size / 2}
          y1={size / 2}
          x2={size / 2 + (size / 2 - 20) * Math.cos((angle * Math.PI) / 180)}
          y2={size / 2 + (size / 2 - 20) * Math.sin((angle * Math.PI) / 180)}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="text-mirubato-wood-600"
        />

        {/* Center dot */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r="3"
          fill="currentColor"
          className="text-mirubato-wood-600"
        />
      </svg>

      {/* Label */}
      {label && (
        <div
          className="text-xs text-center mt-1 text-mirubato-wood-600"
          style={{ opacity: ghost ? 0.05 : 0.7 }}
        >
          {label}
        </div>
      )}
    </div>
  )
}
