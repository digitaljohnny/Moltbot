---
name: golf-course-research
description: Research comprehensive information about golf courses using course name, city, and state. Returns structured JSON data matching the golf course database schema.
metadata: {"moltbot":{"emoji":"🏌️"}}
---

# 🏌️ Golf Course Research Skill

Research comprehensive information about golf courses using course name, city, and state. Returns structured JSON data matching the golf course database schema.

## When to Use

Use this skill when a user requests information about a golf course, needs to research course details, or wants to populate course data. The skill performs web research to gather comprehensive course information.

**Invocation modes:**
- **Manual:** User explicitly asks to research a course.
- **Auto-detect:** If a message includes a course name plus city and state, invoke this skill automatically.
- **Fallback:** If the course name is provided without city/state, ask for the missing location before running.

## Input Parameters

- **courseName** (required): Name of the golf course
- **city** (required): City where the course is located
- **state** (required): State abbreviation (e.g., "TX", "CA")

## Research Process

### Step 1: Locate the Course (Google Places)
Use the Google Places skill to locate the course and normalize identity.

- Run a text search with: `"{courseName}" "{city}" "{state}"`
- If multiple candidates are returned, present 3-5 and ask the user to pick one.
- Use the selected candidate’s `placeId` to fetch place details.

### Step 2: Gather Core Information
From Google Places details (plus the course website), collect:
- Official course name
- Full address (street, city, state, zip, country)
- Phone number
- Email address
- Website domain
- Geographic coordinates (latitude/longitude)
- Timezone (based on location)
- Course description (style, design, notable features)

### Step 3: Browse the Course Website (Playwright Primary)
Use Playwright as the primary way to access and read the course website.

- Open the official course website from Google Places.
- Prefer the most relevant subpages: `/golf`, `/course`, `/scorecard`, `/rates`, `/policies`.
- Dismiss cookie banners or modals if they block content.
- Extract text content for: description, policies, booking rules, dress code, walking/caddie info, and pricing.
- If a PDF scorecard is linked, open it and capture tee/holes data.
- For any page accessed via Playwright, add a provenance entry with `method: "playwright"`.
- If the site is inaccessible via Playwright, fall back to lightweight fetches.

