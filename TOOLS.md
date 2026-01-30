# TOOLS.md - Local Notes

Skills define *how* tools work. This file is for *your* specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:
- Camera names and locations
- SSH hosts and aliases  
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras
- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH
- home-server → 192.168.1.100, user: admin

### TTS
- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

Add whatever helps you do your job. This is your cheat sheet.

## Golf Course Research

Use the golf course research skill at `skills/golf-course-research/SKILL.md` when users request information about golf courses.

**Auto-detect policy:**
- If a message includes a course name plus a city/state pair, run the golf course research workflow automatically.
- If the course name is present but location is missing, ask for city and state before running the workflow.
- Manual trigger: explicit “research course” request from the user.

**Usage:**
- Read `skills/golf-course-research/SKILL.md` for complete instructions
- Use web search to gather course information
- Use AI reasoning to classify course types according to the taxonomy (analyze descriptions, context, and apply taxonomy rules)
- Return structured JSON matching the schema defined in the skill

**Example Request:**
"Research Pebble Beach Golf Links in Pebble Beach, CA"

**Process:**
1. Search for course using name, city, and state
2. Gather core information (address, contact, coordinates)
3. Research course design and layout
4. Classify course types (hole_count, length_class, access, tech + optionals)
5. Collect tee sets, holes, amenities, pricing
6. Structure and return JSON response

## Google Places

Use the Google Places skill at `skills/google-places/SKILL.md` when users request business or place lookups.

**Auto-detect policy:**
- If a message includes a place name plus city/state or address, run the Google Places workflow automatically.
- If the place name is present but location is missing, ask for city/state or a full address before running the workflow.
- Manual trigger: explicit “use Google Places” or “look up place” request from the user.

**Usage:**
- Read `skills/google-places/SKILL.md` for complete instructions
- Use the Places Text Search API for candidate discovery
- Use the Places Details API to return contact info and hours
- Return structured JSON matching the schema defined in the skill

**Example Request:**
"Find the website and phone for Allbirds in Austin, TX"

**Process:**
1. Search for place using name and city/state
2. Disambiguate if multiple candidates exist
3. Fetch place details for the selected result
4. Structure and return JSON response
