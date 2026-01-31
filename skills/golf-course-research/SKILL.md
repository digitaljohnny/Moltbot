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

### Step 1: Locate the Course (Google Places) - REQUIRED FIRST STEP
**CRITICAL**: Always use Google Places FIRST before attempting any web fetches. Never call `web_fetch` with the course name directly.
Use the Google Places skill to locate the course and normalize identity.

- Run a text search with: `"{courseName}" "{city}" "{state}" golf course`
- If multiple candidates are returned, present 3-5 and ask the user to pick one.
- Use the selected candidate’s `placeId` to fetch place details.
- **Extract the `website` field from place details** - this is the official website URL you will use for web fetches.
- **NEVER** treat the course name as a URL (e.g., do NOT call `web_fetch("Indian Hills")`).

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
**CRITICAL RULE: NEVER GUESS URLs. ONLY use URLs from Google Places or discovered within the website itself.**

- **Start with the homepage**: Always fetch the homepage URL from Google Places first (e.g., `https://www.wheatfieldvalley.com/`).
- **Use ONLY the exact URL from the `website` field** - do NOT construct, guess, or infer URLs.
- **Validate URL**: Ensure the URL is well-formed and starts with `http://` or `https://`.
- **NEVER construct URLs**: Do NOT build URLs using course names, city names, or any other text.
- **NEVER guess URLs**: Do NOT try common patterns like `/golf`, `/course`, `/scorecard` unless you found these links in the website navigation.
- **ONLY use discovered URLs**: Only access pages using URLs you found in:
  1. Google Places `website` field (for homepage)
  2. Navigation links discovered on the homepage
  3. Links found within other pages you've already accessed
  4. Links in error pages (404 pages often contain navigation)

**Step 3a: Parse Navigation Structure**
After fetching the homepage, analyze the navigation to find relevant pages. **ONLY use URLs you discover here - never guess.**

1. **Extract Navigation Elements**:
   - Look for navigation menus (header, footer, sidebar)
   - Identify all clickable links and their text labels
   - Extract both visible text and href attributes
   - Look for common navigation patterns: `<nav>`, `<ul class="menu">`, footer links, etc.
   - **Extract ALL links** - don't skip any, as they may lead to needed information

2. **Identify Relevant Links** (from what you actually found, not what you hope to find):
   - **Scorecard**: Look for links containing: "scorecard", "course", "holes", "yardage", "tee", "card"
   - **Rates/Pricing**: Look for: "rates", "pricing", "fees", "green fees", "tee times", "book"
   - **Course Info**: Look for: "about", "course", "layout", "design", "history"
   - **Policies**: Look for: "policies", "rules", "dress code", "walking", "caddie"
   - **Contact**: Look for: "contact", "directions", "location"
   - **IMPORTANT**: Only use links that actually exist in the navigation - don't assume they exist

3. **Map Navigation to Data Needs**:
   - Create a mapping of what data you need vs. which navigation links actually exist
   - Prioritize links that seem most relevant to your research goals
   - Note both absolute URLs and relative paths
   - **If a link doesn't exist in navigation, you cannot access that page** - work with what's available

**Step 3b: Navigate Using Discovered Links**
- **ONLY use discovered navigation links** - never guess or construct URLs
- **ONLY access pages using URLs you found** in:
  - Navigation menus from the homepage
  - Links within pages you've already accessed
  - Links in error pages (404 pages often contain navigation)
- For each relevant page found via navigation:
  - Fetch the page using the **exact URL from the navigation link**
  - Extract the content you're looking for
  - Follow additional links **only if they appear on the current page** (e.g., PDF scorecards linked from scorecard page)
- Dismiss cookie banners or modals if they block content.
- Extract text content for: description, policies, booking rules, dress code, walking/caddie info, and pricing.
- **Look for scorecard data in multiple formats** (see Step 4a for detailed extraction plans):
  - **Linked PDFs**: Follow PDF links (e.g., "Download Scorecard", "Scorecard PDF") and extract structured data from PDF content
  - **Page Content (HTML/Tables)**: Extract scorecard data from HTML tables or structured text on the page
  - **Images**: Extract scorecard data from images using OCR/image analysis
  - **Check all pages**: Scorecard may be on scorecard page, course page, or rates page
- For any page accessed via Playwright, add a provenance entry with `method: "playwright"`.
- **If Playwright is unavailable** (e.g., Docker environment), fall back to `web_fetch` with the full website URL.
- For any page accessed via `web_fetch`, add a provenance entry with `method: "web_fetch"`.
- **If navigation doesn't contain links to scorecard/rates/etc., work with what's available** - don't guess URLs to try to find them

