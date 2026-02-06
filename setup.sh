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
    create_env_files() {
      local api_key="$1"
      local discord_token="$2"
      local discord_app_id="$3"
      local minecraft_path="$4"
      local crafty_path="$5"
      local crafty_api_url="$6"
      local crafty_api_token="$7"
      local crafty_server_id="$8"
      local crafty_allow_insecure="$9"
      local server_loader="${10}"
      local minecraft_version="${11}"

      discord_token=$(echo "$discord_token" | tr -d '[:space:]')
      crafty_api_token=$(echo "$crafty_api_token" | tr -d '[:space:]')
      discord_app_id=$(echo "$discord_app_id" | tr -d '[:space:]')

      log_info "Creating environment file..."

      rm -f .env
      {
        printf 'NODE_ENV=production\n'
        printf 'PORT=3000\n'
        printf 'API_KEY=%s\n' "$api_key"
        printf 'LOG_LEVEL=info\n'
        printf 'LOG_FORMAT=json\n'
        printf 'MINECRAFT_PATH=%s\n' "$minecraft_path"
        printf 'CRAFTY_PATH=%s\n' "$crafty_path"
        printf 'CRAFTY_API_URL=%s\n' "$crafty_api_url"
        printf 'CRAFTY_API_TOKEN=%s\n' "$crafty_api_token"
        printf 'CRAFTY_SERVER_ID=%s\n' "$crafty_server_id"
        printf 'CRAFTY_ALLOW_INSECURE=%s\n' "$crafty_allow_insecure"
        printf 'SERVER_LOADER=%s\n' "$server_loader"
        printf 'MINECRAFT_VERSION=%s\n' "$minecraft_version"
        printf 'DISCORD_BOT_TOKEN=%s\n' "$discord_token"
        printf 'DISCORD_APPLICATION_ID=%s\n' "$discord_app_id"
        printf 'BACKEND_URL=http://localhost:3000\n'
        printf 'BACKEND_API_KEY=%s\n' "$api_key"
        printf 'BOT_ADMIN_ROLE_IDS=\n'
        printf 'BOT_ALERT_CHANNEL_ID=\n'
        printf 'BOT_STATUS_POLL_SECONDS=60\n'
        printf 'BOT_AUTO_RESTART_ON_DOWN=false\n'
      } > .env

      chmod 600 .env
      log_success "Environment file created with secure permissions (600)"

      if [ -z "$discord_token" ]; then
        log_warn "No Discord token provided - update .env manually before starting"
      else
        log_success "Discord token configured"
      fi
    }

    validate_env_files() {
      local has_error=0

      if [ ! -f .env ]; then
        log_error "Missing environment file (.env)"
        return 1
      fi

      if grep -qE "\[(INFO|SUCCESS|WARN|ERROR)\]" .env; then
        log_error "Environment file contains log output; please re-run setup"
        return 1
      fi

      if ! grep -q "^API_KEY=\S" .env; then
        log_error ".env missing API_KEY"
        has_error=1
      fi

      if ! grep -q "^BACKEND_API_KEY=\S" .env; then
        log_error ".env missing BACKEND_API_KEY"
        has_error=1
      fi

      if ! grep -q "^DISCORD_BOT_TOKEN=\S" .env; then
        log_error ".env missing DISCORD_BOT_TOKEN"
        has_error=1
      fi

      if ! grep -q "^DISCORD_BOT_TOKEN=[^[:space:]]\+$" .env; then
        log_error ".env has invalid DISCORD_BOT_TOKEN format"
        has_error=1
      fi

      if grep -q "^CRAFTY_API_TOKEN=\S" .env && ! grep -q "^CRAFTY_API_TOKEN=[^[:space:]]\+$" .env; then
        log_error ".env has invalid CRAFTY_API_TOKEN format"
        has_error=1
      fi

      if grep -q "^CRAFTY_API_URL=\S" .env && ! grep -q "^CRAFTY_API_TOKEN=\S" .env; then
        log_error ".env missing CRAFTY_API_TOKEN"
        has_error=1
      fi

      if grep -q "^CRAFTY_API_TOKEN=\S" .env && ! grep -q "^CRAFTY_SERVER_ID=\S" .env; then
        log_error ".env missing CRAFTY_SERVER_ID"
        has_error=1
      fi

      if [ $has_error -ne 0 ]; then
        return 1
      fi

      log_success "Environment file validated"
      return 0
    }
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

