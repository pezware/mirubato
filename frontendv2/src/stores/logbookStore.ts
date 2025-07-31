/**
 * Legacy logbookStore - redirects to new V2 implementation
 * This maintains backward compatibility during the transition
 */

// Re-export everything from the new implementation
export * from './logbookStore-v2'

// Legacy compatibility layer
console.warn(
  '[LogbookStore] Using legacy import - consider updating to logbookStore-v2'
)
