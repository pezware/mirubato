# Debug LocalStorage Migration

If your old logbook entries are not showing up in frontendv2, follow these steps:

## 1. Quick Debug

Open the browser console (F12) and run:

```javascript
// Check what data you have
Object.keys(localStorage)
  .filter(k => k.includes('mirubato') || k.includes('logbook'))
  .forEach(k => console.log(k))
```

## 2. Manual Migration

If you see `mirubato_logbook_entries` but your entries aren't showing:

```javascript
// Copy this to browser console
const oldData = localStorage.getItem('mirubato_logbook_entries')
if (oldData) {
  localStorage.setItem('mirubato:logbook:entries', oldData)
  location.reload()
}
```

## 3. Full Debug Script

Copy the entire content of `debug-localStorage.js` to your browser console for a comprehensive analysis.

## 4. Force Re-Migration

In the browser console:

```javascript
// Remove new key to force migration
localStorage.removeItem('mirubato:logbook:entries')
// Reload the page - migration will run again
location.reload()
```

## Common Issues

1. **Empty entries array**: The migration might have run but found no data. Check if the original frontend stored data under a different key.

2. **Different domain**: If you accessed the original frontend on a different domain/port, the localStorage won't be shared.

3. **Module storage**: The original frontend might have stored individual entries as separate keys. The migration handles this, but you can check with:
   ```javascript
   Object.keys(localStorage).filter(k =>
     k.startsWith('mirubato:logbook:entry_')
   )
   ```
