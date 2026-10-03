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
**Create the first admin** for the admin panel (`/admin/login`). This works only while no admin exists:
```bash
curl -X PUT https://project-crm.glamofashion.com/api/admin/auth \
  -H 'Content-Type: application/json' \
  -d '{"name":"Your Name","email":"you@example.com","password":"a-long-password"}'
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

Example: a Node/Next.js project at **xyz.glamofashion.com** on port **3300**, repo
`https://github.com/<you>/xyz.git`, checked out on your Mac at `~/code/xyz`.
Replace `xyz`, `3300` and the paths everywhere below.

**Before you start, the project needs:**
- a `start` script in `package.json` that listens on `process.env.PORT`
  (`next start` does; for Express use `app.listen(process.env.PORT)`)
- a production env file on your Mac, e.g. `~/code/xyz/.env.production`
  - with a database: `DB_HOST=127.0.0.1`, `DB_NAME=xyz`, `DB_USER=xyz`, `DB_PASSWORD=<long random>`.
    The first deploy creates the database and user.
  - without a database: leave out `DB_NAME`

### Step 1 — DNS
hPanel → Domains → glamofashion.com → DNS / Nameservers → **Add record**:

| Type | Name | Points to | TTL |
|---|---|---|---|
| A | `xyz` | `187.126.117.103` | 300 |

Check it on your Mac. It should print the IP:
```bash
dig +short xyz.glamofashion.com
```

### Step 2 — Jenkins API token (once, reuse for every project)
Jenkins → **admin** (top right) → **Security** → **API Token** → **Add new token** → copy it.
Then, in your Mac terminal:
```bash
export JENKINS_USER=admin
export JENKINS_TOKEN=paste-the-token-here
```

### Step 3 — Run the setup script
From this repo (Project-Management-Like-Basecamp), on your Mac:
```bash
cd ~/Desktop/Advance-Project/Working/Project-Management-Like-Basecamp

deploy/new-project.sh \
  --dir ~/code/xyz \
  --name xyz \
  --domain xyz.glamofashion.com \
  --port 3300 \
  --repo https://github.com/<you>/xyz.git \
  --env-file ~/code/xyz/.env.production \
  --health /
```
What it does:
- writes `Jenkinsfile`, `ecosystem.config.js` and `deploy/` (remote-deploy.sh, db-migrate.sh, nginx.conf) into `~/code/xyz`, already filled in for `xyz`
- creates the Jenkins credential `xyz-env` from your env file
- creates the Jenkins job `xyz`, which checks GitHub every 5 minutes and deploys `main`

Options: `--branch <name>` (default `main`), `--health /path` (a page that returns 200 without login),
`--git-credential <id>` for a private repo (see "By hand" below for creating it).
Without `JENKINS_TOKEN` set, the script only writes the files.

### Step 4 — Push
```bash
cd ~/code/xyz
git add Jenkinsfile ecosystem.config.js deploy
git commit -m "Add VPS deploy"
git push
```
Within 5 minutes Jenkins runs build #1. It creates the nginx site, the HTTPS certificate and
the database (if any), then starts the app. To start it straight away:
```bash
curl -X POST -u $JENKINS_USER:$JENKINS_TOKEN https://jenkins.glamofashion.com/job/xyz/build
```
Watch it at `https://jenkins.glamofashion.com/job/xyz/` → the build → **Console Output**.

### Step 5 — Check
```bash
curl -I https://xyz.glamofashion.com          # expect 200 or 30x
ssh root@187.126.117.103 'pm2 ls'             # xyz should be "online"
```

### By hand (instead of the script)
1. Copy `Jenkinsfile`, `deploy/remote-deploy.sh`, `deploy/db-migrate.sh`, `deploy/nginx.conf` into the project.
   In the `Jenkinsfile` `environment` block set:
   ```groovy
   APP_ROOT          = '/var/www/xyz'
   DOMAIN            = 'xyz.glamofashion.com'
   APP_PORT          = '3300'
   PM2_APP_NAME      = 'xyz'
   HEALTH_PATH       = '/'
   ENV_CREDENTIAL_ID = 'xyz-env'
   ```
   Create `ecosystem.config.js` with `name: 'xyz'`, `script: 'npm'`, `args: 'start'`,
   `cwd: '/var/www/xyz/current'`, `env: { NODE_ENV: 'production', PORT: 3300 }`.
