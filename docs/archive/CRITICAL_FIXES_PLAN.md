# Critical Fixes Plan - Audio Playback & Security Issues

**Branch**: `fix/critical-audio-security-issues`  
**Date**: June 14, 2025  
**Status**: Partially Complete
**Updated**: June 19, 2025

## Executive Summary

This plan addresses critical issues identified in the code analysis that are affecting core functionality and security before MVP launch:

1. **Audio playback breaking after each measure** (blocking user experience) - ⚠️ **SOLUTION IMPLEMENTED BUT NOT DEPLOYED**
2. **XSS vulnerability** in documentation rendering (security risk) - ✅ **FIXED**
3. **Memory management issues** in audio system (performance degradation) - ⚠️ **SOLUTION IMPLEMENTED BUT NOT DEPLOYED**
4. **Type alignment verification** (ensure previous fixes are actually implemented) - ✅ **VERIFIED**

## Update Summary (June 19, 2025)

### Completed

- ✅ XSS vulnerability fixed with DOMPurify implementation in `markdownRenderer.ts`
- ✅ Type alignment issues resolved in recent PR #129
- ✅ ImprovedMultiVoiceAudioManager created with proper memory management

### Pending

- ⚠️ ImprovedMultiVoiceAudioManager exists but AudioContext still uses old implementation
- ⚠️ Need to switch to improved audio manager in production

## Priority 1: Audio Playback Issues 🎵

### Problem

Users report that audio playback "breaks for a second or so after each measure", making the practice experience unusable.

### Root Cause Analysis

**File**: `frontend/src/utils/multiVoiceAudioManager.ts`

**Identified Issues**:

1. **Transport scheduling accumulation** (lines 558, 566, 640)
   - Multiple `Transport.schedule()` calls may conflict with timing
   - Schedule ID tracking may not properly clear previous schedules
2. **Measure timing calculation precision** (lines 693-694)
   - `getMeasureDuration()` calculation may have floating-point precision issues
   - Tempo changes between measures could cause gaps
3. **Batch scheduling gaps** (lines 549-585)
   - All notes scheduled at once but measure boundaries may have timing gaps
4. **Singleton disposal issues** (line 17)
   - `globalAudioManagerInstance` never properly cleaned up
   - Previous playback state may interfere with new playback

### Proposed Fixes

1. **Improve Transport schedule management**
   - Use a more reliable schedule clearing mechanism
   - Implement proper schedule ID tracking
   - Add debug logging for timing issues

2. **Fix measure timing precision**
   - Use high-precision timing calculations
   - Ensure smooth transitions between measures
   - Handle tempo changes more gracefully

3. **Enhance singleton lifecycle**
   - Add proper disposal of global instance
   - Clear all Transport schedules on new playback
   - Reset timing state between sessions

## Priority 2: Security Fix 🔐

### Problem

**XSS Vulnerability** in documentation rendering allows potential script injection.

**File**: `frontend/src/pages/Docs.tsx:150`

```typescript
dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
```

### Risk Assessment

- **Severity**: HIGH
- **Attack Vector**: Malicious markdown content could execute scripts
- **Impact**: User session compromise, data theft, site defacement

### Proposed Fix

Replace `dangerouslySetInnerHTML` with a sanitized markdown renderer:

1. Install DOMPurify for HTML sanitization
2. Create safe markdown rendering utility
3. Update Docs component to use sanitized rendering

## Priority 3: Memory Management 🧹

### Problem

Audio system accumulates memory usage and doesn't properly clean up resources.

### Issues Identified

1. **Singleton never disposed** (line 17, 738-740)
2. **Event listeners accumulate** (lines 71-73, 444-461)
3. **Transport schedules persist** (lines 351-355)

### Proposed Fixes

1. **Implement proper disposal pattern**
   - Add cleanup method for global singleton
   - Clear all event listeners on disposal
   - Dispose Tone.js resources properly

2. **Improve schedule management**
   - Track and clear all Transport schedules
   - Implement schedule cleanup on component unmount
   - Add memory usage monitoring

## Priority 4: Type Alignment Verification 🔍

### Task

Verify that fixes documented in `TYPE_ALIGNMENT_AUDIT.md` are actually implemented in the codebase.

### Validation Items

- [ ] `removeUndefinedValues` utility function exists and is used
- [ ] `tempo` field handling in session sync
- [ ] `targetTempo` field handling in log sync
- [ ] GraphQL input sanitization
- [ ] Auth redirect race condition fixes
- [ ] Local data fallback implementation

## Implementation Timeline

### Day 1: Audio System Fixes

- [ ] Fix Transport scheduling issues
- [ ] Improve measure timing precision
- [ ] Test playback continuity

### Day 2: Security & Memory

- [ ] Implement sanitized markdown rendering
- [ ] Fix memory management issues
- [ ] Add proper cleanup patterns

### Day 3: Verification & Testing

- [ ] Verify type alignment fixes
- [ ] Test all changes thoroughly
- [ ] Document remaining issues (if any)

## Testing Strategy

### Audio Playback Testing

1. **Manual Testing**
   - Play various scores with different tempos
   - Test measure transitions for gaps/breaks
   - Verify smooth playback across multiple measures

2. **Performance Testing**
   - Monitor memory usage during extended playback
   - Test singleton cleanup and recreation
   - Verify no Transport schedule accumulation

### Security Testing

1. **XSS Prevention**
   - Test with potentially malicious markdown content
   - Verify script tags are sanitized
   - Ensure no code execution in rendered content

## Success Criteria

### Audio Playback

- [ ] No breaks or gaps between measures during playback
- [ ] Smooth tempo transitions
- [ ] Consistent timing across different scores
- [ ] No memory accumulation during extended use

### Security

- [ ] No XSS vulnerabilities in markdown rendering
- [ ] All HTML content properly sanitized
- [ ] No script execution from markdown content

### Memory Management

- [ ] Proper cleanup of audio resources
- [ ] No memory leaks during repeated playback
- [ ] Singleton properly disposed when needed

## Dependencies

- **DOMPurify**: For HTML sanitization (security fix)
- **Tone.js**: Already installed (audio system)
- **Testing**: Existing test framework

## Rollback Plan

If any fixes cause regressions:

1. **Audio Issues**: Revert to previous audio manager implementation
2. **Security**: Temporarily disable dynamic markdown rendering
3. **Memory**: Revert cleanup changes and monitor usage

## Post-Implementation Tasks

1. **Documentation Updates**
   - Update CLAUDE.md with new patterns
   - Document audio system architecture changes
   - Add security guidelines for content rendering

2. **Monitoring**
   - Add performance monitoring for audio system
   - Monitor memory usage in production
   - Track user feedback on playback quality

## Notes

- Rate limiter, CORS, and test coverage improvements are postponed per user request
- JWT secret in wrangler.toml is for testing only and acceptable
- Focus is on core functionality stability before MVP launch
