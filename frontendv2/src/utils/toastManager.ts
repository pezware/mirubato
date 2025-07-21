import { ToastProps } from '@/components/ui/Toast'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastManager {
  listeners: Set<(toasts: ToastProps[]) => void>
  toasts: ToastProps[]
}

const toastManager: ToastManager = {
  listeners: new Set(),
  toasts: [],
}

export function showToast(
  message: string,
  type: ToastType = 'info',
  title?: string,
  duration?: number
) {
  const id = Date.now().toString()
  const toast: ToastProps = {
    id,
    message,
    type,
    title,
    duration,
    onClose: hideToast,
  }

  toastManager.toasts = [...toastManager.toasts, toast]
  notifyListeners()
}

export function hideToast(id: string) {
  toastManager.toasts = toastManager.toasts.filter(toast => toast.id !== id)
  notifyListeners()
}

export function clearToasts() {
  toastManager.toasts = []
  notifyListeners()
}

export function subscribeToToasts(listener: (toasts: ToastProps[]) => void) {
  toastManager.listeners.add(listener)
  return () => {
    toastManager.listeners.delete(listener)
  }
}

export function getToasts(): ToastProps[] {
  return toastManager.toasts
}

function notifyListeners() {
  toastManager.listeners.forEach(listener => {
    listener(toastManager.toasts)
  })
}