2. Jenkins → **Manage Jenkins → Credentials → System → Global credentials → Add Credentials**:
   - **Kind:** Secret file · **File:** the production env · **ID:** `xyz-env`
   - **Private repo only:** Kind *Username with password* · your GitHub user · a GitHub
     personal access token (repo read) as the password · **ID:** `github-token`
3. Jenkins → **New Item** → name `xyz` → **Pipeline** → OK:
   - **Triggers:** tick **Poll SCM**, schedule `H/5 * * * *`
   - **Pipeline → Definition:** *Pipeline script from SCM* · SCM **Git** · your repo URL ·
     credentials `github-token` (private only) · branch `*/main` · Script Path `Jenkinsfile`
   - **Save** → **Build Now**

The SSH key `vps-ssh-key` already exists in Jenkins and is shared by all projects.

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

### "I pushed but the site didn't change"
Work down this list. Each line answers one question.
```bash
# 1. Is the commit on GitHub main? (on your Mac, in the project)
git fetch && git log origin/main --oneline -1

# 2. Did Jenkins see it? Last poll result:
ssh root@187.126.117.103 'tail -3 /var/lib/jenkins/jobs/project-crm/scm-polling.log'

# 3. Did the build pass? (green/red on the job page, or:)
curl -s -u $JENKINS_USER:$JENKINS_TOKEN "https://jenkins.glamofashion.com/job/project-crm/lastBuild/api/json?tree=number,result,building"

# 4. Is the app running the newest release?
ssh root@187.126.117.103 'ls -1t /var/www/project-crm/releases | head -1; readlink /var/www/project-crm/current; pm2 ls'

# 5. Is the app throwing errors? (a missing DB column shows up here)
ssh root@187.126.117.103 'pm2 logs project-crm --err --lines 50 --nostream'
```
- Step 1 shows an old commit → you haven't pushed, or pushed to another branch. Jenkins only deploys `main`.
- Step 2 says "No changes" but step 1 has a new commit → wait up to 5 minutes, or start a build (§7).
- Step 3 shows `FAILURE` → open the build's **Console Output**. The previous release is still running.
- Step 4 shows the new release but the page looks old → hard-refresh the browser (⌘⇧R).
- Step 5 shows `Unknown column` / `doesn't exist` → the code needs a schema change. Add a `.sql` file
  and append it to `deploy/migrations.list`; the next build applies it.

| Symptom | Cause | Fix |
|---|---|---|
| Browser: `ERR_SSL_UNRECOGNIZED_NAME_ALERT` | No certificate for that name | `certbot --nginx -d <name> --redirect` (DNS must point here first) |
| `502 Bad Gateway` | nginx works, app isn't running on its port | `pm2 ls`, `pm2 logs <app>`; check the port in the nginx site matches |
| "Welcome to nginx!" or nginx `404` | No nginx site for that name | Add a site in `/etc/nginx/sites-available` + link it in `sites-enabled` |
| MySQL `ERROR 1045 Access denied` | Wrong password, or user exists for another host | `ALTER USER '<u>'@'localhost' IDENTIFIED BY '…'`; create `'<u>'@'127.0.0.1'` too |
| MySQL `ERROR 1410 … create a user with GRANT` | `GRANT` names a user that doesn't exist | Run `CREATE USER` first, with the same name and host |
| MySQL syntax error near `groups` | `groups` is a reserved word in MySQL 8 | Wrap the name in backticks in every SQL statement, as `database/schema.sql` does |
| Jenkins build red at "Migrate, build & start" | Build or migration failed | Build → Console Output; the previous release keeps running |
| Jenkins down after editing `casc.yaml` | Invalid config | `journalctl -u jenkins -n 200 \| grep -A3 SEVERE`, fix the file, `systemctl reset-failed jenkins && systemctl restart jenkins` |
