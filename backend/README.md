# Backend API

High-performance REST/WebSocket API for Minecraft server management.

## Features

- Fastify-based REST API
- WebSocket support for real-time monitoring
- Modrinth plugin integration
- File upload handling
- Crafty Controller detection and integration
- Rate limiting and request validation
- Structured logging

## Starting the Server

```bash
npm install
npm run dev        # Development with hot reload
npm run build      # Build TypeScript
npm start          # Production
```

## Environment Variables

```env
NODE_ENV=production
PORT=3000
API_KEY=<generated-at-setup>
LOG_LEVEL=info
MINECRAFT_PATH=/path/to/server
CRAFTY_PATH=/opt/crafty
MODRINTH_API_BASE=https://api.modrinth.com/v2
```

## API Endpoints

### Server Status
- `GET /status` - Server status and metrics

### Server Control
- `POST /server/restart` - Restart the server

### Plugins
- `GET /plugins` - List installed plugins
- `GET /modrinth/search?q=...` - Search Modrinth
- `POST /plugins/install` - Install from Modrinth
- `POST /plugins/upload` - Upload jar file
- `DELETE /plugins/:name` - Remove plugin

### Health
- `GET /health` - Service health check
- `GET /metrics` - Performance metrics

## Authentication

All endpoints except `/health` require:
```
X-API-Key: <api-key>
```

## Error Handling

Standard error responses:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description",
    "statusCode": 400,
    "details": {}
  }
}
```

## Rate Limiting

- 100 requests/minute per API key
- 10 file uploads/minute
- Modrinth proxy: 60 requests/minute

## WebSocket

Real-time server metrics via WebSocket:
```
ws://localhost:3000/metrics
```

Message format:
```json
{
  "type": "status_update",
  "data": {
    "online": true,
    "players": 5,
    "cpuUsage": 45.2,
    "ramUsage": 60.1
  }
}
```
