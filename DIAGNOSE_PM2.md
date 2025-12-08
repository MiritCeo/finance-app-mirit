# Diagnostyka problemów z PM2

## Krok 1: Sprawdź status PM2

```bash
pm2 status
pm2 list
```

Powinieneś zobaczyć aplikację `profitflow` ze statusem `online`.

## Krok 2: Sprawdź logi PM2

```bash
# Wszystkie logi
pm2 logs profitflow --lines 50

# Tylko błędy
pm2 logs profitflow --err --lines 50

# Tylko output
pm2 logs profitflow --out --lines 50
```

## Krok 3: Sprawdź, czy aplikacja nasłuchuje na porcie

```bash
# Sprawdź, czy port 3000 jest używany
lsof -i :3000
# lub
netstat -tulpn | grep :3000
# lub
ss -tulpn | grep :3000
```

## Krok 4: Sprawdź, czy katalog dist/public istnieje

```bash
# Sprawdź strukturę katalogów
ls -la dist/
ls -la dist/public/

# Sprawdź, czy index.html istnieje
ls -la dist/public/index.html

# Sprawdź zawartość index.html
head -20 dist/public/index.html
```

## Krok 5: Sprawdź zmienne środowiskowe

```bash
# Sprawdź zmienne w PM2
pm2 env 0

# Sprawdź konkretną zmienną
pm2 env 0 | grep NODE_ENV
pm2 env 0 | grep DATABASE_URL
pm2 env 0 | grep PORT
```

## Krok 6: Przetestuj aplikację bezpośrednio

```bash
# Zatrzymaj PM2
pm2 stop all

# Uruchom bezpośrednio
node dist/index.js
```

Jeśli działa bezpośrednio, problem jest w konfiguracji PM2.

## Krok 7: Sprawdź, czy frontend został zbudowany

```bash
# Sprawdź, czy vite build został wykonany
ls -la dist/public/assets/

# Sprawdź rozmiar plików
du -sh dist/public/
```

## Krok 8: Sprawdź błędy w przeglądarce

Otwórz konsolę deweloperską w przeglądarce (F12) i sprawdź:
- Błędy w konsoli
- Błędy w zakładce Network
- Status odpowiedzi HTTP

## Krok 9: Sprawdź, czy serwer odpowiada

```bash
# Test HTTP
curl http://localhost:3000/

# Test z nagłówkami
curl -I http://localhost:3000/

# Test API
curl http://localhost:3000/api/trpc/system.health
```

## Najczęstsze problemy i rozwiązania

### Problem 1: Aplikacja nie startuje (status: errored)

**Sprawdź logi:**
```bash
pm2 logs profitflow --err
```

**Możliwe przyczyny:**
- Brak zmiennych środowiskowych (DATABASE_URL, JWT_SECRET)
- Błąd w kodzie
- Port już w użyciu

### Problem 2: Aplikacja działa, ale przeglądarka pokazuje błąd 404

**Sprawdź:**
```bash
# Czy dist/public istnieje
ls -la dist/public/index.html

# Czy frontend został zbudowany
ls -la dist/public/assets/
```

**Rozwiązanie:**
```bash
# Zbuduj frontend ponownie
pnpm build
```

### Problem 3: Aplikacja działa, ale nie ładuje się frontend

**Sprawdź logi PM2:**
```bash
pm2 logs profitflow
```

**Możliwe przyczyny:**
- `dist/public` nie istnieje
- Błędna ścieżka w `serveStatic`
- Problem z CORS

### Problem 4: Port już w użyciu

**Rozwiązanie:**
```bash
# Znajdź proces używający portu 3000
lsof -i :3000

# Zatrzymaj proces
kill -9 <PID>

# Lub zmień port w ecosystem.config.cjs
```

### Problem 5: Zmienne środowiskowe nie są załadowane

**Rozwiązanie:**
```bash
# Uruchom PM2 z --update-env
pm2 delete all
pm2 start ecosystem.config.cjs --update-env

# Lub ustaw zmienne w systemie
export DATABASE_URL="..."
export JWT_SECRET="..."
pm2 restart ecosystem.config.cjs
```

## Kompletna procedura naprawy

```bash
# 1. Zatrzymaj PM2
pm2 stop all
pm2 delete all

# 2. Sprawdź zmienne środowiskowe
cat .env  # lub sprawdź zmienne systemowe

# 3. Zbuduj aplikację
pnpm build

# 4. Sprawdź, czy dist/public istnieje
ls -la dist/public/index.html

# 5. Uruchom PM2
pm2 start ecosystem.config.cjs --update-env

# 6. Sprawdź status
pm2 status
pm2 logs profitflow

# 7. Przetestuj
curl http://localhost:3000/
```

## Debugowanie zaawansowane

### Włącz szczegółowe logi

W `ecosystem.config.cjs` dodaj:
```javascript
log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
merge_logs: true,
```

### Sprawdź proces Node.js

```bash
# Sprawdź, czy proces działa
ps aux | grep node

# Sprawdź użycie pamięci
pm2 monit
```

### Sprawdź połączenie z bazą danych

```bash
# Test połączenia (jeśli masz mysql client)
mysql -h host -u user -p

# Sprawdź DATABASE_URL w PM2
pm2 env 0 | grep DATABASE_URL
```

