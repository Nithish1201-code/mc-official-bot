# MC Official Bot - Minecraft Server Management Infrastructure

Production-grade, self-hosted infrastructure for managing Minecraft servers via Discord.

## Features

- **Autonomous Setup**: Run `setup.sh` and get a fully configured system
- **Secure Token Handling**: Discord token validation during setup with secure storage
- **Zero Manual Config**: Auto-detection of Crafty, server directories, dependencies
- **Discord UI**: Slash commands, rich embeds, pagination, buttons
- **Interactive Plugin Browser**: Browse Modrinth with dropdown selection & one-click install
- **Automated Testing**: Tests run during setup with results displayed in terminal
- **Plugin Management**: Search, install, upload plugins via Modrinth API
- **Server Control**: Restart, status, player monitoring
- **Production Ready**: Systemd services, logging, error handling, retries

## Quick Start

```bash
git clone https://github.com/Nithish1201-code/mc-official-bot.git
cd mc-official-bot
bash setup.sh
```

**During setup, you'll be prompted for:**
- Discord Bot Token (validated automatically)
- Discord Application ID (optional)

**Security:** Tokens are validated and stored securely with `600` permissions. See [SECURITY.md](SECURITY.md) for guidelines.

---

## Architecture

```
mc-official-bot/
├── backend/          # Node.js + Fastify REST/WebSocket API
├── bot/              # Discord.js bot client
├── shared/           # TypeScript types and interfaces
├── installer/        # Bootstrap scripts and detection logic
├── systemd/          # Service unit templates
└── setup.sh          # Main installation orchestrator
```

## Documentation

- [QUICKSTART.md](QUICKSTART.md) - 5-minute setup guide
- [SECURITY.md](SECURITY.md) - **Security best practices**
- [TESTING.md](TESTING.md) - Running and writing tests
- Backend API: [backend/README.md](backend/README.md)
- Bot: [bot/README.md](bot/README.md)
- Deployment: [installer/README.md](installer/README.md)

## Requirements

- Ubuntu/Debian Linux
- Node.js 20+
- npm 10+
- curl, git, jq
- Crafty Controller (auto-detected)

## Development

```bash
npm install

# Run both backend and bot in dev mode
npm run dev

# Or run individually
npm run dev:backend
npm run dev:bot
```

## Production Deployment

```bash
bash setup.sh
systemctl status mc-backend.service
systemctl status mc-bot.service
```

## Security

🔐 **Critical security features:**
- Discord token validation during setup
- API key authentication
- Rate limiting (100/minute)
- Path sanitization
- Upload validation (.jar only, 50MB limit)
- File permissions (600 on .env files)
- Structured logging

**See [SECURITY.md](SECURITY.md) for comprehensive guidelines.**

⚠️ **Never commit:**
- `.env` files
- `config.json`
- Discord tokens
- API keys

## License

MIT
