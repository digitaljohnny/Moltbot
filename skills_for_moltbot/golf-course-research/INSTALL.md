# Installation Guide - Golf Course Research Skill

## Installation Status

✅ **The skill is already installed!** The files are in place and ready to use.

## Installation Location

The skill files are located in the agent workspace:
```
/root/clawd/skills/golf-course-research/
```

## Files Installed

- `SKILL.md` - Main skill documentation and instructions
- `classify-course-type.py` - Python helper script for course type classification
- `README.md` - Overview documentation
- `INSTALL.md` - This installation guide

## How It Works

In Clawdbot/Moltbot, workspace-based skills don't require formal installation. The agent discovers and uses skills by:

1. **Reading SKILL.md files** - When the agent needs to perform a task, it can read skill documentation from the workspace
2. **Referencing TOOLS.md** - The workspace `TOOLS.md` file has been updated to reference this skill
3. **Using helper scripts** - The Python classification script is available in the skill directory

## Verification

To verify the skill is installed correctly:

```bash
# Check files exist
docker exec moltbot-setup ls -la /root/clawd/skills/golf-course-research/

# Verify TOOLS.md references the skill
docker exec moltbot-setup grep -A 5 "Golf Course Research" /root/clawd/TOOLS.md

# Test the classification script
docker exec moltbot-setup python3 /root/clawd/skills/golf-course-research/classify-course-type.py
```

## Usage

The agent will automatically use this skill when:
- A user requests golf course research
- A user asks for information about a golf course
- The agent needs to classify course types

**Example requests:**
- "Research Pebble Beach Golf Links in Pebble Beach, CA"
- "Find information about Augusta National in Augusta, GA"
- "What type of course is [course name]?"

## Manual Testing

You can test the classification script directly:

```bash
# Create a test course data file
docker exec moltbot-setup bash -c 'cat > /tmp/test_course.json << EOF
{
  "holes": 18,
  "totalYardage": 6500,
  "parValues": [4,4,3,5,4,4,3,5,4,4,3,5,4,4,3,5,4,4],
  "description": "Championship parkland course with strategic design",
  "locationInfo": "Inland, tree-lined course"
}
EOF'

# Run classification
docker exec moltbot-setup python3 /root/clawd/skills/golf-course-research/classify-course-type.py /tmp/test_course.json
```

## Updating the Skill

To update the skill files:

1. **Edit files locally** in `skills/golf-course-research/`
2. **Copy to container**:
   ```bash
   docker cp skills/golf-course-research/SKILL.md moltbot-setup:/root/clawd/skills/golf-course-research/SKILL.md
   docker cp skills/golf-course-research/classify-course-type.py moltbot-setup:/root/clawd/skills/golf-course-research/classify-course-type.py
   ```

## Troubleshooting

**Skill not being used?**
- Verify files are in `/root/clawd/skills/golf-course-research/`
- Check that `TOOLS.md` references the skill
- Ensure the agent has web search capabilities enabled

**Classification script not working?**
- Verify Python 3 is available: `docker exec moltbot-setup python3 --version`
- Check script permissions: `docker exec moltbot-setup ls -l /root/clawd/skills/golf-course-research/classify-course-type.py`

**Agent not finding the skill?**
- The agent reads skills from the workspace automatically
- No configuration changes needed
- The skill is referenced in `TOOLS.md` for easy discovery

## Notes

- This is a **workspace-based skill** - it doesn't require npm installation or config registration
- The agent discovers skills by reading `SKILL.md` files in the workspace
- Helper scripts are available for programmatic classification
- The skill uses web search capabilities (which should be available via MCP tools)
