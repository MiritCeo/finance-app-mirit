# Ładowanie zmiennych z .env w PM2

## Problem

PM2 nie ładuje automatycznie zmiennych z pliku `.env`, nawet jeśli plik istnieje.

## Rozwiązanie

### Opcja 1: Użyj flagi --update-env (Zalecane)

```bash
# Zatrzymaj PM2
pm2 stop all
pm2 delete all

# Uruchom z --update-env (ładuje zmienne z .env)
pm2 start ecosystem.config.cjs --update-env

# Sprawdź zmienne
pm2 env 0 | grep DATABASE_URL
```

### Opcja 2: Zainstaluj pm2-dotenv

```bash
# Zainstaluj pm2-dotenv
pnpm add -D pm2-dotenv

# Edytuj ecosystem.config.cjs i dodaj na początku:
require('pm2-dotenv').config();
```

### Opcja 3: Dodaj zmienne bezpośrednio do ecosystem.config.cjs

Edytuj `ecosystem.config.cjs`:

```javascript
const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  apps: [
    {
      name: 'profitflow',
      // ...
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        DATABASE_URL: process.env.DATABASE_URL,
        JWT_SECRET: process.env.JWT_SECRET,
        OWNER_NAME: process.env.OWNER_NAME,
        OWNER_OPEN_ID: process.env.OWNER_OPEN_ID,
        VITE_APP_ID: process.env.VITE_APP_ID,
        // ... inne zmienne
      },
    },
  ],
};
```

**UWAGA:** To wymaga zainstalowania `dotenv` jako dependency (nie devDependency).

### Opcja 4: Użyj env_file w PM2 (PM2 2.5.0+)

```javascript
{
  name: 'profitflow',
  script: './server/_core/index.ts',
  env_file: '.env', // PM2 automatycznie załaduje zmienne z .env
  // ...
}
```

## Weryfikacja

Po zastosowaniu jednego z rozwiązań:

```bash
# Sprawdź zmienne
pm2 env 0 | grep DATABASE_URL

# Sprawdź logi
pm2 logs profitflow | grep -i database
```

Powinieneś zobaczyć:
```
[Database] Connecting to database...
[Database] Connected successfully
```

## Najszybsze rozwiązanie

```bash
# 1. Zatrzymaj PM2
pm2 stop all
pm2 delete all

# 2. Uruchom z --update-env
pm2 start ecosystem.config.cjs --update-env

# 3. Sprawdź
pm2 env 0 | grep DATABASE_URL
pm2 logs profitflow
```

