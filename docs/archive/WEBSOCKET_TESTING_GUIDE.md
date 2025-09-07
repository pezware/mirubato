# WebSocket Real-time Sync Testing Guide

## ✅ Basic Connection Test (Completed)

The WebSocket connection to staging is working correctly:

- Connection established: `wss://sync-staging.mirubato.com/sync/ws`
- Welcome message received
- PING/PONG communication working
- Event sending functional

## 🌐 Browser Testing Steps

### 1. Enable WebSocket Sync Feature

Open the Mirubato frontend and enable the WebSocket sync feature:

1. **Development Mode**: Feature is automatically enabled
2. **Staging/Production**:
   - Go to **About** page → **Debug** tab (dev mode only)
   - Check "Enable WebSocket Sync Feature"
   - OR manually in browser console:
   ```javascript
   localStorage.setItem('mirubato:features:websocket-sync', 'true')
   window.location.reload()
   ```

### 2. Verify Sync Indicator

Look for the sync indicator in the sidebar:

- **Real-time mode**: Shows WiFi icon (🛜) instead of cloud icon
- **Connected**: Green WiFi icon with "Real-time sync active"
- **Connecting**: Blue spinning WiFi icon
- **Disconnected**: Red crossed WiFi icon

### 3. Multi-Device Testing

**Best way to test real-time sync:**

1. **Open two browser windows/tabs** (or different devices):
   - Window A: `https://staging.mirubato.com`
   - Window B: `https://staging.mirubato.com` (incognito or different browser)

2. **Sign in to the same account** in both windows

3. **Enable WebSocket sync** in both windows

4. **Create a practice entry** in Window A:
   - Go to Logbook
   - Click "Add Entry"
   - Fill in practice details
   - Save

5. **Check Window B immediately**:
   - Should see the new entry appear automatically
   - No page refresh needed
   - Entry appears in real-time

### 4. Console Testing

Open browser DevTools console and test directly:

```javascript
// Check if WebSocket sync is available
const logbookStore = window.__MIRUBATO_STORES__?.logbook
if (logbookStore) {
  console.log(
    'WebSocket sync enabled:',
    logbookStore.getState().isRealtimeSyncEnabled
  )
  console.log('Sync status:', logbookStore.getState().realtimeSyncStatus)
}

// Enable WebSocket sync programmatically
logbookStore
  .getState()
  .enableRealtimeSync()
  .then(success => {
    console.log('WebSocket sync enabled:', success)
  })

// Send a test event
const webSocketSync = window.__MIRUBATO_WEBSOCKET__
if (webSocketSync) {
  webSocketSync.send({
    type: 'PING',
    timestamp: new Date().toISOString(),
  })
}
```

### 5. Debug Tab Testing

In development mode, use the Debug tab:

1. Go to **About** page → **Debug** tab
2. **WebSocket Sync Testing** section shows:
   - Connection status
   - Real-time activity log
   - Test buttons for sending events
   - Connection controls

## 🔍 What to Look For

### Visual Indicators

- ✅ **Green WiFi icon**: Real-time sync connected and working
- 🔄 **Blue spinning icon**: Connecting/reconnecting
- ❌ **Red crossed WiFi icon**: Disconnected or error

### Real-time Behavior

- ✅ **Instant updates**: Changes appear immediately across devices
- ✅ **No page refresh**: Updates happen without reloading
- ✅ **Conflict resolution**: Last-write-wins for simultaneous edits
- ✅ **Offline queue**: Changes saved locally when offline, synced when reconnected

### Console Messages

Look for these in browser console:

```
[WebSocketSync] Connected to sync service
✨ New practice entry synced from another device: [Entry Title]
📝 Practice entry updated from another device: [Entry Title]
🗑️ Practice entry deleted from another device: [Entry Title]
```

## 🚨 Troubleshooting

### Connection Issues

```javascript
// Check connection status
console.log('WebSocket status:', webSocketSync.getConnectionStatus())
console.log('Offline queue size:', webSocketSync.getOfflineQueueSize())
```

### Manual Reconnection

```javascript
// Force reconnection
logbookStore.getState().disableRealtimeSync()
setTimeout(() => {
  logbookStore.getState().enableRealtimeSync()
}, 1000)
```

### Feature Flag Check

```javascript
// Verify feature flag
console.log(
  'Feature enabled:',
  localStorage.getItem('mirubato:features:websocket-sync')
)
```

## 🧪 Advanced Testing

### Load Testing

Open multiple tabs/windows (5-10) with the same user to test:

- Connection scaling
- Message broadcasting
- Performance under load

### Network Conditions

Test with:

- Slow network (DevTools → Network → Slow 3G)
- Offline/online switching
- Network interruptions

### Error Scenarios

- Invalid authentication tokens
- Server disconnections
- Malformed messages

## 🎯 Success Criteria

The WebSocket real-time sync is working correctly if:

1. ✅ Connection establishes automatically when authenticated
2. ✅ Sync indicator shows correct status
3. ✅ Practice entries sync instantly across devices
4. ✅ Manual sync still works as fallback
5. ✅ Offline changes are queued and sent when reconnected
6. ✅ No duplicate entries or data loss
7. ✅ Performance remains smooth with real-time updates

## 📊 Current Status

- ✅ **Backend**: Deployed and functional on staging
- ✅ **Frontend**: Integrated with feature flag control
- ✅ **Connection**: WebSocket handshake working
- ✅ **Events**: PING/PONG and sync events functional
- ✅ **UI**: Sync indicator and debug tools available
- ✅ **Testing**: Automated tests passing (449 tests)

**Ready for staging testing and user validation!** 🚀
