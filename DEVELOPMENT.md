# Local Development Setup

Quick start guide for developing MC Bot locally.

## Prerequisites

- Node.js 20+
- npm 10+
- Git
- VS Code (recommended)

## Installation

```bash
# Clone the repository
git clone https://github.com/Nithish1201-code/mc-official-bot.git
cd mc-official-bot

# Install all dependencies
npm install

# Create environment files
cp backend/.env.example backend/.env
cp bot/.env.example bot/.env
```

## Configure Environment

### Backend (`backend/.env`)

```env
NODE_ENV=development
PORT=3000
API_KEY=dev-key-12345678901234567890123456789012
LOG_LEVEL=debug
MINECRAFT_PATH=/path/to/minecraft
```

### Bot (`bot/.env`)

Get credentials from [Discord Developer Portal](https://discord.com/developers/applications):

```env
NODE_ENV=development
DISCORD_BOT_TOKEN=YOUR_BOT_TOKEN_HERE
DISCORD_APPLICATION_ID=YOUR_APP_ID_HERE
DISCORD_PUBLIC_KEY=YOUR_PUBLIC_KEY_HERE
BACKEND_URL=http://localhost:3000
BACKEND_API_KEY=dev-key-12345678901234567890123456789012
LOG_LEVEL=debug
```

## Development Workflow

### Terminal 1: Backend

```bash
npm run dev:backend
```

Watches and rebuilds TypeScript on changes. Starts server on `http://localhost:3000`

### Terminal 2: Bot

```bash
npm run dev:bot
```

Watches and rebuilds bot on changes.

### Terminal 3: Optional - Shared Types

```bash
cd shared
npm run dev
```

Watches shared type definitions.

## Testing the API

### Health Check

```bash
curl http://localhost:3000/health
```

### Server Status

```bash
curl -H "X-API-Key: dev-key-12345678901234567890123456789012" \
  http://localhost:3000/api/status
```

### Search Modrinth

```bash
curl -H "X-API-Key: dev-key-12345678901234567890123456789012" \
  "http://localhost:3000/api/modrinth/search?q=fabric"
```

## Project Structure

```
mc-official-bot/
├── backend/          # Fastify REST API
│   ├── src/
│   │   ├── server.ts
│   │   ├── config.ts
│   │   ├── routes/
│   │   └── utils/
│   ├── package.json
│   └── tsconfig.json
│
├── bot/              # Discord.js bot
│   ├── src/
│   │   ├── index.ts
│   │   ├── client.ts
│   │   ├── config.ts
│   │   ├── commands/
│   │   ├── events/
│   │   └── utils/
│   ├── package.json
│   └── tsconfig.json
│
├── shared/           # Shared types & interfaces
│   ├── src/
│   │   ├── types.ts
│   │   ├── api.ts
│   │   └── errors.ts
│   ├── package.json
│   └── tsconfig.json
│
└── setup.sh          # Installation script
```

## Building

```bash
# Build all packages
npm run build

# Build specific package
npm run build --workspace=backend
npm run build --workspace=bot
```

## Linting & Testing

```bash
# Lint backend
cd backend && npm run lint

# Lint bot
cd bot && npm run lint

# Run tests
npm test
```

## VS Code Extensions

Recommended:

- ES7+ React/Redux/React-Native snippets
- Prettier - Code formatter
- ESLint
- TypeScript Vue Plugin
- Thunder Client (for API testing)

## Debugging

### Backend Debug

Add to `backend/.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Backend",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev:backend"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

Press `F5` to debug.

### Bot Debug

Similar setup for bot - create `.vscode/launch.json` and use `npm run dev:bot`

## Common Issues

### Port 3000 already in use

```bash
# Find process using port
lsof -i :3000

# Kill it
kill -9 <PID>

# Or use different port
PORT=3001 npm run dev:backend
```

### Module not found errors

```bash
# Ensure dependencies installed
npm install

# Rebuild shared types
npm run build --workspace=shared
```

### Environment variables not loading

Check that `.env` files exist in `backend/` and `bot/` directories:

```bash
ls -la backend/.env bot/.env
```

## Git Workflow

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes, commit
git add .
git commit -m "feat: description"

# Push to origin
git push origin feature/my-feature

# Create pull request on GitHub
```

Commit message format:
- `feat:` New feature
- `fix:` Bug fix
- `refactor:` Code restructure
- `docs:` Documentation
- `test:` Tests
- `chore:` Dependencies/config

## Performance Profiling

```bash
# Generate CPU profile
node --prof backend/dist/index.js

# Process profile
node --prof-process isolate-*.log > profile.txt
```

## Next Steps

- Review [Backend API documentation](./backend/README.md)
- Review [Bot documentation](./bot/README.md)
- Check [Deployment guide](./DEPLOYMENT.md) for production setup
