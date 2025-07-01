// Generate unique IDs for scores
export function generateId(): string {
  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).substring(2, 15)
  return `score_${timestamp}_${randomPart}`
}
