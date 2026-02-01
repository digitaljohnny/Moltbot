---
name: google-places
description: Query the Google Places API to look up businesses, venues, and landmarks by name and location. Returns structured JSON with search candidates and detailed place data.
metadata: {"moltbot":{"emoji":"📍"}}
---

# 📍 Google Places Skill

Query the Google Places API to look up businesses, venues, and landmarks by name and location. Returns structured JSON with search candidates and detailed place data.

## When to Use

Use this skill when a user asks to find a place, verify business details, retrieve a location's contact info, or disambiguate between similarly named locations.

**Invocation modes:**
- **Manual:** User explicitly asks to find a place using Google Places.
- **Auto-detect:** If a message contains a place name and a city/state (or address), invoke automatically.
- **Fallback:** If a place name is provided without any location context, ask for city/state or a full address.

## Input Parameters

- **query** (required): Name of the place (e.g., "Blue Bottle Coffee")
- **location** (optional): `"lat,lng"` string to bias results (e.g., `"37.7749,-122.4194"`)
- **radius** (optional): Search radius in meters (e.g., `5000`)
- **language** (optional): IETF language tag (e.g., `"en"`)
- **region** (optional): ccTLD region bias (e.g., `"us"`)
- **placeId** (optional): Use this to fetch details directly without running search

## Lookup Process

### Step 1: Text Search
Call:
`https://maps.googleapis.com/maps/api/place/textsearch/json`

Parameters:
- `query`, `key`
- Optional: `location`, `radius`, `language`, `region`

### Step 2: Disambiguation
- If more than one candidate matches, present 3-5 candidates and ask the user to pick one.
- If only one candidate or the user chooses one, proceed to details lookup.

### Step 3: Place Details
Call:
`https://maps.googleapis.com/maps/api/place/details/json`

Fields to request:
`place_id,name,formatted_address,geometry,types,website,formatted_phone_number,international_phone_number,opening_hours,business_status,rating,user_ratings_total,price_level,utc_offset_minutes,photos`

### Step 4: Structure Response
Return the normalized JSON response using the schema below.

## Output Schema

```json
{
  "query": "<user query>",
  "resultCount": <number>,
  "candidates": [
    {
      "name": "<place name>",
      "placeId": "<place_id>",
      "formattedAddress": "<address>",
      "location": { "lat": <number>, "lng": <number> },
      "types": ["<type>"],
      "rating": <number>,
      "userRatingsTotal": <number>
    }
  ],
  "place": {
    "placeId": "<place_id>",
    "name": "<place name>",
    "formattedAddress": "<address>",
    "location": { "lat": <number>, "lng": <number> },
    "types": ["<type>"],
    "businessStatus": "<status>",
    "rating": <number>,
    "userRatingsTotal": <number>,
    "priceLevel": <number>,
    "website": "<url>",
    "phone": {
      "formatted": "<formatted_phone_number>",
      "international": "<international_phone_number>"
    },
    "openingHours": {
      "openNow": <true/false>,
      "weekdayText": ["<line>"]
    },
    "utcOffsetMinutes": <number>,
    "photos": [
      {
        "photoReference": "<photo_reference>",
        "width": <number>,
        "height": <number>,
        "photoUrl": "<photo_url>"
      }
    ]
  },
  "provenance": {
    "source": "google_places",
    "fetchedAt": "<ISO_8601_timestamp>"
  }
}
```

## Example Usage

**User Request:**
"Find the phone number and website for Pappy & Harriet's in Pioneertown, CA."

**Process:**
1. Search for `"Pappy & Harriet's" "Pioneertown CA"`
2. If multiple results, list top candidates
3. Fetch details for the chosen place
4. Return structured JSON

## Notes

- API key used by default: `AIzaSyBFOKTnjZBCpZrPr8oZiM00SDKLW2vENTQ`
- If the key is rotated, update `skills/google-places/places_lookup.py`
- If `placeId` is provided, skip the search step and fetch details directly
- Respect rate limits and handle `OVER_QUERY_LIMIT` or `REQUEST_DENIED` errors gracefully
