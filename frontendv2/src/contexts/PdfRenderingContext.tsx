import React, { createContext, useContext, useMemo } from 'react'
import {
  PdfRenderingService,
  getRenderingService,
} from '../services/PdfRenderingService'
import type { RenderingConfig } from '../services/PdfRenderingService'

const PdfRenderingContext = createContext<PdfRenderingService | null>(null)

export const usePdfRenderingService = () => {
  const service = useContext(PdfRenderingContext)
  if (!service) {
    throw new Error(
      'usePdfRenderingService must be used within PdfRenderingProvider'
    )
  }
  return service
}

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
