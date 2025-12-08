# Instrukcja uruchomienia PM2 z nową konfiguracją

## Krok po kroku:

### 1. Zatrzymaj wszystkie procesy PM2 (jeśli są):
```bash
pm2 delete all
```

### 2. Sprawdź czy plik .env istnieje:
```bash
ls -la /home/mirit-ceo/finance-app/.env
cat /home/mirit-ceo/finance-app/.env | grep DATABASE_URL
```

### 3. Uruchom PM2 z nową konfiguracją:
```bash
cd /home/mirit-ceo/finance-app
pm2 start ecosystem.config.cjs
```

### 4. Sprawdź logi PM2:
```bash
pm2 logs profitflow --lines 50
```

Powinieneś zobaczyć:
```
[PM2] Załadowano .env z: /home/mirit-ceo/finance-app/.env
[PM2] DATABASE_URL: ustawiony (mysql://...)
[Env] Załadowano plik .env z: ...
[Database] Connecting to database...
```

### 5. Sprawdź status PM2:
```bash
pm2 status
```

### 6. Sprawdź zmienne środowiskowe:
```bash
pm2 env profitflow | grep DATABASE_URL
```

### 7. Sprawdź czy aplikacja działa:
- Otwórz IP serwera w przeglądarce
- Sprawdź konsolę przeglądarki (F12)

## Jeśli nadal nie działa:

### Sprawdź czy .env jest poprawnie sformatowany:
```bash
# Sprawdź zawartość (bez wyświetlania wartości)
grep -E "^DATABASE_URL=" .env

# Powinno być: DATABASE_URL=mysql://... (BEZ cudzysłowów)
```

### Sprawdź uprawnienia:
```bash
chmod 644 .env
```

### Przetestuj ręcznie:
```bash
# Załaduj .env ręcznie
export $(cat .env | xargs)

# Sprawdź czy zmienna jest dostępna
echo $DATABASE_URL

# Uruchom aplikację bezpośrednio (do testów)
NODE_ENV=production pnpm exec tsx server/_core/index.ts
```

