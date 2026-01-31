---
name: openclaw-arcane-docker
description: Interacts with the Arcane Docker Management REST API to manage Docker containers, stacks (compose), templates, images, networks, volumes, users, API keys, and system monitoring. Use when the user mentions Arcane, Arcane API, Docker management via Arcane, or asks to list/start/stop/restart containers, deploy/update stacks, manage templates, or view logs/stats.
---

# OpenClaw — Arcane Docker Management

## Quick start

When helping with Arcane Docker Management API requests:

1. **Get connection details**
   - Base URL (default): `http://localhost:3552/api`
   - Auth method: **JWT bearer token** or **X-API-Key**

2. **Be careful with destructive actions**
   - Treat these as destructive: delete/remove/prune operations (containers, images, networks, volumes, stacks, templates, users, API keys).
   - Prefer a “dry run” first (list/inspect) and clearly state what will be deleted.

3. **Make the API call**
   - Use `curl` for quick checks.
   - Use Python `requests` for multi-step workflows, pagination, and structured outputs.

For the full endpoint cookbook, see [reference.md](reference.md).

## Conventions

### Auth headers

- **JWT**: `Authorization: Bearer <token>`
- **API key**: `X-API-Key: <key>`

### Response shape

- Success wrapper (commonly):
  - `success: true|false`
  - `data: ...`
  - `message: ...`
- Errors may follow RFC 7807 problem details (`type`, `title`, `status`, `detail`).

### Pagination

Many list endpoints accept:
- `start` (default 0)
- `limit` (default 20)
- `sort`
- `order` (`asc`/`desc`)
- `search`

## Core workflows (preferred)

### Container lifecycle

- List/filter/search containers → inspect a target → fetch logs/stats → start/stop/restart/update.

### Stack (compose) deploy/update

- List stacks → deploy a stack (from template or compose content) → monitor logs → start/stop/restart/pull.

### Cleanup & maintenance

- Inspect disk usage/system stats → prune images/volumes/networks carefully → re-check disk usage.

## Examples

### Login (JWT) then list containers

```bash
BASE_URL="http://localhost:3552/api"

TOKEN="$(
  curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"your_password"}' \
  | jq -r '.token'
)"

curl -s -X GET "$BASE_URL/containers" \
  -H "Authorization: Bearer $TOKEN"
```

### List running containers (API key)

```bash
BASE_URL="http://localhost:3552/api"
API_KEY="your-api-key"

curl -s -X GET "$BASE_URL/containers?status=running" \
  -H "X-API-Key: $API_KEY"
```