**404 Error Handling**:
- If a navigation link returns 404, extract any useful information from the error page (contact info, navigation links, address).
- Log the attempted URL for debugging.
- Retry with the homepage URL and re-parse navigation.
- Try alternative navigation links if the first attempt fails.
- Continue research with available information even if some pages fail.

### Step 4: Research Course Design & Layout
- Number of holes
- Course type indicators:
  - Par values (if all holes are par-3, it's a par-3 course)
  - Total yardage (executive courses are shorter)
  - Course layout descriptions
- Images of the course (for visual analysis)
- Scorecard information if available

### Step 4a: Extract Scorecard Data
**Expect scorecard data in multiple formats. Have a plan for each format.**

Scorecard data is critical for:
- Tee sets (colors, ratings, slopes, par, yardage)
- Holes (individual hole par, handicap, distance, hazards)
- Course layout and design

**Format 1: Linked PDF Scorecard**
When you find a PDF link (e.g., "Download Scorecard", "Scorecard PDF"):
1. **Fetch the PDF**: Use the exact URL from the link
2. **Extract PDF Content**:
   - Parse PDF text content for structured data
   - Look for tables with columns: Hole, Par, Handicap, Distance (for each tee)
   - Identify tee set headers (e.g., "Blue Tees", "White Tees", "Red Tees")
   - Extract:
     - Tee set names/colors
     - Total par for each tee set
     - Total yardage for each tee set
     - Rating and slope for each tee set (if available)
     - Individual hole data: hole number, par, handicap, distance per tee
3. **Handle PDF Structure**:
   - PDFs may have multiple pages - extract from all pages
   - Tables may span multiple pages
   - Look for repeating patterns (hole numbers, tee colors)
   - Handle merged cells or complex layouts

**Format 2: Scorecard in Page Content (HTML/Text)**
When scorecard data is embedded in the webpage:
1. **Identify Scorecard Section**:
   - Look for headings like "Scorecard", "Course Layout", "Tee Information"
   - Find tables with scorecard data
   - Look for structured lists or divs containing hole information
2. **Extract from HTML Tables**:
   - Parse `<table>` elements
   - Identify header rows (Hole, Par, Handicap, Blue, White, Red, etc.)
   - Extract data rows (one per hole)
   - Map columns to tee sets and hole properties
3. **Extract from Structured Text**:
   - Look for patterns like "Hole 1: Par 4, 350 yards"
   - Identify tee set sections (e.g., "Blue Tees:", "White Tees:")
   - Parse yardage, par, handicap from text patterns
   - Handle variations in formatting

**Format 3: Scorecard in Image**
When scorecard is presented as an image (JPG, PNG, etc.):
1. **Identify Scorecard Image**:
   - Look for images with alt text containing "scorecard", "course", "layout"
   - Check image filenames for scorecard indicators
   - Look for images linked from scorecard pages
2. **Extract Image Content**:
   - Use image analysis/OCR to read text from the image
   - Parse structured data from the image (tables, text)
   - Extract:
     - Tee set information (colors, names)
     - Hole numbers, par, yardage
     - Rating and slope (if visible)
3. **Handle Image Formats**:
   - May be a single image or multiple images (one per tee set)
   - May contain course map/layout in addition to scorecard
   - May need to combine information from multiple images

**Data Extraction Plan for All Formats**:

1. **Tee Sets** - Extract for each tee set found:
   - `color`: Tee color/name (Blue, White, Red, Gold, Black, etc.)
   - `name`: Full name if different from color (e.g., "Championship Tees")
   - `par`: Total par for the course from this tee
   - `rating`: Course rating (if available)
   - `slope`: Slope rating (if available)
   - `units`: "yards" or "meters"
   - `totalYardage`: Sum of all hole distances

2. **Holes** - Extract for each hole:
   - `holeNumber`: 1-18 (or 1-9, 1-27, etc.)
   - `par`: Par for the hole (3, 4, or 5)
   - `handicapIndex`: Handicap/stroke index (1-18)
   - `distance`: Yardage for each tee set
   - `hazards`: List of hazards (water, bunker, trees, etc.) - may need to infer from course description

3. **Validation**:
   - Verify hole count matches course description
   - Check that par values are reasonable (3-5 per hole)
   - Verify total yardage is reasonable for course type
   - Cross-reference with course description if available

4. **Missing Data Handling**:
   - If rating/slope not available, use `null`
   - If handicap not available, use `null` or estimate based on difficulty
   - If hazards not listed, extract from course description or use empty array
   - If only some tee sets have data, include what's available

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
- **Tee Sets**: Extract from scorecard data (see Step 4a) - Color names (Blue, White, Red, Gold, etc.), ratings, slopes, par, yardage
- **Holes**: Extract from scorecard data (see Step 4a) - Individual hole details (par, handicap, distance, hazards) for each tee set
- **Scorecard Data Sources**: Check all formats:
  - PDF scorecards (linked from scorecard page or course page)
  - HTML tables on scorecard/course pages
  - Images of scorecards (use OCR if needed)
  - Structured text on course pages
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

1. **Google Places First**: ALWAYS use Google Places to locate the course and get the official website URL before any web fetches.
   - Never call `web_fetch` with just a course name (e.g., `web_fetch("Indian Hills")` will fail with 404)
   - Always use the `website` field from Google Places place details
   - Course names are NOT URLs - they must be resolved through Google Places first

2. **Navigation-First Approach - NO URL GUESSING**:
   - **ALWAYS parse navigation from the homepage** before attempting to access subpages
   - Extract all navigation links (header, footer, sidebar menus)
   - Map navigation links to the data you need (scorecard → "Scorecard" or "Course" link)
   - **ONLY use discovered navigation links** - NEVER guess or construct URLs
   - **NEVER try common URL patterns** like `/golf`, `/course`, `/scorecard` unless you found these exact links in the navigation
   - Look for common link text patterns in what you actually found:
     - Scorecard: "Scorecard", "Course", "Holes", "Yardage", "Tee Times"
     - Rates: "Rates", "Pricing", "Fees", "Green Fees", "Tee Times"
     - Course Info: "About", "The Course", "Course Layout", "Course Design"
     - Policies: "Policies", "Rules", "Dress Code", "Walking Policy"
   - Parse both visible link text and href attributes
   - Handle relative URLs by combining with the homepage base URL
   - **If a link doesn't exist in navigation, you cannot access that page** - work with available information

3. **URL Rules - NO CONSTRUCTION OR GUESSING**:
   - **NEVER** construct URLs using course names, city names, or any other text
   - **NEVER** guess URLs using common patterns (e.g., `/golf`, `/course`, `/scorecard`)
   - **ONLY** use URLs from:
     1. Google Places `website` field (for homepage only)
     2. Navigation links discovered on the homepage
     3. Links found within pages you've already accessed
     4. Links in error pages (404 pages often contain navigation)
   - For relative URLs from navigation, combine with homepage base URL
   - Validate that URLs are well-formed before attempting to fetch them
   - Always start with the homepage URL from Google Places, then use discovered navigation to find subpages
   - **If navigation doesn't have a link to what you need, you cannot access it** - extract what information is available from accessible pages

4. **404 Error Handling**:
   - Extract useful information from 404 error pages (contact info, navigation links, address)
   - Retry with the homepage URL if a subpage fails
   - Re-parse navigation from the homepage if a link fails
   - Try alternative navigation links if the first attempt fails
   - Continue research with available information even if some pages fail

5. **Multiple Sources**: Cross-reference information from:
   - Google Places (primary for address/phone/website/coords)
   - Course official website (use Playwright as the primary access method, or `web_fetch` with full URL)
   - Golf course directories (GolfNow, GolfLink, etc.)
   - Review sites (Yelp, Google Reviews)
   - Golf association websites

6. **Playwright First**: Use Playwright to render JS-heavy pages, follow links, and capture content. Only fall back to lightweight fetches if Playwright fails.
   - Record Playwright usage in provenance with `method: "playwright"` and the page URL.
   - If Playwright is unavailable (Docker environment), use `web_fetch` with the full website URL from Google Places.

7. **Coordinate Lookup**: Use the address to verify/obtain coordinates via geocoding

8. **Timezone**: Determine timezone from state/city (e.g., Texas → America/Chicago or America/Denver)

9. **Missing Data**: If information isn't available, use `null` or reasonable defaults:
   - Email: `null` if not found
   - Pricing: Use `null` for ranges if unavailable
   - Tee sets/holes: Include what's available, omit what's not

10. **Confidence Scoring**: Rate confidence based on:
   - Multiple sources confirming same info: 0.9+
   - Single authoritative source: 0.7-0.8
   - Inferred/estimated: 0.5-0.6

## Navigation Parsing Guide

### How to Parse Navigation from Homepage

**CRITICAL: Only use URLs you discover here. Never guess or construct URLs.**

After fetching the homepage, follow these steps to extract and use navigation:

1. **Identify Navigation Elements**:
   - Look for `<nav>` elements
   - Find `<ul>` or `<ol>` lists with class names like "menu", "navigation", "nav", "links"
   - Check header and footer sections for link collections
   - Look for `<a>` tags with href attributes
   - **Extract ALL links** - don't assume what should exist, work with what actually exists

2. **Extract Link Information**:
   - For each link, capture:
     - **Link text**: The visible text (e.g., "Scorecard", "Course Info")
     - **href attribute**: The URL path (e.g., `/scorecard`, `/course`, `https://example.com/rates`)
     - **Link context**: Where it appears (header menu, footer, sidebar)
   - **Only use links that actually exist** - don't create links based on what you think should be there

3. **Normalize URLs** (only for links you actually found):
   - If href is relative (starts with `/`), combine with homepage base URL
     - Example: Homepage `https://www.example.com/` + `/scorecard` = `https://www.example.com/scorecard`
   - If href is absolute (starts with `http://` or `https://`), use as-is
   - If href is relative without leading `/` (e.g., `scorecard`), combine with homepage directory
     - Example: Homepage `https://www.example.com/` + `scorecard` = `https://www.example.com/scorecard`
   - **Only normalize URLs from links you discovered** - never construct URLs from text

4. **Map Links to Data Needs** (only for links that actually exist):
   Create a mapping of what you need vs. which links you actually found:
   
   | Data Needed | Look For Links Containing |
   |------------|---------------------------|
   | Scorecard/Holes | "scorecard", "course", "holes", "yardage", "tee", "card" |
   | Tee Sets | "scorecard", "tee", "yardage", "ratings", "slope" |
   | Rates/Pricing | "rates", "pricing", "fees", "green fees", "tee times", "book" |
   | Course Description | "about", "course", "layout", "design", "history", "overview" |
   | Policies | "policies", "rules", "dress code", "walking", "caddie", "etiquette" |
   | Contact Info | "contact", "directions", "location", "phone", "email" |
   | Amenities | "amenities", "facilities", "pro shop", "restaurant", "driving range" |
   
   **IMPORTANT**: Only map links that you actually found. If a link doesn't exist, you cannot access that page.

5. **Prioritize Links** (from what you found):
   - Scorecard data is highest priority (needed for holes, tee sets)
   - Rates/pricing is high priority (needed for pricingMeta)
   - Course description is medium priority (needed for description field)
   - Policies are medium priority (needed for playability.policies)
   - Contact info is usually already from Google Places, but verify
   - **If a priority link doesn't exist, work with what's available** - don't guess URLs

6. **Follow Navigation Links** (only discovered links):
   - Use the **exact URLs discovered from navigation** - never modify or guess
   - Fetch each relevant page using the discovered URL
   - Extract data from each page
   - Follow additional links **only if they appear on the current page** (e.g., PDF scorecard linked from scorecard page)
   - **Never construct URLs** - only use links you found

7. **Extract Scorecard Data** (from any format found):
   - **PDF Links**: Follow PDF links and extract structured data from PDF content
   - **HTML Tables**: Parse scorecard tables from page HTML
   - **Structured Text**: Extract from formatted text patterns on the page
   - **Images**: Use OCR/image analysis to extract scorecard data from images
   - See Step 4a for detailed extraction plans for each format

### Example: Wheatfield Valley Navigation

**Homepage**: `https://www.wheatfieldvalley.com/`

**Navigation Links Found** (from 404 error page):
- "The Course" → Likely contains course info and scorecard
- "Tee Time" → Likely contains rates and booking info
- "Rates" → Contains pricing information
- "Contact Us" → Contains contact details
- "Directions" → Contains location details

**Action**: Use these exact navigation links instead of guessing URLs like `/Wheatfield Valley Golf`

## Example Usage

**User Request:**
"Research Pebble Beach Golf Links in Pebble Beach, CA"

**Process:**
1. **Google Places**: Search "Pebble Beach Golf Links" "Pebble Beach" "CA" golf course
2. **Get Website**: Extract `website` field from place details (e.g., `https://www.pebblebeach.com/`)
3. **Fetch Homepage**: Get `https://www.pebblebeach.com/`
4. **Parse Navigation**: Extract navigation links:
   - "Golf Courses" → `/golf-courses`
   - "Scorecard" → `/golf-courses/pebble-beach-golf-links/scorecard`
   - "Rates" → `/golf-courses/pebble-beach-golf-links/rates`
   - "Course Info" → `/golf-courses/pebble-beach-golf-links`
5. **Navigate Using Links**: 
   - Fetch `/golf-courses/pebble-beach-golf-links/scorecard` for tee sets and holes
   - Fetch `/golf-courses/pebble-beach-golf-links/rates` for pricing
   - Fetch `/golf-courses/pebble-beach-golf-links` for course description
6. **Extract Scorecard Data** (check all formats):
   - **If PDF link found**: Follow PDF link, extract structured data from PDF (tee sets, holes, par, yardage)
   - **If HTML table found**: Parse table structure, extract tee sets and hole data
   - **If image found**: Use OCR/image analysis to extract scorecard data from image
   - **If structured text found**: Parse text patterns for hole/tee information
7. **Extract Other Data**: Gather amenities, pricing, policies from discovered pages
8. **Classify**: Course design (18-hole championship), layout, images
9. **Structure**: Return complete JSON response with tee sets and holes from scorecard data

## Notes

- **CRITICAL**: Always use Google Places first to get the official website URL. Never call `web_fetch` with a course name directly.
- **CRITICAL**: Always parse navigation from the homepage before accessing subpages. Use discovered navigation links - never guess or construct URLs.
- **CRITICAL**: Only use URLs from Google Places or discovered within the website itself. Never guess URLs based on common patterns or course names.
- **CRITICAL**: If navigation doesn't contain a link to what you need, you cannot access that page. Work with available information from accessible pages.
- Always verify critical information (address, coordinates) from multiple sources
- When course type is ambiguous, default to "championship_18" for 18-hole courses
- Include source URLs in provenance for traceability
- Use current date/time for `lastVerifiedAt` and `fetchedAt` timestamps
- Generate unique IDs using descriptive patterns (e.g., `course_pebble_beach_ca`)

## Troubleshooting

### Common Errors

**Error: `web_fetch failed: Web fetch failed (404): [Course Name]`**
- **Cause**: Course name was used as a URL instead of resolving through Google Places first
- **Fix**: Always use Google Places Step 1 to get the official website URL, then use that URL for `web_fetch`

**Error: `web_fetch failed: Web fetch failed (404): Page not found`**
- **Cause**: Attempted to fetch a subpage that doesn't exist, or URL was constructed incorrectly
- **Fix**: 
  1. Extract useful information from the 404 error page (contact info, navigation links)
  2. Retry with the homepage URL from Google Places
  3. **Parse navigation from the homepage** to find correct page paths
  4. Use discovered navigation links instead of guessing URLs
  5. Never construct URLs using course names or other text

**Error: Cannot find scorecard/rates/course info pages**
- **Cause**: Not parsing navigation from homepage, or guessing URLs instead of using navigation
- **Fix**:
  1. **Always fetch homepage first** before accessing any subpages
  2. **Parse navigation structure** from homepage HTML
  3. **Extract all navigation links** (header, footer, menus)
  4. **Map link text to data needs** (e.g., "Scorecard" → scorecard data)
  5. **Use exact URLs from navigation links** - never guess or construct
  6. **If navigation doesn't contain links to what you need, work with available information** - don't guess URLs
  7. **Never try common URL patterns** - only use links you actually found

**Error: `browser failed: Can't reach the clawd browser control service`**
- **Cause**: Playwright is unavailable (common in Docker environments)
- **Fix**: Fall back to `web_fetch` with the full website URL from Google Places

**Error: Python script execution failures**
- **Cause**: Python scripts may not be available or have permission issues
- **Fix**: Use AI reasoning directly for course type classification instead of Python helper scripts

**Error: Cannot extract scorecard data**
- **Cause**: Scorecard data may be in PDF, HTML table, or image format
- **Fix**:
  1. **Check for PDF links**: Look for "Download Scorecard", "Scorecard PDF" links and extract from PDF
  2. **Check HTML tables**: Parse `<table>` elements on scorecard/course pages
  3. **Check for images**: Look for scorecard images and use OCR/image analysis
  4. **Check structured text**: Look for formatted text patterns with hole/tee information
  5. **Try multiple pages**: Scorecard may be on course page, scorecard page, or rates page
  6. **Extract partial data**: If full scorecard unavailable, extract what's available (e.g., total yardage, par)

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
- Fall back to `web_search` for information gathering

### Playwright Unavailable
- Automatically fall back to `web_fetch`
- Use homepage URL from Google Places
- Extract information from HTML content
