# Shared Types Architecture Refactor

## Current Problems

1. **Nested Directory Build Issues**
   - TypeScript creates `dist/backend/src/` structure when including files outside project root
   - Complex build script workarounds to move files to correct locations
   - Manual cleanup of compiled files in shared directory

2. **Type Duplication**
   - Frontend and backend define overlapping types
   - No single source of truth
   - GraphQL schema types don't align with shared types

3. **Import Path Fragility**
   - Relative imports (`../../../shared/types`) are hard to maintain
   - Different nesting levels require different paths
   - No IDE support for refactoring

4. **Build Complexity**
   - Schema is hardcoded in TypeScript, not using schema.graphql
   - Complex build script to generate schema content
   - Multiple workarounds for Cloudflare Workers limitations

## Proposed Solution

### 1. GraphQL Schema as Single Source of Truth

```
GraphQL Schema (schema.graphql)
    ↓
GraphQL Codegen
    ↓
Generated TypeScript Types
    ↓
Shared Package (@mirubato/shared)
    ↓
Frontend & Backend consume types
```

### 2. Proper NPM Package Structure

```
shared/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts           # Re-exports all types
│   └── generated/         # GraphQL codegen output
│       └── types.ts
├── dist/                  # Compiled output
│   ├── index.js
│   ├── index.d.ts
│   └── generated/
│       ├── types.js
│       └── types.d.ts
└── codegen.yml           # GraphQL codegen config
```

### 3. Package.json Exports

```json
{
  "name": "@mirubato/shared",
  "version": "0.1.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "scripts": {
    "build": "tsc",
    "codegen": "graphql-codegen"
  }
}
```

### 4. GraphQL Codegen Configuration

```yaml
# shared/codegen.yml
schema: ../backend/src/schema/schema.graphql
generates:
  ./src/generated/types.ts:
    plugins:
      - typescript
      - typescript-operations
    config:
      enumsAsTypes: false
      scalars:
        DateTime: string
        JSON: any
```

### 5. TypeScript Project References

```json
// Root tsconfig.json
{
  "references": [
    { "path": "./shared" },
    { "path": "./backend" },
    { "path": "./frontend" }
  ]
}

// Backend tsconfig.json
{
  "references": [
    { "path": "../shared" }
  ],
  "compilerOptions": {
    "paths": {
      "@mirubato/shared": ["../shared/src"],
      "@mirubato/shared/*": ["../shared/src/*"]
    }
  }
}
```

### 6. Import Path Updates

```typescript
// Before
import { User, Instrument } from '../../../shared/types'

// After
import { User, Instrument } from '@mirubato/shared'
```

## Implementation Steps

### Phase 1: Set Up Shared Package Build

1. Add build script to shared package
2. Configure TypeScript compilation
3. Set up dual ESM/CJS output
4. Update package.json exports

### Phase 2: GraphQL Codegen Integration

1. Install and configure GraphQL codegen in shared package
2. Generate types from backend schema
3. Update shared/index.ts to export generated types
4. Remove duplicate type definitions

### Phase 3: Update Import Paths

1. Update all relative imports to package imports
2. Configure TypeScript path mappings
3. Test imports work correctly
4. Update build scripts

### Phase 4: Simplify Build Process

1. Remove complex file moving logic from build.js
2. Use standard TypeScript compilation
3. Remove schema generation workarounds
4. Clean up build scripts

## Benefits

1. **Single Source of Truth**: GraphQL schema defines all types
2. **Clean Imports**: No more relative path complexity
3. **Better IDE Support**: Package imports work with refactoring tools
4. **Simpler Build**: Standard TypeScript compilation without workarounds
5. **Type Safety**: Generated types always match GraphQL schema
6. **Maintainability**: Clear separation of concerns

## Migration Path

1. Start with shared package build setup (non-breaking)
2. Add GraphQL codegen alongside existing types (non-breaking)
3. Gradually migrate imports from relative to package imports
4. Remove duplicate type definitions
5. Simplify build scripts

## Testing Strategy

1. Unit tests for type compatibility
2. Build tests to ensure correct output structure
3. Import tests to verify package resolution
4. End-to-end tests for full type flow

## Risks and Mitigations

1. **Risk**: Breaking existing code during migration
   - **Mitigation**: Gradual migration with backwards compatibility

2. **Risk**: Cloudflare Workers compatibility
   - **Mitigation**: Test deployment at each step

3. **Risk**: Development workflow disruption
   - **Mitigation**: Keep existing workflow until new one is stable
