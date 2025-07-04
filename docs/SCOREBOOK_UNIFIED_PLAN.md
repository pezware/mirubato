# Scorebook Collections Simplification Plan

## Overview

This document outlines the plan to simplify the collections system in Mirubato, treating collections as lightweight organizational tags while maintaining essential use cases for personal organization and educational content curation.

## Key Principles

1. **Collections as Lightweight Tags**: Collections are user-created organizational containers, not heavyweight objects
2. **Independent Visibility**: Scores and collections have separate visibility controls - scores remain publicly accessible
3. **Purpose-Driven**: Collections serve specific user purposes (personal practice, teaching materials, platform curation)
4. **Simple UI**: Reduce complexity while preserving essential functionality

## Current State Issues

1. **Over-engineered Collections**: Too many properties and features (sharing, visibility states, owner types)
2. **Complex UI**: Multiple tabs, modals, and management interfaces
3. **Confusing Permissions**: Teacher-specific sharing, derived visibility, multiple access patterns
4. **Redundant UI Elements**: Collections appear in score upload panel unnecessarily

## Target State

### Collection Model (Simplified)

```typescript
interface Collection {
  id: string
  name: string
  slug: string
  description?: string
  ownerId: string
  visibility: 'private' | 'public' // Only two states
  featured: boolean // Admin-curated collections
  scoreIds: string[] // Scores in this collection
  createdAt: Date
  updatedAt: Date
}
```

### Use Cases Preserved

1. **Personal Organization**
   - Users create private collections for their practice goals
   - "My December pieces", "Working on rhythm", "Exam prep"
   - Only visible to the owner

2. **Teaching Materials**
   - Teachers create public collections for students
   - "Piano Grade 3 Exam Prep", "Summer recital pieces"
   - Students access via collection URL or browse

3. **Platform Curation**
   - Admins feature high-quality collections
   - "Best Bach for beginners", "Essential jazz standards"
   - Prominently displayed for all users

## Implementation Plan

### Phase 1: UI Cleanup

1. **Remove Collection Elements from Score Upload Panel**
   - Remove "My Collections" section from ScoreManagement.tsx
   - Remove "Browse Collections" section from score upload interface
   - Keep only score upload functionality (PDF, Images, URL)

2. **Remove Legacy Components**
   - Delete `/components/scorebook/ScoreImport.tsx` (if exists)
   - Remove any duplicate or unused collection components
   - Clean up unused imports and references

### Phase 2: Simplify Collections UI

1. **Streamline Collection Manager**
   - Remove "Shared with Me" tab
   - Keep only "My Collections" and "Featured" tabs
   - Use UI component library (Button, Modal, Card components)
   - Add proper i18n translations

2. **Simplify Collection Creation**
   - Simple form with name, description, visibility toggle
   - Clear public/private distinction with helper text
   - No complex sharing options

3. **Update Score Browser**
   - Show collections as simple badges on scores
   - Click collection badge to filter by that collection
   - Featured collections shown prominently at top

### Phase 3: Backend Simplification

1. **Database Schema Updates**

   ```sql
   -- Remove unused columns
   ALTER TABLE user_collections
   DROP COLUMN owner_type,
   DROP COLUMN shared_with,
   DROP COLUMN collection_type;

   -- Simplify visibility
   ALTER TABLE user_collections
   MODIFY visibility ENUM('private', 'public') NOT NULL DEFAULT 'private';
   ```

2. **API Endpoint Consolidation**
   - Remove `/api/user-collections/shared` endpoints
   - Simplify collection queries
   - Remove complex permission checking

3. **Migration Script**
   - Convert existing visibility states to public/private
   - Remove shared collections (convert to public if needed)
   - Clean up orphaned data

### Phase 4: Integration Improvements

1. **Add to Collection Flow**
   - Simplify AddToCollectionModal
   - Show only user's collections + option to create new
   - One-click add/remove with proper loading states

2. **Collection Browsing**
   - Unified view: Featured → Public → My Collections
   - Simple filtering and search
   - Clean, card-based layout using UI components

3. **Score Integration**
   - Add "Import Score" button to main scorebook view
   - Modal-based import (not separate page)
   - After import, option to add to collections

## UI Component Usage

All UI updates must use the Mirubato component library:

```typescript
import { Button, Modal, Card, Input, Select, Toast } from '@/components/ui'
```

- No native HTML buttons, inputs, or modals
- Consistent styling with design system
- Proper loading states and error handling

## Internationalization

All user-facing text must use i18n:

```typescript
import { useTranslation } from 'react-i18next'

const { t } = useTranslation('scorebook')
// Use: t('collections.createNew')
```

## Success Metrics

1. **Reduced Complexity**
   - 50% fewer database fields
   - 30% less UI code
   - Simpler mental model for users

2. **Preserved Functionality**
   - All three use cases still work
   - No loss of essential features
   - Better user experience

3. **Technical Improvements**
   - Consistent UI component usage
   - Proper i18n support
   - Cleaner, more maintainable code

## Timeline

- **Week 1**: UI cleanup and component removal
- **Week 2**: Collection system simplification
- **Week 3**: Testing and migration scripts
- **Week 4**: Documentation and deployment

## Next Steps

1. Begin with removing collection elements from score upload panel
2. Update collection manager to use simplified model
3. Create migration scripts for database changes
4. Update API endpoints to match new model
5. Comprehensive testing of all use cases
