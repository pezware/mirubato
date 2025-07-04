# Obsolete Files Analysis

## Files That Can Be Deleted

### 1. **LogbookReports.tsx** (11KB)

- **Status**: NOT USED - Safe to delete
- **Evidence**: Not imported by any file in the codebase
- **Replaced by**: EnhancedPracticeReports.tsx (64KB)
- **Action**: Delete this file

## Files That Need Review

### 2. **PDF Viewer Components**

Currently we have 3 PDF viewers, all actively used:

- **PdfViewer.tsx** - Basic PDF viewer using react-pdf
- **ImageBasedPdfViewer.tsx** - Converts PDF to images for display
- **AdaptivePdfViewer.tsx** - Smart wrapper that chooses between the two based on device

**Current Usage**:

- ScoreViewer → AdaptivePdfViewer → (PdfViewer OR ImageBasedPdfViewer)
- All three are needed for the adaptive rendering strategy

**Recommendation**: Keep all three as they serve different purposes

### 3. **EnhancedPracticeReports.tsx** (64KB - 1515 lines!)

- **Status**: ACTIVELY USED but needs refactoring
- **Issues**:
  - Extremely large file (64KB)
  - Over 1500 lines of code
  - Difficult to maintain
- **Action**: Split into smaller components

## Legacy/Migration Files

### 4. **transformLegacyEntry.ts**

- **Status**: Has active tests, likely still needed for data migration
- **Action**: Keep until confirmed all users have migrated

### 5. **migrateLegacyData.ts**

- **Status**: Not found in grep, might already be deleted

## Summary Actions

1. **Immediate**: Delete `LogbookReports.tsx`
2. **High Priority**: Refactor `EnhancedPracticeReports.tsx` into smaller components
3. **Keep**: All PDF viewer components (they work together)
4. **Review Later**: Legacy migration utilities after confirming all data is migrated

## Refactoring Priority

Instead of refactoring obsolete files, focus on:

1. **EnhancedPracticeReports.tsx** - Split into smaller components
2. Continue button refactoring in active components
3. Add missing tests for active components
