import React from 'react'
import { theme } from '../theme/mirubato'

interface ArchitectureBoxProps {
  label: string
  sublabel?: string
  variant?: 'service' | 'storage' | 'cloud'
  opacity?: number
  scale?: number
}

export const ArchitectureBox: React.FC<ArchitectureBoxProps> = ({
  label,
  sublabel,
  variant = 'service',
  opacity = 1,
  scale = 1,
}) => {
  const getColors = () => {
    switch (variant) {
      case 'service':
        return {
          bg: theme.colors.primary,
          border: theme.colors.primaryLight,
          text: theme.colors.textPrimary,
        }
      case 'storage':
        return {
          bg: theme.colors.backgroundLighter,
          border: theme.colors.accentAlt,
          text: theme.colors.textPrimary,
        }
      case 'cloud':
        return {
          bg: 'transparent',
          border: theme.colors.accent,
          text: theme.colors.accent,
        }
      default:
        return {
          bg: theme.colors.primary,
          border: theme.colors.primaryLight,
          text: theme.colors.textPrimary,
        }
    }
  }

  const colors = getColors()

  return (
    <div
      style={{
        backgroundColor: colors.bg,
        border: `2px solid ${colors.border}`,
        borderRadius: '0.75rem',
        padding: `${theme.spacing.md} ${theme.spacing.lg}`,
        opacity,
        transform: `scale(${scale})`,
        transformOrigin: 'center',
        textAlign: 'center',
        minWidth: '150px',
        boxShadow: variant !== 'cloud' ? theme.shadows.box : 'none',
      }}
    >
      <div
        style={{
          fontSize: theme.fontSizes.lg,
          fontFamily: theme.fonts.ui,
          fontWeight: 600,
          color: colors.text,
          margin: 0,
        }}
      >
        {label}
      </div>
      {sublabel && (
        <div
          style={{
            fontSize: theme.fontSizes.sm,
            fontFamily: theme.fonts.ui,
            color: theme.colors.textMuted,
            marginTop: theme.spacing.xs,
          }}
        >
          {sublabel}
        </div>
      )}
    </div>
  )
}
