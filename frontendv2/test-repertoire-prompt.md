# Testing the Repertoire Prompt Feature

## Test Steps

1. Navigate to the Logbook page
2. Click "Add Entry" button
3. Fill in the form with a piece that is NOT in your repertoire:
   - Title: "Moonlight Sonata"
   - Composer: "Beethoven"
   - Duration: 30 minutes
4. Click "Save Entry"

## Expected Behavior

1. After saving, you should see a prompt appear in the bottom-right corner
2. The prompt should say "Add to Your Repertoire?"
3. It should show "You just practiced Moonlight Sonata by Beethoven"
4. Two buttons should be visible:
   - "Add to Repertoire" (primary button)
   - "Not Now" (ghost button)

## Test Cases

### Test 1: Add to Repertoire

- Click "Add to Repertoire"
- Should see success toast: "Moonlight Sonata added to your repertoire"
- Modal should close and return to logbook

### Test 2: Not Now

- Click "Not Now"
- Prompt should close without adding to repertoire
- Should return to logbook

### Test 3: Piece Already in Repertoire

- Add a piece to repertoire first
- Create a new logbook entry for the same piece
- Should NOT see the prompt (piece already in repertoire)

### Test 4: Multiple Pieces

- Create entry with multiple pieces
- Should only prompt for the first piece not in repertoire

## Implementation Details

- Component: `AddToRepertoirePrompt.tsx`
- Integration: `ManualEntryForm.tsx`
- Store: `repertoireStore.ts`
- Score ID format: `{title}-{composer}` (lowercase)
