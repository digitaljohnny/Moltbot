# Issue: Config File Missing - Telegram Not Connected

## Problem

When we recreated the Moltbot container, the config file (`clawdbot.json`) was lost. The container is running but **Telegram is not configured**, so Buddy can't receive messages.

## Symptoms

- ✅ Container is running
- ✅ Gateway is listening on port 18789
- ❌ Buddy doesn't respond to ANY messages (not just proposal messages)
- ❌ No Telegram channel initialization in logs

## Solution Options

### Option 1: Restore Original Container Config (If Available)

If you have a backup of the original config or the original container still exists:

```bash
# Check if old container exists
docker ps -a | grep moltbot

# If old container exists, copy config from it:
docker cp <old-container-id>:/root/.clawdbot/clawdbot.json ./clawdbot.json.backup
# Then copy into new container:
docker cp ./clawdbot.json.backup moltbot-setup:/home/node/.clawdbot/clawdbot.json
docker restart moltbot-setup
```

### Option 2: Configure via Control UI

1. Open Control UI: `http://127.0.0.1:18789/?token=f5e457b2e16f5b4cb51d5ee124426d296f77da7463133daa`
2. Go to Channels page
3. Enable Telegram channel
4. Enter Telegram bot token
5. Save configuration

### Option 3: Create Config File Manually

Create `/home/node/.clawdbot/clawdbot.json` with Telegram settings:

```json
{
  "gateway": {
    "port": 18789,
    "bind": "lan",
    "auth": {
      "mode": "token",
      "token": "f5e457b2e16f5b4cb51d5ee124426d296f77da7463133daa"
    },
    "mode": "local"
  },
  "channels": {
    "telegram": {
      "enabled": true,
      "botToken": "YOUR_TELEGRAM_BOT_TOKEN"
    },
    "imessage": {
      "enabled": false
    }
  },
  "plugins": {
    "entries": {
      "telegram": {
        "enabled": true
      },
      "imessage": {
        "enabled": false
      }
    }
  },
  "agents": {
    "default": {
      "model": "anthropic/claude-opus-4-5",
      "workspace": "/home/node/clawd"
    }
  }
}
```

Replace `YOUR_TELEGRAM_BOT_TOKEN` with your actual Telegram bot token.

Then restart:
```bash
docker restart moltbot-setup
```

## What You Need

Your **Telegram bot token** - this is what connects Moltbot to Telegram. You'll need to get this from:
- Your Telegram BotFather conversation
- Or your original Moltbot config (if you have it)

## After Configuring

Once Telegram is configured:
1. Buddy should start receiving messages
2. Test with: `hi` (should get a response)
3. Then test: `proposal:ingest:TC-20260201-001`
