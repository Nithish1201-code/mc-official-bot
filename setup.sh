#!/bin/bash

# MC Official Bot - Complete Setup Script
# Autonomous infrastructure setup for Minecraft server management

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1" >&2
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1" >&2
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1" >&2
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1" >&2
}

# ============================================================================
# DEPENDENCY DETECTION & INSTALLATION
# ============================================================================

check_command() {
  if command -v "$1" &> /dev/null; then
    return 0
  else
    return 1
  fi
}

install_nodejs() {
  log_info "Installing Node.js..."
  
  if check_command curl; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - || {
      log_warn "NodeSource failed, using distribution package"
    }
  fi
  
  sudo apt-get update
  sudo apt-get install -y nodejs npm
  
  log_success "Node.js and npm installed"
}

install_dependencies() {
  log_info "Checking system dependencies..."
  
  local missing=()
  
  if ! check_command node; then
    missing+=("nodejs")
  fi
  
  if ! check_command npm; then
    missing+=("npm")
  fi
  
  if ! check_command git; then
    missing+=("git")
  fi
  
  if ! check_command curl; then
    missing+=("curl")
  fi
  
  if ! check_command jq; then
    missing+=("jq")
  fi
  
  if [ ${#missing[@]} -gt 0 ]; then
    log_warn "Missing dependencies: ${missing[*]}"
    
    sudo apt-get update
    
    for dep in "${missing[@]}"; do
      case "$dep" in
        nodejs)
          install_nodejs
          ;;
        npm)
          sudo apt-get install -y npm
          ;;
        *)
          sudo apt-get install -y "$dep"
          ;;
      esac
    done
  fi
  
  log_success "All dependencies satisfied"
}

# ============================================================================
# CRAFTY DETECTION
# ============================================================================

detect_crafty() {
  log_info "Detecting Crafty Controller installation..."
  
  local search_paths=(
    "/opt/crafty"
    "/home/crafty"
    "/root/crafty"
    "$HOME/crafty"
  )
  
  for path in "${search_paths[@]}"; do
    if [ -d "$path" ]; then
      log_success "Found Crafty at: $path"
      echo "$path"
      return 0
    fi
  done
  
  log_warn "Crafty not found in standard locations"
  
  # Prompt user for custom path
  read -p "Enter Crafty installation path (or press Enter to skip): " crafty_path
  
  if [ -n "$crafty_path" ] && [ -d "$crafty_path" ]; then
    log_success "Using Crafty at: $crafty_path"
    echo "$crafty_path"
    return 0
  else
    log_warn "Crafty not configured - some features will be unavailable"
    echo ""
    return 1
  fi
}

# ============================================================================
# MINECRAFT SERVER DETECTION
# ============================================================================

