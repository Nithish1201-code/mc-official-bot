# Architecture Overview

Complete architectural documentation for MC Official Bot.

## System Design

```
┌─────────────────────────────────────────────────────────────┐
│                      Discord Server                         │
│         (Event ingestion point for users)                   │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ WebSocket/REST
                 ▼
┌─────────────────────────────────────────────────────────────┐
│              Discord Bot (Node.js)                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Slash Commands                                       │  │
│  │ • /status       • /restart     • /search             │  │
│  │ • /plugin list  • /plugin upload                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                        │                                    │
│         Calls Backend API (no direct access)               │
└────────────────┬────────────────────────────────────────────┘
                 │
         X-API-Key: <secured>
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│         Backend API (Fastify + TypeScript)                 │
│                                                             │
│  ┌─────────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │ Route Layer     │  │ Business     │  │ External    │  │
│  │                 │  │ Logic        │  │ Services    │  │
│  │ /api/status     │  │              │  │             │  │
│  │ /api/plugins    │  │ • Crafty     │  │ • Modrinth  │  │
│  │ /api/modrinth   │  │ • Plugin     │  │ • Discord   │  │
│  │ /api/server     │  │   Mgt       │  │             │  │
│  │                 │  │ • File Ops   │  │ External    │  │
│  └─────────────────┘  └──────────────┘  └─────────────┘  │
│                        │                                    │
└────────────────┬───────┼────────────────────────────────────┘
                 │       │
                 ▼       ▼
      ┌──────────────────────────────────┐
      │   Minecraft Server Instance      │
      │  (Spigot/Paper/Forge/Fabric)     │
      │                                  │
      │  • server.properties             │
      │  • plugins/ directory            │
      │  • logs/ directory               │
      │  • world/ directory              │
      └──────────────────────────────────┘
```

## Monorepo Structure

```
mc-official-bot/
│
├── shared/                      # 🔗 Shared Types & Utilities
│   ├── src/
│   │   ├── types.ts            # Core domain types
│   │   ├── api.ts              # API schemas & responses
│   │   └── errors.ts           # Error definitions
│   ├── package.json
│   └── tsconfig.json
│
├── backend/                     # 🖥️ REST API Server
│   ├── src/
│   │   ├── index.ts            # Entry point
│   │   ├── server.ts           # Fastify setup
│   │   ├── config.ts           # Configuration
│   │   ├── routes/             # API endpoints
│   │   │   ├── health.ts       # Health checks
│   │   │   ├── status.ts       # Server status
│   │   │   ├── server.ts       # Server control
│   │   │   ├── plugins.ts      # Plugin management
│   │   │   └── modrinth.ts     # Modrinth proxy
│   │   └── utils/              # Helper utilities
│   │       ├── logger.ts       # Logging
│   │       ├── crafty.ts       # Crafty detection
│   │       └── modrinth.ts     # Modrinth API client
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
│
├── bot/                         # 🤖 Discord Bot
│   ├── src/
│   │   ├── index.ts            # Entry point & login
│   │   ├── client.ts           # Discord.js client
│   │   ├── config.ts           # Configuration
│   │   ├── commands/           # Slash commands
│   │   │   └── index.ts        # Command definitions
│   │   ├── events/             # Event handlers
│   │   │   └── index.ts        # Interaction handling
│   │   └── utils/              # Helper utilities
│   │       ├── logger.ts       # Logging
│   │       ├── api.ts          # Backend API client
│   │       └── embeds.ts       # Discord embeds
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
│
├── installer/                   # 📦 Setup & Bootstrap
│   └── README.md
│
├── systemd/                     # 🔧 System Configuration
│   ├── mc-backend.service
│   └── mc-bot.service
│
├── setup.sh                     # 🚀 Main setup script
├── package.json                # Workspace root
├── tsconfig.json               # TypeScript config
├── docker-compose.yml          # Docker setup
├── Dockerfile.backend          # Backend image
├── Dockerfile.bot              # Bot image
│
└── Documentation/
    ├── README.md               # Project overview
    ├── DEVELOPMENT.md          # Development guide
    ├── DEPLOYMENT.md           # Production deployment
    ├── API_REFERENCE.md        # API documentation
    ├── CONTRIBUTING.md         # Contributing guidelines
    └── ARCHITECTURE.md         # This file
```

