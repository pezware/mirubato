import React from 'react'
import { useCurrentFrame, useVideoConfig } from 'remotion'
import { ChapterTitle } from '../components/ChapterTitle'
import { ArchitectureBox } from '../components/ArchitectureBox'
import { theme } from '../theme/mirubato'
import { fadeIn, staggeredAppearance } from '../utils/animations'

export const Architecture: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const titleOpacity = fadeIn(frame, 0, fps * 0.3)

  // Cloud header
  const cloudOpacity = fadeIn(frame, fps * 0.3, fps * 0.3)

  // Services (staggered appearance) - Core services only, no beta features
  const services = ['Frontend', 'API', 'Sync']
  const storages = ['D1 Database', 'KV Cache', 'WebSockets']

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: theme.colors.background,
        position: 'relative',
        padding: '5%',
      }}
    >
      <ChapterTitle
        title="Architecture"
        subtitle="Built on Cloudflare edge infrastructure"
        opacity={titleOpacity}
      />

      {/* Cloudflare Edge Network Header */}
      <div
        style={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          transform: 'translateX(-50%)',
          opacity: cloudOpacity,
        }}
      >
        <ArchitectureBox
          label="Cloudflare Edge Network"
          sublabel="300+ Global Locations"
          variant="cloud"
        />
      </div>

      {/* Services Row */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '10%',
          right: '10%',
          display: 'flex',
          justifyContent: 'space-around',
        }}
      >
        {services.map((service, index) => {
          const serviceOpacity = staggeredAppearance(
            frame - fps * 1.5,
            index,
            10
          )
          return (
            <div key={service} style={{ opacity: serviceOpacity }}>
              <ArchitectureBox
                label={service}
                sublabel="Worker"
                variant="service"
                scale={serviceOpacity}
              />
            </div>
          )
        })}
      </div>

      {/* Connection Lines */}
      {frame > fps * 1 && (
        <svg
          style={{
            position: 'absolute',
            top: '38%',
            left: '10%',
            right: '10%',
            width: '80%',
            height: '20%',
            pointerEvents: 'none',
          }}
        >
          {services.map((_, index) => {
            const lineOpacity = fadeIn(frame, fps * 1 + index * 3, fps * 0.2)
            const xPercent = 10 + (80 / (services.length - 1)) * index
            return (
              <line
                key={index}
                x1="50%"
                y1="15%"
                x2={`${xPercent}%`}
                y2="85%"
                stroke={theme.colors.primaryLight}
                strokeWidth="2"
                opacity={lineOpacity}
                strokeDasharray="5,5"
              />
            )
          })}
        </svg>
      )}

      {/* Storage Row */}
      <div
        style={{
          position: 'absolute',
          top: '72%',
          left: '20%',
          right: '20%',
          display: 'flex',
          justifyContent: 'space-around',
        }}
      >
        {storages.map((storage, index) => {
          const storageOpacity = staggeredAppearance(
            frame - fps * 1.8,
            index,
            10
          )
          return (
            <div key={storage} style={{ opacity: storageOpacity }}>
              <ArchitectureBox
                label={storage}
                variant="storage"
                scale={storageOpacity}
              />
            </div>
          )
        })}
      </div>

      {/* Storage Connection Lines */}
      {frame > fps * 2.2 && (
        <svg
          style={{
            position: 'absolute',
            top: '62%',
            left: '20%',
            right: '20%',
            width: '60%',
            height: '15%',
            pointerEvents: 'none',
          }}
        >
          {storages.map((_, index) => {
            const lineOpacity = fadeIn(frame, fps * 2.2 + index * 3, fps * 0.2)
            const xPercent = (100 / (storages.length - 1)) * index
            return (
              <line
                key={index}
                x1="50%"
                y1="0%"
                x2={`${xPercent}%`}
                y2="100%"
                stroke={theme.colors.accentAlt}
                strokeWidth="2"
                opacity={lineOpacity}
                strokeDasharray="3,3"
              />
            )
          })}
        </svg>
      )}

      {/* Performance metrics */}
      {frame > fps * 2.8 && (
        <div
          style={{
            position: 'absolute',
            bottom: '8%',
            left: '10%',
            right: '10%',
            display: 'flex',
            justifyContent: 'center',
            gap: theme.spacing['3xl'],
            opacity: fadeIn(frame, fps * 2.8, fps * 0.3),
          }}
        >
          {[
            { label: 'Global Edge', value: '300+' },
            { label: 'Latency', value: '<50ms' },
            { label: 'Uptime', value: '99.9%' },
          ].map((metric, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontSize: theme.fontSizes['3xl'],
                  fontFamily: theme.fonts.ui,
                  fontWeight: 600,
                  color: theme.colors.accentAlt,
                }}
              >
                {metric.value}
              </div>
              <div
                style={{
                  fontSize: theme.fontSizes.base,
                  fontFamily: theme.fonts.ui,
                  color: theme.colors.textMuted,
                }}
              >
                {metric.label}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
