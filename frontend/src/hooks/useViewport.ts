import { useState, useEffect } from 'react'

export const useViewport = () => {
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth)

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const isMobile = viewportWidth < 640
  const isTablet = viewportWidth >= 640 && viewportWidth < 1024
  const isDesktop = viewportWidth >= 1024

  return {
    viewportWidth,
    isMobile,
    isTablet,
    isDesktop,
  }
}
