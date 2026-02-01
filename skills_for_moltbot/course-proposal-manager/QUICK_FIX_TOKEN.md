# Quick Fix: Set COURSE_INGEST_TOKEN

## The Problem

Buddy is getting `401 Unauthorized` when trying to ingest proposals because the `COURSE_INGEST_TOKEN` environment variable isn't set in the Moltbot container.

## The Token

```
COURSE_INGEST_TOKEN=8-iVeTs0dZWb_Hw3PtzXV14wJlEkw3t29BzJw52Qc5Y
COURSE_INGEST_URL=http://host.docker.internal:8088
```

## Quick Fix: Restart Container with Env Vars

### Step 1: Stop Current Container

```bash
docker stop moltbot-setup
```

### Step 2: Remove Old Container (if needed)

```bash
docker rm moltbot-setup
```

### Step 3: Start with Environment Variables

```bash
docker run -d \
  --name moltbot-setup \
  --env COURSE_INGEST_TOKEN=8-iVeTs0dZWb_Hw3PtzXV14wJlEkw3t29BzJw52Qc5Y \
  --env COURSE_INGEST_URL=http://host.docker.internal:8088 \
  -p 127.0.0.1:18789:18789 \
  --restart unless-stopped \
  moltbot-img:latest \
  gateway --port 18789 --bind lan
```

### Step 4: Verify

```bash
# Check container is running
docker ps | grep moltbot-setup

# Test token is available (may need to check from Buddy's Python context)
docker exec moltbot-setup python3 -c "import os; print('Token:', 'SET' if os.getenv('COURSE_INGEST_TOKEN') else 'NOT SET')"
```

### Step 5: Test Ingest

Send in Telegram:
```
proposal:ingest:TC-20260201-001
```

Should succeed (no 401 error).

## Alternative: Check How Container Was Started

If Moltbot was started via a script or docker-compose, find that file and add the environment variables there, then restart.

## Permanent Solution

For a permanent fix, ensure the environment variables are set wherever Moltbot is started (startup script, docker-compose, systemd service, etc.).
