# Test Edit Functionality

## Steps to Test:

1. Navigate to the Logbook page: http://www-mirubato.localhost:4000/logbook
2. If you have existing entries, you should see them in the Overview tab
3. Click the edit button (pencil icon) on any entry
4. The form should open with the entry data pre-filled
5. The URL should contain `?tab=newEntry&editId=[entry-id]`
6. The form title should show "📝 Edit Entry" instead of "✨ Add new entry"
7. Make some changes and save
8. The entry should be updated (not create a new one)

## What was Fixed:

1. The `EnhancedReports` component now reads the `editId` from URL parameters
2. When `editId` is present, it finds the corresponding entry from the store
3. The entry data is passed to the `ManualEntryForm` component
4. The form correctly shows "Edit Entry" when an entry is provided
5. The URL is properly cleaned up when closing or saving the form

## Key Changes:

- Added logic to check for `editId` URL parameter in addition to navigation state
- Made sure the entry is found from the store using the ID
- Properly maintained URL parameters during navigation
- Cleaned up URL parameters when closing the form
