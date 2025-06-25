# Type Alignment Refactoring Plan

## Overview

Critical refactoring to align type definitions between backend, frontend, and shared folders. Currently, there's significant duplication and misalignment causing maintenance issues and potential runtime errors.

## Current Problem Analysis

### Type Duplication Issues

1. **Backend** (`backend/src/types/shared.ts`):
   - Defines its own types instead of importing from shared
   - Uses string literals instead of enums (e.g., `type Instrument = 'PIANO' | 'GUITAR'`)
   - Missing logbook types entirely

2. **Frontend** (`frontend/src`):
   - 16 files import from `shared/types` ✅
   - But also has duplicate definitions in `modules/core/sharedTypes.ts`
   - Mixed usage of shared and local types

3. **Shared** (`shared/types/index.ts`):
   - Comprehensive type definitions with enums ✅
   - Includes validators and converters ✅
   - Has logbook types that backend lacks

### GraphQL Schema Alignment

- GraphQL schema matches backend types, not shared types
- This creates a three-way divergence: GraphQL ↔ Backend ↔ Shared ↔ Frontend

### Critical Misalignments

1. **Enum vs String Literals**:

   ```typescript
   // Shared (correct)
   export enum Instrument {
     PIANO = 'PIANO',
     GUITAR = 'GUITAR',
   }

   // Backend (incorrect)
   export type Instrument = 'PIANO' | 'GUITAR'
   ```

2. **Missing Types**:
   - Backend missing: LogbookEntry, Goal, LocalStorage types
   - Frontend duplicating: EntityBase, AccuracyMetrics, SkillLevel

3. **Type Structure Differences**:
   - User type in backend embeds preferences/stats
   - User type in shared keeps them as references
   - This affects GraphQL resolver implementations

## Strategy and Approach

### Phase 1: Audit and Document (1 day)

- Complete type inventory across all packages
- Document all divergences
- Create migration map

### Phase 2: Unify Type Sources (2-3 days)

- Update backend to use shared types
- Remove duplicate frontend types
- Update GraphQL schema generation

### Phase 3: Code Generation Setup (2 days)

- Implement GraphQL Code Generator
- Generate TypeScript types from GraphQL schema
- Ensure shared types are source of truth

### Phase 4: Migration and Testing (2-3 days)

- Update all imports
- Fix type errors
- Comprehensive testing

## Implementation Steps

### Phase 1: Audit and Document ✅

- [x] Identify type duplication in backend/src/types/shared.ts
- [x] Find frontend files using shared types (16 files)
- [x] Document GraphQL schema divergence
- [x] Create this plan document

### Phase 2: Unify Type Sources ⏳

- [ ] Update backend/src/types/shared.ts to import from shared

  ```typescript
  // Remove all duplicate definitions
  export * from '../../../shared/types'

  // Add any backend-specific extensions
  export interface BackendUser extends User {
    // backend-specific fields
  }
  ```

- [ ] Remove frontend/src/modules/core/sharedTypes.ts duplicates

  ```typescript
  // Keep only frontend-specific types
  // Import everything else from shared
  export * from '../../../../shared/types'
  ```

- [ ] Update all backend imports
  ```bash
  # Find and replace all backend type imports
  find backend/src -name "*.ts" -exec sed -i '' 's/from "\.\.\/types\/shared"/from "..\/..\/..\/shared\/types"/g' {} \;
  ```

### Phase 3: Code Generation Setup ⏳

- [ ] Install GraphQL Code Generator

  ```json
  // backend/package.json
  "devDependencies": {
    "@graphql-codegen/cli": "^5.0.0",
    "@graphql-codegen/typescript": "^4.0.0"
  }
  ```

- [ ] Create codegen config

  ```yaml
  # backend/codegen.yml
  schema: ./src/schema/schema.graphql
  generates:
    ./src/types/generated/graphql.ts:
      plugins:
        - typescript
      config:
        enumsAsTypes: false
        useTypeImports: true
        mappers:
          User: '../../../shared/types#User'
          LogbookEntry: '../../../shared/types#LogbookEntry'
  ```

- [ ] Update GraphQL schema to match shared types

  ```graphql
  # Use enums from shared types
  enum Instrument {
    PIANO
    GUITAR
  }

  # Add missing types
  type LogbookEntry {
    id: ID!
    userId: String!
    timestamp: DateTime!
    # ... rest of fields
  }
  ```

### Phase 4: Migration and Testing ⏳

- [ ] Run type generation

  ```bash
  cd backend && npm run codegen
  ```

- [ ] Fix all TypeScript errors
- [ ] Update resolver types
- [ ] Run all tests
- [ ] Add type validation tests

## Timeline

- **Day 1**: Complete audit (DONE)
- **Days 2-4**: Unify type sources
- **Days 5-6**: Setup code generation
- **Days 7-9**: Migration and testing
- **Day 10**: Documentation and team training

## Risk Assessment

### High Risk

- **Breaking Changes**: Type changes may break existing code
  - _Mitigation_: Comprehensive testing, gradual migration

### Medium Risk

- **GraphQL Client Compatibility**: Frontend queries may break
  - _Mitigation_: Version GraphQL schema, test all queries

### Low Risk

- **Build Time Impact**: Code generation adds build step
  - _Mitigation_: Only regenerate on schema changes

## Success Criteria

- [ ] Zero duplicate type definitions
- [ ] All packages import from shared/types
- [ ] GraphQL types generated from schema
- [ ] Backend passes all type checks
- [ ] Frontend passes all type checks
- [ ] All tests passing
- [ ] No runtime type errors

## Progress Tracking

- ✅ Phase 1: Audit Complete
- 🔄 Phase 2: In Progress
  - ✅ Updated backend/src/types/shared.ts to import from shared
  - ✅ Fixed enum usage in auth.ts and user.ts
  - ❌ Type incompatibility: GraphQL expects embedded preferences/stats
  - ⏳ Need to update GraphQL schema to match shared types
- ⏳ Phase 3: Not Started
- ⏳ Phase 4: Not Started

**Overall Status**: 🔄 Phase 2 Implementation

## Implementation Notes

### Discovered Issues

1. **GraphQL Schema Mismatch**: The GraphQL schema expects User to have embedded preferences and stats, but shared types keep them as separate entities
2. **MusicXML Converter**: The converter files in shared/scripts have type errors and should be excluded from backend build
3. **Enum Values**: Backend was using string literals ('PIANO') instead of enum values (Instrument.PIANO)

## Related Files

### Shared Types (Source of Truth)

- `/shared/types/index.ts` - Main type definitions
- `/shared/types/validation.ts` - Type validators

### Files to Update

- `/backend/src/types/shared.ts` - Replace with imports
- `/backend/src/schema/schema.graphql` - Align with shared types
- `/frontend/src/modules/core/sharedTypes.ts` - Remove duplicates
- All resolver files using types

### New Files

- `/backend/codegen.yml` - GraphQL code generator config
- `/backend/src/types/generated/graphql.ts` - Generated types

## Notes

- Shared types should be the single source of truth
- GraphQL schema should be generated from or aligned with shared types
- Consider using TypeScript project references for better type sharing
- Add pre-commit hooks to ensure type alignment

## Code Quality Issues to Address

Based on the earlier analysis, this type refactoring should also address:

- Remove `any` types in favor of proper shared types
- Improve type safety in event payloads
- Add proper type guards using shared validators
