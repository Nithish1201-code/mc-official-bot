# Setup Script

Autonomous bootstrapping for the entire Minecraft management infrastructure.

## What It Does

```bash
bash setup.sh
```

The script handles:

1. **Dependency Detection** - Checks for Node.js, npm, git, curl, jq
   - Auto-installs missing packages via apt
   - Handles different distributions

2. **Crafty Detection** - Searches common paths
   - `/opt/crafty` (standard location)
   - `/home/crafty`
   - `/root/crafty`
   - Falls back to user input

3. **Minecraft Server Discovery** - Finds `server.properties` files
   - Validates server directories
   - Lists available servers

4. **Configuration**
   - Generates secure API key
   - Creates `.env` files
   - Outputs `config.json`

5. **Installation**
   - Runs `npm install` for all workspaces
   - Builds TypeScript
   - Installs dependencies

6. **System Services**
   - Creates systemd unit files
   - Registers with `systemctl`
   - Enables auto-boot

## Environment Variables

Set before running:

```bash
# Optional
MINECRAFT_PATH=/path/to/server
CRAFTY_PATH=/opt/crafty
NODE_ENV=production
LOG_LEVEL=info
```

## Post-Setup

After `setup.sh` completes:

1. Update `bot/.env`:
```env
DISCORD_BOT_TOKEN=<your-token>
DISCORD_APPLICATION_ID=<your-id>
DISCORD_PUBLIC_KEY=<your-public-key>
```

2. Start services:
```bash
sudo systemctl start mc-backend.service
sudo systemctl start mc-bot.service
```

3. Enable automatic start:
```bash
sudo systemctl enable mc-backend.service mc-bot.service
```

4. Monitor:
```bash
journalctl -u mc-backend.service -f
journalctl -u mc-bot.service -f
```
