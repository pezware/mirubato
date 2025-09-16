# Manual Test: Bidirectional Sync After Authentication

## Purpose

Test that entries created while logged out are synced to the server after signing in.

## Test Steps

### 1. Create Local Entries (Logged Out)

1. Open the app in incognito/private window
2. Do NOT sign in
3. Create 2-3 practice entries using the logbook
4. Verify entries appear in the logbook (stored in localStorage only)
5. Open browser DevTools > Application > Local Storage
6. Verify `mirubato:logbook:entries` contains your entries

### 2. Sign In and Verify Sync

1. Sign in using magic link or Google
2. Watch the browser console for these messages:
   - `📤 Pushing local entries to server...`
   - `📊 Found X local entries to sync`
   - `✅ Push complete: X entries pushed, 0 failed`
3. WebSocket should then connect and sync any server data

### 3. Verify on Another Device

1. Sign in on a different device/browser with the same account
2. Check that all entries created in step 1 appear
3. Create a new entry on device 2
4. Verify it appears on device 1 via WebSocket sync

## Expected Results

- Local entries created before auth are pushed to server
- No data loss during authentication
- Bidirectional sync works correctly
- Console shows successful push of local entries

## Debugging

If entries don't sync, check:

1. Browser console for errors
2. Network tab for failed API calls to `/api/sync/push`
3. Local Storage to see if entries still exist locally
4. Server logs for any 409 (duplicate) or 500 errors

## Implementation Details

The fix adds:

- `pushLocalEntriesToServer()` method in logbookStore
- Calls this method after successful authentication in authStore
- Handles duplicates gracefully (409 errors are expected and OK)
