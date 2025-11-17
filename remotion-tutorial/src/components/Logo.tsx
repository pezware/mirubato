import React from 'react'
import { Img, staticFile } from 'remotion'
import { theme } from '../theme/mirubato'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  opacity?: number
  scale?: number
  showText?: boolean
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  opacity = 1,
  scale = 1,
  showText = true,
}) => {
  const getImageSize = () => {
    switch (size) {
      case 'sm':
        return 80
      case 'md':
        return 120
      case 'lg':
        return 160
      case 'xl':
        return 200
      default:
        return 120
    }
  }

  const getTextSize = () => {
    switch (size) {
      case 'sm':
        return theme.fontSizes['3xl']
      case 'md':
        return theme.fontSizes['5xl']
      case 'lg':
        return theme.fontSizes['6xl']
      case 'xl':
        return theme.fontSizes['7xl']
      default:
        return theme.fontSizes['5xl']
    }
  }

  const imageSize = getImageSize()

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
      {/* Official Mirubato Logo */}
      <Img
        src={staticFile('assets/logo.png')}
        style={{
          width: imageSize,
          height: imageSize,
          objectFit: 'contain',
        }}
      />

      {showText && (
        <>
          <h1
            style={{
              fontSize: getTextSize(),
              fontFamily: theme.fonts.headers,
              fontWeight: 300,
              color: theme.colors.textPrimary,
              margin: 0,
              marginTop: theme.spacing.lg,
              letterSpacing: '0.05em',
            }}
          >
            Mirubato
          </h1>
          <div
            style={{
              width: '80%',
              height: '2px',
              background: `linear-gradient(90deg, transparent, ${theme.colors.primary}, transparent)`,
              marginTop: theme.spacing.sm,
              borderRadius: '1px',
            }}
          />
        </>
      )}
    </div>
  )
}
