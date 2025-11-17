import React from 'react'
import { theme } from '../theme/mirubato'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  opacity?: number
  scale?: number
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  opacity = 1,
  scale = 1,
}) => {
  const getSizeValue = () => {
    switch (size) {
      case 'sm':
        return theme.fontSizes['4xl']
      case 'md':
        return theme.fontSizes['6xl']
      case 'lg':
        return theme.fontSizes['7xl']
      case 'xl':
        return '6rem'
      default:
        return theme.fontSizes['6xl']
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        opacity,
        transform: `scale(${scale})`,
        transformOrigin: 'center',
      }}
    >
      <h1
        style={{
          fontSize: getSizeValue(),
          fontFamily: theme.fonts.music,
          fontWeight: 500,
          color: theme.colors.textPrimary,
          margin: 0,
          letterSpacing: '0.05em',
          textShadow: theme.shadows.glow,
        }}
      >
        Mirubato
      </h1>
      <div
        style={{
          width: '60%',
          height: '3px',
          background: `linear-gradient(90deg, transparent, ${theme.colors.primary}, transparent)`,
          marginTop: theme.spacing.md,
          borderRadius: '2px',
        }}
      />
    </div>
  )
}