prompt_crafty_api_url() {
  local default_url="https://localhost:8443"
  read -p "Enter Crafty API URL (default: $default_url): " crafty_api_url
  if [ -z "$crafty_api_url" ]; then
    crafty_api_url="$default_url"
  fi
  echo "$crafty_api_url"
}

prompt_crafty_api_token() {
  local token=""
  while true; do
    read -p "Enter Crafty API token: " token
    token=$(echo "$token" | tr -d '[:space:]')
    if [ -n "$token" ]; then
      echo "$token"
      return 0
    fi
    log_error "Crafty API token cannot be empty"
  done
}

prompt_crafty_insecure() {
  local response=""
  read -p "Allow self-signed Crafty TLS? (Y/n): " response
  if [ -z "$response" ] || [[ "$response" =~ ^[Yy]$ ]]; then
    echo "true"
  else
    echo "false"
  fi
}

prompt_server_loader() {
  local default_loader="paper"
  read -p "Server loader (paper/spigot/bukkit/fabric/vanilla) [${default_loader}]: " loader
  if [ -z "$loader" ]; then
    loader="$default_loader"
  fi
  echo "$loader"
}

prompt_minecraft_version() {
  read -p "Minecraft version (optional, e.g. 1.21.1): " mc_version
  echo "$mc_version"
}

list_crafty_servers() {
  local api_url="$1"
  local token="$2"
  local allow_insecure="$3"

  if [ -z "$api_url" ] || [ -z "$token" ]; then
    return 1
  fi

  local curl_flags=("-s")
  if [ "$allow_insecure" = "true" ]; then
    curl_flags+=("-k")
  fi

  local response
  response=$(curl "${curl_flags[@]}" \
    -H "Authorization: Bearer $token" \
    "$api_url/api/v2/servers")

  if ! echo "$response" | jq -e 'type == "array"' > /dev/null 2>&1; then
    log_warn "Crafty API server list returned unexpected response"
    return 1
  fi

  echo "$response" | jq -r '.[] | "\(.server_id)\t\(.server_name)\t\(.path)"'
}

