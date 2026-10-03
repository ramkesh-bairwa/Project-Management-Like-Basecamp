#!/usr/bin/env bash
# Sets up another Node project to deploy to the VPS the same way project-crm does.
# Run on your Mac, from this repo:
#
#   deploy/new-project.sh --dir ~/code/xyz --name xyz --domain xyz.glamofashion.com --port 3300 \
#       --repo https://github.com/<you>/xyz.git --env-file ~/code/xyz/.env.production
#
# It always writes the deploy files into --dir. With JENKINS_USER and JENKINS_TOKEN set
# it also creates the Jenkins env-file credential and the pipeline job.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
SRC="$(cd "$HERE/.." && pwd)"
JENKINS_URL="${JENKINS_URL:-https://jenkins.glamofashion.com}"
DIR="" NAME="" DOMAIN="" PORT="" REPO="" ENV_FILE="" HEALTH="/" BRANCH="main" GIT_CRED=""

usage() { sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'; echo; echo "Options: --health /path (default /)  --branch main  --git-credential <id> (private repos)"; exit 1; }
while [ $# -gt 0 ]; do
  case "$1" in
    --dir) DIR="$2"; shift 2 ;;
    --name) NAME="$2"; shift 2 ;;
    --domain) DOMAIN="$2"; shift 2 ;;
    --port) PORT="$2"; shift 2 ;;
    --repo) REPO="$2"; shift 2 ;;
    --env-file) ENV_FILE="$2"; shift 2 ;;
    --health) HEALTH="$2"; shift 2 ;;
    --branch) BRANCH="$2"; shift 2 ;;
    --git-credential) GIT_CRED="$2"; shift 2 ;;
    -h|--help) usage ;;
    *) echo "Unknown option $1"; usage ;;
  esac
done
[ -n "$DIR" ] && [ -n "$NAME" ] && [ -n "$DOMAIN" ] && [ -n "$PORT" ] || usage
[[ "$NAME" =~ ^[a-z0-9-]+$ ]] || { echo "--name may only contain a-z, 0-9 and -"; exit 1; }
[[ "$PORT" =~ ^[0-9]+$ ]] || { echo "--port must be a number"; exit 1; }
case "$PORT" in 3000|3005|3100|3200|3306|8080) echo "Port $PORT is already used on the VPS. Pick another (3300, 3400, ...)."; exit 1 ;; esac
[ -f "$DIR/package.json" ] || { echo "$DIR/package.json not found: --dir must be the project's repo"; exit 1; }

echo ">>> Writing deploy files into $DIR"
mkdir -p "$DIR/deploy"
cp "$SRC/deploy/remote-deploy.sh" "$SRC/deploy/db-migrate.sh" "$SRC/deploy/nginx.conf" "$DIR/deploy/"
chmod +x "$DIR/deploy/remote-deploy.sh" "$DIR/deploy/db-migrate.sh"

sed -e "s#^        APP_ROOT      = .*#        APP_ROOT      = '/var/www/$NAME'#" \
    -e "s#^        DOMAIN        = .*#        DOMAIN        = '$DOMAIN'#" \
    -e "s#^        APP_PORT      = .*#        APP_PORT      = '$PORT'#" \
    -e "s#^        PM2_APP_NAME  = .*#        PM2_APP_NAME  = '$NAME'#" \
    -e "s#^        HEALTH_PATH   = .*#        HEALTH_PATH   = '$HEALTH'#" \
    -e "s#^        ENV_CREDENTIAL_ID = .*#        ENV_CREDENTIAL_ID = '$NAME-env'#" \
    -e "s#^// Deploys this app to the Hostinger VPS at .*#// Deploys $NAME to the Hostinger VPS at https://$DOMAIN#" \
    -e "s#project-crm-env  - \"Secret file\", the production .env.local (see deploy/README.md)#$NAME-env - \"Secret file\", the production .env#" \
    -e "s#this repo, branch main#this repo, branch $BRANCH#" \
    "$SRC/Jenkinsfile" > "$DIR/Jenkinsfile"

