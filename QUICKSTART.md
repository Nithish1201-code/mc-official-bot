# Quick Start Guide

Get MC Official Bot running in 5 minutes.

## Prerequisites

- 5+ minutes
- Ubuntu/Debian VPS or local machine
- Internet connection

## Local Development (2 minutes)

```bash
# Clone
git clone https://github.com/Nithish1201-code/mc-official-bot.git
cd mc-official-bot

# Install
npm install

# Setup environment files
cp backend/.env.example backend/.env
cp bot/.env.example bot/.env

# Edit Discord credentials in bot/.env
nano bot/.env
```

Then in two terminals:

```bash
# Terminal 1: Backend
npm run dev:backend

# Terminal 2: Bot
npm run dev:bot
```

Backend will be running at `http://localhost:3000`

## Production Deployment (3 minutes)

### Prerequisites

Get your Discord Bot Token first:
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create application → Bot section → Reset Token → Copy
3. Save this token (you'll need it during setup)

⚠️ **Security:** Never share or commit this token!

### Run Setup

```bash
# SSH into your VPS
ssh user@your-vps

# Clone repo
git clone https://github.com/Nithish1201-code/mc-official-bot.git
cd mc-official-bot

# Run automated setup
bash setup.sh
```

### What Happens During Setup

The script will:
1. ✓ Install Node.js, npm, git, curl, jq
2. ✓ Detect Crafty Controller (if present)
3. ✓ Find Minecraft server directories
4. ✓ Generate secure API key
5. ✓ **Prompt for Discord Bot Token** (with validation)
6. ✓ Ask for Discord Application ID (optional)
7. ✓ Create config files with secure permissions
8. ✓ Install and build all packages
9. ✓ Run automated tests
10. ✓ Create and enable systemd services

**Token validation:**
- Checks token is valid with Discord API
- Shows bot username if successful
- Gives 3 attempts if invalid
- Stores securely in `bot/.env` with 600 permissions

### Start Services

If setup completed successfully:

```bash
# Services are created - just start them
sudo systemctl start mc-backend.service
sudo systemctl start mc-bot.service

# Enable auto-start on boot
sudo systemctl enable mc-backend.service mc-bot.service

# Check status
systemctl status mc-backend.service
systemctl status mc-bot.service
```

If you need to add token manually:
```bash
# Edit bot/.env
nano bot/.env
# Add: DISCORD_BOT_TOKEN=your_token_here

# Then start services
sudo systemctl start mc-backend mc-bot
```

## Verify Installation

```bash
# Check backend health
curl http://localhost:3000/health

# Check API is working (replace with your API key)
curl -H "X-API-Key: your-api-key" \
  http://localhost:3000/api/status

# View logs
journalctl -u mc-backend.service -f
journalctl -u mc-bot.service -f
```

## Docker (Alternative)

```bash
# Copy env template
cp docker-compose.example.yml docker-compose.yml

# Edit configuration
nano docker-compose.yml

# Start
docker-compose up -d

# Logs
docker-compose logs -f backend
docker-compose logs -f bot
```

## Next Steps

1. **Configure Minecraft Server**
   - Set `MINECRAFT_PATH` in backend/.env
   - Point to your server directory

2. **Add to Discord Server**
   - Go to Discord Developer Portal
   - Copy OAuth2 URL with scopes: `bot`, and permissions: 18496
   - Authorize bot to your server

3. **Customize Commands**
   - Edit `bot/src/commands/index.ts`
   - Add new slash commands
   - Run `npm run dev:bot` to test

4. **Deploy to Production**
   - Follow [DEPLOYMENT.md](./DEPLOYMENT.md)
   - Set up nginx reverse proxy
   - Use Let's Encrypt SSL

## Common Commands

```bash
# View logs
journalctl -u mc-backend.service -n 50
journalctl -u mc-bot.service -n 50

# Restart services
sudo systemctl restart mc-backend.service
sudo systemctl restart mc-bot.service

# Stop services
sudo systemctl stop mc-backend.service
sudo systemctl stop mc-bot.service

# Check memory usage
systemctl show -p MemoryCurrent --value=yes $(systemctl show -p MainPID --value=yes mc-backend.service)

# Build before deploying
npm run build
```

## Troubleshooting Quick Links

- **Setup issues?** → [DEPLOYMENT.md](./DEPLOYMENT.md#troubleshooting)
- **API problems?** → [API_REFERENCE.md](./API_REFERENCE.md#error-codes)
- **Development help?** → [DEVELOPMENT.md](./DEVELOPMENT.md)
- **Architecture?** → [ARCHITECTURE.md](./ARCHITECTURE.md)

## Architecture

```
Discord ────► Bot (discord.js) ────► Backend (Fastify) ────► Minecraft
                 (ui only)             (api layer)             (server)
```

Bot calls backend API only - no direct server access. All operations proxied through REST.

## API Key

Generated during setup by `setup.sh`. Find it in:
- `config.json` (root)
- `backend/.env` → `API_KEY`
- `bot/.env` → `BACKEND_API_KEY`

Store securely. Regenerate with:
```bash
openssl rand -hex 32
```

## Documentation

- [README.md](./README.md) - Project overview
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Local development
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Production setup
- [API_REFERENCE.md](./API_REFERENCE.md) - Complete API docs
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Contributing guidelines

## Support

- 📝 Check documentation first
- 🐛 Search existing issues
- 💬 Open new issue with details
- 📧 Contact maintainer

## License

MIT License - See LICENSE file

---

Ready to go! 🚀

For detailed information, see [README.md](./README.md)
