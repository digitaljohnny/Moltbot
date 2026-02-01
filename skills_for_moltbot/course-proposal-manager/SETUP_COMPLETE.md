# Setup Complete - Next Steps

## ✅ What's Working

1. **Control UI**: Connected successfully (pairing fixed!)
2. **Gateway**: Running and listening on port 18789

## ❌ What Needs Configuration

### 1. Anthropic API Key (Required for Buddy to respond)

Buddy needs an Anthropic API key to use the Claude model. You have two options:

**Option A: Set Environment Variable**
```bash
# Stop container
docker stop moltbot-setup

# Start with ANTHROPIC_API_KEY
docker run -d \
  --name moltbot-setup \
  --env ANTHROPIC_API_KEY=your_anthropic_api_key_here \
  --env COURSE_INGEST_TOKEN=8-iVeTs0dZWb_Hw3PtzXV14wJlEkw3t29BzJw52Qc5Y \
  --env COURSE_INGEST_URL=http://host.docker.internal:8088 \
  --env CLAWDBOT_GATEWAY_TOKEN=f5e457b2e16f5b4cb51d5ee124426d296f77da7463133daa \
  -p 127.0.0.1:18789:18789 \
  --restart unless-stopped \
  moltbot-img:latest \
  node dist/index.js gateway --port 18789 --bind lan --allow-unconfigured
```

**Option B: Create auth-profiles.json Manually**
```bash
docker exec moltbot-setup python3 << 'PYTHON'
import json
import os

agent_dir = '/home/node/.clawdbot/agents/main/agent'
auth_file = os.path.join(agent_dir, 'auth-profiles.json')

os.makedirs(agent_dir, exist_ok=True)

auth_profiles = {
    "anthropic": {
        "apiKey": "YOUR_ANTHROPIC_API_KEY_HERE"
    }
}

with open(auth_file, 'w') as f:
    json.dump(auth_profiles, f, indent=2)

print('✅ Created auth-profiles.json')
PYTHON

docker restart moltbot-setup
```

### 2. Telegram Configuration (Required for Telegram messages)

**Option A: Configure via Control UI (Easiest)**
1. Open: `http://127.0.0.1:18789/?token=f5e457b2e16f5b4cb51d5ee124426d296f77da7463133daa`
2. Go to **Channels** page
3. Enable **Telegram** channel
4. Enter your **Telegram bot token**
5. Save configuration

**Option B: Configure via Config File**
```bash
docker exec moltbot-setup python3 << 'PYTHON'
import json

config_path = '/home/node/.clawdbot/clawdbot.json'

# Read current config
with open(config_path, 'r') as f:
    config = json.load(f)

# Add Telegram config
config['channels'] = {
    'telegram': {
        'enabled': True,
        'botToken': 'YOUR_TELEGRAM_BOT_TOKEN_HERE'
    },
    'imessage': {
        'enabled': False
    }
}

config['plugins'] = {
    'entries': {
        'telegram': {
            'enabled': True
        },
        'imessage': {
            'enabled': False
        }
    }
}

# Write back
with open(config_path, 'w') as f:
    json.dump(config, f, indent=2)

print('✅ Updated config with Telegram settings')
PYTHON

docker restart moltbot-setup
```

## Testing

After configuring both:

1. **Test Buddy in Control UI**: Send "hi" - should get a response
2. **Test Telegram**: Send "hi" to your Telegram bot - should get a response
3. **Test Proposal Routing**: Send `proposal:view_json:TC-20260201-001` - should return JSON

## What You Need

1. **Anthropic API Key**: Get from https://console.anthropic.com/
2. **Telegram Bot Token**: Get from @BotFather on Telegram
