# UI Errors Checklist

## Pages Checked
- [x] Chat (/chat)
- [x] Overview (/overview)
- [x] Operations (/operations)
- [x] Channels (/channels)
- [x] Instances (/instances)
- [x] Sessions (/sessions)
- [x] Cron Jobs (/cron)
- [x] Skills (/skills)
- [x] Nodes (/nodes)
- [x] Config (/config)
- [x] Debug (/debug)
- [x] Logs (/logs)

## Errors Found

### Chat Page (/chat)
- [x] No errors found - page loads correctly

### Overview Page (/overview)
- [x] Health status shows "Offline" instead of "OK" when WebSocket is disconnected
- [x] Status shows "Disconnected" - this may be expected if not connected, but should show connection status more clearly
- [x] Multiple fields show "n/a" when disconnected (Uptime, Tick Interval, Last Channels Refresh, Sessions, Cron)

### Operations Page (/operations)
- [x] No errors found - page loads correctly

### Channels Page (/channels)
- [x] All channels show "Schema unavailable. Use Raw." error message
- [x] Save buttons are disabled for all channels (WhatsApp, Telegram, Discord, Google Chat, Slack, Signal, iMessage, Nostr)
- [x] Config schema is not loading/available - this prevents form-based configuration

### Instances Page (/instances)
- [x] No errors found - page loads correctly

### Sessions Page (/sessions)
- [x] No errors found - page loads correctly

### Cron Jobs Page (/cron)
- [x] Health status shows "Offline" instead of "OK"
- [x] Scheduler section shows "n/a" for Enabled, Jobs, and Next wake fields

### Skills Page (/skills)
- [x] Health status shows "Offline" instead of "OK"
- [x] Shows "No skills found" - may be expected if no skills installed

### Nodes Page (/nodes)
- [x] No errors found - page loads correctly (large page but renders properly)

### Config Page (/config)
- [x] Shows "Loading schema…" message - schema may not be loading properly
- [x] Settings sidebar shows "unknown" as the category name when no section is selected
- [x] Form button is disabled when schema is loading

### Debug Page (/debug)
- [x] Status field shows "{}" (empty object) instead of formatted JSON or meaningful content
- [x] Last heartbeat shows "{}" (empty object) instead of formatted JSON or meaningful content
- [x] Models shows "[]" (empty array) - may be expected but could indicate API issue

### Logs Page (/logs)
- [x] Shows "No log entries" - may be expected if no logs yet
- [x] Loading button shows "Loading…" and is disabled
- [x] Export visible button is disabled

## General Issues
- [x] Health status indicator is inconsistent across pages (shows "Offline" on some pages, "OK" on others) - likely WebSocket connection state issue
- [x] WebSocket connection status not properly reflected in health indicator across all pages
- [x] Config schema not loading/available - affects Channels page (all channels) and Config page
- [x] Debug page shows empty objects `{}` for Status and Last heartbeat - may be expected if no data, but could be improved with "No data" message
- [x] Empty states not clearly indicating if data is expected to be empty or if there's an error

## Root Causes Identified

### CRITICAL: WebSocket Connection Failure
**Found in gateway logs**: Multiple WebSocket connection failures with error:
```
invalid connect params: at /client/id: must be equal to constant; at /client/id: must match a schema in anyOf
```

This explains:
- Health status showing "Offline" on some pages
- Config schema not loading (requires WebSocket connection)
- Data not loading properly
- Inconsistent connection state across pages

**Impact**: The UI cannot establish a proper WebSocket connection to the gateway, causing cascading failures.

### Other Issues
1. **Config Schema Loading Failure**: The gateway is not providing config schema data, causing "Schema unavailable. Use Raw." errors on Channels page (likely caused by WebSocket connection failure)
2. **WebSocket Connection State**: Health indicator inconsistency suggests WebSocket connection state is not being properly synchronized across page components (confirmed by connection errors)
3. **Empty Data Display**: Debug page shows `{}` for empty data instead of a more user-friendly "No data available" message

## Fixes Applied
None yet - UI source code is compiled in Docker container and requires rebuilding.

## Recommended Fixes

### 1. Debug Page - Empty Data Display
**File**: `/app/ui/src/ui/views/debug.ts`
**Issue**: Shows `{}` for empty status/heartbeat data
**Fix**: Update the renderDebug function to check if objects are empty and show a user-friendly message:
```typescript
// Instead of:
<pre class="code-block">${JSON.stringify(props.status ?? {}, null, 2)}</pre>

// Use:
${Object.keys(props.status ?? {}).length === 0 
  ? html`<div class="muted">No status data available</div>`
  : html`<pre class="code-block">${JSON.stringify(props.status, null, 2)}</pre>`}
```

### 2. Channels Page - Schema Loading
**File**: `/app/ui/src/ui/views/channels.config.ts`
**Issue**: Schema not loading, shows "Schema unavailable. Use Raw."
**Fix**: This appears to be a backend/API issue. The gateway needs to provide config schema via WebSocket or API. Check:
- Gateway logs for schema loading errors
- WebSocket connection is properly established
- Config schema endpoint is responding

### 3. Health Status Indicator
**Issue**: Inconsistent health status across pages
**Fix**: Ensure WebSocket connection state is properly shared across all page components. The health indicator should use a global connection state rather than per-page state.

### 4. Config Page - Schema Loading
**Issue**: Shows "Loading schema…" indefinitely
**Fix**: Similar to Channels page - ensure config schema API endpoint is working and WebSocket is properly connected.

## Next Steps

### Priority 1: Fix WebSocket Connection Issue
The WebSocket connection is failing due to invalid client ID parameters. This is the root cause of most UI issues.

**Investigation needed**:
1. Check WebSocket client ID generation in UI code
2. Verify gateway WebSocket schema validation
3. Check if client ID format has changed or if there's a version mismatch

**Potential fixes**:
- Update UI WebSocket client to send correct client ID format
- Check gateway WebSocket connection schema/validation logic
- Verify gateway and UI versions are compatible

### Priority 2: Improve Error Messages
1. Update debug.ts to show "No data available" instead of `{}` for empty objects
2. Improve error messages on Channels page when schema is unavailable
3. Add connection status indicators to all pages

### Priority 3: Verify Configuration
1. Check gateway logs for schema loading errors: `docker logs moltbot-setup | grep -i schema`
2. Verify WebSocket connection is established on all pages (currently failing)
3. Test config schema API endpoint: Check if `/api/config/schema` or similar endpoint exists and responds
4. Rebuild UI after making code changes (if source is accessible) 
