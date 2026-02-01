# Golf Courses Viewer

A simple web interface for browsing and searching golf courses in the database.

## Access

Open in your browser:
```
http://localhost:8088/
```

## Features

- **Search**: Filter by course name, city, or state
- **State Filter**: Filter by state abbreviation (e.g., "MI")
- **City Filter**: Filter by city name
- **Pagination**: Navigate through results (50 per page)
- **Course Details**: View course name, location, hole count, domain, phone, and coordinates
- **Click to View**: Click any course to see full details (opens JSON in new tab)

## API Endpoints

### List Courses

```
GET /v1/courses
```

**Query Parameters:**
- `limit` (default: 50, max: 100) - Number of results per page
- `offset` (default: 0) - Pagination offset
- `state` - Filter by state abbreviation (e.g., "MI")
- `city` - Filter by city name (case-insensitive)
- `search` - Search in course name, city, or state (case-insensitive)

**Example:**
```bash
curl "http://localhost:8088/v1/courses?state=MI&limit=10"
```

**Response:**
```json
{
  "ok": true,
  "total": 2,
  "limit": 10,
  "offset": 0,
  "count": 2,
  "courses": [
    {
      "id": "course_royal_scot_lansing_mi",
      "name": "Royal Scot Golf & Bowl",
      "city": "Lansing",
      "state": "MI",
      "holes": 27,
      "domain": "royalscot.net",
      "phone": "+1-517-321-6220",
      "geoLat": 42.7474332,
      "geoLng": -84.5576018,
      "updated_at": "2026-02-01T13:51:18.539Z"
    }
  ]
}
```

### Get Single Course

```
GET /v1/courses/:id
```

Returns full course details including tee sets, holes, amenities, and course types.

## Usage Examples

**List all courses:**
```bash
curl "http://localhost:8088/v1/courses"
```

**Search for courses in Michigan:**
```bash
curl "http://localhost:8088/v1/courses?state=MI"
```

**Search by name:**
```bash
curl "http://localhost:8088/v1/courses?search=Royal"
```

**Filter by city:**
```bash
curl "http://localhost:8088/v1/courses?city=Lansing"
```

**Combined filters:**
```bash
curl "http://localhost:8088/v1/courses?state=MI&city=Lansing&search=Golf"
```

**Pagination:**
```bash
# First page
curl "http://localhost:8088/v1/courses?limit=10&offset=0"

# Second page
curl "http://localhost:8088/v1/courses?limit=10&offset=10"
```

## UI Features

The web interface provides:
- Real-time search and filtering
- Responsive design (works on mobile)
- Click courses to view full JSON details
- Pagination controls
- Loading states and error handling
- Clean, modern UI

## Next Steps

With the viewer in place, you can now:
1. Browse courses visually without using psql/curl
2. Validate ingested data
3. Share the viewer URL with others
4. Use the API endpoints programmatically
