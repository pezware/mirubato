import React from 'react'
import { theme } from '../theme/mirubato'

interface FeatureCardProps {
  title: string
  description: string
  icon?: string
  opacity?: number
  scale?: number
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  description,
  icon,
  opacity = 1,
  scale = 1,
}) => {
  return (
    <div
      style={{
        backgroundColor: theme.colors.backgroundLight,
        borderRadius: '1rem',
        padding: theme.spacing['2xl'],
        boxShadow: theme.shadows.box,
        border: `1px solid ${theme.colors.backgroundLighter}`,
        opacity,
        transform: `scale(${scale})`,
        transformOrigin: 'center',
        maxWidth: '600px',
      }}
    >
      {icon && (
        <div
          style={{
            fontSize: theme.fontSizes['4xl'],
            marginBottom: theme.spacing.md,
          }}
        >
          {icon}
        </div>
      )}
      <h3
        style={{
          fontSize: theme.fontSizes['3xl'],
          fontFamily: theme.fonts.headers,
          fontWeight: 300,
          color: theme.colors.textPrimary,
          margin: 0,
          marginBottom: theme.spacing.md,
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: theme.fontSizes.lg,
          fontFamily: theme.fonts.ui,
          color: theme.colors.textSecondary,
          margin: 0,
          lineHeight: 1.6,
        }}
      >
        {description}
      </p>
    </div>
  )
}