### Step 4: Research Course Design & Layout
- Number of holes
- Course type indicators:
  - Par values (if all holes are par-3, it's a par-3 course)
  - Total yardage (executive courses are shorter)
  - Course layout descriptions
- Images of the course (for visual analysis)
- Scorecard information if available

### Step 5: Determine Course Types (AI Classification)
Use AI reasoning to analyze all collected information and classify course types according to the comprehensive taxonomy. Apply your understanding of golf course characteristics, descriptions, and the taxonomy rules below to make intelligent classifications. The classification system includes 8 groups:

**1. Hole Count** (always classified):
- **3**: Very short loop for practice, beginners, or quick play
- **6**: Time-saving or space-constrained design
- **9**: Half-length by hole count; often played twice for 18
- **12**: Time-saving or space-constrained design
- **18**: Standard full course with par 3/4/5 mix
- **27**: Typically three 9-hole nines combined into 18
- **36**: Multiple full courses on one facility

**2. Length Class** (always classified):
- **pitch-and-putt**: Ultra-short holes, typically up to ~90m; 2-3 clubs
- **par-3**: All holes are par 3; beginner and skills-focused
- **executive**: Shorter than regulation; mostly par 3s plus short par 4s
- **regulation**: Standard full-length course

**3. Access** (always classified):
- **municipal**: Public course owned/operated by a government entity
- **public**: Open to anyone paying a green fee
- **daily-fee**: Public access with private ownership
- **semi-private**: Memberships plus public tee times
- **private**: Access primarily via membership

**4. Purpose** (optional - classify if information available):
- **championship**: Tournament-capable, full-length, challenging layout
- **stadium-tournament**: Built for events with spectator infrastructure
- **resort**: Guest experience, scenic routing, broad playability
- **member**: Tuned for repeat play and member enjoyment
- **beginner**: Wide fairways, shorter carries, forward tees
- **junior**: Designed for youth programs and instruction
- **academy**: Coaching-first facility focused on instruction

**5. Land Type** (optional - classify if information available):
- **links**: Coastal, sandy terrain with dunes and wind exposure
- **links-style**: Inland course imitating links characteristics
- **parkland**: Inland, tree-lined, lush turf, sheltered conditions
- **heathland**: Sandy soils with heather/gorse and firm surfaces
- **moorland**: Upland, open, windswept with elevation and views
- **woodland**: Dense trees with tight corridors and accuracy focus
- **desert**: Arid terrain with irrigated corridors and native hazards
- **mountain**: Significant elevation change and sloped lies
- **coastal-cliff**: Ocean-adjacent cliffs/headlands without true linksland
- **tropical**: Dense vegetation and heavy rainfall considerations
- **wetland**: Routed around water systems and wetlands
- **volcanic**: Routed through rock and lava features
- **island**: Built on an island or multiple water-separated landmasses
- **sandbelt**: Sandy soils with firm conditions and distinct bunker style

**6. Design Philosophy** (optional - classify if information available):
- **penal**: High punishment for misses and narrow corridors
- **strategic**: Multiple lines of play with risk-reward choices
- **heroic**: Dramatic carries with high reward for bold shots
- **target**: Isolated landing zones and forced carries
- **minimalist**: Light-touch shaping emphasizing natural contours

**7. Technology** (always classified, defaults to "none"):
- **none**: Traditional play without tech-mediated formats
- **augmented-range**: Traditional range upgraded with tracking and games
- **simulator**: Indoor simulator facility with real shots into a screen
- **screen-golf**: High-volume simulator lounge with standardized bays
- **entertainment-range**: Topgolf-style venues with targets and hospitality
- **vr**: Virtual golf without ball striking; controller or motion input

**8. Alternative Golf** (optional - only if alternative golf facility):
- **miniature**: Putting-only course with obstacles and artificial surfaces
- **adventure**: Themed mini-golf with elaborate obstacles
- **disc**: Frisbee-style throwing sport with basket targets
- **footgolf**: Soccer-ball golf using oversized cups

**AI Classification Process:**
Use your AI reasoning capabilities to analyze the collected data and apply the taxonomy rules:

1. **Hole Count**: Count the number of holes (always required) - straightforward numeric classification
2. **Length Class**: Use AI to analyze par values, total yardage, course descriptions, and context
   - If all holes are par-3 → classify as par-3 (or pitch-and-putt if yardage indicates ultra-short)
   - If total par is 60-68 and yardage is shorter → classify as executive
   - If standard full-length course → classify as regulation
   - Consider course descriptions mentioning "executive", "par-3", "pitch and putt" as strong signals
3. **Access**: Use AI to interpret ownership, membership info, website content, and descriptions
   - Analyze language patterns: "municipal", "city-owned" → municipal
   - "Members only", "exclusive" → private
   - "Memberships available", "semi-private" → semi-private
   - "Public access", "open to public" with private ownership → daily-fee
   - Default to public if unclear
4. **Purpose**: Use AI to identify intent from descriptions, website content, and context
   - Look for tournament history, championship mentions → championship
   - Resort/hotel associations → resort
   - Member-focused language → member
   - Beginner-friendly descriptions → beginner
   - Youth programs mentioned → junior
   - Instruction/academy focus → academy
5. **Land Type**: Use AI to analyze geographic location, terrain descriptions, images, and course characteristics
   - Coastal + sandy + dunes → links
   - Inland + tree-lined + lush → parkland
   - Analyze images for terrain features (desert, mountain, tropical, etc.)
   - Consider location context (Arizona → likely desert, Hawaii → likely tropical)
6. **Design**: Use AI to analyze course descriptions for strategic characteristics
   - "Narrow", "punishing" → penal
   - "Risk-reward", "multiple options" → strategic
   - "Dramatic carries" → heroic
   - "Isolated landing zones" → target
   - "Natural contours", "minimal shaping" → minimalist
7. **Technology**: Use AI to check amenities and descriptions for tech features
   - Look for mentions of simulators, Topgolf-style venues, VR, etc.
   - Default to "none" if no tech features found
8. **Alternative**: Use AI to determine if this is alternative golf (mini-golf, disc golf, etc.)
   - Only classify if clearly alternative golf facility

### Step 6: Gather Additional Details
- **Tee Sets**: Color names (Blue, White, Red, Gold, etc.), ratings, slopes, par, yardage
- **Holes**: Individual hole details (par, handicap, distance, hazards) for each tee set
- **Amenities**: Driving range, putting green, pro shop, restaurant, clubhouse, etc.
- **Pricing**: Green fee ranges, cart fees (if available)
- **Policies**: Dress code, booking rules, walking policies

### Step 7: Verify and Structure Data
- Verify coordinates match the address
- Ensure timezone is correct for the location
- Cross-reference information from multiple sources
- Structure data according to the schema

## Output Schema

Return a JSON object with the following structure:

```json
{
  "course": {
    "id": "course_<unique_id>",
    "name": "<Official Course Name>",
    "description": "<Course description>",
    "domain": "<website_domain>",
    "phone": "<phone_number>",
    "email": "<email_address>",
    "city": "<city>",
    "state": "<state_abbrev>",
    "geoLat": <latitude>,
    "geoLng": <longitude>,
    "timezone": "<timezone>",
    "status": "active",
    "moderationStatus": "approved",
    "sourceTags": ["web_research"],
    "lastVerifiedAt": "<ISO_8601_timestamp>",
    "address": {
      "line1": "<street_address>",
      "line2": null,
      "city": "<city>",
      "state": "<state_abbrev>",
      "postalCode": "<zip_code>",
      "country": "US",
      "formatted": "<formatted_address>"
    },
    "provenance": {
      "sources": [
        {
          "sourceTag": "web_research",
          "url": "<source_url>",
          "fetchedAt": "<ISO_8601_timestamp>",
          "method": "web_search",
          "confidence": <0.0-1.0>
        }
      ]
    },
    "playability": {
      "holes": <number>,
      "walkingAllowed": <true/false>,
      "bookingRules": { "advanceDays": <number> },
      "policies": { "dressCode": "<code>" }
    },
    "pricingMeta": {
      "currency": "USD",
      "greenFeeRange": { "min": <number>, "max": <number> },
      "cartFeeRange": { "min": <number>, "max": <number> }
    },
    "media": {
      "heroImageUrl": "<url>",
      "logoUrl": "<url>",
      "gallery": [],
      "scorecard": { "pdfUrl": "<url>" }
    }
  },
  "teeSets": [
    {
      "id": "tee_<unique_id>",
      "courseId": "course_<unique_id>",
      "color": "<color_name>",
      "name": null,
      "rating": <number>,
      "slope": <number>,
      "par": <number>,
      "units": "yards"
    }
  ],
  "holes": [
    {
      "id": "h<hole#>_<tee_color>",
      "courseId": "course_<unique_id>",
      "teeSetId": "tee_<unique_id>",
      "holeNumber": <number>,
      "par": <number>,
      "handicapIndex": <number>,
      "distance": <number>,
      "hazards": ["<hazard_type>"]
    }
  ],
  "amenities": [
    {
      "id": "am_<unique_id>",
      "name": "<amenity_name>",
      "category": "<category>"
    }
  ],
  "courseTypes": [
    {
      "groupKey": "hole_count",
      "typeKey": "18"
    },
    {
      "groupKey": "length_class",
      "typeKey": "regulation"
    },
    {
      "groupKey": "access",
      "typeKey": "public"
    },
    {
      "groupKey": "purpose",
      "typeKey": "championship"
    },
    {
      "groupKey": "land_type",
      "typeKey": "parkland"
    },
    {
      "groupKey": "design",
      "typeKey": "strategic"
    },
    {
      "groupKey": "tech",
      "typeKey": "none"
    }
  ]
}
```

## Course Type Taxonomy Reference

The taxonomy includes 8 classification groups. Some are always classified (hole_count, length_class, access, tech), while others are optional based on available information (purpose, land_type, design, alternative).

### 1. Hole Count (groupKey: "hole_count") - Always Classified
- **3**: Very short loop for practice, beginners, or quick play
- **6**: Time-saving or space-constrained design
- **9**: Half-length by hole count; often played twice for 18
- **12**: Time-saving or space-constrained design
- **18**: Standard full course with par 3/4/5 mix
- **27**: Typically three 9-hole nines combined into 18
- **36**: Multiple full courses on one facility

### 2. Length Class (groupKey: "length_class") - Always Classified
- **pitch-and-putt**: Ultra-short holes, typically up to ~90m; 2-3 clubs
- **par-3**: All holes are par 3; beginner and skills-focused
- **executive**: Shorter than regulation; mostly par 3s plus short par 4s
- **regulation**: Standard full-length course

### 3. Access (groupKey: "access") - Always Classified
- **municipal**: Public course owned/operated by a government entity
- **public**: Open to anyone paying a green fee
- **daily-fee**: Public access with private ownership
- **semi-private**: Memberships plus public tee times
- **private**: Access primarily via membership

### 4. Purpose (groupKey: "purpose") - Optional
- **championship**: Tournament-capable, full-length, challenging layout
- **stadium-tournament**: Built for events with spectator infrastructure
- **resort**: Guest experience, scenic routing, broad playability
- **member**: Tuned for repeat play and member enjoyment
- **beginner**: Wide fairways, shorter carries, forward tees
- **junior**: Designed for youth programs and instruction
- **academy**: Coaching-first facility focused on instruction

### 5. Land Type (groupKey: "land_type") - Optional
- **links**: Coastal, sandy terrain with dunes and wind exposure
- **links-style**: Inland course imitating links characteristics
- **parkland**: Inland, tree-lined, lush turf, sheltered conditions
- **heathland**: Sandy soils with heather/gorse and firm surfaces
- **moorland**: Upland, open, windswept with elevation and views
- **woodland**: Dense trees with tight corridors and accuracy focus
- **desert**: Arid terrain with irrigated corridors and native hazards
- **mountain**: Significant elevation change and sloped lies
- **coastal-cliff**: Ocean-adjacent cliffs/headlands without true linksland
- **tropical**: Dense vegetation and heavy rainfall considerations
- **wetland**: Routed around water systems and wetlands
- **volcanic**: Routed through rock and lava features
- **island**: Built on an island or multiple water-separated landmasses
- **sandbelt**: Sandy soils with firm conditions and distinct bunker style

### 6. Design Philosophy (groupKey: "design") - Optional
- **penal**: High punishment for misses and narrow corridors
- **strategic**: Multiple lines of play with risk-reward choices
- **heroic**: Dramatic carries with high reward for bold shots
- **target**: Isolated landing zones and forced carries
- **minimalist**: Light-touch shaping emphasizing natural contours

### 7. Technology (groupKey: "tech") - Always Classified (defaults to "none")
- **none**: Traditional play without tech-mediated formats
- **augmented-range**: Traditional range upgraded with tracking and games
- **simulator**: Indoor simulator facility with real shots into a screen
- **screen-golf**: High-volume simulator lounge with standardized bays
- **entertainment-range**: Topgolf-style venues with targets and hospitality
- **vr**: Virtual golf without ball striking; controller or motion input

### 8. Alternative Golf (groupKey: "alternative") - Optional (only if alternative golf)
- **miniature**: Putting-only course with obstacles and artificial surfaces
- **adventure**: Themed mini-golf with elaborate obstacles
- **disc**: Frisbee-style throwing sport with basket targets
- **footgolf**: Soccer-ball golf using oversized cups

## Research Tips

1. **Multiple Sources**: Cross-reference information from:
   - Google Places (primary for address/phone/website/coords)
   - Course official website (use Playwright as the primary access method)
   - Golf course directories (GolfNow, GolfLink, etc.)
   - Review sites (Yelp, Google Reviews)
   - Golf association websites

2. **Playwright First**: Use Playwright to render JS-heavy pages, follow links, and capture content. Only fall back to lightweight fetches if Playwright fails.
   - Record Playwright usage in provenance with `method: "playwright"` and the page URL.

3. **Coordinate Lookup**: Use the address to verify/obtain coordinates via geocoding

4. **Timezone**: Determine timezone from state/city (e.g., Texas → America/Chicago or America/Denver)

5. **Missing Data**: If information isn't available, use `null` or reasonable defaults:
   - Email: `null` if not found
   - Pricing: Use `null` for ranges if unavailable
   - Tee sets/holes: Include what's available, omit what's not

6. **Confidence Scoring**: Rate confidence based on:
   - Multiple sources confirming same info: 0.9+
   - Single authoritative source: 0.7-0.8
   - Inferred/estimated: 0.5-0.6

## Example Usage

**User Request:**
"Research Pebble Beach Golf Links in Pebble Beach, CA"

**Process:**
1. Search: "Pebble Beach Golf Links" "Pebble Beach" "CA" golf course
2. Gather: Official name, address, contact info, website
3. Research: Course design (18-hole championship), layout, images
4. Classify: Access type (resort), Format type (championship_18)
5. Collect: Tee sets, holes, amenities, pricing
6. Structure: Return complete JSON response

## Notes

- Always verify critical information (address, coordinates) from multiple sources
- When course type is ambiguous, default to "championship_18" for 18-hole courses
- Include source URLs in provenance for traceability
- Use current date/time for `lastVerifiedAt` and `fetchedAt` timestamps
- Generate unique IDs using descriptive patterns (e.g., `course_pebble_beach_ca`)
