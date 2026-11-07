/**
 * PM2 Ecosystem Configuration for SkyzoneBD
 * Target Host: Ubuntu VPS (IP: 3.26.54.131)
 * Application Directory: /var/www/skyzonebd/app
 * Port: 3001 (Isolated from Kuttush on Port 3000)
 */

module.exports = {
  apps: [
    {
      name: 'skyzonebd',
      script: 'server.js',
      cwd: '/var/www/skyzonebd/app',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '800M', // Guard against OOM on 1.9GB VPS shared with Kuttush
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        HOSTNAME: '0.0.0.0',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        HOSTNAME: '0.0.0.0',
      },
      error_file: '/var/www/skyzonebd/logs/error.log',
      out_file: '/var/www/skyzonebd/logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },
  ],
};

