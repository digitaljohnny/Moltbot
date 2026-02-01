# Device Pairing Solution

## The Problem

Each time you open the Control UI, it creates a new pairing request. The gateway requires device pairing for security.

## Quick Fix: Auto-Approve Script

I've created an auto-approve script that will automatically approve devices from localhost. However, the **simplest solution** is to use the Control UI's built-in pairing flow.

## Recommended: Use Control UI Pairing Flow

When you see "pairing required", the Control UI should show a pairing interface. Look for:

1. **A pairing button or link** in the UI
2. **A QR code or pairing code** to approve
3. **Or check the browser console** for pairing instructions

The Control UI should handle pairing automatically if configured correctly.

## Alternative: Manual Approval Script

If the UI doesn't work, you can run this script to auto-approve devices:

```bash
docker exec moltbot-setup python3 /home/node/clawd/auto_approve_devices.py
```

But this is a workaround - the proper way is through the Control UI.

## Current Status

- ✅ 2 devices already paired
- ⚠️ New requests created on each connection
- 🔧 Need to use Control UI pairing flow OR auto-approve script

## Next Steps

1. **Try the Control UI again** - it should show a pairing interface
2. **Or run the auto-approve script** in background
3. **Then configure Telegram** once UI is accessible
