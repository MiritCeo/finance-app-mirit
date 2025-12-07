// PM2 Ecosystem Configuration dla ProfitFlow

module.exports = {
  apps: [
    {
      name: 'profitflow',
      script: './dist/index.js',
      instances: 1, // Użyj 1 instancji dla ES modules (cluster mode może mieć problemy)
      exec_mode: 'fork', // Fork mode działa lepiej z ES modules
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        // UWAGA: Pozostałe zmienne środowiskowe (DATABASE_URL, JWT_SECRET, itp.)
        // powinny być ustawione w systemie lub w pliku .env w katalogu głównym projektu.
        // PM2 automatycznie załaduje zmienne z systemu operacyjnego.
        // Możesz też użyć: pm2 start ecosystem.config.cjs --update-env
      },
      // Auto restart przy crashu
      autorestart: true,
      // Maksymalne restarty w ciągu minuty
      max_restarts: 10,
      min_uptime: '10s',
      // Restart przy przekroczeniu limitu pamięci
      max_memory_restart: '500M',
      // Logi (katalog logs zostanie utworzony automatycznie)
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // Graceful shutdown
      kill_timeout: 5000,
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
      'post-deploy': 'pnpm install && pnpm build && pm2 reload ecosystem.config.cjs --env production',
      'pre-setup': 'apt-get install git',
    },
  },
};
