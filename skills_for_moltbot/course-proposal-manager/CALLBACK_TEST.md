# Callback Format Test

## Quick Test Steps

### 1. Send Test Button Message

Ask your Moltbot agent to send you a test message with inline buttons. You can say:

```
"Send me a test button with callback_data test:123"
```

Or manually create/send a message with:
- **Text**: "Test button"
- **Inline keyboard**: `[{"text": "Test", "callback_data": "test:123"}]`

### 2. Click the Button

Click the "Test" button once in Telegram.

### 3. Observe What Happens

**Check for ONE of these:**

#### Option A: Message-Based Callback
- ✅ A **new message** appears in the chat
- ✅ The message text is exactly: `test:123`
- ✅ It looks like a normal user message

**What to paste:**
```
test:123
```

#### Option B: True Callback Query
- ✅ **No new message** appears
- ✅ Check Moltbot logs or event payload
- ✅ Look for structure like:
  ```json
  {
    "callback_query": {
      "id": "123",
      "data": "test:123",
      "message": {...}
    }
  }
  ```

**What to paste:**
- Log snippet showing `callback_query.data = "test:123"`
- Or event payload structure

### 4. Report Results

Paste what you observed, and I'll provide the exact integration code.

## Alternative: Check Logs Directly

If you have access to Moltbot logs, check what appears when you click:

```bash
# Watch logs in real-time
docker logs -f moltbot-setup | grep -i "callback\|test:123"
```

Look for:
- `callback_query` object
- `update.callback_query`
- Or just the text `test:123` as a message

## What We're Looking For

The key question: **Does clicking a button send a message, or trigger a callback_query event?**

Once we know, the integration is straightforward:
- **Message-based**: Handle as normal incoming message
- **Callback query**: Handle as callback_query event

Both patterns are already implemented in `callback_handler.py` - we just need to know which one to wire up!
