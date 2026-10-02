#!/usr/bin/env bash
# Called by remote-deploy.sh when the env file sets DB_NAME. Creates the MySQL
# database and user, then applies the SQL files in deploy/migrations.list that
# haven't run yet (tracked in the _deploy_migrations table).
set -euo pipefail

: "${RELEASE_DIR:?}" "${ENV_FILE:?}"

log() { echo ">>> $*"; }
die() { echo "!!! $*" >&2; exit 1; }
env_get() { grep -E "^$1=" "$ENV_FILE" | tail -n1 | cut -d= -f2- | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//'; }
sql_str() { printf "%s" "$1" | sed -e 's/\\/\\\\/g' -e "s/'/''/g"; }

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

MIGRATIONS_LIST="$RELEASE_DIR/deploy/migrations.list"
[ -f "$MIGRATIONS_LIST" ] || { log "No deploy/migrations.list, skipping migrations"; exit 0; }

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
done < "$MIGRATIONS_LIST"
