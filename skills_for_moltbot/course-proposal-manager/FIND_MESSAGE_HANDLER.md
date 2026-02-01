# Finding Your Agent Message Handler

## Where to Look

The agent message preprocessing happens in one of these places:

### Option 1: Moltbot Config Hook

Check your `clawdbot.json` config for hooks:

```bash
docker exec moltbot-setup cat /root/.clawdbot/clawdbot.json | grep -A 5 hooks
```

Look for:
- `hooks.entries.message-received` - A hook that processes messages
- Any custom message preprocessing hooks

### Option 2: Agent Code/Instructions

Check your agent's instructions or code files:

**Common locations:**
- `/home/node/clawd/AGENTS.md` - Agent instructions
- `/home/node/clawd/TOOLS.md` - Tool definitions
- `/home/node/clawd/*.py` - Any Python files that handle messages

**Look for:**
- Functions that process Telegram messages
- Code that calls the LLM with user messages
- Message preprocessing logic

### Option 3: Skill-Level Handling

If messages are handled at the skill level, check:
- `/home/node/clawd/skills/` - Any skill that handles messages
- Skill files that mention "telegram" or "message"

## What to Look For

Search for code patterns like:

```python
# Pattern 1: Direct message handler
def handle_message(message):
    text = message.get("text")
    # ... send to LLM

# Pattern 2: Preprocessing function
def preprocess_message(message):
    # ... modify message before LLM

# Pattern 3: Hook function
def message_received_hook(message):
    # ... process message
```

## Quick Search Commands

```bash
# Search for message handling in agent workspace
docker exec moltbot-setup find /home/node/clawd -name "*.py" -exec grep -l "message\|telegram" {} \;

# Search in markdown files
docker exec moltbot-setup find /home/node/clawd -name "*.md" -exec grep -l "message\|telegram" {} \;

# Check config for hooks
docker exec moltbot-setup cat /root/.clawdbot/clawdbot.json | grep -i hook
```

## What You Need to Add

Once you find where messages are processed, add this **at the very beginning**:

```python
# Import the routing function
from INTEGRATION_SNIPPET import route_proposal_callbacks

# In your message handler, add this FIRST:
def handle_incoming_message(message_data):
    # STEP 1: Intercept proposal callbacks BEFORE anything else
    proposal_result = route_proposal_callbacks(message_data)
    if proposal_result.get("handled"):
        return  # Don't send to LLM
    
    # STEP 2: Continue your normal message processing...
    # (send to LLM, etc.)
```

## Alternative: If You Can't Find It

If you can't locate the message handler:

1. **Check Moltbot documentation** - Look for "message hooks" or "message preprocessing"
2. **Check agent logs** - See where messages are logged/processed
3. **Ask in Moltbot community** - Where do agents intercept messages before LLM?

## Once You Find It

1. Copy `INTEGRATION_SNIPPET.py` to your agent workspace
2. Import `route_proposal_callbacks` in your message handler
3. Call it **first** in your message processing function
4. Test with `proposal:view_json:<ID>` message

## Still Stuck?

If you can't find the message handler, you can:

1. **Create a new hook file** - Add `/home/node/clawd/message_preprocess.py` with the routing code
2. **Register it as a hook** - Add to `clawdbot.json` hooks section
3. **Or tell me what you find** - Paste the code block where messages are handled, and I'll show you exactly where to add the routing
