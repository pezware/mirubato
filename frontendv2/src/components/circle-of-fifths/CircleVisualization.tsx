import React from 'react'
import { getKeyOrder, getMinorKeyOrder, getKeyData } from './keyData'

interface CircleVisualizationProps {
  selectedKey: string
  onKeySelect: (keyId: string) => void
}

const CircleVisualization: React.FC<CircleVisualizationProps> = ({
  selectedKey,
  onKeySelect,
}) => {
  const majorKeys = getKeyOrder()
  const minorKeys = getMinorKeyOrder()

  const centerX = 250
  const centerY = 250
  const outerRadius = 180
  const innerRadius = 120
  const innerCircleRadius = 60

  // Calculate path for each segment
  const createSegmentPath = (
    index: number,
    radius: number,
    innerRadiusValue: number
  ) => {
    const angleStep = 360 / 12
    const startAngle =
      ((index * angleStep - 90 - angleStep / 2) * Math.PI) / 180
    const endAngle =
      (((index + 1) * angleStep - 90 - angleStep / 2) * Math.PI) / 180

    const x1 = centerX + radius * Math.cos(startAngle)
    const y1 = centerY + radius * Math.sin(startAngle)
    const x2 = centerX + radius * Math.cos(endAngle)
    const y2 = centerY + radius * Math.sin(endAngle)
    const x3 = centerX + innerRadiusValue * Math.cos(endAngle)
    const y3 = centerY + innerRadiusValue * Math.sin(endAngle)
    const x4 = centerX + innerRadiusValue * Math.cos(startAngle)
    const y4 = centerY + innerRadiusValue * Math.sin(startAngle)

    return `M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadiusValue} ${innerRadiusValue} 0 0 0 ${x4} ${y4} Z`
  }

  // Calculate text position
  const getTextPosition = (index: number, radius: number) => {
    const angleStep = 360 / 12
    const angle = ((index * angleStep - 90) * Math.PI) / 180
    const x = centerX + radius * Math.cos(angle)
    const y = centerY + radius * Math.sin(angle)
    return { x, y }
  }

  // Get related keys for highlighting
  const getRelatedKeys = (keyId: string) => {
    const keyData = getKeyData(keyId)
    const isMinorKey = keyId.includes('m')

    if (isMinorKey) {
      // For minor keys, relativeMinor field contains the relative major
      const relativeMajor = keyData.relativeMinor.replace(' Major', '')
      return {
        dominant: keyData.fifthClockwise,
        subdominant: keyData.fifthCounterClockwise,
        relativeMajor: relativeMajor,
      }
    } else {
      // For major keys, extract the relative minor key name
      return {
        dominant: keyData.fifthClockwise,
        subdominant: keyData.fifthCounterClockwise,
        relativeMinor: keyData.relativeMinor.split(' ')[0], // Extract just the key name
      }
    }
  }

  const relatedKeys = getRelatedKeys(selectedKey)

  // Handle key signatures display
  const getKeySignatureDisplay = (keyData: ReturnType<typeof getKeyData>) => {
    if (keyData.keySignature === 0) return ''
    const symbol = keyData.sharpsOrFlats === 'sharps' ? '♯' : '♭'
    return `${keyData.keySignature}${symbol}`
  }

  return (
    <div className="flex justify-center items-center">
      <svg
        width="500"
        height="500"
        viewBox="0 0 500 500"
        className="w-full h-full max-w-[500px] max-h-[500px]"
      >
        {/* Background circle */}
        <circle
          cx={centerX}
          cy={centerY}
          r={outerRadius + 20}
          fill="#FAF8F5"
          stroke="#E8E6E1"
          strokeWidth="2"
        />

        {/* Major key segments */}
        {majorKeys.map((key, index) => {
          const keyData = getKeyData(key)
          const isSelected = selectedKey === key
          const _isRelated = Object.values(relatedKeys).includes(key)

          return (
            <g key={`major-${key}`}>
              <path
                d={createSegmentPath(index, outerRadius, innerRadius)}
                fill={keyData.color}
                fillOpacity={0.7}
                stroke={isSelected ? '#2D3748' : '#FFFFFF'}
                strokeWidth={isSelected ? '4' : '2'}
                className="cursor-pointer transition-all duration-300 hover:stroke-gray-400"
                onClick={() => onKeySelect(key)}
              />
              <text
                {...getTextPosition(index, (outerRadius + innerRadius) / 2)}
                textAnchor="middle"
                dominantBaseline="middle"
                className="pointer-events-none select-none font-medium"
                fill={isSelected ? '#1A202C' : '#4A4A4A'}
                fontSize="16"
              >
                {key}
              </text>
            </g>
          )
        })}

        {/* Minor key segments */}
        {minorKeys.map((key, index) => {
          const minorKeyData = getKeyData(key)
          const isSelected = selectedKey === key
          const _isRelated = Object.values(relatedKeys).includes(key)

          return (
            <g key={`minor-${key}`}>
              <path
                d={createSegmentPath(index, innerRadius, innerCircleRadius)}
                fill={minorKeyData.color}
                fillOpacity={0.5}
                stroke={isSelected ? '#2D3748' : '#FFFFFF'}
                strokeWidth={isSelected ? '3' : '2'}
                className="cursor-pointer transition-all duration-300 hover:stroke-gray-400"
                onClick={() => onKeySelect(key)}
              />
              <text
                {...getTextPosition(
                  index,
                  (innerRadius + innerCircleRadius) / 2
                )}
                textAnchor="middle"
                dominantBaseline="middle"
                className="pointer-events-none select-none"
                fill={isSelected ? '#1A202C' : '#6B6B6B'}
                fontSize="13"
              >
                {key}
              </text>
            </g>
          )
        })}

        {/* Inner circle */}
        <circle
          cx={centerX}
          cy={centerY}
          r={innerCircleRadius}
          fill="#FFFFFF"
          stroke="#E8E6E1"
          strokeWidth="2"
        />

        {/* Key signatures on outer ring */}
        {majorKeys.map((key, index) => {
          const keyData = getKeyData(key)
          const sigDisplay = getKeySignatureDisplay(keyData)
          if (!sigDisplay) return null

          const { x, y } = getTextPosition(index, outerRadius + 35)

          return (
            <text
              key={`sig-${key}`}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-gray-500"
              fontSize="12"
            >
              {sigDisplay}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

export default CircleVisualization
