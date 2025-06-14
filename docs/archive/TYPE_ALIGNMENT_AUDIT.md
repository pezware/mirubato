# Type Alignment Audit - Frontend/Backend Mismatches

## Date: June 14, 2025

### Executive Summary

This audit identifies type misalignments between frontend and backend that are causing sync failures and authentication issues. The primary issues are:

1. **Optional fields being sent as `undefined`** - GraphQL doesn't accept undefined values
2. **Missing field mappings** - Some fields exist in one layer but not another
3. **Type inconsistencies** - Same data represented differently across layers

### Critical Issues Found

#### 1. **syncAnonymousData Mutation - Optional Fields**

**Problem**: Optional fields are being included with `undefined` values in GraphQL mutations.

**Location**: `frontend/src/contexts/AuthContext.tsx:258-407`

**Current Behavior**:

- The code attempts to conditionally add fields, but some edge cases still result in undefined values
- GraphQL rejects mutations with undefined values, causing sync failures

**Required Fix**:

- Ensure ALL optional fields are completely omitted from the input object when null/undefined
- Add stricter validation before sending to GraphQL

**Affected Fields**:

- Sessions: `tempo` (missing), `sheetMusicId`, `accuracy`, `notes`, `completedAt`
- Logs: `tempoPracticed`, `targetTempo`, `notes`
- Entries: `techniques`, `goalIds`, `mood`, `tags`, `metadata`
- Goals: `description`, `targetDate`, `milestones`

#### 2. **Missing tempo Field in Session Sync**

**Problem**: The `tempo` field exists in `CreatePracticeSessionInput` but is never set during sync.

**Location**: `frontend/src/contexts/AuthContext.tsx:271-296`

**Current Code**:

```typescript
const sessionInput: any = {
  sessionType: 'PRACTICE' as const,
  instrument: session.instrument,
  durationMinutes,
  status: session.completedAt
    ? ('COMPLETED' as const)
    : ('IN_PROGRESS' as const),
  createdAt: session.startedAt,
  updatedAt: session.completedAt || session.startedAt,
}
// tempo field is never added
```

**Required Fix**: Add tempo field handling if available in session data

#### 3. **Authentication Redirect Race Condition**

**Problem**: After clicking magic link, "login failed" briefly appears before successful auth.

**Likely Cause**:

- Auth state updates happen asynchronously
- Error state is set before success state propagates
- Multiple auth checks may be racing

**Location**: Auth redirect handling in `AuthContext`

#### 4. **Local Entries Not Displayed**

**Problem**: Logbook shows "No practice entries yet" despite Reports showing data.

**Root Cause**:

- Sync failures prevent data from being properly stored in D1
- Local data exists but UI queries expect synced data
- Type mismatches prevent proper data flow

### Type Definition Mismatches

#### Frontend vs Backend Type Definitions

| Field           | Frontend Type             | Backend Type             | Issue                           |
| --------------- | ------------------------- | ------------------------ | ------------------------------- |
| Session.tempo   | Not included              | `Int` (optional)         | Missing mapping                 |
| Entry.goals     | `string[]`                | `goalIds: [ID!]`         | Field name mismatch             |
| Log.targetTempo | Not included              | `Int` (optional)         | Missing in LocalPracticeSession |
| Metadata        | `Record<string, unknown>` | Specific fields expected | Type too generic                |

### Recommendations

1. **Immediate Actions**:

   - Fix the tempo field mapping in session sync
   - Add comprehensive undefined/null filtering before GraphQL mutations
   - Run `npm run codegen` after any GraphQL schema changes

2. **Short-term Fixes**:

   - Create strict type guards for GraphQL inputs
   - Add validation layer before mutations
   - Improve error messages to show exactly which fields failed

3. **Long-term Solutions**:
   - Unify type definitions in a single source of truth
   - Use code generation for all type definitions
   - Add integration tests for sync functionality

### Testing Requirements

After implementing fixes, test:

1. Guest user creating practice sessions
2. Syncing to cloud after authentication
3. Manual sync button functionality
4. Data persistence across auth states

### Files Requiring Updates

1. `frontend/src/contexts/AuthContext.tsx` - Fix optional field handling
2. `frontend/src/components/UserStatusIndicator.tsx` - Already has error handling ✓
3. `shared/types/index.ts` - Add missing fields to interfaces
4. `backend/src/graphql/schema.graphql` - Ensure consistency

### Validation Checklist

- [x] All optional fields properly filtered before GraphQL mutations (added removeUndefinedValues helper)
- [x] tempo field added to session sync
- [x] GraphQL types regenerated with `npm run codegen`
- [ ] No TypeScript errors with `npm run type-check` (some ESLint errors remain)
- [ ] Manual sync works without console errors
- [ ] Local entries display properly after sync

### Implementation Status

#### Completed

1. Created `removeUndefinedValues` utility function to clean GraphQL inputs
2. Added tempo field handling to session sync
3. Added targetTempo field handling to log sync
4. Updated all GraphQL input objects to use Record<string, unknown> instead of any
5. Created comprehensive tests for graphqlHelpers
6. Regenerated GraphQL types

#### Remaining Work

1. Test manual sync functionality with actual data
2. Fix authentication redirect race condition
3. Investigate why local entries aren't displayed after sync
4. Address remaining ESLint errors in codebase
