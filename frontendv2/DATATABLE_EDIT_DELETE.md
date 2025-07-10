# Data Table Edit/Delete Functionality

## What was added:

Added edit and delete buttons to each entry in the Data Table view, allowing users to manage their practice entries directly from the table.

## Changes made:

1. **DataTableView.tsx**:
   - Added navigation and logbook store imports
   - Created `handleEditEntry` and `handleDeleteEntry` handlers
   - Pass these handlers to GroupedDataTable component

2. **GroupedDataTable.tsx**:
   - Added Edit and Trash2 icons from lucide-react
   - Updated props to accept `onEditEntry` and `onDeleteEntry` callbacks
   - Pass handlers through GroupRow to EntryRow components
   - Added edit and delete buttons to each entry row with proper styling

## How it works:

- Edit button navigates to the entry form with the entry ID in URL
- Delete button shows confirmation dialog before deleting
- Buttons are positioned on the right side of each entry row
- Click events are properly stopped to prevent row expansion when clicking buttons

## Usage:

1. Navigate to Logbook > Data Table
2. Expand groups to see individual entries
3. Click the edit icon to edit an entry
4. Click the trash icon to delete an entry (with confirmation)
