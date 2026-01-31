# Wheatfield Valley Research Enhancements

## Summary
Analysis of the "Wheatfield Valley, Williamston, MI" research process reveals opportunities to improve error handling, URL construction, and information extraction from error pages.

## Error Analysis

### Error Found
**Error**: `web_fetch failed: Web fetch failed (404): Page not found – Wheatfield Valley Golf`

**Observation**: The error response contains valuable information:
- Website URL: `https://www.wheatfieldvalley.com/`
- Contact: `(517) 655-6999`
- Email: `Wheatfieldvalley@yahoo.com`
- Address: `1600 Linn Road, Williamston, MI`

**Issue**: The agent likely:
1. ✅ Got the website URL from Google Places (good!)
2. ❌ Tried to fetch a specific page that doesn't exist (e.g., `/Wheatfield Valley Golf` or similar)
3. ❌ Didn't extract useful information from the 404 error page
4. ❌ Didn't retry with the homepage URL

## Enhancements Needed

### 1. **Better 404 Error Handling**

**Current Behavior**: When a 404 occurs, the agent treats it as a failure and stops.

**Enhanced Behavior**: 
- Extract useful information from 404 error pages (they often contain navigation, contact info, etc.)
- Automatically retry with the homepage URL if a subpage fails
- Use the homepage as a fallback when specific pages don't exist

**Implementation**:
```markdown
### Step 3: Browse the Course Website (Playwright Primary)
**IMPORTANT**: Use the website URL from Google Places, NOT the course name.

- Start with the homepage URL from Google Places (e.g., `https://www.wheatfieldvalley.com/`)
- **Always fetch the homepage first** to establish the base URL and site structure
- If a specific subpage returns 404, extract any useful information from the error page, then retry with the homepage
- Prefer the most relevant subpages: `/golf`, `/course`, `/scorecard`, `/rates`, `/policies`
- **404 Error Handling**: If a subpage returns 404:
  1. Extract any useful information from the error page (contact info, navigation links, etc.)
  2. Log the attempted URL for debugging
  3. Retry with the homepage URL
  4. Look for navigation menus or sitemaps on the homepage to find correct page paths
```

### 2. **Improved URL Construction**

**Current Issue**: Agent may be constructing URLs incorrectly (e.g., using course name in path).

**Enhanced Behavior**:
- Always start with the exact homepage URL from Google Places
- Never construct URLs using course names or other text
- Use relative paths from the homepage when navigating to subpages
- Validate URLs before fetching

**Implementation**:
```markdown
### URL Construction Rules
- **NEVER** construct URLs using course names (e.g., `https://example.com/Wheatfield Valley Golf`)
- **ALWAYS** use the exact `website` field from Google Places as the base URL
- For subpages, use relative paths from the homepage (e.g., `/golf`, `/course`)
- If you need to find a specific page, first fetch the homepage and look for navigation links
- Validate that URLs are well-formed before attempting to fetch them
```

### 3. **Extract Information from Error Pages**

**Current Issue**: 404 error pages often contain useful information (contact info, navigation, etc.) that is ignored.

**Enhanced Behavior**:
- Parse 404 error pages for useful information
- Extract contact information, navigation links, and other metadata
- Use this information to supplement the research data

**Implementation**:
```markdown
### Error Page Information Extraction
When a 404 error occurs:
1. **Extract Contact Information**: Look for phone numbers, email addresses, addresses in the error page HTML
2. **Extract Navigation**: Look for navigation menus, links to other pages
3. **Extract Site Structure**: Identify the homepage URL and main sections
4. **Log Findings**: Record what was found in the error page
5. **Continue Research**: Use extracted information and retry with homepage
```

### 4. **Robust Fallback Strategy**

**Current Issue**: Single point of failure - if one approach fails, research stops.

**Enhanced Behavior**:
- Multiple fallback strategies
- Progressive degradation (Playwright → web_fetch → web_search)
- Extract partial information from each attempt

**Implementation**:
```markdown
### Fallback Strategy
1. **Primary**: Use Playwright to browse the website (if available)
2. **Secondary**: Use `web_fetch` with homepage URL from Google Places
3. **Tertiary**: If homepage fails, try common paths (`/`, `/home`, `/index.html`)
4. **Quaternary**: Use `web_search` to find course information from other sources
5. **Always**: Extract any available information from error pages before giving up
```

### 5. **Better Logging and Debugging**

**Current Issue**: Difficult to debug what URL was attempted and why it failed.

**Enhanced Behavior**:
- Log the exact URL being fetched
- Log the HTTP status code
- Log extracted information from error pages
- Provide clear error messages with context

**Implementation**:
```markdown
### Debugging Information
When fetching web pages:
- Log the exact URL being fetched: `Fetching: https://www.wheatfieldvalley.com/golf`
- Log the HTTP status: `Status: 404 Not Found`
- Log extracted information: `Found contact info in error page: (517) 655-6999`
- Log retry attempts: `Retrying with homepage: https://www.wheatfieldvalley.com/`
```

## Specific Enhancements for Skill Documentation

### Update Step 3 in SKILL.md

```markdown
### Step 3: Browse the Course Website (Playwright Primary)
**IMPORTANT**: Use the website URL from Google Places, NOT the course name.

