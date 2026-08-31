module.exports = {
  apps: [
    {
      name: 'project-management',
      script: 'server.js',
      cwd: '/var/www/project-management',
      instances: 'max',          // use all CPU cores
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      watch: false,
      max_memory_restart: '1G',
      error_file: '/var/log/pm2/project-management-error.log',
      out_file: '/var/log/pm2/project-management-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      restart_delay: 3000,
      autorestart: true,
    },
  ],
};
