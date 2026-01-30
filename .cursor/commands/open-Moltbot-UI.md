# Open Moltbot UI

Open the Moltbot Control UI in the default browser with authentication token.

## Instructions

Execute the following steps to open the Moltbot Control UI:

1. **Retrieve the gateway authentication token**:
   ```bash
   docker exec moltbot-setup clawdbot config get gateway.auth.token
   ```

2. **Open the browser** with the token appended to the URL:
   ```bash
   open "http://127.0.0.1:18789/?token=<TOKEN_FROM_STEP_1>"
   ```

Replace `<TOKEN_FROM_STEP_1>` with the actual token value retrieved in step 1.

## Notes

- Gateway URL: `http://127.0.0.1:18789/`
- Container name: `moltbot-setup`
- If you see a "pairing required" error, check for pending device approvals with `docker exec moltbot-setup clawdbot devices list` and approve them