- **Start with the homepage**: Always fetch the homepage URL from Google Places first (e.g., `https://www.wheatfieldvalley.com/`)
- **Validate URL**: Ensure the URL is well-formed and starts with `http://` or `https://`
- **Never construct URLs**: Do NOT build URLs using course names or other text - use the exact URL from Google Places
- Prefer the most relevant subpages: `/golf`, `/course`, `/scorecard`, `/rates`, `/policies`
- Dismiss cookie banners or modals if they block content.
- Extract text content for: description, policies, booking rules, dress code, walking/caddie info, and pricing.
- If a PDF scorecard is linked, open it and capture tee/holes data.
- For any page accessed via Playwright, add a provenance entry with `method: "playwright"`.
- **If Playwright is unavailable** (e.g., Docker environment), fall back to `web_fetch` with the full website URL.
- For any page accessed via `web_fetch`, add a provenance entry with `method: "web_fetch"`.

**404 Error Handling**:
- If a subpage returns 404, extract any useful information from the error page (contact info, navigation links)
- Log the attempted URL for debugging
- Retry with the homepage URL
- Look for navigation menus on the homepage to find correct page paths
- Continue research with available information even if some pages fail
```

### Add New Section: Error Recovery

```markdown
## Error Recovery Strategies

### 404 Errors
When encountering a 404 error:
1. **Extract Information**: Parse the error page for:
   - Contact information (phone, email, address)
   - Navigation links
   - Site structure hints
   - Homepage URL
2. **Retry Strategy**:
   - If a subpage failed, retry with homepage
   - If homepage failed, try common variations (`/index.html`, `/home`)
   - Use extracted navigation links to find correct paths
3. **Continue Research**: Don't stop research if one page fails - use available information and try alternative sources

### Network Errors
- Retry with exponential backoff
- Try alternative URLs if available
- Fall back to web_search for information gathering

### Playwright Unavailable
- Automatically fall back to `web_fetch`
- Use homepage URL from Google Places
- Extract information from HTML content
```

## Recommended Code/Logic Changes

### 1. URL Validation
Before fetching any URL:
- Check if it's a valid URL format
- Ensure it starts with `http://` or `https://`
- Never use course names or other text as URLs

### 2. Homepage-First Strategy
Always:
1. Fetch the homepage first
2. Extract navigation structure
3. Use navigation links to find subpages
4. Only construct URLs from discovered links, never from text

### 3. Error Page Parsing
When a 404 occurs:
1. Parse HTML for contact information (regex patterns for phone, email, address)
2. Extract navigation links
3. Identify homepage URL
4. Log findings for debugging

### 4. Progressive Fallback
Implement a fallback chain:
1. Try Playwright (if available)
2. Try `web_fetch` with homepage
3. Try `web_fetch` with common paths
4. Try `web_search` for information
5. Extract partial information from each attempt

## Example: Wheatfield Valley Case

**What Happened**:
- Agent likely got `https://www.wheatfieldvalley.com/` from Google Places ✅
- Agent tried to fetch a non-existent page (possibly `/Wheatfield Valley Golf`) ❌
- 404 error occurred, but useful information was in the error page
- Agent didn't extract information or retry with homepage ❌

**What Should Happen**:
1. Get `https://www.wheatfieldvalley.com/` from Google Places ✅
2. Fetch homepage: `https://www.wheatfieldvalley.com/` ✅
3. Extract navigation links from homepage
4. Use navigation links to find `/golf`, `/course`, `/rates` pages
5. If any page returns 404:
   - Extract contact info from error page: `(517) 655-6999`, `Wheatfieldvalley@yahoo.com`
   - Extract address: `1600 Linn Road, Williamston, MI`
   - Retry with homepage
   - Continue research with available information

## Next Steps

1. **Update Skill Documentation**: Add error handling and URL construction rules
2. **Add Error Recovery Section**: Document strategies for handling 404s and other errors
3. **Improve Logging**: Add URL logging and error page information extraction
4. **Test Fallback Strategies**: Verify that homepage retry and error page parsing work correctly

## Related Files
- `skills/golf-course-research/SKILL.md` - Main skill documentation (needs updates)
- `INDIAN_HILLS_ERRORS_ANALYSIS.md` - Previous error analysis (similar issues)
