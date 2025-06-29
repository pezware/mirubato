# Scorebook Testing Instructions

## Setup

1. **Start the scores service** (in one terminal):

   ```bash
   cd scores
   npm run dev
   ```

2. **Start the frontend** (in another terminal):

   ```bash
   cd frontendv2
   npm run dev
   ```

3. **Verify test data is loaded**:
   ```bash
   curl http://localhost:8787/api/scores | jq
   ```
   You should see `test_aire_sureno` and `test_romance_anonimo` in the list.

## Testing URLs

### Browse Scores

- http://localhost:5173/scorebook
- http://localhost:5173/scorebook/browse

### View Test Scores

- **Aire Sureño (1 page)**: http://localhost:5173/scorebook/test_aire_sureno
- **Romance (3 pages)**: http://localhost:5173/scorebook/test_romance_anonimo

### Test Collections

- http://localhost:5173/scorebook/collection/test-guitar-pieces

## Features to Test

### 1. Score Display

- [ ] PDF loads correctly
- [ ] Page navigation works for multi-page score
- [ ] Loading spinner shows while PDF loads

### 2. Floating Controls

- [ ] Practice recording button (authenticated users only)
- [ ] Metronome toggle and tempo adjustment
- [ ] Auto-scroll toggle
- [ ] Management menu opens/closes

### 3. Score Browser

- [ ] All scores display in grid
- [ ] Filter by instrument works
- [ ] Filter by difficulty works
- [ ] Collections show correctly
- [ ] Clicking score navigates to viewer

### 4. Management Panel

- [ ] Search functionality
- [ ] My Scores section (authenticated)
- [ ] Upload area shows (authenticated)
- [ ] Collections browsing

### 5. Authentication Awareness

- [ ] Read-only mode for anonymous users
- [ ] Full access indicator for authenticated users
- [ ] Practice tracking only available when signed in

## Known Issues

1. **PDF Display**: Currently using iframe which may have limitations
   - Consider implementing pdf.js for better control
   - CORS must be properly configured

2. **Metronome**: Audio not yet implemented
   - Tone.js integration needed

3. **Practice Tracking**: Not yet saving to logbook
   - Integration with logbook store needed

## Next Steps

1. Implement proper PDF viewer with pdf.js
2. Add Tone.js for metronome audio
3. Connect practice sessions to logbook
4. Add file upload functionality
5. Implement auto-scroll behavior
6. Add keyboard shortcuts for navigation