## Data Flow

### 1. Server Status Request

```
User: /status
  ↓
Discord Bot
  ├─ Parse command
  └─ Call Backend: GET /api/status (with X-API-Key)
  ├─ Backend queries server process
  └─ Return JSON response
  ├─ Bot formats as embed
  └─ Send reply to user
```

### 2. Plugin Installation

```
User: /plugin install <project-id>
  ↓
Discord Bot: Command interaction
  ├─ Backend: GET /api/modrinth/versions/<project-id>
  ├─ Show versioning options to user
  └─ User selects version
  ├─ Backend: POST /api/plugins/install
  ├─ Backend:
  │  ├─ Download from Modrinth
  │  ├─ Backup existing plugins
  │  ├─ Move to plugins directory
  │  └─ Trigger server reload
  ├─ Confirm success/failure
  └─ Send confirmation to user
```

### 3. File Upload

```
User: Upload jar file
  ↓
Discord Bot: Multipart upload
  ├─ POST /api/plugins/upload
  ├─ Backend:
  │  ├─ Validate file (jar signature)
  │  ├─ Scan for malware (optional)
  │  ├─ Create backup
  │  ├─ Move to plugins directory
  │  └─ Return location
  ├─ Confirm upload success
  └─ Notify user
```

## Component Details

### Backend (Fastify)

**Responsibilities:**
- HTTP API server (REST endpoints)
- Request validation with Zod
- API key authentication
- Rate limiting
- Error handling & logging
- Crafty/Minecraft server interaction
- File operations (download, upload, validate)
- Modrinth API proxy

**Performance:**
- Single-threaded event loop
- Async I/O for all operations
- No blocking calls
- Memory-efficient stream processing

### Bot (Discord.js)

**Responsibilities:**
- User interaction handling
- Command parsing
- Response formatting (embeds)
- Backend API calls (no direct filesystem access)
- Error display to users
- Rate limiting locally

**Design:**
- Stateless design (no session storage)
- All data flows through backend
- Idempotent commands
- Graceful error handling

### Shared Types

**Responsibility:**
- Single source of truth for types
- Validation schemas (Zod)
- Error definitions
- API contracts

**Benefits:**
- Type safety across monorepo
- Consistent validation
- Version-independent interfaces

## Security Architecture

### Authentication

```
┌─────────────────────────────────────────┐
│ Request with X-API-Key header           │
└─────────────┬───────────────────────────┘
              │
              ▼
    ┌─────────────────────┐
    │ Fastify middleware  │
    │ - Extract API key   │
    │ - Compare with env  │
    └─────────────────────┘
              │
         ┌────┴────┐
         │          │
    ✓ Valid    ✗ Invalid
         │          │
         ▼          ▼
    Process    401 Error
    Request
```

### Input Validation

```
Request ──►  Zod Schema  ──► TypeScript Type
              │
         Passes all:
         • Type check
         • Length limits
         • Format rules
         • Whitelist patterns
```

### File Security

```
Upload ──┬─► Size check (50MB limit)
         ├─► Extension validation (.jar only)
         ├─► Magic number check (PK header)
         ├─► Backup existing
         └─► Atomic move
```

### Path Traversal Prevention

```
User Path           Filter              Safe Path
─────────          ─────              ──────────
"../../../etc"  ──► No ".."  ──►  Reject
"/etc/passwd"   ──► No root  ──►  Reject
"plugins/test"  ──► Relative  ──►  Accept
```

## Deployment Architecture

### Single-Server Deployment

```
VPS (Ubuntu/Debian)
├── Backend (Node.js)    Port 3000
├── Bot (Node.js)        No port
├── Systemd services
├── nginx (optional)     Port 80/443
└── Minecraft Server
```

### Docker Deployment

```
Docker Host
├── Backend container (port 3000)
├── Bot container
├── Minecraft container
└── Optional: nginx container
```

