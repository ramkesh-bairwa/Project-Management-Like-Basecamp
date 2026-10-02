#!/usr/bin/env bash
# One-time Jenkins setup on the VPS (run as root). Safe to re-run.
#   Usage: bash install.sh /path/to/project-crm.env
# Run from the deploy/jenkins directory (needs casc.yaml, nginx.conf, plugins.txt).
set -euo pipefail

ENV_SRC="${1:?usage: install.sh /path/to/project-crm.env}"
HERE="$(cd "$(dirname "$0")" && pwd)"
DOMAIN="jenkins.glamofashion.com"
JENKINS_HOME="/var/lib/jenkins"
SECRETS="$JENKINS_HOME/casc-secrets"
PIM_VERSION="2.13.2"

log() { echo ">>> $*"; }

# ------------------------------------------------------------------ swap
# 4 GB RAM is shared by MySQL, two Node apps, Jenkins and `next build`.
if ! swapon --show | grep -q .; then
  log "Adding 2G swap"
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# --------------------------------------------------------------- packages
log "Installing Java, rsync and Jenkins"
export DEBIAN_FRONTEND=noninteractive
if [ ! -f /etc/apt/sources.list.d/jenkins.list ]; then
  curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key -o /usr/share/keyrings/jenkins-keyring.asc
  echo "deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] https://pkg.jenkins.io/debian-stable binary/" \
    > /etc/apt/sources.list.d/jenkins.list
fi
apt-get update -q
apt-get install -y -q fontconfig openjdk-21-jre-headless rsync git
systemctl stop jenkins 2>/dev/null || true
apt-get install -y -q jenkins
systemctl stop jenkins

# ---------------------------------------------------------------- secrets
log "Writing Jenkins secrets"
install -d -m 700 -o jenkins -g jenkins "$SECRETS"
if [ ! -f "$SECRETS/admin-password" ]; then
  openssl rand -base64 18 | tr -d '/+=\n' > "$SECRETS/admin-password"
fi
if [ ! -f "$SECRETS/deploy_key" ]; then
  ssh-keygen -q -t ed25519 -N '' -C "jenkins@$DOMAIN" -f "$SECRETS/deploy_key"
fi
install -d -m 700 /root/.ssh
touch /root/.ssh/authorized_keys && chmod 600 /root/.ssh/authorized_keys
grep -qF "$(cat "$SECRETS/deploy_key.pub")" /root/.ssh/authorized_keys || cat "$SECRETS/deploy_key.pub" >> /root/.ssh/authorized_keys
install -m 600 "$ENV_SRC" "$SECRETS/project-crm.env"
chown -R jenkins:jenkins "$SECRETS"
chmod 600 "$SECRETS"/*

# --------------------------------------------------------- config & plugins
install -m 644 -o jenkins -g jenkins "$HERE/casc.yaml" "$JENKINS_HOME/casc.yaml"

log "Installing plugins"
PIM_JAR="/opt/jenkins-plugin-manager-$PIM_VERSION.jar"
[ -f "$PIM_JAR" ] || curl -fsSL -o "$PIM_JAR" \
  "https://github.com/jenkinsci/plugin-installation-manager-tool/releases/download/$PIM_VERSION/jenkins-plugin-manager-$PIM_VERSION.jar"
install -d -o jenkins -g jenkins "$JENKINS_HOME/plugins"
sudo -u jenkins java -jar "$PIM_JAR" --war /usr/share/java/jenkins.war \
  --plugin-download-directory "$JENKINS_HOME/plugins" --plugin-file "$HERE/plugins.txt"

log "Configuring the Jenkins service"
install -d /etc/systemd/system/jenkins.service.d
cat > /etc/systemd/system/jenkins.service.d/override.conf <<'EOF'
[Service]
Environment="JENKINS_LISTEN_ADDRESS=127.0.0.1"
Environment="JENKINS_PORT=8080"
Environment="JAVA_OPTS=-Djava.awt.headless=true -Xmx768m -Djenkins.install.runSetupWizard=false"
Environment="CASC_JENKINS_CONFIG=/var/lib/jenkins/casc.yaml"
EOF
systemctl daemon-reload
systemctl enable jenkins
systemctl restart jenkins

log "Waiting for Jenkins"
for _ in $(seq 1 90); do
  code="$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8080/login || true)"
  [ "$code" = "200" ] && break
  sleep 2
done
[ "$code" = "200" ] || { journalctl -u jenkins -n 80 --no-pager; exit 1; }

# ----------------------------------------------------------- nginx + TLS
if [ ! -f /etc/nginx/sites-available/jenkins ]; then
  log "Installing nginx site for $DOMAIN"
  install -m 644 "$HERE/nginx.conf" /etc/nginx/sites-available/jenkins
  ln -sfn /etc/nginx/sites-available/jenkins /etc/nginx/sites-enabled/jenkins
  nginx -t && systemctl reload nginx
fi
if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --redirect --register-unsafely-without-email
fi

# ------------------------------------------------- PM2 on boot (all apps)
if ! systemctl is-enabled pm2-root >/dev/null 2>&1; then
  log "Enabling PM2 start on boot"
  pm2 startup systemd -u root --hp /root
  pm2 save
fi

log "Jenkins is up at https://$DOMAIN (user: admin)"
