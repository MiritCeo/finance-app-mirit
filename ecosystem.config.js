// PM2 Ecosystem Configuration dla ProfitFlow

module.exports = {
  apps: [
    {
      name: 'profitflow',
      script: './server/index.js',
      instances: 'max', // Wykorzystaj wszystkie rdzenie CPU
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Auto restart przy crashu
      autorestart: true,
      // Maksymalne restarty w ciągu minuty
      max_restarts: 10,
      min_uptime: '10s',
      // Restart przy przekroczeniu limitu pamięci
      max_memory_restart: '500M',
      // Logi
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      // Watch (wyłączone w produkcji)
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'uploads'],
      // Cron restart (opcjonalnie - restart o 3:00 każdego dnia)
      // cron_restart: '0 3 * * *',
    },
  ],

  // Deployment configuration (opcjonalnie)
  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-username/profitflow.git',
      path: '/var/www/profitflow',
      'post-deploy': 'pnpm install && pnpm build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'apt-get install git',
    },
  },
};
