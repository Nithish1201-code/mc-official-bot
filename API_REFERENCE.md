# API Reference

Complete REST API documentation for the Minecraft management backend.

## Base URL

```
http://localhost:3000
```

## Authentication

All endpoints except `/health`, `/ping`, and `/metrics` require:

```
X-API-Key: <api-key>
```

## Responses

### Success Response (2xx)

```json
{
  "status": "online",
  "playerCount": 5,
  "data": {}
}
```

### Error Response (4xx, 5xx)

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Descriptive error message",
    "statusCode": 400,
    "details": {}
  }
}
```

## Endpoints

### Health & Status

#### GET /health
Health check endpoint (no auth required).

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 3600,
  "memory": {
    "heapUsed": 52428800,
    "heapTotal": 134217728,
    "external": 1024000,
    "rss": 167772160
  }
}
```

#### GET /ping
Simple ping (no auth required).

**Response:**
```json
{
  "pong": true
}
```

#### GET /metrics
Performance metrics (no auth required).

**Response:**
```json
{
  "uptime": 3600,
  "memory": {
    "heapUsed": "50 MB",
    "heapTotal": "128 MB",
    "rss": "160 MB"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Server Management

#### GET /api/status
Get current server status.

**Headers:**
```
X-API-Key: <api-key>
```

**Response:**
```json
{
  "status": {
    "online": true,
    "playerCount": 5,
    "maxPlayers": 20,
    "ping": 35,
    "cpuUsage": 45.2,
    "ramUsage": 60.1,
    "uptime": 3600
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### POST /api/server/restart
Restart the Minecraft server.

**Headers:**
```
X-API-Key: <api-key>
Content-Type: application/json
```

**Request Body:**
```json
{
  "delay": 0
}
```

**Parameters:**
- `delay` (number, optional) - Seconds before restart (0-300)

**Response:**
```json
{
  "success": true,
  "message": "Server restart initiated",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### POST /api/server/stop
Stop the Minecraft server.

**Headers:**
```
X-API-Key: <api-key>
```

**Response:**
```json
{
  "success": true,
  "message": "Server stop initiated",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Plugin Management

#### GET /api/plugins
List installed plugins.

**Headers:**
```
X-API-Key: <api-key>
```

**Response:**
```json
{
  "plugins": [
    {
      "name": "EssentialsX",
      "version": "2.20.0",
      "path": "/plugins/EssentialsX.jar",
      "size": 5242880,
      "modrinthId": "essentials",
      "enabled": true
    }
  ],
  "count": 1
}
```

#### GET /api/modrinth/search
Search Modrinth for projects.

**Headers:**
```
X-API-Key: <api-key>
```

**Query Parameters:**
- `q` (string, required) - Search query
- `limit` (number, optional) - Results to return (1-100, default: 10)
- `offset` (number, optional) - Result offset for pagination (default: 0)
- `loaders` (string array, optional) - Filter by loader (e.g., fabric, forge)
- `gameVersions` (string array, optional) - Filter by version (e.g., 1.20.1)

**Example:**
```
GET /api/modrinth/search?q=fabric&limit=5&loaders=["fabric"]
```

**Response:**
```json
{
  "hits": [
    {
      "project_id": "fabric-api",
      "project_type": "mod",
      "title": "Fabric API",
      "description": "Core API for Fabric",
      "slug": "fabric-api",
      "categories": ["library"],
      "downloads": 1000000,
      "follows": 50000,
      "icon_url": "https://...",
      "date_modified": "2024-01-15T10:30:00Z"
    }
  ],
  "offset": 0,
  "limit": 5,
  "total_hits": 150
}
```

#### POST /api/plugins/install
Install a plugin from Modrinth.

**Headers:**
```
X-API-Key: <api-key>
Content-Type: application/json
```

**Request Body:**
```json
{
  "projectId": "fabric-api",
  "versionId": "version-hash-123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Plugin installation initiated",
  "projectId": "fabric-api",
  "versionId": "version-hash-123"
}
```

#### POST /api/plugins/upload
Upload a plugin jar file.

**Headers:**
```
X-API-Key: <api-key>
Content-Type: multipart/form-data
```

**Form Data:**
- `file` (file/jar, required) - Plugin jar file (max 50MB)

**Response:**
```json
{
  "success": true,
  "file": {
    "name": "MyPlugin.jar",
    "size": 5242880,
    "path": "/plugins/MyPlugin.jar"
  },
  "message": "Plugin uploaded successfully"
}
```

#### DELETE /api/plugins/:name
Remove an installed plugin.

**Headers:**
```
X-API-Key: <api-key>
```

**Path Parameters:**
- `name` (string, required) - Plugin name

**Example:**
```
DELETE /api/plugins/EssentialsX
```

**Response:**
```json
{
  "success": true,
  "message": "Plugin 'EssentialsX' deleted"
}
```

## Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `MISSING_API_KEY` | 401 | API key not provided |
| `INVALID_API_KEY` | 401 | API key is invalid |
| `MISSING_QUERY` | 400 | Required query parameter missing |
| `MISSING_FIELDS` | 400 | Required fields missing from request |
| `NO_FILE` | 400 | No file provided in upload |
| `INVALID_FILE` | 400 | File is invalid or too large |
| `STATUS_CHECK_FAILED` | 500 | Could not retrieve server status |
| `RESTART_FAILED` | 500 | Could not restart server |
| `STOP_FAILED` | 500 | Could not stop server |
| `LIST_PLUGINS_FAILED` | 500 | Could not list plugins |
| `MODRINTH_SEARCH_FAILED` | 500 | Modrinth search failed |
| `INSTALL_FAILED` | 500 | Plugin installation failed |
| `UPLOAD_FAILED` | 500 | File upload failed |
| `DELETE_FAILED` | 500 | Plugin deletion failed |

## Rate Limiting

Default limits:
- General endpoints: 100 requests/minute
- File uploads: 10 requests/minute
- Modrinth proxy: 60 requests/minute

When rate limited, response:
```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded",
    "statusCode": 429,
    "details": {
      "retryAfter": 60
    }
  }
}
```

Use `Retry-After` header for backoff.

## Examples

### cURL

```bash
# Check status
curl -H "X-API-Key: your-api-key" http://localhost:3000/api/status

# Restart server
curl -X POST \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"delay": 10}' \
  http://localhost:3000/api/server/restart

# Search plugins
curl -H "X-API-Key: your-api-key" \
  "http://localhost:3000/api/modrinth/search?q=essentials&limit=5"

# Upload plugin
curl -X POST \
  -H "X-API-Key: your-api-key" \
  -F "file=@plugin.jar" \
  http://localhost:3000/api/plugins/upload
```

### JavaScript

```javascript
const apiKey = "your-api-key";

// Get status
const status = await fetch("http://localhost:3000/api/status", {
  headers: { "X-API-Key": apiKey }
}).then(r => r.json());

// Restart server
const result = await fetch("http://localhost:3000/api/server/restart", {
  method: "POST",
  headers: {
    "X-API-Key": apiKey,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ delay: 0 })
}).then(r => r.json());

// Search Modrinth
const search = await fetch(
  "http://localhost:3000/api/modrinth/search?q=fabric",
  { headers: { "X-API-Key": apiKey } }
).then(r => r.json());
```

### Python

```python
import requests

api_key = "your-api-key"
base_url = "http://localhost:3000"
headers = {"X-API-Key": api_key}

# Get status
response = requests.get(f"{base_url}/api/status", headers=headers)
status = response.json()

# Restart server
response = requests.post(
    f"{base_url}/api/server/restart",
    json={"delay": 0},
    headers=headers
)
result = response.json()

# Search plugins
params = {"q": "fabric", "limit": 5}
response = requests.get(
    f"{base_url}/api/modrinth/search",
    params=params,
    headers=headers
)
results = response.json()
```

## Pagination

Results are paginated using standard query parameters:

```
GET /api/modrinth/search?q=fabric&offset=0&limit=10
```

Response includes pagination metadata:
```json
{
  "hits": [...],
  "offset": 0,
  "limit": 10,
  "total_hits": 156
}
```

Calculate next page:
```javascript
nextOffset = currentOffset + limit;
hasNext = (offset + limit) < totalHits;
```

## WebSocket

Real-time metrics via WebSocket:

```javascript
const ws = new WebSocket("ws://localhost:3000/metrics");

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  // message.type: "status_update"
  // message.data: { online, players, cpu, ram, ... }
};
```

## Changelog

### v1.0.0 (Initial Release)
- [ ] Server status endpoint
- [ ] Server control (restart, stop)
- [ ] Plugin management
- [ ] Modrinth integration
- [ ] File upload support
- [ ] Basic authentication
- [ ] Rate limiting
- [ ] Health checks
