# Alternative: Set Token Without Restarting Container

Since restarting the container requires the exact startup command, here's an alternative approach:

## Option 1: Hardcode Token Temporarily (Quick Test)

Modify `proposal_manager.py` to use a fallback token:

```python
# In proposal_manager.py, change line 25:
COURSE_INGEST_TOKEN = os.getenv("COURSE_INGEST_TOKEN") or "8-iVeTs0dZWb_Hw3PtzXV14wJlEkw3t29BzJw52Qc5Y"
```

Then copy the updated file to the container:
```bash
docker cp "/Users/johngilkey/Documents/Code Repository/Moltbot/skills_for_moltbot/course-proposal-manager/proposal_manager.py" \
  moltbot-setup:/home/node/clawd/skills_for_moltbot/course-proposal-manager/proposal_manager.py
```

## Option 2: Find Original Startup Command

Check how the container was originally started:

```bash
# Check if there's a docker-compose file
find . -name "*docker-compose*.yml" -o -name "*docker-compose*.yaml"

# Or check if there's a startup script
find . -name "*start*.sh" -o -name "*moltbot*.sh"

# Check container history
docker inspect moltbot-setup --format='{{.Config.Cmd}}'
docker inspect moltbot-setup --format='{{.Config.Entrypoint}}'
```

Then restart with the same command + env vars.

## Option 3: Use Docker Compose (If Available)

If Moltbot uses docker-compose, create/update `docker-compose.yml`:

```yaml
services:
  moltbot-setup:
    image: moltbot-img:latest
    container_name: moltbot-setup
    environment:
      COURSE_INGEST_TOKEN: 8-iVeTs0dZWb_Hw3PtzXV14wJlEkw3t29BzJw52Qc5Y
      COURSE_INGEST_URL: http://host.docker.internal:8088
    ports:
      - "127.0.0.1:18789:18789"
    command: [clawdbot, gateway, --port, 18789, --bind, lan]
    restart: unless-stopped
```

Then:
```bash
docker-compose up -d
```

## Recommended: Option 1 (Quick Test)

For immediate testing, use Option 1 to hardcode the token temporarily. Then find the proper startup method for a permanent fix.
