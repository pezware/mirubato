import React from 'react'
import { theme } from '../theme/mirubato'

interface ChapterTitleProps {
  title: string
  subtitle?: string
  opacity?: number
  scale?: number
}

export const ChapterTitle: React.FC<ChapterTitleProps> = ({
  title,
  subtitle,
  opacity = 1,
  scale = 1,
}) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: '10%',
        left: '10%',
        right: '10%',
        opacity,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
      }}
    >
      <h1
        style={{
          fontSize: theme.fontSizes['6xl'],
          fontWeight: 300,
          fontFamily: theme.fonts.headers,
          color: theme.colors.textPrimary,
          margin: 0,
          textShadow: theme.shadows.text,
          letterSpacing: '-0.02em',
        }}
      >
        {title}
      </h1>
      {subtitle && (
        <p
          style={{
            fontSize: theme.fontSizes['2xl'],
            fontFamily: theme.fonts.ui,
            color: theme.colors.textSecondary,
            marginTop: theme.spacing.md,
            fontWeight: 400,
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  )
}
