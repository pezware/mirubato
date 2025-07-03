// Type definitions for the enhanced collections system

export type UserRole = 'user' | 'teacher' | 'admin'

export type CollectionVisibility = 'private' | 'public' | 'unlisted'

export type CollectionOwnerType = 'user' | 'admin' | 'teacher'

export type CollectionType = 'personal' | 'professional' | 'platform'

export interface User {
  id: string
  email: string
  displayName?: string
  role: UserRole
  primaryInstrument?: 'PIANO' | 'GUITAR' | 'BOTH'
  createdAt: Date
  updatedAt: Date
}

export interface Collection {
  id: string
  userId: string
  name: string
  description?: string
  slug: string
  visibility: CollectionVisibility
  isDefault: boolean
  collectionType: CollectionType
  ownerType: CollectionOwnerType
  tags: string[]
  displayOrder: number
  sharedWith: string[] // User IDs for teacher sharing
  featuredAt?: Date
  featuredBy?: string // Admin user ID who featured it
  createdAt: Date
  updatedAt: Date
}

export interface CollectionWithScores extends Collection {
  scores: Score[]
  scoreCount: number
}

export interface Score {
  id: string
  title: string
  composer: string
  opus?: string
  instrument: 'PIANO' | 'GUITAR' | 'BOTH'
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  visibility: CollectionVisibility
  derivedVisibility?: CollectionVisibility // Inherited from collections
  userId?: string // Owner for user-uploaded scores
  tags: string[]
  metadata: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export interface CollectionMember {
  id: string
  collectionId: string
  scoreId: string
  displayOrder: number
  addedAt: Date
}

export interface CollectionVisibilityLog {
  id: string
  collectionId: string
  scoreId: string
  oldVisibility?: CollectionVisibility
  newVisibility: CollectionVisibility
  changedBy: string
  changedAt: Date
}

// API Request/Response types

export interface CreateCollectionRequest {
  name: string
  description?: string
  visibility?: CollectionVisibility
  tags?: string[]
}

export interface UpdateCollectionRequest {
  name?: string
  description?: string
  visibility?: CollectionVisibility
  tags?: string[]
  displayOrder?: number
}

export interface ShareCollectionRequest {
  userIds: string[]
  message?: string
}

export interface AddScoreToCollectionRequest {
  scoreId: string
}

export interface BulkAddScoresToCollectionRequest {
  scoreIds: string[]
}

export interface FeatureCollectionRequest {
  collectionId: string
  displayOrder?: number
}

export interface CollectionPermissions {
  canRead: boolean
  canWrite: boolean
  canDelete: boolean
  canShare: boolean
  canFeature: boolean
}

// Helper functions for permission checking

export function getCollectionPermissions(
  collection: Collection,
  user: User | null
): CollectionPermissions {
  if (!user) {
    // Anonymous users can only read public/featured collections
    return {
      canRead: collection.visibility === 'public' || !!collection.featuredAt,
      canWrite: false,
      canDelete: false,
      canShare: false,
      canFeature: false,
    }
  }

  const isOwner = collection.userId === user.id
  const isAdmin = user.role === 'admin'
  const isTeacher = user.role === 'teacher'
  const isSharedWith = collection.sharedWith.includes(user.id)

  return {
    canRead:
      isOwner || isAdmin || isSharedWith || collection.visibility === 'public',
    canWrite: isOwner || isAdmin,
    canDelete: (isOwner && !collection.isDefault) || isAdmin,
    canShare: (isOwner && isTeacher) || isAdmin,
    canFeature: isAdmin,
  }
}

export function canUserSeeScore(
  score: Score,
  user: User | null,
  userCollections: Collection[] = []
): boolean {
  // Public scores are always visible
  if (score.visibility === 'public' || score.derivedVisibility === 'public') {
    return true
  }

  if (!user) {
    return false
  }

  // Owner can always see their own scores
  if (score.userId === user.id) {
    return true
  }

  // Admins can see all scores
  if (user.role === 'admin') {
    return true
  }

  // Check if score is in any collection the user has access to
  return userCollections.some(collection => {
    const hasAccess = getCollectionPermissions(collection, user).canRead
    // Would need to check if score is in this collection
    return hasAccess
  })
}

// Constants for system collections
export const SYSTEM_COLLECTIONS = {
  BEGINNER_PIANO: 'featured-beginner-piano',
  BEGINNER_GUITAR: 'featured-beginner-guitar',
  INTERMEDIATE_PIANO: 'featured-intermediate-piano',
  ADVANCED_GUITAR: 'featured-advanced-guitar',
  SIGHT_READING: 'featured-sight-reading',
  POPULAR_CLASSICS: 'featured-popular-classics',
} as const

export const DEFAULT_COLLECTION_NAME = 'General'
export const SYSTEM_USER_ID = 'system'
