// PM2 Ecosystem Configuration dla ProfitFlow

// Załaduj zmienne z .env - użyj absolutnej ścieżki
const path = require('path');
const dotenv = require('dotenv');

// Załaduj .env z katalogu głównego projektu (gdzie jest ecosystem.config.cjs)
const envPath = path.resolve(__dirname, '.env');
const envResult = dotenv.config({ path: envPath });

if (envResult.error) {
  console.warn('[PM2] Błąd ładowania .env:', envResult.error.message);
} else {
  console.log('[PM2] Załadowano .env z:', envPath);
  console.log('[PM2] DATABASE_URL:', process.env.DATABASE_URL ? 'ustawiony' : 'BRAK');
  console.log('[PM2] OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'ustawiony' : 'BRAK');
}

module.exports = {
  apps: [
    {
      name: 'profitflow',
      script: './server/_core/index.ts',
      interpreter: 'pnpm',
      interpreter_args: 'exec tsx',
      instances: 1, // Użyj 1 instancji dla ES modules (cluster mode może mieć problemy)
      exec_mode: 'fork', // Fork mode działa lepiej z ES modules
      cwd: __dirname, // Ustaw katalog roboczy na katalog z ecosystem.config.cjs
      env: {
        NODE_ENV: process.env.NODE_ENV || 'production',
        PORT: process.env.PORT || 3000,
        DATABASE_URL: process.env.DATABASE_URL,
        JWT_SECRET: process.env.JWT_SECRET,
        OWNER_NAME: process.env.OWNER_NAME,
        OWNER_OPEN_ID: process.env.OWNER_OPEN_ID,
        VITE_APP_ID: process.env.VITE_APP_ID,
        VITE_APP_TITLE: process.env.VITE_APP_TITLE,
        VITE_APP_LOGO: process.env.VITE_APP_LOGO,
        OAUTH_SERVER_URL: process.env.OAUTH_SERVER_URL,
        VITE_OAUTH_PORTAL_URL: process.env.VITE_OAUTH_PORTAL_URL,
        SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME,
        SESSION_COOKIE_MAX_AGE: process.env.SESSION_COOKIE_MAX_AGE,
        VITE_ANALYTICS_ENDPOINT: process.env.VITE_ANALYTICS_ENDPOINT,
        VITE_ANALYTICS_WEBSITE_ID: process.env.VITE_ANALYTICS_WEBSITE_ID,
        BUILT_IN_FORGE_API_URL: process.env.BUILT_IN_FORGE_API_URL,
        BUILT_IN_FORGE_API_KEY: process.env.BUILT_IN_FORGE_API_KEY,
        VITE_FRONTEND_FORGE_API_KEY: process.env.VITE_FRONTEND_FORGE_API_KEY,
        VITE_FRONTEND_FORGE_API_URL: process.env.VITE_FRONTEND_FORGE_API_URL,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
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
