import { useContext } from 'react'
import { PdfRenderingContext } from '../contexts/PdfRenderingContext'

export const usePdfRenderingService = () => {
  const service = useContext(PdfRenderingContext)
  if (!service) {
    throw new Error(
      'usePdfRenderingService must be used within PdfRenderingProvider'
    )
  }
  return service
}
