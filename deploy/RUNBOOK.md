# VPS runbook

Everything running on the Hostinger VPS, the commands to look after it, and the steps
to put a new project on a new subdomain or domain with Jenkins deploys.

- **Server:** `187.126.117.103` (Hostinger VPS `srv2027162`, Ubuntu 26.04, 1 CPU, 4 GB RAM + 2 GB swap)
- **Log in:** `ssh root@187.126.117.103`
- **DNS for glamofashion.com:** hPanel → Domains → glamofashion.com → DNS / Nameservers

All commands below run on the server unless they start with `ssh` (run those on your Mac).

---

## 1. What's on the server

| Site | What it is | Runs as | Port | Code / files | nginx site |
|---|---|---|---|---|---|
| https://project-crm.glamofashion.com | This app (Next.js) | PM2 `project-crm` | 3100 | `/var/www/project-crm/current` | `project-crm` |
| https://jenkins.glamofashion.com | Jenkins (deploys) | systemd `jenkins` | 8080 | `/var/lib/jenkins` | `jenkins` |
| https://score.glamofashion.com | CricScore API | systemd `cricscore` | 3200 | `/opt/cricscore` | `cricscore` |
| https://db.glamofashion.com | phpMyAdmin | nginx + `php8.5-fpm` | – | `/var/www/phpmyadmin` | `cricscore-db` |
| https://gsm-samiti.glamofashion.com | **Nothing running yet** (returns 502) | – | 3005 | – | `gsm-samiti` |
| (not public) | team-score-api | PM2 `team-score-api` | 3000 | – | – |

Shared services: **MySQL 8.4** (`127.0.0.1:3306`), **nginx**, **certbot** (renews certificates automatically).

**Ports in use:** 3000, 3005, 3100, 3200, 3306, 8080. Use **3300, 3400, …** for new apps.
Check what's free: `ss -ltnp | grep LISTEN`

`glamofashion.com` itself (`@`) points to a different server (`69.62.85.121`), not this VPS.

---

## 2. Commands per site

### project-crm (PM2)
```bash
pm2 ls                                   # status of all PM2 apps
pm2 logs project-crm --lines 100         # recent logs (Ctrl+C to stop)
pm2 restart project-crm                  # restart
ls -l /var/www/project-crm/current       # which release is live
cat /var/www/project-crm/shared/.env.local   # production env (secrets!)
```
**Roll back** to an earlier release:
```bash
ls -1t /var/www/project-crm/releases                       # newest first
ln -sfn /var/www/project-crm/releases/<NUMBER> /var/www/project-crm/current
pm2 restart project-crm
```

### Jenkins (systemd)
```bash
systemctl status jenkins
journalctl -u jenkins -n 100 --no-pager          # logs
systemctl restart jenkins
cat /var/lib/jenkins/casc-secrets/admin-password  # admin login password
```
Login: user `admin` at https://jenkins.glamofashion.com.
Config is code: `/var/lib/jenkins/casc.yaml` (from `deploy/jenkins/casc.yaml`); it's re-applied on every restart.

### CricScore (systemd)
```bash
systemctl status cricscore
journalctl -u cricscore -n 100 --no-pager
systemctl restart cricscore
```

### phpMyAdmin
```bash
cut -d: -f1 /etc/nginx/.htpasswd-cricscore-db                # browser pop-up usernames
htpasswd /etc/nginx/.htpasswd-cricscore-db <user>            # change pop-up password (apt install apache2-utils if missing)
systemctl restart php8.5-fpm
```
MySQL login for the phpMyAdmin page: see **§3 MySQL**.

---

## 3. General server commands

### nginx
```bash
ls /etc/nginx/sites-enabled            # active sites
nginx -t                               # test config — always run before reload
systemctl reload nginx                 # apply config changes
tail -f /var/log/nginx/error.log
```

### HTTPS certificates
```bash
certbot certificates                   # list certificates and expiry dates
certbot renew --dry-run                # test automatic renewal
certbot --nginx -d xyz.glamofashion.com --redirect   # add HTTPS to a site
certbot delete --cert-name xyz.glamofashion.com      # remove one
```

