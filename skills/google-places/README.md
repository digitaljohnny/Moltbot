# Google Places Skill

A skill for Moltbot/Clawdbot to look up places using the Google Places API.

## Overview

This skill searches for businesses, landmarks, and venues by name and location, then returns structured place details (address, phone, website, hours, ratings).

## Files

- **SKILL.md**: Skill documentation and usage instructions
- **places_lookup.py**: Helper script to call Google Places APIs
- **README.md**: This file

## Installation

Skill files are located at `/root/clawd/skills/google-places/`. The agent can use this skill by reading `SKILL.md`.

## Usage

**Invocation modes:**
- **Manual:** Explicit request to find a place with Google Places.
- **Auto-detect:** Place name plus city/state or address present.
- **Fallback:** Ask for missing location context.

Use the helper script for direct lookups:

```bash
python3 skills/google-places/places_lookup.py "Blue Bottle Coffee" --location "37.7749,-122.4194" --radius 5000
```

## Notes

- Default API key is embedded in `places_lookup.py`
- For direct detail lookups, pass `--place-id`
- The script returns JSON with candidate matches and place details
