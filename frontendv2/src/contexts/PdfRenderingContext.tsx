import React, { createContext, useMemo } from 'react'
import {
  PdfRenderingService,
  getRenderingService,
} from '../services/PdfRenderingService'
import type { RenderingConfig } from '../services/PdfRenderingService'

export const PdfRenderingContext = createContext<PdfRenderingService | null>(
  null
)

interface PdfRenderingProviderProps {
  children: React.ReactNode
  config?: Partial<RenderingConfig>
}

export const PdfRenderingProvider: React.FC<PdfRenderingProviderProps> = ({
  children,
  config,
}) => {
  const service = useMemo(() => {
    const defaultConfig: RenderingConfig = {
      maxCachedPages: 50,
      maxMemoryMB: 100,
      preloadStrategy: 'adjacent',
      mobileOptimizations: window.innerWidth < 768,
    }

    return getRenderingService({
      ...defaultConfig,
      ...config,
    })
  }, [config])

  return (
    <PdfRenderingContext.Provider value={service}>
      {children}
    </PdfRenderingContext.Provider>
  )
}