### MySQL
```bash
mysql                                  # root shell (works only on the server)
mysql -e "SHOW DATABASES"
mysql -e "SELECT user, host FROM mysql.user"
```
Create a database and user for an app:
```bash
mysql <<'SQL'
CREATE DATABASE xyz CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'xyz'@'localhost' IDENTIFIED BY 'LONG_RANDOM_PASSWORD';
CREATE USER 'xyz'@'127.0.0.1' IDENTIFIED BY 'LONG_RANDOM_PASSWORD';
GRANT ALL PRIVILEGES ON xyz.* TO 'xyz'@'localhost';
GRANT ALL PRIVILEGES ON xyz.* TO 'xyz'@'127.0.0.1';
SQL
```
Change a password: `mysql -e "ALTER USER 'xyz'@'localhost' IDENTIFIED BY 'NEW_PASSWORD'"`

Back up and restore:
```bash
mysqldump --single-transaction xyz > /root/backup/xyz-$(date +%F).sql
mysql xyz < /root/backup/xyz-2026-10-02.sql
```

### Health of the box
```bash
free -h                  # memory and swap
df -h /                  # disk
top                      # CPU (q to quit)
ss -ltnp | grep LISTEN   # ports in use
```

---

## 4. Deploy a new project on a subdomain (with Jenkins)

Example: a Node/Next.js project at **xyz.glamofashion.com** on port **3300**.
Replace `xyz` and `3300` everywhere below.

### Step 1 — DNS
hPanel → Domains → glamofashion.com → DNS / Nameservers → **Add record**:

| Type | Name | Points to | TTL |
|---|---|---|---|
| A | `xyz` | `187.126.117.103` | 300 |

Check it (on your Mac) — should print the IP:
```bash
dig +short xyz.glamofashion.com
```

### Step 2 — Copy the deploy files into the new project's repo
From this repo, copy:

| File | Change in it |
|---|---|
| `Jenkinsfile` | the `environment` block (see below) |
| `ecosystem.config.js` | `script:` — how the app starts (see below) |
| `deploy/remote-deploy.sh` | nothing |
| `deploy/db-migrate.sh` | nothing (only used if the env file sets `DB_NAME`) |
| `deploy/nginx.conf` | nothing (`client_max_body_size` if uploads are big) |
| `deploy/migrations.list` | list the project's own `.sql` files, or leave it out |

`Jenkinsfile` → `environment` block:
```groovy
APP_ROOT          = '/var/www/xyz'
DOMAIN            = 'xyz.glamofashion.com'
APP_PORT          = '3300'
PM2_APP_NAME      = 'xyz'
HEALTH_PATH       = '/'              // a page that returns 200 without login
ENV_CREDENTIAL_ID = 'xyz-env'
```
`ecosystem.config.js` → set `name` default to `'xyz'`, `APP_ROOT` default to `'/var/www/xyz'`,
log file names to `xyz-*.log`, and `script` to how the app starts:

| App type | `script` | `args` |
|---|---|---|
| Custom server (like this repo) | `'server.js'` | – |
| Plain Next.js | `'node_modules/next/dist/bin/next'` | `'start'` |
| Express / Node | `'index.js'` (your entry file) | – |

The app must listen on `process.env.PORT` (`next start` does this already).
`npm run build` runs if the project has a `build` script.

Commit and push these files to the project's `main` branch.

### Step 3 — Jenkins credentials (once per project)
https://jenkins.glamofashion.com → **Manage Jenkins → Credentials → System → Global credentials → Add Credentials**:

1. **Kind:** Secret file · **File:** the project's production `.env` · **ID:** `xyz-env`
   - Use `DB_HOST=127.0.0.1` and a non-root `DB_USER`. With `DB_NAME` set, the deploy
     creates the database and user for you. Without `DB_NAME`, database setup is skipped.
2. **Private GitHub repo only:** Kind *Username with password* · username = your GitHub user ·
   password = a GitHub personal access token (repo read) · ID `github-token`.

The SSH key `vps-ssh-key` already exists and is shared by all projects.

### Step 4 — Jenkins job
**New Item** → name `xyz` → **Pipeline** → OK, then:

- **Triggers:** tick **Poll SCM**, schedule `H/5 * * * *` (deploys within 5 min of a push)
- **Pipeline → Definition:** *Pipeline script from SCM*
  - SCM: **Git** · Repository URL: `https://github.com/<you>/<repo>.git`
  - Credentials: `github-token` (private repos only)
  - Branch: `*/main` · Script Path: `Jenkinsfile`
- **Save** → **Build Now**

The first build creates the nginx site, the HTTPS certificate, the database (if any)
and starts the app. Watch it under **Build #1 → Console Output**; the job page shows
each stage as green or red.

### Step 5 — Check
```bash
curl -I https://xyz.glamofashion.com          # on your Mac: expect 200 or 30x
ssh root@187.126.117.103 'pm2 ls'             # xyz should be "online"
```

