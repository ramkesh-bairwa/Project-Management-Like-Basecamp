// PM2 config used by deploy/remote-deploy.sh. `current` is a symlink to the
// active release in /var/www/project-crm/releases/<build>.
const APP_ROOT = process.env.APP_ROOT || '/var/www/project-crm';

module.exports = {
  apps: [
    {
      name: process.env.PM2_APP_NAME || 'project-crm',
      script: 'server.js',
      cwd: `${APP_ROOT}/current`,
      // Single fork process: the WebSocket client registry in server.js lives in
      // memory, so it can't be split across cluster workers.
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.APP_PORT || 3100,
      },
      watch: false,
      max_memory_restart: '1G',
      error_file: '/var/log/pm2/project-crm-error.log',
      out_file: '/var/log/pm2/project-crm-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      restart_delay: 3000,
      autorestart: true,
    },
  ],
};
