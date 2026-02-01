# Setup: Copy Proposal Manager into Moltbot Container

## File Locations

**On Mac Host:**
- Proposal manager code: `/Users/johngilkey/Documents/Code Repository/Moltbot/skills_for_moltbot/course-proposal-manager/`
- Database: Will be created at `/home/node/clawd/data/course_proposals.db` (inside container)

**Inside Container:**
- Target code path: `/home/node/clawd/skills_for_moltbot/course-proposal-manager/`
- Target DB path: `/home/node/clawd/data/course_proposals.db`

## Setup Commands

### Step 1: Create Directories

```bash
# Create data directory (for SQLite DB)
docker exec moltbot-setup mkdir -p /home/node/clawd/data

# Create skills_for_moltbot directory
docker exec moltbot-setup mkdir -p /home/node/clawd/skills_for_moltbot
```

### Step 2: Copy Proposal Manager Code

```bash
# Copy the entire course-proposal-manager directory into container
docker cp "/Users/johngilkey/Documents/Code Repository/Moltbot/skills_for_moltbot/course-proposal-manager" \
  moltbot-setup:/home/node/clawd/skills_for_moltbot/
```

### Step 3: Verify Files Are Present

```bash
# List files in the copied directory
docker exec moltbot-setup ls -la /home/node/clawd/skills_for_moltbot/course-proposal-manager/

# Check for key files
docker exec moltbot-setup test -f /home/node/clawd/skills_for_moltbot/course-proposal-manager/callback_handler.py && echo "✓ callback_handler.py exists"
docker exec moltbot-setup test -f /home/node/clawd/skills_for_moltbot/course-proposal-manager/proposal_manager.py && echo "✓ proposal_manager.py exists"
```

### Step 4: Set Permissions (if needed)

```bash
# Ensure node user can read/write
docker exec moltbot-setup chown -R node:node /home/node/clawd/skills_for_moltbot
docker exec moltbot-setup chown -R node:node /home/node/clawd/data
```

### Step 5: Verify Database Path

The database will be created automatically on first use. Verify the path is correct:

```bash
# Check that data directory exists and is writable
docker exec moltbot-setup ls -ld /home/node/clawd/data
```

## One-Line Setup (All Steps)

```bash
docker exec moltbot-setup mkdir -p /home/node/clawd/data /home/node/clawd/skills_for_moltbot && \
docker cp "/Users/johngilkey/Documents/Code Repository/Moltbot/skills_for_moltbot/course-proposal-manager" \
  moltbot-setup:/home/node/clawd/skills_for_moltbot/ && \
docker exec moltbot-setup chown -R node:node /home/node/clawd/skills_for_moltbot /home/node/clawd/data && \
docker exec moltbot-setup ls -la /home/node/clawd/skills_for_moltbot/course-proposal-manager/ | head -10
```

## Dependencies

The proposal manager requires the `requests` library for HTTP calls to the ingest API. 

**Note:** The agent's Python environment (where Buddy runs) should have `requests` available. If you encounter `ModuleNotFoundError: No module named 'requests'`, you may need to:

1. Install it in the agent's Python environment (check how Moltbot manages Python dependencies)
2. Or ensure the agent has access to a Python environment with `requests` installed

The code will be executed by the agent (Buddy), not directly by the container's Python, so the agent's environment is what matters.

## Verification

After setup, verify files are present:

```bash
# Check key files exist
docker exec moltbot-setup test -f /home/node/clawd/skills_for_moltbot/course-proposal-manager/callback_handler.py && echo "✓ callback_handler.py exists"
docker exec moltbot-setup test -f /home/node/clawd/skills_for_moltbot/course-proposal-manager/proposal_manager.py && echo "✓ proposal_manager.py exists"

# List directory contents
docker exec moltbot-setup ls -la /home/node/clawd/skills_for_moltbot/course-proposal-manager/ | grep -E "(callback_handler|proposal_manager|\.py$)"
```

**Note:** Import tests may fail if `requests` isn't available in the container's Python, but this is OK - the agent's Python environment is what matters.

## Database Creation

The database will be created automatically when `create_proposal()` is first called. To verify it exists:

```bash
# After creating a proposal, check:
docker exec moltbot-setup ls -lh /home/node/clawd/data/course_proposals.db
```

## Troubleshooting

**"No such file or directory"**
- Ensure directories were created: `docker exec moltbot-setup ls -la /home/node/clawd/`
- Check container name: `docker ps | grep moltbot`

**"Permission denied"**
- Fix ownership: `docker exec moltbot-setup chown -R node:node /home/node/clawd/skills_for_moltbot /home/node/clawd/data`

**"Module not found"**
- Verify files copied: `docker exec moltbot-setup ls -la /home/node/clawd/skills_for_moltbot/course-proposal-manager/`
- Check Python path in your agent code matches `/home/node/clawd/skills_for_moltbot/course-proposal-manager`

## Next Steps

After setup:
1. Integrate agent routing (see `AGENT_ROUTING.md`)
2. Test with manual message: `proposal:view_json:TO-20260201-001`
3. Test with button click on a proposal card
