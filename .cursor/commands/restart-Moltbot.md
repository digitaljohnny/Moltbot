# Restart Moltbot

Start or restart the Moltbot container and gateway service.

## Instructions

Execute the following steps to restart the Moltbot container and gateway:

1. **Check container status**:
   ```bash
   docker ps -a --filter "name=moltbot-setup" --format "{{.Names}}\t{{.Status}}"
   ```

2. **Start or restart the container** based on its current state:
   - If container is stopped: `docker start moltbot-setup`
   - If container is running: `docker restart moltbot-setup`
   - If container doesn't exist: Inform the user that the container needs to be created first

3. **Wait for container to initialize**:
   ```bash
   sleep 2
   ```

4. **Restart the gateway service** inside the container:
   ```bash
   docker exec moltbot-setup clawdbot gateway restart
   ```

## Complete Workflow

Execute these commands in sequence:

```bash
# Check and restart/start container
if docker ps -a --format '{{.Names}}' | grep -q '^moltbot-setup$'; then 
  docker restart moltbot-setup
else 
  docker start moltbot-setup 2>/dev/null || echo "Error: Container 'moltbot-setup' does not exist."
fi

# Wait and restart gateway
sleep 2 && docker exec moltbot-setup clawdbot gateway restart
```

## Notes

- Container name: `moltbot-setup`
- Gateway runs as the main process (PID1) inside the container
- The gateway restart ensures proper service restart even if the container was already running
