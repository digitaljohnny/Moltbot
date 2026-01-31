# Indian Hills Research Errors Analysis

## Summary
Multiple errors occurred when researching "Indian Hills" golf course. The primary issue is that the agent is incorrectly calling `web_fetch` with the course name as a URL instead of following the proper research workflow.

## Errors Found

### 1. **CRITICAL: Incorrect web_fetch Usage**
**Error**: `web_fetch failed: Web fetch failed (404): Indian Hills`

**Problem**: The agent called `web_fetch` with "Indian Hills" as a URL, resulting in a 404 error. The course name is being treated as a URL instead of a search query.

**Root Cause**: The agent is not following the golf-course-research skill workflow:
- ❌ **Current behavior**: Directly calling `web_fetch("Indian Hills")` 
- ✅ **Expected behavior**: 
  1. Use Google Places skill to locate the course
  2. Get the official website URL from Google Places
  3. Use that URL with `web_fetch` or Playwright

**Location**: `skills/golf-course-research/SKILL.md` Step 1 and Step 3

### 2. **Browser/Playwright Failures**
**Error**: `browser failed: Can't reach the clawd browser control service. Start (or restart) the Moltbot gateway (Moltbot.app menubar, or `moltbot gateway`) and try again. (Error: Error: No supported browser found (Chrome/Brave/Edge/Chromium on macOS, Linux, or Windows).)`

**Problem**: Playwright cannot run in the Docker container environment (no browser available).

**Impact**: The skill documentation recommends Playwright as the primary method for browsing course websites, but this fails in Docker.

**Workaround**: The skill should fall back to lightweight web fetches when Playwright is unavailable.

### 3. **Python Execution Errors**
**Errors**:
- `exec failed: sh: 1: python: Permission denied`
- `exec failed: Traceback (most recent call last): ModuleNotFoundError: No module named 'requests'`
- `exec failed: sh: 10: Syntax error: end of file unexpected (expecting ")")`

**Problem**: Multiple Python script execution failures:
- Python permission issues
- Missing dependencies (`requests` module)
- Shell syntax errors

**Impact**: Any Python helper scripts (like `classify-course-type.py`) cannot run.

### 4. **API Key Errors** (Separate Issue)
**Error**: `No API key found for provider "anthropic"` and `No API key found for provider "openai"`

**Problem**: Missing API keys for LLM providers.

**Impact**: Agent cannot generate responses or perform AI reasoning for course classification.

## Recommended Fixes

### Fix 1: Update Skill Documentation
**File**: `skills/golf-course-research/SKILL.md`

**Change**: Add explicit error handling and fallback instructions:

```markdown
### Step 1: Locate the Course (Google Places) - REQUIRED FIRST STEP
**CRITICAL**: Always use Google Places FIRST before attempting any web fetches.

- Run a text search with: `"{courseName}" "{city}" "{state}" golf course`
- **DO NOT** call `web_fetch` with the course name directly
- **DO NOT** treat the course name as a URL
- If multiple candidates are returned, present 3-5 and ask the user to pick one
- Use the selected candidate's `placeId` to fetch place details
- Extract the `website` field from place details - this is the URL to use for web fetches

### Step 3: Browse the Course Website
**IMPORTANT**: Use the website URL from Google Places, NOT the course name.

- Open the official course website URL from Google Places (e.g., `https://indianhillsgolf.com`)
- If Playwright is unavailable (Docker environment), fall back to `web_fetch` with the full URL
- Prefer the most relevant subpages: `/golf`, `/course`, `/scorecard`, `/rates`, `/policies`
- For any page accessed via Playwright, add a provenance entry with `method: "playwright"`
- For any page accessed via web_fetch, add a provenance entry with `method: "web_fetch"`
```

### Fix 2: Add Error Handling for Missing Tools
**File**: `skills/golf-course-research/SKILL.md`

**Change**: Add a troubleshooting section:

```markdown
## Troubleshooting

### Playwright Unavailable
If Playwright fails (e.g., in Docker environments):
- Fall back to `web_fetch` with the full website URL from Google Places
- Use `web_search` for finding course information if direct website access fails
- Document the method used in provenance

### Python Scripts Unavailable
If Python helper scripts fail:
- Use AI reasoning directly for course type classification
- Follow the taxonomy rules in the skill documentation
- Classify based on collected information without Python scripts
```

### Fix 3: Improve Agent Instructions
**File**: `TOOLS.md` or agent instructions

**Change**: Add explicit warning:

```markdown
## Golf Course Research - CRITICAL WORKFLOW

**NEVER** call `web_fetch` with just a course name. Always follow this order:

1. **FIRST**: Use Google Places skill to locate the course
   - Search: `"{courseName}" "{city}" "{state}" golf course`
   - Get place details including the `website` field

2. **THEN**: Use the website URL from Google Places for web fetches
   - Call `web_fetch` with the full URL (e.g., `https://indianhillsgolf.com`)
   - Or use Playwright if available

3. **NEVER**: Call `web_fetch("Indian Hills")` or similar - course names are NOT URLs
```

## Error Logs Reference

### Main Error (05:08:37 UTC)
```
2026-01-30T05:08:37.225Z [tools] web_fetch failed: Web fetch failed (404): Indian Hills
```

### Browser Errors
```
2026-01-30T05:07:36.968Z [tools] browser failed: Can't reach the clawd browser control service...
2026-01-30T04:48:45.335Z [tools] browser failed: Can't reach the clawd browser control service...
```

### Python Errors
```
2026-01-30T05:07:45.161Z [tools] exec failed: sh: 1: python: Permission denied
2026-01-30T05:07:54.053Z [tools] exec failed: Traceback (most recent call last):
ModuleNotFoundError: No module named 'requests'
2026-01-30T05:07:59.796Z [tools] exec failed: sh: 10: Syntax error: end of file unexpected (expecting ")")
```

## Next Steps

1. **Immediate**: Update skill documentation to prevent incorrect `web_fetch` usage
2. **Short-term**: Add error handling and fallback instructions for Docker environments
3. **Long-term**: Consider adding validation/pre-checks before tool calls to catch these errors earlier

## Related Files
- `skills/golf-course-research/SKILL.md` - Main skill documentation
- `skills/golf-course-research/classify-course-type.py` - Python helper (failing in Docker)
- `TOOLS.md` - Agent instructions for golf course research
