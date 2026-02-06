# Security Guide

Comprehensive security guidelines for the MC Official Bot infrastructure.

## 🔐 Critical Security Rules

### 1. Never Commit Secrets to Git

**What to protect:**
- Discord Bot Token
- API Keys
- `.env` files
- `config.json` with sensitive data

**Why:** Anyone with repository access can see commit history, including leaked secrets.

**Protection:**
```bash
# Verify .gitignore includes:
.env
.env.*
!.env.example
config.json
backend/.env
bot/.env
```

### 2. Discord Token Security

#### Getting Your Token
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. Navigate to **Bot** section
4. Click **Reset Token** (first time) or **Copy**

#### Token Storage
✅ **DO:**
- Store in `bot/.env` with file permissions `600`
- Use environment variables
- Load with dotenv at runtime
- Keep in secure system directories (`/etc/mc-control/.env`)

❌ **DON'T:**
- Hardcode in source files
- Commit to GitHub
- Share publicly (Discord, Slack, etc.)
- Store in plaintext logs

#### Token Format
```
DISCORD_BOT_TOKEN=REDACTED_TOKEN_EXAMPLE
```
- Starts with bot user ID (base64)
- Always starts with `MTI...` or similar
- Contains dots separating segments

#### If Token Leaks

**Immediate actions:**
1. Go to Discord Developer Portal
2. Reset token immediately
3. Update `bot/.env` with new token
4. Restart bot service:
   ```bash
   sudo systemctl restart mc-bot.service
   ```
5. Check for unauthorized activity in Discord servers

**What attackers can do with your token:**
- Control your bot completely
- Send messages to any server
- Read messages in channels bot can access
- Spam users/servers
- Get your bot banned

### 3. API Key Security

The backend API key protects server management endpoints.

#### Generation
Generated during setup using:
```bash
openssl rand -hex 32  # Produces 64 character hex string
```

#### Storage
- Backend: `backend/.env` (`API_KEY=...`)
- Bot: `bot/.env` (`BACKEND_API_KEY=...`)
- Permissions: `chmod 600 *.env`

#### Usage
```typescript
// Backend validates on every request
headers: {
  'X-API-Key': process.env.API_KEY
}
```

#### Rotation
```bash
# Generate new key
NEW_KEY=$(openssl rand -hex 32)

# Update backend/.env
echo "API_KEY=$NEW_KEY" >> backend/.env

# Update bot/.env
echo "BACKEND_API_KEY=$NEW_KEY" >> bot/.env

# Restart services
sudo systemctl restart mc-backend mc-bot
```

### 4. File Permissions

**Critical files must be 600 (rw-------)**

```bash
# Set during setup
chmod 600 backend/.env
chmod 600 bot/.env
chmod 600 config.json

# Verify
ls -la | grep -E '\.(env|json)$'
# Should show: -rw------- (600)
```

**Why 600?**
- Owner can read/write
- Group cannot access
- Others cannot access
- Prevents other users/services from reading secrets

### 5. Environment Variable Validation

The bot validates required variables on startup:

```typescript
// bot/src/config.ts
if (!config.botToken) {
  throw new Error("DISCORD_BOT_TOKEN not set");
}
if (!config.backendApiKey) {
  throw new Error("BACKEND_API_KEY not set");
}
```

**Fails fast** if misconfigured - prevents running with partial config.

## 🛡️ Setup Script Security

### Automatic Validation

The `setup.sh` script validates tokens before storing:

```bash
validate_discord_token() {
  # Calls Discord API to verify token works
  curl -H "Authorization: Bot $token" \
    https://discord.com/api/v10/users/@me
  
  # Returns bot username if valid
  # Returns 401 if invalid
}
```

**Benefits:**
- Catch typos immediately
- Confirm token is active
- Prevent invalid configuration
- Professional installer UX

### Secure Prompting

Token input uses `read -sp` (silent prompt):
```bash
read -sp "Enter Discord Bot Token: " token
# Input is hidden (no echo to terminal)
# Prevents shoulder-surfing attacks
```

### Multi-Attempt Validation

```bash
max_attempts=3
while [ $attempts -lt $max_attempts ]; do
  # Prompt for token
  # Validate with Discord API
  # Break if valid
done
```

Gives users 3 chances to enter correctly.

## 🚨 Common Mistakes

### 1. Committing .env Files

**Mistake:**
```bash
git add .
git commit -m "Add config"
# Accidentally includes .env with secrets!
```

**Fix:**
```bash
# Remove from staging
git reset HEAD .env

# Remove from history if already committed
git filter-branch --index-filter \
  'git rm --cached --ignore-unmatch .env' HEAD
```

**Prevention:**
- Always check `git status` before commit
- Use `.gitignore` properly
- Set up pre-commit hooks

### 2. Sharing Logs with Tokens

**Mistake:**
```bash
# Log files might contain tokens
cat bot/logs/debug.log | curl -F 'file=@-' pastebin.com
```

