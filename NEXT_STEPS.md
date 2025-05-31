# Next Steps for Mirubato Development

## Current State (2025-05-31)

- ✅ Testing infrastructure complete (Jest, Husky, pre-commit hooks)
- ✅ CSP issues fixed for Cloudflare deployment
- ✅ Basic practice page with Moonlight Sonata (20 measures)
- ✅ Audio system using Tone.js with Salamander piano samples from CDN

## Immediate Priority: Fix Tempo Bug 🐛

The most pressing issue is the tempo speed-up bug in Practice.tsx:

### Bug Description

- **Problem**: Tempo increases after pause/play cycle
- **Location**: `/src/pages/Practice.tsx`
- **Likely Cause**: Tone.Transport not properly resetting when paused
- **Impact**: Makes practice unusable after pausing

### How to Fix

1. Check `handlePlayPause()` function in Practice.tsx
2. When pausing, ensure:
   - `Tone.Transport.pause()` is called
   - Clear any scheduled events with `Tone.Transport.cancel()`
3. When resuming, ensure:
   - Don't call `scheduleNotes()` again (it's already scheduled)
   - Just call `Tone.Transport.start()`
4. Consider using `Tone.Transport.stop()` instead of pause and reschedule

### Test the Fix

```bash
npm run dev
# Navigate to /practice
# Play, pause, play again - tempo should remain constant
```

## Next Features (After Bug Fix)

### 1. Volume Control

- Add volume slider component in Practice.tsx
- Use `Tone.Master.volume.value` or create a Gain node
- Range: -60 to 0 (in decibels)

### 2. Visual Feedback for Playing Notes

- In `scheduleNotes()`, add visual highlighting
- Track current measure/note position
- Update UI to show which note is currently playing
- Consider adding a progress bar for the piece

### 3. Authentication System (Phase 1)

Following the roadmap, implement magic link auth:

#### Backend Setup (Cloudflare Workers)

1. Create `src/api/` directory structure
2. Implement endpoints:
   - `POST /api/auth/login` - Send magic link email
   - `POST /api/auth/verify` - Verify token and return JWT
   - `POST /api/auth/refresh` - Refresh JWT token
3. Use Cloudflare D1 for user storage
4. Use Resend API for sending emails

#### Frontend Auth

1. Create login page component
2. Implement auth context using Zustand
3. Add protected route wrapper
4. Handle JWT storage and refresh

### 4. Database Schema Implementation

Set up Cloudflare D1 with migrations:

```sql
-- First migration
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE practice_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  started_at DATETIME NOT NULL,
  duration_seconds INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## Development Workflow Reminders

### Testing

- All commits now require passing tests
- Run `npm test` to verify before committing
- Add tests for new features:
  ```typescript
  // Example for volume control
  describe('VolumeControl', () => {
    it('should adjust master volume', () => {
      // Test implementation
    })
  })
  ```

### Commit Messages

Use conventional commits:

- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation
- `test:` for test additions
- `refactor:` for code refactoring

### Project Structure

```
src/
├── api/          # Backend API (to be created)
├── components/   # Reusable React components
├── pages/        # Page components
├── utils/        # Utilities (audioManager, etc.)
├── data/         # Sheet music data
├── types/        # TypeScript types
└── __mocks__/    # Jest mocks
```

## Quick Start for Next Session

```bash
# Start development
npm run dev

# Run tests
npm test

# Check types
npm run type-check

# If working on backend
npx wrangler dev
```

## Resources

- [Tone.js Transport docs](https://tonejs.github.io/docs/14.7.77/Transport)
- [Cloudflare D1 docs](https://developers.cloudflare.com/d1/)
- [Cloudflare Workers docs](https://developers.cloudflare.com/workers/)
- [Magic link auth pattern](https://www.cloudflare.com/learning/access-management/what-is-magic-link-authentication/)

## Contact Points

- Main repo: https://github.com/arbeitandy/mirubato
- Issues: Track bugs and features in GitHub Issues
- Design docs: See `/docs` directory for architecture decisions
