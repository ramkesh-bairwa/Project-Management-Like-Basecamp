# Deployment

Every Jenkins build of `main` deploys to **https://project-crm.glamofashion.com**
on the Hostinger VPS (`187.126.117.103`). No manual steps on the server are needed.

## What a build does

1. Uploads the code to `/var/www/project-crm/releases/<build number>`.
2. Uploads the production env file to `/var/www/project-crm/shared/.env.local`.
3. Runs `deploy/remote-deploy.sh` on the server, which:
   - creates the MySQL database and user if they don't exist,
   - applies the SQL files in `deploy/migrations.list` that haven't run yet,
   - runs `npm ci` and `npm run build`,
   - points `/var/www/project-crm/current` at the new release and restarts PM2 (`project-crm`, port 3100),
   - rolls back to the previous release if the new one doesn't answer on `/login`,
   - creates the nginx site and Let's Encrypt certificate on the first run,
   - keeps the last 5 releases.
4. Checks that `https://project-crm.glamofashion.com/login` responds.

## One-time Jenkins setup

1. Install plugins: **Pipeline**, **Git**, **SSH Agent**, **Credentials Binding**.
   The Jenkins agent needs `ssh`, `rsync` and `curl`.
2. Add credentials:
   - `vps-ssh-key`: *SSH Username with private key*, username `root`. Add its public key to
     `/root/.ssh/authorized_keys` on the VPS (or attach it in hPanel → VPS → SSH keys).
   - `project-crm-env`: *Secret file*, built from the template below.
3. Create a **Pipeline** job → *Pipeline script from SCM* → Git →
   `https://github.com/ramkesh-bairwa/Project-Management-Like-Basecamp.git`,
   branch `*/main`, script path `Jenkinsfile`.
4. Optional: tick *GitHub hook trigger for GITScm polling* and add a GitHub webhook
   (`https://<jenkins>/github-webhook/`) to deploy on every push.

## Production env file (`project-crm-env`)

```ini
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=project_crm
DB_PASSWORD=<long random password, no quotes>
DB_NAME=project_crm

JWT_SECRET=<openssl rand -hex 32>
JWT_EXPIRES_IN=7d

NEXT_PUBLIC_APP_URL=https://project-crm.glamofashion.com

ENABLE_WEBSOCKET=true
WS_API_KEY=<random>
NEXT_PUBLIC_WS_URL=wss://project-crm.glamofashion.com
NEXT_PUBLIC_WS_API_KEY=<same as WS_API_KEY>
NEXT_PUBLIC_ENABLE_WEBSOCKET=true

RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
NEXT_PUBLIC_RAZORPAY_KEY_ID=...

SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=...

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

The deploy refuses to run if `DB_USER` is `root` or `DB_HOST` isn't `127.0.0.1`.
Add `https://project-crm.glamofashion.com` callback URLs in the Google and GitHub OAuth consoles.

## Changing the database schema

Add a new `.sql` file and append its path to the end of `deploy/migrations.list`.
The next build applies it once and fails the deploy if it errors.