**Fix:**
```bash
# Sanitize logs before sharing
cat bot/logs/debug.log | sed 's/DISCORD_BOT_TOKEN=.*/DISCORD_BOT_TOKEN=[REDACTED]/' 
```

### 3. Using Same Token in Multiple Bots

**Why it's bad:**
- One bot's code leak compromises all
- Can't revoke without affecting all bots
- Makes incident response difficult

**Best practice:**
- One token per bot instance
- Separate dev/staging/production tokens

### 4. Weak File Permissions

**Mistake:**
```bash
chmod 777 .env  # Everyone can read!
```

**Fix:**
```bash
chmod 600 .env  # Only owner can read
```

### 5. Environment Variables in Process Listings

**Concern:**
```bash
# Some process tools show env vars
ps auxe | grep node
# Could expose DISCORD_BOT_TOKEN=...
```

**Mitigation:**
- Load from file instead of passing via command line
- Use dotenv (file-based) not `-e` flags
- Restrict who can view processes

## 🔍 Security Checklist

Before deployment:

- [ ] `.gitignore` includes `.env`, `config.json`
- [ ] `.env` files have 600 permissions
- [ ] Discord token validated during setup
- [ ] API key uses strong randomness (32+ bytes)
- [ ] No secrets in source code
- [ ] Config validation on startup
- [ ] Logs don't contain tokens
- [ ] systemd services run as non-root user
- [ ] Rate limiting enabled on backend
- [ ] CORS configured properly
- [ ] Helmet security headers enabled

## 🔧 Security Features in This Project

### Backend Security

**Authentication:**
```typescript
// API key middleware on every protected route
const apiKeyAuth = fastify.register(fastifyAuth, {
  defaultRelation: 'and'
});
```

**Rate Limiting:**
```typescript
fastify.register(rateLimit, {
  max: 100,           // 100 requests
  timeWindow: 60000   // per minute
});
```

**Input Validation:**
```typescript
// Zod schemas validate all inputs
const ServerControlSchema = z.object({
  action: z.enum(['start', 'stop', 'restart']),
  delay: z.number().min(0).max(300).optional()
});
```

**Path Sanitization:**
```typescript
// Prevent directory traversal
function sanitizePath(path: string): string {
  return path.replace(/\.\./g, '').replace(/\/\//g, '/');
}
```

**File Upload Validation:**
```typescript
// Only accept .jar files, size limits
if (!file.filename.endsWith('.jar')) {
  throw new ValidationError('Only .jar files allowed');
}
if (file.size > 50 * 1024 * 1024) {  // 50MB limit
  throw new ValidationError('File too large');
}
```

### Bot Security

**Command Permissions:**
```typescript
// Only server administrators can restart
if (!interaction.memberPermissions?.has('Administrator')) {
  return interaction.reply('Admin only');
}
```

**Input Sanitization:**
```typescript
// Sanitize user inputs before API calls
const query = interaction.options.getString('query')
  .trim()
  .substring(0, 100);
```

**Error Handling:**
```typescript
// Never expose internal details in errors
catch (error) {
  logger.error(error);
  return interaction.reply('An error occurred');
  // Don't send error.message to user
}
```

## 🚀 Production Security Hardening

### System Level

**1. Run as Non-Root User:**
```bash
# systemd services already configured
User=$(whoami)
# Never run as root
```

**2. Firewall Configuration:**
```bash
# Only expose necessary ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 3000/tcp  # Backend API (internal)
sudo ufw deny 25565/tcp  # Minecraft port (if exposed)
sudo ufw enable
```

**3. Fail2Ban:**
```bash
# Protect against brute force
sudo apt install fail2ban
sudo systemctl enable fail2ban
```

**4. Automatic Updates:**
```bash
# Keep system patched
sudo apt install unattended-upgrades
sudo dpkg-reconfigure unattended-upgrades
```

### Application Level

**1. Dependency Scanning:**
```bash
# Check for vulnerabilities
npm audit
npm audit fix
```

**2. Secrets Rotation:**
```bash
# Rotate every 90 days
0 0 1 */3 * /usr/local/bin/rotate-secrets.sh
```

**3. Monitoring:**
```bash
# Watch for unauthorized access
journalctl -u mc-backend -f | grep -E '401|403'
```

**4. Backups:**
```bash
# Backup configs (without secrets)
tar -czf backup.tar.gz \
  --exclude='*.env' \
  --exclude='config.json' \
  backend bot shared
```

## 📚 Additional Resources

- [Discord Bot Security Best Practices](https://discord.com/developers/docs/topics/security)
- [OWASP Security Cheat Sheet](https://cheatsheetseries.owasp.org/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Fastify Security Headers](https://github.com/fastify/fastify-helmet)

## 📞 Reporting Security Issues

If you discover a security vulnerability:

1. **Do NOT** open a public GitHub issue
2. Email: [your-security-email@example.com]
3. Include:
   - Description of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if known)

We'll respond within 48 hours and work on a fix.

---

**Remember:** Security is not a one-time setup - it's an ongoing process. Stay vigilant!
