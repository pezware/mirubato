import { IconAlertCircle } from '@tabler/icons-react'

interface FormErrorProps {
  error?: string
  className?: string
}

export function FormError({ error, className = '' }: FormErrorProps) {
  if (!error) return null

  return (
    <div
      className={`flex items-center gap-1 mt-1 text-red-600 text-sm ${className}`}
    >
      <IconAlertCircle size={14} />
      <span>{error}</span>
    </div>
  )
}

export default FormError
