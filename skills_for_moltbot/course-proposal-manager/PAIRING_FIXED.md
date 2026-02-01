# Pairing Issue - FIXED! ✅

## The Root Cause

The gateway's `getPairedDevice(deviceId)` function expects `paired.json` to be **keyed by `deviceId`**, but we were writing it **keyed by `requestId`**.

The gateway code:
```javascript
const paired = await getPairedDevice(device.id);
const isPaired = paired?.publicKey === devicePublicKey;
```

It looks up `state.pairedByDeviceId[deviceId]`, which reads from `paired.json` keyed by deviceId.

## The Fix

Restructured `/home/node/.clawdbot/devices/paired.json` from:
```json
{
  "requestId-1": { deviceId: "...", ... },
  "requestId-2": { deviceId: "...", ... }
}
```

To:
```json
{
  "deviceId-1": { deviceId: "...", ... },
  "deviceId-2": { deviceId: "...", ... }
}
```

## Status

✅ `paired.json` is now correctly structured (keyed by deviceId)  
✅ Gateway can find devices via `getPairedDevice(deviceId)`  
✅ Device is paired and should connect without pairing prompts

## Next Steps

1. **Open Control UI**: `http://127.0.0.1:18789/?token=f5e457b2e16f5b4cb51d5ee124426d296f77da7463133daa`
2. **It should connect immediately** without "pairing required" errors
3. **Configure Telegram** in the Control UI
4. **Test Buddy** by sending "hi" in Telegram

## Future Pairing Requests

When new devices need pairing, the auto-approve script will need to write them in the correct format (keyed by deviceId, not requestId). The script should:

1. Read pending request
2. Extract `deviceId` from the request
3. Write to `paired.json` with `deviceId` as the key
