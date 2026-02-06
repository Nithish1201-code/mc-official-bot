# Discord Bot

UI layer for Minecraft server management. Communicates with backend API only.

## Features

- Slash commands for server control
- Plugin search and installation
- Real-time status monitoring
- Rich embeds and interactions
- Pagination for results
- Button-based controls

## Starting the Bot

```bash
npm install
npm run dev        # Development
npm run build      # Build TypeScript
npm start          # Production
```

## Environment Variables

```env
DISCORD_BOT_TOKEN=<bot-token>
DISCORD_PUBLIC_KEY=<public-key>
DISCORD_APPLICATION_ID=<application-id>
BACKEND_URL=http://localhost:3000
BACKEND_API_KEY=<same-as-backend>
NODE_ENV=production
```

## Commands

### Server Management
- `/status` - Check server status
- `/restart [delay]` - Restart server with optional delay

### Plugin Management - Interactive Browser

#### `/plugins browse [query] [category]`
**Interactive plugin browser with:**
- 🔍 Search Modrinth catalog
- 📄 Pagination (5 plugins per page)
- 📋 Dropdown selection menu
- 🔘 Navigation buttons (Previous/Next/Refresh)
- 📦 Detailed plugin view with icon
- ⚡ One-click installation
- 📊 Live download/follower counts
- 🎯 Category filtering

**Features:**
- Browse through 25+ plugins per search
- Select any plugin to view full details
- Click "Install Plugin" button to add to server
- Navigate pages with Previous/Next buttons
- Refresh search results anytime
- Auto-expires after 5 minutes

#### `/plugins list`
List all currently installed plugins with status indicators

#### `/plugins install <project_id>`
Direct installation by Modrinth project ID

### Example Usage

```
/plugins browse query:economy category:economy
→ Shows economy plugins with interactive UI
→ Select plugin from dropdown
→ View details with install button
→ Click to install directly

/plugins list
→ Shows all installed plugins
→ Green/red indicators for enabled/disabled

/plugins install project_id:essentialsx
→ Directly installs EssentialsX plugin
```

## Architecture

Bot communicates ONLY with backend API:
- No filesystem access
- No direct server interaction
- All operations proxied through API
- Stateless design for scalability

## Development

First start the backend:
```bash
npm run dev:backend
```

Then in a new terminal:
```bash
npm run dev:bot
```
