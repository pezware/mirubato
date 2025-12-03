import { useState, useEffect } from 'react'
import { ToastContainer, type ToastProps } from '@mirubato/ui'
import { subscribeToToasts, hideToast } from '@/utils/toastManager'

export function ToastProvider() {
  const [toasts, setToasts] = useState<ToastProps[]>([])

  useEffect(() => {
    // Subscribe to toast updates
    const unsubscribe = subscribeToToasts(newToasts => {
      setToasts(newToasts)
    })

    return unsubscribe
  }, [])

  return <ToastContainer toasts={toasts} onClose={hideToast} />
}