detect_minecraft_servers() {
  log_info "Detecting Minecraft server directories..."
  
  local base_path="${1:-.}"
  local server_dirs=()
  local server_names=()
  
  while IFS= read -r -d '' properties_file; do
    local server_dir
    local server_name
    server_dir=$(dirname "$properties_file")
    server_name=$(grep -m1 '^motd=' "$properties_file" 2>/dev/null | cut -d= -f2-)
    if [ -z "$server_name" ]; then
      server_name=$(grep -m1 '^level-name=' "$properties_file" 2>/dev/null | cut -d= -f2-)
    fi
    if [ -z "$server_name" ]; then
      server_name=$(basename "$server_dir")
    fi

    server_dirs+=("$server_dir")
    server_names+=("$server_name")
  done < <(find "$base_path" -name "server.properties" -type f -print0 2>/dev/null \
    | head -20)
  
  if [ ${#server_dirs[@]} -eq 0 ]; then
    log_warn "No Minecraft servers found"
    return 1
  fi

  if [ ${#server_dirs[@]} -eq 1 ]; then
    log_success "Found server: ${server_dirs[0]}"
    echo "${server_dirs[0]}"
    return 0
  fi

  log_info "Found ${#server_dirs[@]} server directories:"
  for i in "${!server_dirs[@]}"; do
    printf "  [%d] %s (%s)\n" "$((i + 1))" "${server_names[$i]}" "${server_dirs[$i]}" >&2
  done

  local selection=""
  while true; do
    read -p "Select the server to manage (1-${#server_dirs[@]}): " selection
    if [[ "$selection" =~ ^[0-9]+$ ]] && [ "$selection" -ge 1 ] && [ "$selection" -le ${#server_dirs[@]} ]; then
      local index=$((selection - 1))
      log_success "Selected server: ${server_names[$index]}"
      echo "${server_dirs[$index]}"
      return 0
    fi
    log_warn "Invalid selection. Enter a number between 1 and ${#server_dirs[@]}"
  done
  
  return 0
}

# ============================================================================
# API KEY GENERATION
# ============================================================================

generate_api_key() {
  log_info "Generating API key..."
  
  if check_command openssl; then
    local api_key=$(openssl rand -hex 32)
  else
    # Fallback to /dev/urandom
    local api_key=$(head -c 32 /dev/urandom | xxd -p -c 32)
  fi
  
  log_success "API Key generated"
  echo "$api_key"
}

# ============================================================================
# DISCORD TOKEN HANDLING
# ============================================================================

validate_discord_token() {
  local token="$1"
  
  log_info "Validating Discord token..."
  
  if ! check_command curl; then
    log_warn "curl not available - skipping token validation"
    return 0
  fi
  
  local response=$(curl -s -w "\n%{http_code}" -H "Authorization: Bot $token" \
    https://discord.com/api/v10/users/@me 2>/dev/null)
  
  local http_code=$(echo "$response" | tail -n1)
  local body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" = "200" ]; then
    local bot_name=$(echo "$body" | grep -o '"username":"[^"]*"' | cut -d'"' -f4)
    log_success "Token valid! Bot: $bot_name"
    return 0
  elif [ "$http_code" = "401" ]; then
    log_error "Invalid Discord token (401 Unauthorized)"
    return 1
  else
    log_warn "Could not validate token (HTTP $http_code)"
    return 0
  fi
}

create_env_files() {
  local api_key="$1"
  local discord_token="$2"
  local discord_app_id="$3"
  
  log_info "Creating environment files..."
  
  # Overwrite env files to avoid stale or corrupted content
  rm -f backend/.env bot/.env

  # Backend environment
  cat > backend/.env << EOF
NODE_ENV=production
PORT=3000
API_KEY=$api_key
LOG_LEVEL=info
EOF
  
  # Bot environment with Discord credentials
  cat > bot/.env << EOF
NODE_ENV=production
DISCORD_BOT_TOKEN=$discord_token
DISCORD_APPLICATION_ID=$discord_app_id
BACKEND_URL=http://localhost:3000
BACKEND_API_KEY=$api_key
LOG_LEVEL=info
EOF
  
  # Set secure permissions
  chmod 600 backend/.env
  chmod 600 bot/.env
  
  log_success "Environment files created with secure permissions (600)"
  
  if [ -z "$discord_token" ]; then
    log_warn "No Discord token provided - update bot/.env manually before starting"
  else
    log_success "Discord token configured"
  fi
}

validate_env_files() {
  local has_error=0

  if [ ! -f backend/.env ] || [ ! -f bot/.env ]; then
    log_error "Missing environment files (backend/.env or bot/.env)"
    return 1
  fi

  if grep -qE "\[(INFO|SUCCESS|WARN|ERROR)\]" backend/.env bot/.env; then
    log_error "Environment files contain log output; please re-run setup"
    return 1
  fi

  if ! grep -q "^API_KEY=\S" backend/.env; then
    log_error "backend/.env missing API_KEY"
    has_error=1
  fi

  if ! grep -q "^BACKEND_API_KEY=\S" bot/.env; then
    log_error "bot/.env missing BACKEND_API_KEY"
    has_error=1
  fi

  if ! grep -q "^DISCORD_BOT_TOKEN=\S" bot/.env; then
    log_warn "bot/.env missing DISCORD_BOT_TOKEN"
  fi

  if [ $has_error -ne 0 ]; then
    return 1
  fi

  log_success "Environment files validated"
  return 0
}

prompt_discord_token() {
  local token=""
  local valid=false
  local attempts=0
  local max_attempts=3
  
  while [ "$valid" = false ] && [ $attempts -lt $max_attempts ]; do
    read -sp "Enter Discord Bot Token: " token
    echo
    
    if [ -z "$token" ]; then
      log_error "Token cannot be empty"
      attempts=$((attempts + 1))
      continue
    fi
    
    if validate_discord_token "$token"; then
      valid=true
    else
      attempts=$((attempts + 1))
      if [ $attempts -lt $max_attempts ]; then
        log_warn "Please try again ($attempts/$max_attempts)"
      fi
    fi
  done
  
  if [ "$valid" = false ]; then
    log_error "Failed to validate token after $max_attempts attempts"
    log_warn "You can manually add the token to bot/.env later"
    echo ""
    return 1
  fi
  
  echo "$token"
  return 0
}

prompt_discord_app_id() {
  echo
  read -p "Enter Discord Application ID (optional, press Enter to skip): " app_id
  echo "$app_id"
}

# ============================================================================
# CONFIGURATION
# ============================================================================

create_config() {
  local api_key="$1"
  local minecraft_path="$2"
  local crafty_path="$3"
  
  log_info "Creating configuration file..."
  
  cat > config.json << EOF
{
  "apiKey": "$api_key",
  "port": 3000,
  "minecraftPath": "$minecraft_path",
  "craftyPath": "$crafty_path",
  "environment": "production",
  "logging": {
    "level": "info",
    "format": "json"
  }
}
EOF
  
  log_success "Configuration created"
}

create_env_files() {
  local api_key="$1"
  local discord_token="$2"
  local discord_app_id="$3"
  
  log_info "Creating environment files..."
  
  # Backend environment
  cat > backend/.env << EOF
NODE_ENV=production
PORT=3000
API_KEY=$api_key
LOG_LEVEL=info
EOF
  
  # Bot environment with Discord credentials
  cat > bot/.env << EOF
NODE_ENV=production
DISCORD_BOT_TOKEN=$discord_token
DISCORD_APPLICATION_ID=$discord_app_id
BACKEND_URL=http://localhost:3000
BACKEND_API_KEY=$api_key
LOG_LEVEL=info
EOF
  
  # Set secure permissions
  chmod 600 backend/.env
  chmod 600 bot/.env
  
  log_success "Environment files created with secure permissions (600)"
  
  if [ -z "$discord_token" ]; then
    log_warn "No Discord token provided - update bot/.env manually before starting"
  else
    log_success "Discord token configured"
  fi
}

# ============================================================================
# SYSTEM SERVICE INSTALLATION
# ============================================================================

create_systemd_service() {
  local service_name="$1"
  local description="$2"
  local working_dir="$3"
  local start_cmd="$4"
  
  log_info "Creating systemd service: $service_name"
  
  sudo tee "/etc/systemd/system/$service_name.service" > /dev/null << EOF
[Unit]
Description=$description
After=network.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=$working_dir
ExecStart=$start_cmd
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
  
  sudo systemctl daemon-reload
  log_success "Service $service_name created"
}

enable_and_start_services() {
  if ! check_command systemctl; then
    log_warn "systemctl not available - skipping service enable/start"
    return 0
  fi

  log_info "Enabling and starting systemd services..."
  systemctl enable mc-backend.service mc-bot.service
  systemctl start mc-backend.service mc-bot.service
  log_success "Services enabled and started"
}

# ============================================================================
# INSTALLATION
# ============================================================================

install_shared() {
  log_info "Installing shared dependencies..."
  
  cd shared
  npm install
  npm run build
  cd ..
  
  log_success "Shared package installed"
}

install_backend() {
  log_info "Installing backend dependencies..."
  
  cd backend
  npm install
  npm run build
  cd ..
  
  log_success "Backend installed"
}

install_bot() {
  log_info "Installing bot dependencies..."
  
  cd bot
  npm install
  npm run build
  cd ..
  
  log_success "Bot installed"
}

# ============================================================================
# TESTING
# ============================================================================

run_tests() {
  log_info "Running automated tests..."
  local test_failed=0
  echo ""
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║  Test Suite Execution                                      ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
  
  log_info "Testing backend API..."
  cd backend
  if npm test 2>&1 | tee /tmp/backend-test.log; then
    log_success "✓ Backend API tests passed"
  else
    log_error "✗ Backend API tests failed"
    test_failed=1
  fi
  cd ..
  echo ""
  
  log_info "Testing Discord bot..."
  cd bot
  if npm test 2>&1 | tee /tmp/bot-test.log; then
    log_success "✓ Bot tests passed"
  else
    log_error "✗ Bot tests failed"
    test_failed=1
  fi
  cd ..
  echo ""
  
  if [ $test_failed -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  All Tests Passed! ✓                                       ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
  else
    echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║  Some Tests Failed - Check logs above                      ║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    log_warn "Test failures detected but continuing installation"
    log_warn "Review test logs: /tmp/*-test.log"
  fi
}

# ============================================================================
# MAIN SETUP FLOW
# ============================================================================

main() {
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║  MC Official Bot - Minecraft Server Management Setup       ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
  echo
  
  # 1. Check & install dependencies
  log_info "Step 1: Dependency Check"
  install_dependencies
  echo
  
  # 2. Detect Crafty
  log_info "Step 2: Crafty Detection"
  crafty_path=$(detect_crafty) || crafty_path=""
  echo
  
  # 3. Detect Minecraft servers
  log_info "Step 3: Minecraft Detection"
  minecraft_path="${crafty_path:-$HOME/minecraft}"
  if [ -d "$minecraft_path" ]; then
    selected_server=$(detect_minecraft_servers "$minecraft_path") || true
    if [ -n "$selected_server" ]; then
      minecraft_path="$selected_server"
    fi
  fi
  echo
  
  # 4. Generate API key
  log_info "Step 4: API Key Generation"
  api_key=$(generate_api_key)
  log_success "API Key: $api_key"
  log_warn "Store this key securely - you'll need it for the bot"
  echo
  
  # 5. Discord Setup
  log_info "Step 5: Discord Configuration"
  discord_token=$(prompt_discord_token) || discord_token=""
  discord_app_id=$(prompt_discord_app_id)
  echo
  
  # 6. Create configuration
  log_info "Step 6: Configuration"
  create_config "$api_key" "$minecraft_path" "$crafty_path"
  create_env_files "$api_key" "$discord_token" "$discord_app_id"
  validate_env_files
  echo
  
  # 7. Install dependencies
  log_info "Step 7: Installation"
  install_shared
  install_backend
  install_bot
  echo
  
  # 8. Run automated tests
  log_info "Step 8: Testing"
  run_tests
  echo ""
  
  # 9. Create systemd services
  log_info "Step 9: System Services"  
  create_systemd_service "mc-backend" \
    "MC Bot Backend Service" \
    "$(pwd)/backend" \
    "node dist/index.js"
    
  create_systemd_service "mc-bot" \
    "MC Bot Discord Service" \
    "$(pwd)/bot" \
    "node dist/index.js"
  echo

  enable_and_start_services
  echo
  
  # Summary
  echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║  Setup Complete!                                           ║${NC}"
  echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
  echo
  
  if [ -n "$discord_token" ]; then
    echo -e "${GREEN}✓${NC} Discord bot configured and ready"
    echo
    echo "Next steps:"
    echo "1. Start services:"
    echo "   sudo systemctl start mc-backend.service"
    echo "   sudo systemctl start mc-bot.service"
    echo
    echo "2. Enable auto-start on boot:"
    echo "   sudo systemctl enable mc-backend.service"
    echo "   sudo systemctl enable mc-bot.service"
    echo
    echo "3. Check status:"
    echo "   systemctl status mc-backend.service"
    echo "   systemctl status mc-bot.service"
    echo
    echo "4. View logs:"
    echo "   journalctl -u mc-backend.service -f"
    echo "   journalctl -u mc-bot.service -f"
  else
    echo -e "${YELLOW}⚠${NC}  Discord token not configured"
    echo
    echo "Next steps:"
    echo "1. Add Discord token to bot/.env:"
    echo "   DISCORD_BOT_TOKEN=your_token_here"
    echo
    echo "2. Start services:"
    echo "   sudo systemctl start mc-backend.service"
    echo "   sudo systemctl start mc-bot.service"
    echo
    echo "3. Check status:"
    echo "   systemctl status mc-backend.service"
    echo "   systemctl status mc-bot.service"
  fi
  
  echo
  echo -e "${RED}🔐 SECURITY REMINDERS:${NC}"
  echo "  • Never commit .env files to GitHub"
  echo "  • Never share your Discord token or API key"
  echo "  • Rotate tokens immediately if exposed"
  echo "  • Review SECURITY.md for best practices"
  echo
}

main
