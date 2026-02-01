# Security & Map View Enhancements

## Security Features

### Viewer Authentication (Optional)

The viewer (`/`) supports optional Basic Auth. Set `VIEWER_AUTH` environment variable in format `user:pass`:

```bash
# In docker-compose.courses.yml or .env
VIEWER_AUTH=admin:secret123
```

If not set, the viewer is publicly accessible (useful for localhost development).

### API Authentication

All API routes (except `/health`) require Bearer token authentication:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8088/v1/courses
```

The token is set via `AUTH_TOKEN` environment variable.

**Routes protected:**
- `GET /v1/courses` - List courses
- `GET /v1/courses/:id` - Get course details
- `GET /v1/courses/near` - Nearby courses
- `GET /v1/courses/:id/tee-sets` - Tee sets
- `GET /v1/courses/:id/holes` - Holes
- `GET /v1/courses/:id/amenities` - Amenities
- `GET /v1/courses/:id/snapshot/:snapshotId` - Raw snapshot data
- `POST /v1/courses/ingest` - Ingest course
- `POST /v1/courses/ingest/batch` - Batch ingest

**Public routes:**
- `GET /health` - Health check (no auth required)

## Map View

The viewer now includes a **Map** toggle that displays courses on an interactive Leaflet map.

### Features

- **Toggle between List and Map views**
- **Interactive markers** - Click markers to view course details
- **Auto-fit bounds** - Map automatically zooms to show all visible courses
- **Search/filter works in both views** - Filters apply to map markers
- **Uses OpenStreetMap tiles** - No API key required

### Usage

1. Open `http://localhost:8088/`
2. Click the **🗺️ Map** button
3. Courses with coordinates will appear as markers
4. Click any marker to view course details
5. Use filters to narrow down results on the map

## Enhanced Course Details

When clicking a course, a modal opens with:

### Canonical Tab
Shows the normalized course data (what's stored in the database after processing).

### Raw Snapshot Tab (if available)
Shows the original raw JSON payload from the ingest. This is helpful for:
- Debugging normalization issues
- Seeing what data was transformed
- Understanding what got filtered out

The snapshot tab only appears if the course has a snapshot available.

## New Endpoint

### Get Snapshot

```
GET /v1/courses/:id/snapshot/:snapshotId
Authorization: Bearer {TOKEN}
```

Returns the raw payload from a specific snapshot.

**Response:**
```json
{
  "courseId": "course_royal_scot_lansing_mi",
  "snapshotId": "uuid-here",
  "fetchedAt": "2026-02-01T13:51:18.539Z",
  "rawPayload": { ... }
}
```

## Configuration

### Environment Variables

```bash
# Required for API access
AUTH_TOKEN=your-bearer-token-here

# Optional for viewer Basic Auth
VIEWER_AUTH=user:pass

# If VIEWER_AUTH is not set, viewer is public
```

### Docker Compose

```yaml
environment:
  AUTH_TOKEN: 8-iVeTs0dZWb_Hw3PtzXV14wJlEkw3t29BzJw52Qc5Y
  VIEWER_AUTH: ${VIEWER_AUTH:-}  # Optional
```

## Security Best Practices

1. **Always set AUTH_TOKEN** in production
2. **Set VIEWER_AUTH** if exposing port 8088 beyond localhost
3. **Use HTTPS** if exposing publicly
4. **Rotate tokens** if exposed
5. **Keep /health public** for monitoring (no sensitive data)

## Testing

**Test viewer (no auth if VIEWER_AUTH not set):**
```bash
open http://localhost:8088/
```

**Test API (requires token):**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8088/v1/courses?state=MI
```

**Test viewer with auth:**
```bash
# Set VIEWER_AUTH=admin:secret
# Browser will prompt for credentials
```

## Answer to Your Question

> When you open http://localhost:8088/, does clicking a course show the canonical record only, or does it also let you view the latest snapshot raw JSON?

**Answer:** Clicking a course now shows **both**:
1. **Canonical tab** - The normalized database record
2. **Raw Snapshot tab** - The original ingest payload (if available)

This makes it easy to compare what went in vs. what got normalized, which is perfect for debugging ingest issues!