---

## 5. Deploy on its own domain (xyz.com)

Same as §4 with these differences:

1. **DNS** is at wherever xyz.com is registered (or hPanel if it's in this Hostinger account):

   | Type | Name | Points to |
   |---|---|---|
   | A | `@` | `187.126.117.103` |
   | A | `www` | `187.126.117.103` |

2. **Jenkinsfile:** `DOMAIN = 'xyz.com'`
3. **`deploy/nginx.conf`:** change `server_name __DOMAIN__;` to `server_name __DOMAIN__ www.__DOMAIN__;`
4. **`deploy/remote-deploy.sh`:** in the certbot line, change `-d "$DOMAIN"` to `-d "$DOMAIN" -d "www.$DOMAIN"`
   (both names must already resolve to the server, or certbot fails).

---

## 6. Without Jenkins (quick manual setup)

For a one-off app, or to test before setting up a job. Example: port 3300.

```bash
# on your Mac: upload the code
rsync -az --exclude node_modules --exclude .git --exclude .next ./ root@187.126.117.103:/var/www/xyz/

# on the server
cd /var/www/xyz
npm ci && npm run build --if-present
PORT=3300 pm2 start npm --name xyz -- start      # or: pm2 start ecosystem.config.js
pm2 save

cat > /etc/nginx/sites-available/xyz <<'EOF'
server {
    listen 80;
    server_name xyz.glamofashion.com;
    location / {
        proxy_pass http://127.0.0.1:3300;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
ln -s /etc/nginx/sites-available/xyz /etc/nginx/sites-enabled/xyz
nginx -t && systemctl reload nginx
certbot --nginx -d xyz.glamofashion.com --redirect
```

**Static site (HTML only):** skip PM2; in the nginx block use
`root /var/www/xyz; index index.html; location / { try_files $uri $uri/ =404; }`
instead of the `location / { proxy_pass … }` block.

---

## 7. Jenkins from the terminal

Create an API token once: Jenkins → **admin** (top right) → **Security → API Token → Add new token**.

```bash
J=https://jenkins.glamofashion.com
AUTH=admin:YOUR_API_TOKEN

curl -X POST -u $AUTH $J/job/xyz/build                                         # start a deploy
curl -s -u $AUTH "$J/job/xyz/lastBuild/api/json?tree=number,building,result"   # status
curl -s -u $AUTH $J/job/xyz/lastBuild/consoleText | tail -40                   # log
curl -s -u $AUTH "$J/api/json?tree=jobs[name,color]"                           # all jobs (blue = OK, red = failed)
```

---

## 8. Remove a site

```bash
pm2 delete xyz && pm2 save
rm /etc/nginx/sites-enabled/xyz /etc/nginx/sites-available/xyz
nginx -t && systemctl reload nginx
certbot delete --cert-name xyz.glamofashion.com
mysql -e "DROP DATABASE xyz; DROP USER 'xyz'@'localhost'; DROP USER 'xyz'@'127.0.0.1'"   # irreversible
rm -rf /var/www/xyz
```
Then delete the Jenkins job, its `xyz-env` credential, and the DNS record.

---

## 9. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Browser: `ERR_SSL_UNRECOGNIZED_NAME_ALERT` | No certificate for that name | `certbot --nginx -d <name> --redirect` (DNS must point here first) |
| `502 Bad Gateway` | nginx works, app isn't running on its port | `pm2 ls`, `pm2 logs <app>`; check the port in the nginx site matches |
| "Welcome to nginx!" or nginx `404` | No nginx site for that name | Add a site in `/etc/nginx/sites-available` + link it in `sites-enabled` |
| MySQL `ERROR 1045 Access denied` | Wrong password, or user exists for another host | `ALTER USER '<u>'@'localhost' IDENTIFIED BY '…'`; create `'<u>'@'127.0.0.1'` too |
| MySQL `ERROR 1410 … create a user with GRANT` | `GRANT` names a user that doesn't exist | Run `CREATE USER` first, with the same name and host |
| MySQL syntax error near `groups` | `groups` is a reserved word in MySQL 8 | Write it as `` `groups` `` |
| Jenkins build red at "Migrate, build & start" | Build or migration failed | Build → Console Output; the previous release keeps running |
| Jenkins down after editing `casc.yaml` | Invalid config | `journalctl -u jenkins -n 200 \| grep -A3 SEVERE`, fix the file, `systemctl reset-failed jenkins && systemctl restart jenkins` |
