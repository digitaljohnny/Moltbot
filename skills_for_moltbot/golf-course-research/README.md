# Golf Course Research Skill

A skill for Moltbot/Clawdbot to research comprehensive information about golf courses.

## Overview

This skill enables the agent to research golf courses using course name, city, and state, returning structured JSON data that matches a golf course database schema.

## Files

- **SKILL.md**: Main skill documentation with research methodology, data structure, and usage instructions
- **classify-course-type.py**: Python helper script for classifying course types based on taxonomy
- **README.md**: This file

## Installation

The skill files are located in the agent workspace at `/root/clawd/skills/golf-course-research/`. The agent can reference this skill by reading `SKILL.md` when needed.

## Usage

**Invocation modes:**
- **Manual:** User explicitly asks to research a course.
- **Auto-detect:** If a message includes a course name plus city and state, invoke automatically.
- **Fallback:** If the course name is provided without city/state, ask for the missing location.

When a user requests golf course information, the agent should:

1. Read `skills/golf-course-research/SKILL.md` for instructions
2. Use the Google Places skill to locate the course and fetch place details
3. Browse the official website with Playwright (primary website access)
   - When Playwright is used, include a provenance entry with `method: "playwright"`
4. Perform web research using the course name, city, and state
5. Gather comprehensive course information
6. Use AI reasoning to classify course types according to the taxonomy (analyze descriptions, context, and apply taxonomy rules)
7. Structure data according to the schema
8. Return the complete JSON response

## Course Type Taxonomy

The skill uses a comprehensive 8-group taxonomy system:

### Always Classified
1. **Hole Count**: 3, 6, 9, 12, 18, 27, or 36 holes
2. **Length Class**: pitch-and-putt, par-3, executive, or regulation
3. **Access**: municipal, public, daily-fee, semi-private, or private
4. **Technology**: none, augmented-range, simulator, screen-golf, entertainment-range, or vr

### Optional (Classified When Information Available)
5. **Purpose**: championship, stadium-tournament, resort, member, beginner, junior, or academy
6. **Land Type**: links, links-style, parkland, heathland, moorland, woodland, desert, mountain, coastal-cliff, tropical, wetland, volcanic, island, or sandbelt
7. **Design Philosophy**: penal, strategic, heroic, target, or minimalist
8. **Alternative Golf**: miniature, adventure, disc, or footgolf (only if alternative golf facility)

## Classification Method

**Primary:** Use AI reasoning to analyze collected information and classify course types according to the taxonomy. The AI agent should apply its understanding of golf course characteristics, descriptions, and taxonomy rules to make intelligent classifications.

**Optional Helper:** The `classify-course-type.py` script is available for reference or programmatic use, but AI-based classification is the preferred method as it can better interpret context, descriptions, and nuanced information.

## Example

**Input:**
- Course: "Pebble Beach Golf Links"
- City: "Pebble Beach"
- State: "CA"

**Output:**
Structured JSON with course details, tee sets, holes, amenities, and course types.

## Notes

- The skill relies on web search capabilities to gather information
- Multiple sources should be cross-referenced for accuracy
- Missing information should be set to `null` rather than guessed
- Confidence scores should reflect data quality and source reliability
