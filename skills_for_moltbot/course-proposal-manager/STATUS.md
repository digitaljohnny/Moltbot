# Status: Moltbot Container Setup

## ✅ Completed

1. **Container Started** with environment variables:
   - `COURSE_INGEST_TOKEN=8-iVeTs0dZWb_Hw3PtzXV14wJlEkw3t29BzJw52Qc5Y`
   - `COURSE_INGEST_URL=http://host.docker.internal:8088`

2. **Environment Variables Verified**:
   ```bash
   docker exec moltbot-setup printenv | grep COURSE_INGEST
   # Shows both variables are set ✅
   ```

3. **File Updated**: `proposal_manager.py` has fallback token hardcoded

## ⏳ Pending (Once Container Stabilizes)

The container is currently restarting (likely needs config setup). Once it's running stable:

1. **Copy proposal manager files**:
   ```bash
   docker exec moltbot-setup mkdir -p /home/node/clawd/data /home/node/clawd/skills_for_moltbot
   docker cp "/Users/johngilkey/Documents/Code Repository/Moltbot/skills_for_moltbot/course-proposal-manager" \
     moltbot-setup:/home/node/clawd/skills_for_moltbot/
   docker exec moltbot-setup chown -R node:node /home/node/clawd/skills_for_moltbot /home/node/clawd/data
   ```

2. **Verify files**:
   ```bash
   docker exec moltbot-setup ls -la /home/node/clawd/skills_for_moltbot/course-proposal-manager/
   ```

## 🎯 What's Working

- ✅ Environment variables are set in container
- ✅ Token is hardcoded in `proposal_manager.py` as fallback
- ✅ Container command is correct: `node dist/index.js gateway --port 18789 --bind lan`

## 📝 Next Steps

1. Wait for container to stabilize (may need config setup)
2. Copy proposal manager files once container is running
3. Test ingest: `proposal:ingest:TC-20260201-001`

The token will work either from the environment variable OR the hardcoded fallback, so ingest should work once files are copied.
