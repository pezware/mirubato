// Import Score type
import type { Score } from '../services/scoreService'

// Collection types matching the backend implementation
export interface Collection {
  id: string
  name: string
  slug: string
  description?: string | null
  ownerId: string
  ownerType: 'user' | 'admin' | 'teacher'
  visibility: 'private' | 'public' | 'unlisted'
  tags: string[]
  featuredAt?: string | null
  featuredBy?: string | null
  displayOrder?: number | null
  sharedWith?: string[] // Array of user IDs
  scoreCount?: number
  createdAt: string
  updatedAt: string
  // For featured collections
  featuredByName?: string
  sampleScores?: Array<{
    id: string
    title: string
    composer: string
    instrument: string
    difficulty: string
  }>
  // For collections loaded with full score details
  scores?: Score[]
}

export interface UserCollectionWithScores extends Collection {
  scores: Array<{
    id: string
    title: string
    composer: string
    instrument: string
    difficulty: string
    addedAt: string
  }>
}

export interface CreateCollectionInput {
  name: string
  description?: string
  visibility?: 'private' | 'public' | 'unlisted'
  tags?: string[]
}

export interface UpdateCollectionInput {
  name?: string
  description?: string
  visibility?: 'private' | 'public' | 'unlisted'
  tags?: string[]
}

export interface CollectionPermissions {
  canView: boolean
  canEdit: boolean
  canDelete: boolean
  canShare: boolean
  canFeature: boolean
  canAddScores: boolean
  canRemoveScores: boolean
}

// Import User from auth API
import type { User } from '../api/auth'

// User roles
export type UserRole = 'user' | 'teacher' | 'admin'

// Helper functions
export function isAdmin(user: User | null): boolean {
  return (
    user?.role === 'admin' || (user?.email?.endsWith('@mirubato.com') ?? false)
  )
}

export function isTeacher(user: User | null): boolean {
  return user?.role === 'teacher' || isAdmin(user)
}

export function canShareCollections(user: User | null): boolean {
  return isTeacher(user)
}

export function canFeatureCollections(user: User | null): boolean {
  return isAdmin(user)
}
