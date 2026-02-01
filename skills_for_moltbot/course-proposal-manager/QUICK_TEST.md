# Quick Callback Format Test

## Run This Test

**Step 1:** Send this message to your Moltbot Telegram bot:

```
Send me a test button with callback_data test:123
```

Or if your agent can create inline buttons, ask it to send:
- Text: "Test button"  
- Button with callback_data: "test:123"

**Step 2:** Click the button once.

**Step 3:** Check what appears:

### Option A: Message-Based
If a **new message** appears with text `test:123`, paste:
```
test:123
```

### Option B: Callback Query  
If **no new message** appears, check logs:
```bash
docker logs moltbot-setup 2>&1 | tail -100 | grep -A 5 -B 5 "test:123\|callback"
```

Paste the log snippet that shows the callback structure.

## What I Need

Just paste:
1. The exact message text that appeared (if Option A), OR
2. The log snippet showing callback_query structure (if Option B)

Then I'll give you the exact wiring code!
