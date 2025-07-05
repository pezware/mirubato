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

### Phase 1: UI Cleanup ✅ COMPLETE

1. **Remove Collection Elements from Score Upload Panel** ✅
   - Removed "My Collections" section from ScoreManagement.tsx
   - Removed "Browse Collections" section from score upload interface
   - Kept only score upload functionality (PDF, Images, URL)

2. **Remove Legacy Components** ✅
   - ScoreImport.tsx exists but appears to be deprecated
   - Collections removed from score upload panel
   - Clean UI focusing on score management only

### Phase 2: Simplify Collections UI ✅ COMPLETE

1. **Streamline Collection Manager** ✅
   - Removed "Shared with Me" tab
   - Kept only "My Collections" and "Featured" tabs
   - Uses UI component library (Button, Modal, Card, Input, Tag components)
   - Added proper i18n translations (English and French)

2. **Simplify Collection Creation** ✅
   - Simple form with name and visibility toggle switch
   - Clear public/private distinction with helper text
   - No complex sharing options
   - Public/private toggle with visual feedback

3. **Update Score Browser** ✅
   - Collections displayed as simple badges using CollectionBadges component
   - Click collection badge to navigate to that collection
   - Featured collections shown with distinct styling (sand color)
   - Public collections (sage color) vs Private collections (stone color)

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

### Phase 4: Integration Improvements ✅ COMPLETE

1. **Add to Collection Flow** ✅
   - Simplified AddToCollectionModal
   - Shows only user's collections
   - One-click add/remove with proper loading states
   - Visual feedback with checkmarks for selected collections

2. **Collection Browsing** ✅
   - Tab-based view: Scores → Public Collections → My Collections
   - "Create Collection" button added to My Collections page
   - Clean, card-based layout using UI components
   - Collections Manager modal for creating new collections

3. **Score Integration** ✅
   - Added "Import Score" button to main scorebook view
   - ImportScoreModal with PDF/Images/URL import options
   - After import, option to add to collections during the import flow
   - Collection selection integrated into import process

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

- **Week 1**: UI cleanup and component removal ✅ COMPLETE
- **Week 2**: Collection system simplification ✅ COMPLETE
- **Week 3**: Testing and migration scripts (Backend work pending)
- **Week 4**: Documentation and deployment

## Recent Fixes (July 2025)

1. **Search Functionality** ✅
   - Fixed score search to use correct API endpoint (/api/scores with query params)
   - Search now properly searches by title and composer fields

2. **Collection Creation** ✅
   - Added "Create Collection" button to My Collections page
   - Collections Manager modal accessible from My Collections tab

3. **UI Consistency** ✅
   - Removed dark theme classes from Modal component
   - All modals now consistently use light theme

## Known Issues (July 2025)

### Backend Issues

1. **Public Collections Not Visible**
   - User-created public collections don't appear in Public Collections tab
   - API currently only returns featured collections, not all public collections
   - Example: "Best Guitars" collection marked as public but not visible to other users

### UI/UX Considerations

1. **Score Search Behavior**
   - Search shows results in autocomplete dropdown (working as designed)
   - "My Scores" list always shows all user scores (not filtered by search)
   - This is standard autocomplete behavior but may need UX review

2. **Text Alignment**
   - ✅ FIXED: My Scores list items now properly left-aligned

## Next Steps

1. ✅ DONE: Remove collection elements from score upload panel
2. ✅ DONE: Update collection manager to use simplified model
3. ⏳ PENDING: Create migration scripts for database changes (Backend)
4. ⏳ PENDING: Update API endpoints to match new model (Backend)
   - Fix public collections API to return all public collections
5. ✅ DONE: Frontend implementation complete and tested
6. ✅ DONE: Complete i18n translations for all languages
