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
    return {
      dominant: keyData.fifthClockwise,
      subdominant: keyData.fifthCounterClockwise,
      relativeMinor: keyData.relativeMinor.split(' ')[0], // Extract just the key name
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
          const isRelated = Object.values(relatedKeys).includes(key)

          return (
            <g key={`major-${key}`}>
              <path
                d={createSegmentPath(index, outerRadius, innerRadius)}
                fill={keyData.color}
                fillOpacity={isSelected ? 1 : isRelated ? 0.7 : 0.4}
                stroke="#FFFFFF"
                strokeWidth="2"
                className="cursor-pointer transition-all duration-300 hover:fill-opacity-80"
                onClick={() => onKeySelect(key)}
              />
              <text
                {...getTextPosition(index, (outerRadius + innerRadius) / 2)}
                textAnchor="middle"
                dominantBaseline="middle"
                className="pointer-events-none select-none font-medium"
                fill={isSelected ? '#FFFFFF' : '#4A4A4A'}
                fontSize="16"
              >
                {key}
              </text>
            </g>
          )
        })}

        {/* Minor key segments */}
        {minorKeys.map((key, index) => {
          const majorKey = majorKeys[index]
          const keyData = getKeyData(majorKey) // Use major key color
          const keyName = key.replace('m', '')
          const isSelected = selectedKey === keyName
          const isRelated = Object.values(relatedKeys).includes(keyName)

          return (
            <g key={`minor-${key}`}>
              <path
                d={createSegmentPath(index, innerRadius, innerCircleRadius)}
                fill={keyData.color}
                fillOpacity={isSelected ? 1 : isRelated ? 0.5 : 0.2}
                stroke="#FFFFFF"
                strokeWidth="2"
                className="cursor-pointer transition-all duration-300 hover:fill-opacity-60"
                onClick={() => onKeySelect(keyName)}
              />
              <text
                {...getTextPosition(
                  index,
                  (innerRadius + innerCircleRadius) / 2
                )}
                textAnchor="middle"
                dominantBaseline="middle"
                className="pointer-events-none select-none"
                fill={isSelected ? '#FFFFFF' : '#6B6B6B'}
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

        {/* Center text */}
        <text
          x={centerX}
          y={centerY - 10}
          textAnchor="middle"
          dominantBaseline="middle"
          className="font-semibold text-gray-700"
          fontSize="14"
        >
          Circle of
        </text>
        <text
          x={centerX}
          y={centerY + 10}
          textAnchor="middle"
          dominantBaseline="middle"
          className="font-semibold text-gray-700"
          fontSize="14"
        >
          Fifths
        </text>

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

        {/* Legend */}
        <g transform="translate(20, 20)">
          <rect
            x="0"
            y="0"
            width="100"
            height="60"
            fill="white"
            fillOpacity="0.9"
            stroke="#E8E6E1"
            rx="4"
          />
          <text x="10" y="20" fontSize="12" fill="#6B6B6B">
            Selected
          </text>
          <rect
            x="60"
            y="10"
            width="30"
            height="12"
            fill={getKeyData(selectedKey).color}
            fillOpacity="1"
          />
          <text x="10" y="40" fontSize="12" fill="#6B6B6B">
            Related
          </text>
          <rect
            x="60"
            y="30"
            width="30"
            height="12"
            fill={getKeyData(selectedKey).color}
            fillOpacity="0.7"
          />
        </g>
      </svg>
    </div>
  )
}

export default CircleVisualization
