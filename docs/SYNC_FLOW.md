# Data Sync Flow: localStorage ↔ D1 Storage

## Overview

This document explains how data synchronization works between localStorage (for anonymous users) and D1 cloud storage (for authenticated users) in Mirubato.

**Last Updated**: January 2025 - Reflects current architecture after auth/sync fixes

## Sync Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              USER JOURNEY & DATA SYNC FLOW                           │
└─────────────────────────────────────────────────────────────────────────────────────┘

1. ANONYMOUS USER PHASE
   ═══════════════════

   ┌──────────────┐
   │ Anonymous    │
   │    User      │
   └──────┬───────┘
          │
          ▼
   ┌──────────────────────────────────┐
   │  Practice Sessions & Logbook     │
   │  ✓ Creates practice sessions     │
   │  ✓ Logs practice entries         │
   │  ✓ Sets goals                    │
   └──────────────┬───────────────────┘
                  │
                  ▼
   ┌──────────────────────────────────┐
   │        localStorage              │
   │  • mirubato_practice_sessions    │
   │  • mirubato_logbook_entries      │
   │  • mirubato_goals                │
   │  • mirubato_user_data            │
   │    (isAnonymous: true)           │
   └──────────────────────────────────┘

2. AUTHENTICATION TRIGGER
   ═════════════════════

   ┌──────────────┐                    ┌──────────────────────────────────┐
   │ User clicks  │                    │        Magic Link Flow           │
   │   "Login"    │ ────────────────▶  │  1. Enter email                  │
   └──────────────┘                    │  2. Receive magic link           │
                                       │  3. Click link to verify         │
                                       └──────────────┬───────────────────┘
                                                      │
                                                      ▼
3. LOGIN & SYNC PROCESS
   ═══════════════════

   ┌─────────────────────────────────────────────────────────────────────────────────┐
   │                            AuthContext.login()                                   │
   │                                                                                  │
   │  ┌────────────────┐      ┌─────────────────┐      ┌────────────────────────┐  │
   │  │ Verify Magic   │      │  Check Cloud    │      │   Migrate Anonymous    │  │
   │  │     Link       │ ───▶ │    Storage      │ ───▶ │       User Data        │  │
   │  │                │      │  hasCloudStorage│      │  • Update user ID      │  │
   │  └────────────────┘      └─────────────────┘      │  • Mark as !anonymous  │  │
   │                                                    │  • Set sync flag       │  │
   │                                                    └───────────┬────────────┘  │
   └─────────────────────────────────────────────────────────────────────────────────┘
                                                                    │
                                                                    ▼
   ┌─────────────────────────────────────────────────────────────────────────────────┐
   │                          AuthContext.syncToCloud()                               │
   │                                                                                  │
   │  ┌────────────────────────────────────────────────────────────────────────────┐ │
   │  │                        1. Gather All Unsynced Data                          │ │
   │  │                                                                             │ │
   │  │  const pendingData = {                                                     │ │
   │  │    sessions: getPracticeSessions().filter(!synced),                        │ │
   │  │    logs: getPracticeLogs(),                                                │ │
   │  │    entries: getLogbookEntries().filter(!synced),                           │ │
   │  │    goals: getGoals().filter(!synced)                                       │ │
   │  │  }                                                                          │ │
   │  └────────────────────────────────────────────────────────────────────────────┘ │
   │                                        │                                          │
   │                                        ▼                                          │
   │  ┌────────────────────────────────────────────────────────────────────────────┐ │
   │  │                      2. Transform Data for GraphQL                          │ │
   │  │                                                                             │ │
   │  │  • Practice Sessions → CreatePracticeSessionInput                          │ │
   │  │  • Practice Logs → CreatePracticeLogInput                                  │ │
   │  │  • Logbook Entries → CreateLogbookEntryInput                               │ │
   │  │    - Map localStorage format to GraphQL schema                             │ │
   │  │    - Handle missing fields with defaults                                   │ │
   │  │  • Goals → CreateGoalInput                                                 │ │
   │  └────────────────────────────────────────────────────────────────────────────┘ │
   │                                        │                                          │
   │                                        ▼                                          │
   │  ┌────────────────────────────────────────────────────────────────────────────┐ │
   │  │                   3. Execute SYNC_ANONYMOUS_DATA Mutation                   │ │
   │  │                                                                             │ │
   │  │  mutation SyncAnonymousData($input: SyncAnonymousDataInput!) {             │ │
   │  │    syncAnonymousData(input: $input) {                                      │ │
   │  │      success, syncedSessions, syncedLogs, syncedEntries, syncedGoals       │ │
   │  │    }                                                                        │ │
   │  │  }                                                                          │ │
   │  └────────────────────────────────────────────────────────────────────────────┘ │
   └─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
   ┌─────────────────────────────────────────────────────────────────────────────────┐
   │                              D1 Database (SQLite)                                 │
   │                                                                                   │
   │  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────┐                │
   │  │ practice_sessions│  │ practice_logs    │  │ logbook_entries │                │
   │  │ • id             │  │ • id             │  │ • id            │                │
   │  │ • user_id        │  │ • session_id     │  │ • user_id       │                │
   │  │ • sheet_music_id │  │ • activity_type  │  │ • timestamp     │                │
   │  │ • started_at     │  │ • duration_secs  │  │ • duration      │                │
   │  │ • completed_at   │  │ • notes          │  │ • type          │                │
   │  └─────────────────┘  └──────────────────┘  │ • instrument    │                │
   │                                               │ • pieces JSON   │                │
   │  ┌─────────────────┐                         │ • mood          │                │
   │  │     goals        │                         └─────────────────┘                │
   │  │ • id             │                                                            │
   │  │ • user_id        │                                                            │
   │  │ • title          │                                                            │
   │  │ • target_date    │                                                            │
   │  │ • status         │                                                            │
   │  └─────────────────┘                                                            │
   └─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
   ┌─────────────────────────────────────────────────────────────────────────────────┐
   │                            4. Post-Sync Actions                                  │
   │                                                                                   │
   │  ┌────────────────────┐     ┌──────────────────────┐    ┌───────────────────┐  │
   │  │  Mark as Synced    │     │   Publish Event      │    │   Update UI       │  │
   │  │  • Sessions        │     │  eventBus.publish({  │    │  • Refetch data   │  │
   │  │  • Logs            │ ──▶ │    type: 'sync:      │ ──▶│  • Show D1 data   │  │
   │  │  • Entries         │     │     complete'        │    │  • Hide loading   │  │
   │  │  • Goals           │     │  })                  │    │                   │  │
   │  └────────────────────┘     └──────────────────────┘    └───────────────────┘  │
   └─────────────────────────────────────────────────────────────────────────────────┘

