# Enhanced Collections System Design

## Overview

The Mirubato Collections system has been redesigned as a flexible tag-based system with role-based access control, visibility inheritance, and namespace isolation. This document describes the implemented backend architecture and planned frontend interface.

## Design Principles

1. **Tag-Based System**: Collections are essentially tags with many-to-many relationships to scores
2. **User Namespace Isolation**: Multiple users can have collections with the same name (e.g., "Practice")
3. **Role-Based Access**: Different capabilities for admin, teacher, and regular users
4. **Visibility Inheritance**: Scores inherit visibility from their most permissive collection
5. **Privacy by Default**: User uploads are private unless explicitly shared

## User Roles

### Admin (email ends with @mirubato.com)

- Create and manage featured collections visible to all users
- Feature/unfeature any collection
- View and manage all collections in the system
- Full access to all scores and collections

### Teacher

- Share collections with specific students
- Request collections to be featured
- All regular user capabilities
- View shared collection analytics

### User

- Create unlimited personal collections
- Organize scores with drag & drop
- View featured collections
- Access collections shared with them

## Key Features

### 1. Collection Types

**Personal Collections** (user-created)

- Private by default
- Can be named anything (namespace isolated)
- Can be shared by teachers
- Scores inherit visibility settings

**Featured Collections** (admin-curated)

- Public and visible to all users
- Displayed prominently in UI
- Ordered by admin preference
- Make all contained scores public

**Shared Collections** (teacher functionality)

- Teacher shares with specific user IDs
- Recipients see in "Shared with me" section
- Original owner maintains control
- Can be unshared at any time

### 2. Visibility Rules

- **Score Base Visibility**: Set by owner (private/public/unlisted)
- **Derived Visibility**: Inherited from collections
- **Most Permissive Wins**: If a score is in any public collection, it becomes public
- **Automatic Updates**: Adding/removing from collections updates visibility
- **Audit Trail**: All visibility changes are logged

### 3. Default Behavior

- Every user gets a default "General" collection
- All new uploads automatically go to General collection
- User uploads default to private
- Anonymous uploads default to public
- Collections can be created on-demand

### 4. Collection Operations

**CRUD Operations**

- Create: Name, description, tags
- Read: List with score counts, filter by visibility
- Update: Name, description, visibility, order
- Delete: Not allowed for default collection

**Score Management**

- Add scores to multiple collections
- Remove scores from collections
- Bulk operations support
- Drag & drop organization

**Sharing (Teachers)**

- Share with user IDs
- Optional message to recipients
- Batch sharing support
- Revoke access anytime

## Database Schema

### Key Tables

**user_collections**

- Enhanced with owner_type, shared_with fields
- Supports featured_at, featured_by for admin curation
- Tracks collection type and visibility

**collection_members**

- Many-to-many relationship table
- Maintains display order
- Prevents duplicate entries

**collection_visibility_log**

- Tracks all visibility changes
- Records who made changes
- Audit trail for compliance

### API Endpoints

**Public Access**

- GET /api/collections/featured

**Authenticated Users**

- GET/POST/PUT/DELETE /api/user/collections
- POST/DELETE /api/user/collections/:id/scores

**Teachers Only**

- GET /api/collections/shared/with-me
- GET /api/collections/shared/by-me
- POST/DELETE /api/collections/shared/:id/share

**Admins Only**

- POST /api/collections/featured/feature
- DELETE /api/collections/featured/feature/:id
- PUT /api/collections/featured/order

## Frontend Design (To Be Implemented)

### Collections Management UI

- Tag-like interface similar to logbook
- Inline creation and editing
- Drag & drop score organization
- Bulk selection tools

### Score Browser Updates

- Featured collections carousel
- Collection filter sidebar
- "Shared with me" section
- Collection badges on score cards

### Teacher Dashboard

- Share collection modal
- Student picker interface
- Sharing history view
- Analytics on shared collections

### Admin Interface

- Feature/unfeature controls
- Drag to reorder featured
- Collection analytics
- User management

## Security Considerations

1. **JWT-based authentication** for all protected endpoints
2. **Role verification** on every request
3. **Ownership checks** before modifications
4. **Rate limiting** on collection operations
5. **Audit logging** for all changes

## Implementation Status

✅ **Backend Complete**:

- Database migrations executed
- All API endpoints implemented
- Role-based permissions active
- Visibility inheritance working
- Default collection creation automated

🚧 **Frontend Pending**:

- React components need to be built
- UI/UX design to be finalized
- Integration with existing score browser
- Testing with real users

## Next Steps

1. Build Collections Management component
2. Update ScoreBrowser with collections
3. Create teacher sharing interface
4. Implement admin dashboard
5. Add e2e tests for workflows
6. Deploy to staging for UAT
