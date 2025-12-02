import { Fragment, ReactNode } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { X } from 'lucide-react'
import { cn } from '../utils/cn'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  showCloseButton?: boolean
  closeOnOverlayClick?: boolean
  className?: string
  isMobileOptimized?: boolean
}

const sizeClasses = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
  full: 'sm:max-w-full sm:m-4',
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  className,
  isMobileOptimized = false,
}: ModalProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        onClose={closeOnOverlayClick ? onClose : () => {}}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div
            className={cn(
              'flex min-h-full justify-center p-2 sm:p-4 text-center',
              isMobileOptimized ? 'items-end sm:items-center' : 'items-center'
            )}
          >
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel
                className={cn(
                  'w-full transform rounded-2xl bg-white p-4 sm:p-6 text-left align-middle shadow-xl transition-all',
                  sizeClasses[size],
                  isMobileOptimized && [
                    'max-h-[85vh]', // Use viewport height for better compatibility
                    'sm:max-h-[90vh]',
                    'overflow-hidden', // Panel itself doesn't scroll
                    'flex flex-col', // Make it a flex container
                  ],
                  !isMobileOptimized && 'overflow-hidden',
                  className
                )}
              >
                {(title || showCloseButton) && (
                  <div className="mb-4 flex items-center justify-between flex-shrink-0">
                    {title && (
                      <Dialog.Title
                        as="h3"
                        className="text-lg font-medium leading-6 text-gray-900"
                      >
                        {title}
                      </Dialog.Title>
                    )}
                    {showCloseButton && (
                      <button
                        type="button"
                        className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
                        onClick={onClose}
                      >
                        <X className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                )}
                <div
                  className={cn(
                    'flex-1 min-h-0', // This is key for flex children to be scrollable
                    isMobileOptimized
                      ? 'overflow-y-auto overscroll-contain -mx-4 px-4' // Better scrolling on mobile
                      : '',
                    !isMobileOptimized && 'overflow-visible'
                  )}
                >
                  {children}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

interface ModalFooterProps {
  children: ReactNode
  className?: string
}

export function ModalFooter({ children, className }: ModalFooterProps) {
  return (
    <div className={cn('mt-6 flex justify-end gap-3', className)}>
      {children}
    </div>
  )
}

interface ModalBodyProps {
  children: ReactNode
  className?: string
}

export function ModalBody({ children, className }: ModalBodyProps) {
  return (
    <div className={cn('text-gray-600 dark:text-gray-300', className)}>
      {children}
    </div>
  )
}
