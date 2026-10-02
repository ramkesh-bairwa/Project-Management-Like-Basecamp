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

RELEASE_DIR="$APP_ROOT/releases/$RELEASE"
ENV_FILE="$APP_ROOT/shared/.env.local"
NGINX_SITE="/etc/nginx/sites-available/project-crm"

log() { echo ">>> $*"; }
die() { echo "!!! $*" >&2; exit 1; }

# Reads KEY=value from the env file the same way server.js does (no shell sourcing).
env_get() { grep -E "^$1=" "$ENV_FILE" | tail -n1 | cut -d= -f2- | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//'; }
sql_str() { printf "%s" "$1" | sed -e 's/\\/\\\\/g' -e "s/'/''/g"; }

[ -d "$RELEASE_DIR" ] || die "release dir $RELEASE_DIR not found"
[ -f "$ENV_FILE" ]    || die "env file $ENV_FILE not found"
for bin in node npm pm2 nginx mysql certbot curl; do
  command -v "$bin" >/dev/null || die "$bin is not installed on the server"
done

# ---------------------------------------------------------------- database
DB_NAME="$(env_get DB_NAME)"; DB_USER="$(env_get DB_USER)"; DB_PASSWORD="$(env_get DB_PASSWORD)"
[ -n "$DB_NAME" ] && [ -n "$DB_USER" ] && [ -n "$DB_PASSWORD" ] || die "DB_NAME, DB_USER and DB_PASSWORD must be set in the env file"
[ "$DB_USER" != "root" ] || die "DB_USER must not be root"
[[ "$DB_NAME" =~ ^[A-Za-z0-9_]+$ && "$DB_USER" =~ ^[A-Za-z0-9_]+$ ]] || die "DB_NAME/DB_USER may only contain letters, digits and _"
[ "$(env_get DB_HOST)" = "127.0.0.1" ] || die "DB_HOST must be 127.0.0.1 in the production env file"

log "Ensuring database $DB_NAME and user $DB_USER"
PW_SQL="$(sql_str "$DB_PASSWORD")"
mysql <<SQL
CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'127.0.0.1' IDENTIFIED BY '$PW_SQL';
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$PW_SQL';
ALTER USER '$DB_USER'@'127.0.0.1' IDENTIFIED BY '$PW_SQL';
ALTER USER '$DB_USER'@'localhost' IDENTIFIED BY '$PW_SQL';
GRANT ALL PRIVILEGES ON \`$DB_NAME\`.* TO '$DB_USER'@'127.0.0.1';
GRANT ALL PRIVILEGES ON \`$DB_NAME\`.* TO '$DB_USER'@'localhost';
SQL

# The SQL files hard-code `USE project_management`, and use MariaDB-only
# `ADD COLUMN IF NOT EXISTS`; strip both so they run against $DB_NAME on MySQL.
prepare_sql() {
  sed -E -e '/^[[:space:]]*(USE|CREATE DATABASE)[[:space:]]/Id' \
         -e 's/ADD COLUMN IF NOT EXISTS/ADD COLUMN/Ig' "$RELEASE_DIR/$1"
}

TABLE_COUNT="$(mysql -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DB_NAME'")"
FRESH_DB=false; [ "$TABLE_COUNT" = "0" ] && FRESH_DB=true
mysql "$DB_NAME" -e "CREATE TABLE IF NOT EXISTS _deploy_migrations (name VARCHAR(255) PRIMARY KEY, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)"

while IFS= read -r file; do
  file="${file%%#*}"; file="$(echo "$file" | xargs)"
  [ -n "$file" ] || continue
  [ -f "$RELEASE_DIR/$file" ] || die "migration $file listed but not found"
  done_already="$(mysql -N "$DB_NAME" -e "SELECT COUNT(*) FROM _deploy_migrations WHERE name='$(sql_str "$file")'")"
  [ "$done_already" = "0" ] || continue

  if $FRESH_DB; then
    log "Bootstrap: applying $file (errors are skipped)"
    prepare_sql "$file" | mysql --force "$DB_NAME" || true
  else
    log "Applying new migration $file"
    prepare_sql "$file" | mysql "$DB_NAME"
  fi
  mysql "$DB_NAME" -e "INSERT INTO _deploy_migrations (name) VALUES ('$(sql_str "$file")')"
done < "$RELEASE_DIR/deploy/migrations.list"

# ------------------------------------------------------------------- build
log "Building release $RELEASE"
cd "$RELEASE_DIR"
ln -sfn "$ENV_FILE" .env.local
npm ci --no-audit --no-fund
NODE_OPTIONS="--max-old-space-size=2048" npm run build
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
    curl -fsS -o /dev/null "http://127.0.0.1:$APP_PORT/login" && return 0
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
  ln -sfn "$NGINX_SITE" /etc/nginx/sites-enabled/project-crm
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