4. AUTHENTICATED USER FLOW (Updated January 2025)
   ═════════════════════════════════════════════

   ┌──────────────┐                    ┌─────────────────────────────────────────┐
   │ Authenticated│                    │         Data Operations                 │
   │     User     │ ────────────────▶  │                                         │
   └──────────────┘                    │  CREATE:                                │
                                       │  • Direct GraphQL mutation to D1        │
                                       │  • No localStorage for auth users       │
                                       │                                         │
                                       │  READ:                                  │
                                       │  • If hasCloudStorage: Query D1 via     │
                                       │    GraphQL (myLogbookEntries)          │
                                       │  • Else: Read from localStorage        │
                                       │                                         │
                                       │  UPDATE/DELETE:                         │
                                       │  • Direct GraphQL mutations             │
                                       │  • Immediate D1 updates                 │
                                       └─────────────────────────────────────────┘

5. DATA FLOW DECISION TREE
   ═════════════════════

   ┌─────────────┐     Is user          ┌─────────────┐
   │   START     │ ─────────────────────▶│ authenticated?│
   └─────────────┘                       └──────┬──────┘
                                               │
                              ┌────────────────┴────────────────┐
                              │                                 │
                             NO                               YES
                              │                                 │
                              ▼                                 ▼
                    ┌─────────────────┐              ┌─────────────────┐
                    │ Use localStorage│              │ Has cloud       │
                    │      only       │              │ storage?        │
                    └─────────────────┘              └────────┬────────┘
                                                              │
                                            ┌─────────────────┴─────────────────┐
                                            │                                   │
                                           NO                                 YES
                                            │                                   │
                                            ▼                                   ▼
                                  ┌─────────────────┐                 ┌─────────────────┐
                                  │ Use localStorage│                 │   Use D1 via    │
                                  │  (no sync)      │                 │    GraphQL      │
                                  └─────────────────┘                 └─────────────────┘

6. KEY COMPONENTS
   ═════════════

   AuthContext.tsx         - Handles login flow and triggers sync
   localStorage.service.ts - Manages local data storage
   LogbookReportingModule  - Decides data source based on auth status
   Logbook.tsx            - UI component that displays data
   EventBus               - Publishes sync events for UI updates

7. SYNC STATUS TRACKING
   ═══════════════════

   Each data item has an 'isSynced' flag:

   ┌────────────────────────────────────────┐
   │  {                                     │
   │    id: "entry_123",                    │
   │    userId: "user_456",                 │
   │    timestamp: "2024-01-15T10:30:00Z",  │
   │    ...other fields...,                 │
   │    isSynced: false  ← Tracks sync status│
   │  }                                     │
   └────────────────────────────────────────┘

   After successful sync:
   • isSynced → true
   • Item won't be included in next sync batch
```

## Key Points

1. **Anonymous Users**: All data stored in localStorage only
2. **Authentication Trigger**: Login initiates the sync process
3. **Data Migration**: Anonymous data is associated with the authenticated user (ONE-TIME only)
4. **Sync Process**: Bulk mutation sends all unsynced data to D1
5. **Post-Sync**: UI refreshes to show D1 data instead of localStorage
6. **Ongoing Operations**:
   - Authenticated users with cloud storage use direct GraphQL mutations (no localStorage)
   - Authenticated users without cloud storage continue using localStorage
   - Anonymous users always use localStorage

## Important Notes

- **Token Persistence**: Auth tokens are now stored in localStorage (not sessionStorage) for persistence across browser sessions
- **Event Deduplication**: Auth events are deduplicated to prevent infinite loops
- **Sync is One-Time**: The syncAnonymousData mutation runs ONLY during the transition from anonymous to authenticated user
- **Direct Mutations**: Authenticated users create/update entries directly in D1 via GraphQL mutations

## Error Handling

- If sync fails, data remains in localStorage
- Users can retry sync manually
- System maintains data integrity by keeping localStorage as fallback
- Comprehensive logging tracks sync progress for debugging

## Troubleshooting

### Common Issues

1. **Auth Not Persisting**: Check if tokens are in localStorage (not sessionStorage)
2. **Empty Logbook After Login**:
   - Check browser console for sync errors
   - Verify sync:complete event is fired
   - Check if GraphQL queries are returning data
3. **Sync Not Happening**:
   - Verify user has `hasCloudStorage = true`
   - Check for localStorage data to sync
   - Look for sync mutation errors in console