select_crafty_server() {
  local api_url="$1"
  local token="$2"
  local allow_insecure="$3"

  local entries
  entries=$(list_crafty_servers "$api_url" "$token" "$allow_insecure")
  if [ -z "$entries" ]; then
    return 1
  fi

  local server_ids=()
  local server_names=()
  local server_paths=()

  while IFS=$'\t' read -r server_id server_name server_path; do
    [ -z "$server_id" ] && continue
    server_ids+=("$server_id")
    server_names+=("$server_name")
    server_paths+=("$server_path")
  done <<< "$entries"

  if [ ${#server_ids[@]} -eq 0 ]; then
    return 1
  fi

  if [ ${#server_ids[@]} -eq 1 ]; then
    echo "${server_ids[0]}|${server_paths[0]}"
    return 0
  fi

  log_info "Crafty API returned ${#server_ids[@]} servers:"
  for i in "${!server_ids[@]}"; do
    printf "  [%d] %s (%s)\n" "$((i + 1))" "${server_names[$i]}" "${server_paths[$i]}" >&2
  done

  local selection=""
  while true; do
    read -p "Select the server to manage (1-${#server_ids[@]}): " selection
    if [[ "$selection" =~ ^[0-9]+$ ]] && [ "$selection" -ge 1 ] && [ "$selection" -le ${#server_ids[@]} ]; then
      local index=$((selection - 1))
      echo "${server_ids[$index]}|${server_paths[$index]}"
      return 0
    fi
    log_warn "Invalid selection. Enter a number between 1 and ${#server_ids[@]}"
  done
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
  local minecraft_path="$4"
  local crafty_path="$5"
  local api_key="$1"
  local discord_token="$2"
  local discord_app_id="$3"
  local minecraft_path="$4"
  local crafty_path="$5"
  local crafty_api_url="$6"
  local crafty_api_token="$7"
  local crafty_server_id="$8"
  local crafty_allow_insecure="$9"
  local server_loader="${10}"
  local minecraft_version="${11}"

  discord_token=$(echo "$discord_token" | tr -d '[:space:]')
  crafty_api_token=$(echo "$crafty_api_token" | tr -d '[:space:]')
  discord_app_id=$(echo "$discord_app_id" | tr -d '[:space:]')
  local crafty_allow_insecure="$9"
  local server_loader="${10}"
  local minecraft_version="${11}"

  rm -f .env
  crafty_api_token=$(echo "$crafty_api_token" | tr -d '[:space:]')
  {
    printf 'NODE_ENV=production\n'
    printf 'PORT=3000\n'
    printf 'API_KEY=%s\n' "$api_key"
    printf 'LOG_LEVEL=info\n'
    printf 'MINECRAFT_PATH=%s\n' "$minecraft_path"
    printf 'CRAFTY_PATH=%s\n' "$crafty_path"
    printf 'CRAFTY_API_URL=%s\n' "$crafty_api_url"
    printf 'CRAFTY_API_TOKEN=%s\n' "$crafty_api_token"
    printf 'CRAFTY_SERVER_ID=%s\n' "$crafty_server_id"
    printf 'CRAFTY_ALLOW_INSECURE=%s\n' "$crafty_allow_insecure"
    printf 'SERVER_LOADER=%s\n' "$server_loader"
    printf 'MINECRAFT_VERSION=%s\n' "$minecraft_version"
    printf 'DISCORD_BOT_TOKEN=%s\n' "$discord_token"
    printf 'DISCORD_APPLICATION_ID=%s\n' "$discord_app_id"
    printf 'BACKEND_URL=http://localhost:3000\n'
    printf 'BACKEND_API_KEY=%s\n' "$api_key"
    printf 'BOT_ADMIN_ROLE_IDS=\n'
    printf 'BOT_ALERT_CHANNEL_ID=\n'
    printf 'BOT_STATUS_POLL_SECONDS=60\n'
    printf 'BOT_AUTO_RESTART_ON_DOWN=false\n'
  } > .env
  
  chmod 600 .env
  # Overwrite env files to avoid stale or corrupted content
  if [ -z "$discord_token" ]; then
    log_warn "No Discord token provided - update .env manually before starting"
  # Backend environment
  {
    printf 'NODE_ENV=production\n'
    printf 'PORT=3000\n'
    printf 'API_KEY=%s\n' "$api_key"
    printf 'LOG_LEVEL=info\n'
  if [ ! -f .env ]; then
    log_error "Missing environment file (.env)"
    printf 'CRAFTY_API_URL=%s\n' "$crafty_api_url"
    printf 'CRAFTY_API_TOKEN=%s\n' "$crafty_api_token"
    printf 'CRAFTY_SERVER_ID=%s\n' "$crafty_server_id"
  if grep -qE "\[(INFO|SUCCESS|WARN|ERROR)\]" .env; then
    printf 'SERVER_LOADER=%s\n' "$server_loader"
    printf 'MINECRAFT_VERSION=%s\n' "$minecraft_version"
  } > backend/.env
  
  if ! grep -q "^API_KEY=\S" .env; then
    log_error ".env missing API_KEY"
    printf 'NODE_ENV=production\n'
    printf 'DISCORD_BOT_TOKEN=%s\n' "$discord_token"
    printf 'DISCORD_APPLICATION_ID=%s\n' "$discord_app_id"
  if ! grep -q "^BACKEND_API_KEY=\S" .env; then
    log_error ".env missing BACKEND_API_KEY"
    printf 'LOG_LEVEL=info\n'
    printf 'BOT_ADMIN_ROLE_IDS=\n'
    printf 'BOT_ALERT_CHANNEL_ID=\n'
  if ! grep -q "^DISCORD_BOT_TOKEN=\S" .env; then
    log_error ".env missing DISCORD_BOT_TOKEN"
  } > bot/.env
  
  # Set secure permissions
  if ! grep -q "^DISCORD_BOT_TOKEN=[^[:space:]]\+$" .env; then
    log_error ".env has invalid DISCORD_BOT_TOKEN format"
  
  log_success "Environment files created with secure permissions (600)"
  
  if grep -q "^CRAFTY_API_TOKEN=\S" .env && ! grep -q "^CRAFTY_API_TOKEN=[^[:space:]]\+$" .env; then
    log_error ".env has invalid CRAFTY_API_TOKEN format"
  else
    log_success "Discord token configured"
  fi
  if grep -q "^CRAFTY_API_URL=\S" .env && ! grep -q "^CRAFTY_API_TOKEN=\S" .env; then
    log_error ".env missing CRAFTY_API_TOKEN"
validate_env_files() {
  local has_error=0

  if grep -q "^CRAFTY_API_TOKEN=\S" .env && ! grep -q "^CRAFTY_SERVER_ID=\S" .env; then
    log_error ".env missing CRAFTY_SERVER_ID"
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

  if grep -q "^CRAFTY_API_TOKEN=\S" backend/.env && ! grep -q "^CRAFTY_API_URL=\S" backend/.env; then
    log_error "backend/.env missing CRAFTY_API_URL"
    has_error=1
  fi

  if ! grep -q "^DISCORD_BOT_TOKEN=\S" bot/.env; then
    log_error "bot/.env missing DISCORD_BOT_TOKEN"
    has_error=1
  fi

  if ! grep -q "^DISCORD_BOT_TOKEN=[^[:space:]]\+$" bot/.env; then
    log_error "bot/.env has invalid DISCORD_BOT_TOKEN format"
    has_error=1
  fi

  if grep -q "^CRAFTY_API_TOKEN=\S" backend/.env && ! grep -q "^CRAFTY_API_TOKEN=[^[:space:]]\+$" backend/.env; then
    log_error "backend/.env has invalid CRAFTY_API_TOKEN format"
    has_error=1
  fi

  if grep -q "^CRAFTY_API_URL=\S" backend/.env && ! grep -q "^CRAFTY_API_TOKEN=\S" backend/.env; then
    log_error "backend/.env missing CRAFTY_API_TOKEN"
    has_error=1
  fi

  if grep -q "^CRAFTY_API_TOKEN=\S" backend/.env && ! grep -q "^CRAFTY_SERVER_ID=\S" backend/.env; then
    log_error "backend/.env missing CRAFTY_SERVER_ID"
    has_error=1
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
    read -p "Enter Discord Bot Token: " token
    
    token=$(echo "$token" | tr -d '[:space:]')

    if [ -z "$token" ]; then
      log_error "Token cannot be empty"
      attempts=$((attempts + 1))
      continue
    fi

    if echo "$token" | grep -q '[[:space:]]'; then
      log_error "Token cannot contain whitespace"
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
  app_id=$(echo "$app_id" | tr -d '[:space:]')
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
EnvironmentFile=$(pwd)/.env
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

  if [ -f .env ]; then
    set -a
    . ./.env
    set +a
  fi
  
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
  crafty_api_url=$(prompt_crafty_api_url)
  crafty_api_token=$(prompt_crafty_api_token)
  crafty_allow_insecure=$(prompt_crafty_insecure)
  server_loader=$(prompt_server_loader)
  minecraft_version=$(prompt_minecraft_version)

  if [ -z "$crafty_api_token" ]; then
    crafty_api_url=""
    crafty_allow_insecure="false"
    crafty_server_id=""
  fi
  echo
  
  # 3. Detect Minecraft servers
  log_info "Step 3: Minecraft Detection"
  minecraft_path="${crafty_path:-$HOME/minecraft}"
  crafty_server_id=""
  if [ -n "$crafty_api_token" ] && [ -n "$crafty_api_url" ]; then
    selected_server=$(select_crafty_server "$crafty_api_url" "$crafty_api_token" "$crafty_allow_insecure") || true
    if [ -n "$selected_server" ]; then
      crafty_server_id=$(echo "$selected_server" | cut -d'|' -f1)
      minecraft_path=$(echo "$selected_server" | cut -d'|' -f2)
    fi
  fi

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
  create_env_files \
    "$api_key" \
    "$discord_token" \
    "$discord_app_id" \
    "$minecraft_path" \
    "$crafty_path" \
    "$crafty_api_url" \
    "$crafty_api_token" \
    "$crafty_server_id" \
    "$crafty_allow_insecure" \
    "$server_loader" \
    "$minecraft_version"
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
    echo "   systemctl start mc-backend.service"
    echo "   systemctl start mc-bot.service"
    echo
    echo "2. Enable auto-start on boot:"
    echo "   systemctl enable mc-backend.service"
    echo "   systemctl enable mc-bot.service"
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
    echo "   systemctl start mc-backend.service"
    echo "   systemctl start mc-bot.service"
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
