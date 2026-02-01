# Set COURSE_INGEST_TOKEN in Moltbot Container

## Problem

The Moltbot container needs the `COURSE_INGEST_TOKEN` environment variable to authenticate with the course-ingest API.

**Token:** `8-iVeTs0dZWb_Hw3PtzXV14wJlEkw3t29BzJw52Qc5Y`

## Solution Options

### Option 1: Set via Container Environment (Temporary)

Set the environment variable in the running container (will be lost on restart):

```bash
# Set environment variable in running container
docker exec moltbot-setup sh -c 'export COURSE_INGEST_TOKEN=8-iVeTs0dZWb_Hw3PtzXV14wJlEkw3t29BzJw52Qc5Y && export COURSE_INGEST_URL=http://host.docker.internal:8088'
```

**Note:** This only affects the current process. For Buddy to see it, you need to restart Moltbot.

### Option 2: Restart Container with Environment Variable (Recommended)

If Moltbot is started via `docker run`, restart it with the env vars:

```bash
# Stop current container
docker stop moltbot-setup

# Start with environment variables
docker run -d \
  --name moltbot-setup \
  --env COURSE_INGEST_TOKEN=8-iVeTs0dZWb_Hw3PtzXV14wJlEkw3t29BzJw52Qc5Y \
  --env COURSE_INGEST_URL=http://host.docker.internal:8088 \
  -p 127.0.0.1:18789:18789 \
  moltbot-img:latest \
  gateway --port 18789 --bind lan
```

### Option 3: Use Docker Compose (If Available)

If Moltbot uses docker-compose, add to the service:

```yaml
services:
  moltbot-setup:
    environment:
      COURSE_INGEST_TOKEN: 8-iVeTs0dZWb_Hw3PtzXV14wJlEkw3t29BzJw52Qc5Y
      COURSE_INGEST_URL: http://host.docker.internal:8088
```

Then restart:
```bash
docker-compose restart moltbot-setup
```

### Option 4: Set in Clawdbot Config (If Supported)

Check if Clawdbot supports environment variables in config:

```bash
docker exec moltbot-setup cat /root/.clawdbot/clawdbot.json
```

If there's an `env` or `environment` section, add:
```json
{
  "env": {
    "COURSE_INGEST_TOKEN": "8-iVeTs0dZWb_Hw3PtzXV14wJlEkw3t29BzJw52Qc5Y",
    "COURSE_INGEST_URL": "http://host.docker.internal:8088"
  }
}
```

## Verify Token is Set

After setting and restarting:

```bash
# Check environment variable (may not show if set in config)
docker exec moltbot-setup printenv | grep COURSE_INGEST

# Or test from inside Buddy's Python:
docker exec moltbot-setup python3 -c "
import os
print('COURSE_INGEST_URL:', os.getenv('COURSE_INGEST_URL', 'NOT SET'))
print('COURSE_INGEST_TOKEN:', os.getenv('COURSE_INGEST_TOKEN', 'NOT SET'))
"
```

## Test After Setting

1. Restart Moltbot container
2. Send in Telegram: `proposal:ingest:TC-20260201-001`
3. Should succeed (no 401 error)

## Quick Fix (Temporary Test)

For a quick test, you can modify `proposal_manager.py` to hardcode the token temporarily:

```python
# Temporary hardcode for testing
COURSE_INGEST_TOKEN = "8-iVeTs0dZWb_Hw3PtzXV14wJlEkw3t29BzJw52Qc5Y" if not os.getenv("COURSE_INGEST_TOKEN") else os.getenv("COURSE_INGEST_TOKEN")
```

But the proper solution is to set the environment variable in the container.
