#!/usr/bin/env bash
# Runs on the VPS (as root), invoked by the Jenkinsfile after the release has been
# uploaded to $APP_ROOT/releases/$RELEASE and the env file to $APP_ROOT/shared/.env.local.
#
# Idempotent: first run creates the database, nginx site and TLS certificate;
# later runs only apply new migrations, build, switch the release and restart.
set -euo pipefail

: "${RELEASE:?RELEASE is required}"
APP_ROOT="${APP_ROOT:-/var/www/project-crm}"
DOMAIN="${DOMAIN:-project-crm.glamofashion.com}"
APP_PORT="${APP_PORT:-3100}"
PM2_APP_NAME="${PM2_APP_NAME:-project-crm}"
KEEP_RELEASES="${KEEP_RELEASES:-5}"
HEALTH_PATH="${HEALTH_PATH:-/login}"

RELEASE_DIR="$APP_ROOT/releases/$RELEASE"
ENV_FILE="$APP_ROOT/shared/.env.local"
NGINX_SITE="/etc/nginx/sites-available/$PM2_APP_NAME"

log() { echo ">>> $*"; }
die() { echo "!!! $*" >&2; exit 1; }

# Reads KEY=value from the env file the same way server.js does (no shell sourcing).
env_get() { grep -E "^$1=" "$ENV_FILE" | tail -n1 | cut -d= -f2- | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//'; }

[ -d "$RELEASE_DIR" ] || die "release dir $RELEASE_DIR not found"
[ -f "$ENV_FILE" ]    || die "env file $ENV_FILE not found"
for bin in node npm pm2 nginx mysql certbot curl; do
  command -v "$bin" >/dev/null || die "$bin is not installed on the server"
done

# ---------------------------------------------------------------- database
if [ -n "$(env_get DB_NAME)" ]; then
  RELEASE_DIR="$RELEASE_DIR" ENV_FILE="$ENV_FILE" bash "$RELEASE_DIR/deploy/db-migrate.sh"
else
  log "No DB_NAME in env file, skipping database setup"
fi

# ------------------------------------------------------------------- build
log "Building release $RELEASE"
cd "$RELEASE_DIR"
ln -sfn "$ENV_FILE" .env.local
npm ci --no-audit --no-fund
NODE_OPTIONS="--max-old-space-size=2048" npm run build --if-present
npm prune --omit=dev --no-audit --no-fund

# --------------------------------------------------------- switch & restart
PREVIOUS="$(readlink -f "$APP_ROOT/current" 2>/dev/null || true)"

switch_to() {
  ln -sfn "$1" "$APP_ROOT/current.tmp" && mv -Tf "$APP_ROOT/current.tmp" "$APP_ROOT/current"
  mkdir -p /var/log/pm2
  pm2 delete "$PM2_APP_NAME" >/dev/null 2>&1 || true
  APP_ROOT="$APP_ROOT" APP_PORT="$APP_PORT" PM2_APP_NAME="$PM2_APP_NAME" \
    pm2 start "$APP_ROOT/current/ecosystem.config.js"
  pm2 save
}

healthy() {
  for _ in $(seq 1 30); do
    curl -fsS -o /dev/null "http://127.0.0.1:$APP_PORT$HEALTH_PATH" && return 0
    sleep 2
  done
  return 1
}

log "Starting $PM2_APP_NAME on port $APP_PORT"
switch_to "$RELEASE_DIR"
if ! healthy; then
  pm2 logs "$PM2_APP_NAME" --lines 50 --nostream || true
  if [ -n "$PREVIOUS" ] && [ "$PREVIOUS" != "$RELEASE_DIR" ]; then
    log "Health check failed, rolling back to $PREVIOUS"
    switch_to "$PREVIOUS"
  fi
  die "release $RELEASE failed its health check"
fi

# ------------------------------------------------------------ nginx + TLS
if [ ! -f "$NGINX_SITE" ]; then
  log "Installing nginx site for $DOMAIN"
  sed -e "s/__DOMAIN__/$DOMAIN/g" -e "s/__PORT__/$APP_PORT/g" "$RELEASE_DIR/deploy/nginx.conf" > "$NGINX_SITE"
  ln -sfn "$NGINX_SITE" "/etc/nginx/sites-enabled/$PM2_APP_NAME"
  nginx -t
  systemctl reload nginx
fi

if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
  log "Requesting TLS certificate for $DOMAIN"
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --redirect --register-unsafely-without-email
fi

# ----------------------------------------------------------------- cleanup
log "Keeping the last $KEEP_RELEASES releases"
ls -1dt "$APP_ROOT"/releases/*/ | tail -n +$((KEEP_RELEASES + 1)) | while read -r old; do
  [ "$(readlink -f "$old")" = "$(readlink -f "$APP_ROOT/current")" ] || rm -rf "$old"
done

log "Release $RELEASE is live on https://$DOMAIN"