### Scaling Options

**Horizontal:**
- Multiple backends behind load balancer
- Shared Minecraft server
- Bot connects to load balancer
- Redis for state (future)

**Vertical:**
- Increase Node.js memory (--max-old-space-size)
- Increase system resources
- Database optimization

## Error Handling Strategy

### Classification

```
Error         │ Code     │ HTTP │ Retry
──────────────┼──────────┼──────┼─────
No API key    │ 401      │ 4xx  │ No
Invalid key   │ 401      │ 4xx  │ No
File too big  │ 400      │ 4xx  │ No
Not found     │ 404      │ 4xx  │ No
Rate limited  │ 429      │ 429  │ Yes (backoff)
Server error  │ 500      │ 5xx  │ Yes (backoff)
```

### Retry Logic

```
1st attempt ──►  Fail ──┐
                        │
80ms delay             │
     ▼                 │
2nd attempt ──►  Fail ──┤ Max 3 attempts
                        │
500ms delay            │
     ▼                 │
3rd attempt ──►  Fail ──┤
                        │
Return error ◄┘
```

## Performance Characteristics

### Latency SLA

| Operation | Target | Actual |
|-----------|--------|--------|
| Status check | <500ms | ~200ms |
| Search Modrinth | <2s | ~800ms |
| Install plugin | <30s | ~5-15s |
| File upload | <10s | ~3-8s |

### Concurrency

- No fixed connection limit
- Event loop scales with system
- Per-process rate limiting
- Horizontal scaling recommended for >50 concurrent

### Memory

- Backend: ~80-150MB baseline
- Bot: ~120-200MB baseline
- Per request: <5MB overhead
- Total: ~300-400MB for full stack

## Monitoring & Observability

### Logs

```
Format: JSON (production) | Pretty (dev)
Levels: error, warn, info, debug
Fields: timestamp, level, module, data, error
Stream: stdout (captured by systemd/docker)
```

### Metrics

```
GET /metrics:
- Uptime
- Memory usage (heap, RSS, external)
- Request counts (future)
- Error rates (future)
```

### Health Checks

```
GET /health:
- Service status (healthy/degraded/unhealthy)
- Memory statistics
- Uptime duration
- Timestamp
```

## Future Enhancements

### Phase 2
- [ ] Database persistence (PostgreSQL)
- [ ] Redis caching layer
- [ ] Webhook notifications
- [ ] Web dashboard
- [ ] Plugin marketplace UI

### Phase 3
- [ ] Multi-server management
- [ ] Player authentication
- [ ] Advanced logging/analytics
- [ ] Machine learning insights
- [ ] Mobile app

### Phase 4
- [ ] Kubernetes deployment
- [ ] Multi-region deployments
- [ ] Advanced monitoring (Prometheus/Grafana)
- [ ] Auto-scaling
- [ ] Disaster recovery

## Technology Decisions

### Why Fastify?

- Faster than Express (benchmarks: 2-3x)
- Built-in validation & middleware
- TypeScript support
- Decorator pattern
- Plugin ecosystem
- Active maintenance

### Why Discord.js?

- Most popular Discord library  
- Strong type support (v14+)
- Excellent documentation
- Active community
- Event-driven architecture
- Slash command support

### Why TypeScript?

- Type safety & IDE support
- Compile-time error detection
- Better refactoring
- Self-documenting code
- Industry standard

### Why Monorepo?

- Code reuse (shared types)
- Single build/test pipeline
- Atomic commits across packages
- Easier onboarding
- npm workspaces native support

### Why npm Workspaces?

- No external tool needed
- Built into npm 7+
- Simple & transparent
- Works with all tooling
- Good performance

## Maintenance & Support

### Regular Tasks

- **Weekly:** Check logs for errors
- **Monthly:** Update dependencies
- **Quarterly:** Review performance metrics
- **Yearly:** Major version updates

### Troubleshooting

See DEPLOYMENT.md for common issues and solutions.

### Contributing

See CONTRIBUTING.md for development guidelines.

---

Last updated: 2024-02-06
Architecture v1.0