cat > "$DIR/ecosystem.config.js" <<EOF
// PM2 config used by deploy/remote-deploy.sh. \`current\` is a symlink to the
// active release in /var/www/$NAME/releases/<build>.
const APP_ROOT = process.env.APP_ROOT || '/var/www/$NAME';

module.exports = {
  apps: [
    {
      name: process.env.PM2_APP_NAME || '$NAME',
      // Runs the project's "start" script; it must listen on process.env.PORT.
      script: 'npm',
      args: 'start',
      cwd: \`\${APP_ROOT}/current\`,
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.APP_PORT || $PORT,
      },
      max_memory_restart: '1G',
      error_file: '/var/log/pm2/$NAME-error.log',
      out_file: '/var/log/pm2/$NAME-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      restart_delay: 3000,
      autorestart: true,
    },
  ],
};
EOF

if ! grep -q '"start"' "$DIR/package.json"; then
  echo "!!! package.json has no \"start\" script. Add one (e.g. \"start\": \"next start\" or \"node index.js\")."
fi

if [ -n "${JENKINS_USER:-}" ] && [ -n "${JENKINS_TOKEN:-}" ]; then
  [ -n "$REPO" ] || { echo "--repo is required to create the Jenkins job"; exit 1; }
  AUTH="$JENKINS_USER:$JENKINS_TOKEN"

  if [ -n "$ENV_FILE" ]; then
    [ -f "$ENV_FILE" ] || { echo "env file $ENV_FILE not found"; exit 1; }
    echo ">>> Creating Jenkins credential $NAME-env"
    code=$(curl -s -o /dev/null -w '%{http_code}' -u "$AUTH" -X POST \
      -F "secret=@$ENV_FILE" \
      -F "json={\"\": \"4\", \"credentials\": {\"file\": \"secret\", \"id\": \"$NAME-env\", \"description\": \"Production env for $NAME\", \"stapler-class\": \"org.jenkinsci.plugins.plaincredentials.impl.FileCredentialsImpl\", \"\$class\": \"org.jenkinsci.plugins.plaincredentials.impl.FileCredentialsImpl\"}}" \
      "$JENKINS_URL/credentials/store/system/domain/_/createCredentials")
    case "$code" in 200|302) echo "    created" ;; *) echo "!!! credential create returned HTTP $code (it may already exist)";; esac
  else
    echo "!!! No --env-file: add a Secret file credential with ID $NAME-env in Jenkins before the first build."
  fi

  echo ">>> Creating Jenkins job $NAME"
  CRED_XML=""; [ -n "$GIT_CRED" ] && CRED_XML="<credentialsId>$GIT_CRED</credentialsId>"
  sed -e "s#__NAME__#$NAME#g" -e "s#__DOMAIN__#$DOMAIN#g" -e "s#__REPO__#$REPO#g" -e "s#__BRANCH__#$BRANCH#g" \
      -e "s#__CREDENTIALS__#$CRED_XML#" "$HERE/jenkins/job.xml.tpl" \
    | curl -s -o /dev/null -w '    HTTP %{http_code}\n' -u "$AUTH" -X POST -H 'Content-Type: application/xml' \
        --data-binary @- "$JENKINS_URL/createItem?name=$NAME"
  echo "    $JENKINS_URL/job/$NAME/"
else
  echo ">>> Skipped Jenkins (set JENKINS_USER and JENKINS_TOKEN to create the credential and job automatically)"
fi

cat <<EOF

Next:
  1. DNS: hPanel -> Domains -> DNS: A record '${DOMAIN%%.*}' -> 187.126.117.103   (check: dig +short $DOMAIN)
  2. cd $DIR && git add Jenkinsfile ecosystem.config.js deploy && git commit -m "Add VPS deploy" && git push
  3. Jenkins builds within 5 minutes (or click Build Now): $JENKINS_URL/job/$NAME/
  4. Check: curl -I https://$DOMAIN$HEALTH
EOF
