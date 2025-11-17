import React from 'react'
import { theme } from '../theme/mirubato'

interface AnnotationProps {
  text: string
  position: { x: string; y: string }
  opacity?: number
  variant?: 'highlight' | 'info' | 'tech'
}

export const Annotation: React.FC<AnnotationProps> = ({
  text,
  position,
  opacity = 1,
  variant = 'highlight',
}) => {
  const getBackgroundColor = () => {
    switch (variant) {
      case 'highlight':
        return theme.colors.accent
      case 'info':
        return theme.colors.primary
      case 'tech':
        return theme.colors.accentAlt
      default:
        return theme.colors.accent
    }
  }

  const getTextColor = () => {
    switch (variant) {
      case 'highlight':
        return '#1f2937'
      case 'info':
        return theme.colors.textPrimary
      case 'tech':
        return '#0f172a'
      default:
        return '#1f2937'
    }
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        backgroundColor: getBackgroundColor(),
        color: getTextColor(),
        padding: `${theme.spacing.sm} ${theme.spacing.md}`,
        borderRadius: '0.5rem',
        fontSize: theme.fontSizes.xl,
        fontWeight: 600,
        fontFamily: theme.fonts.ui,
        boxShadow: theme.shadows.box,
        zIndex: 100,
        opacity,
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </div>
  )
}
