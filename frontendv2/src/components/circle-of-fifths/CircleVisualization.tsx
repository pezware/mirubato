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

  // Check if mobile device
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Responsive sizing - maximize on mobile
  const svgSize = isMobile ? 1000 : 500
  const centerX = svgSize / 2
  const centerY = svgSize / 2
  const outerRadius = isMobile ? 450 : 180
  const innerRadius = isMobile ? 280 : 120
  const innerCircleRadius = isMobile ? 120 : 60

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

  // Handle key signatures display
  const getKeySignatureDisplay = (
    keyData: ReturnType<typeof getKeyData>,
    keyName: string
  ) => {
    if (keyData.keySignature === 0) return ''

    // Special case for F#/Gb which has both 6 sharps and 6 flats
    if (keyName === 'F#/Gb' && keyData.keySignature === 6) {
      return '6♯/6♭'
    }

    const symbol = keyData.sharpsOrFlats === 'sharps' ? '♯' : '♭'
    return `${keyData.keySignature}${symbol}`
  }

  return (
    <div className="flex justify-center items-center p-0.5 md:p-4">
      <svg
        width={svgSize}
        height={svgSize}
        viewBox={`0 0 ${svgSize} ${svgSize}`}
        className={`w-full h-full ${isMobile ? 'max-w-[95vw] max-h-[95vw]' : 'max-w-[500px] max-h-[500px]'}`}
      >
        {/* Background circle - removed to clean up appearance */}

        {/* Major key segments */}
        {majorKeys.map((key, index) => {
          const keyData = getKeyData(key)
          const isSelected = selectedKey === key

          return (
            <g key={`major-${key}`}>
              <path
                d={createSegmentPath(index, outerRadius, innerRadius)}
                fill={keyData.color}
                fillOpacity={0.7}
                stroke={isSelected ? '#FB923C' : '#FFFFFF'}
                strokeWidth={isSelected ? (isMobile ? '8' : '4') : '2'}
                className={`cursor-pointer transition-all duration-300 ${!isMobile ? 'hover:stroke-gray-400' : ''}`}
                onClick={() => onKeySelect(key)}
              />
              <text
                {...getTextPosition(index, (outerRadius + innerRadius) / 2)}
                textAnchor="middle"
                dominantBaseline="middle"
                className="pointer-events-none select-none font-medium"
                fill={isSelected ? '#1A202C' : '#4A4A4A'}
                fontSize={isMobile ? '36' : '16'}
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

          return (
            <g key={`minor-${key}`}>
              <path
                d={createSegmentPath(index, innerRadius, innerCircleRadius)}
                fill={minorKeyData.color}
                fillOpacity={0.5}
                stroke={isSelected ? '#FB923C' : '#FFFFFF'}
                strokeWidth={isSelected ? (isMobile ? '6' : '3') : '2'}
                className={`cursor-pointer transition-all duration-300 ${!isMobile ? 'hover:stroke-gray-400' : ''}`}
                onClick={() => onKeySelect(key)}
              />
              {key === 'D#m/Ebm' ? (
                <text
                  {...getTextPosition(
                    index,
                    (innerRadius + innerCircleRadius) / 2
                  )}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="pointer-events-none select-none"
                  fill={isSelected ? '#1A202C' : '#6B6B6B'}
                  fontSize={isMobile ? '32' : '12'}
                >
                  <tspan
                    x={
                      getTextPosition(
                        index,
                        (innerRadius + innerCircleRadius) / 2
                      ).x
                    }
                    dy="-8"
                  >
                    D#m
                  </tspan>
                  <tspan
                    x={
                      getTextPosition(
                        index,
                        (innerRadius + innerCircleRadius) / 2
                      ).x
                    }
                    dy="26"
                  >
                    Ebm
                  </tspan>
                </text>
              ) : (
                <text
                  {...getTextPosition(
                    index,
                    (innerRadius + innerCircleRadius) / 2
                  )}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="pointer-events-none select-none"
                  fill={isSelected ? '#1A202C' : '#6B6B6B'}
                  fontSize={isMobile ? '32' : '13'}
                >
                  {key}
                </text>
              )}
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
          const sigDisplay = getKeySignatureDisplay(keyData, key)
          if (!sigDisplay) return null

          const { x, y } = getTextPosition(
            index,
            outerRadius + (isMobile ? 30 : 35)
          )

          return (
            <text
              key={`sig-${key}`}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-gray-500"
              fontSize={isMobile ? '22' : '12'}
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
