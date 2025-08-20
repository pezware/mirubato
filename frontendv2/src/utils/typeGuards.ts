/**
 * Type guards for safer type checking
 * Replace type assertions (as) with proper type guards
 */

/**
 * Check if a value is an Error instance
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error
}

/**
 * Check if a value is an Error with a message
 */
export function isErrorWithMessage(
  error: unknown
): error is { message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  )
}

/**
 * Get error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message
  }
  if (isErrorWithMessage(error)) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'An unknown error occurred'
}

/**
 * Check if a value is a valid HTML element
 */
export function isHTMLElement(value: unknown): value is HTMLElement {
  return value instanceof HTMLElement
}

/**
 * Check if a value is a valid input element
 */
export function isInputElement(value: unknown): value is HTMLInputElement {
  return value instanceof HTMLInputElement
}

/**
 * Check if a value is a valid textarea element
 */
export function isTextAreaElement(
  value: unknown
): value is HTMLTextAreaElement {
  return value instanceof HTMLTextAreaElement
}

/**
 * Check if a value is a valid select element
 */
export function isSelectElement(value: unknown): value is HTMLSelectElement {
  return value instanceof HTMLSelectElement
}

/**
 * Check if a value is a form element (input, textarea, or select)
 */
export function isFormElement(
  value: unknown
): value is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  return (
    isInputElement(value) || isTextAreaElement(value) || isSelectElement(value)
  )
}

/**
 * Check if a value is a valid KeyboardEvent
 */
export function isKeyboardEvent(value: unknown): value is KeyboardEvent {
  return value instanceof KeyboardEvent
}

/**
 * Check if a value is a valid MouseEvent
 */
export function isMouseEvent(value: unknown): value is MouseEvent {
  return value instanceof MouseEvent
}

/**
 * Check if a value is an array
 */
export function isArray<T = unknown>(value: unknown): value is T[] {
  return Array.isArray(value)
}

/**
 * Check if a value is a non-null object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Check if a value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string'
}

/**
 * Check if a value is a number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value)
}

/**
 * Check if a value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

/**
 * Check if a value is null or undefined
 */
export function isNullish(value: unknown): value is null | undefined {
  return value === null || value === undefined
}

/**
 * Check if a value is defined (not null or undefined)
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}

/**
 * Type guard for checking if an object has a specific property
 */
export function hasProperty<K extends PropertyKey>(
  obj: unknown,
  prop: K
): obj is Record<K, unknown> {
  return isObject(obj) && prop in obj
}

/**
 * Type guard for checking multiple properties
 */
export function hasProperties<K extends PropertyKey>(
  obj: unknown,
  props: K[]
): obj is Record<K, unknown> {
  return isObject(obj) && props.every(prop => prop in obj)
}

/**
 * Parse JSON safely with type guard
 */
export function parseJsonSafely<T = unknown>(
  json: string,
  validator?: (value: unknown) => value is T
): T | null {
  try {
    const parsed = JSON.parse(json)
    if (validator && !validator(parsed)) {
      return null
    }
    return parsed as T
  } catch {
    return null
  }
}

/**
 * Assert that a value is defined (throws if not)
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message = 'Value is not defined'
): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message)
  }
}

/**
 * Assert that a condition is true
 */
export function assert(
  condition: unknown,
  message = 'Assertion failed'
): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

/**
 * Narrow type to exclude null and undefined
 */
export function nonNullable<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined
}
