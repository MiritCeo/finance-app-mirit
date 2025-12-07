# Rozwiązanie problemu z uruchamianiem aplikacji przez PM2

## Problem

Aplikacja działa z `pnpm run dev`, ale nie uruchamia się przez PM2 (`pm2 restart ecosystem.config.cjs`).

## Przyczyny

1. **Cluster mode z ES modules** - PM2 w trybie `cluster` może mieć problemy z ES modules
2. **Brak sygnału ready** - Aplikacja nie wysyłała sygnału `ready` do PM2 (mimo `wait_ready: true`)
3. **Brak obsługi błędów** - Brak obsługi błędów przy starcie serwera

## Rozwiązanie

### 1. Zmiana exec_mode na 'fork'

Zmieniono `exec_mode` z `'cluster'` na `'fork'` w `ecosystem.config.cjs`, ponieważ:
- ES modules lepiej działają w trybie fork
- Cluster mode może powodować problemy z importami dynamicznymi
- Dla większości aplikacji fork mode jest wystarczający

```javascript
{
  name: 'profitflow',
  script: './dist/index.js',
  instances: 1, // Użyj 1 instancji dla ES modules
  exec_mode: 'fork', // Fork mode działa lepiej z ES modules
  // ...
}
```

### 2. Dodanie sygnału ready

Dodano wysyłanie sygnału `ready` do PM2 po uruchomieniu serwera:

```typescript
server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}/`);
  // Wyślij sygnał ready do PM2 jeśli jest dostępny
  if (process.send) {
    process.send('ready');
  }
});
```

### 3. Obsługa błędów

Dodano obsługę błędów przy starcie serwera:

```typescript
server.on('error', (error: any) => {
  console.error('[Server] Error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use`);
  }
  process.exit(1);
});

startServer().catch((error) => {
  console.error('[Startup] Fatal error:', error);
  process.exit(1);
});
```

## Instrukcje dla produkcji

1. **Zbuduj aplikację:**
   ```bash
   pnpm build
   ```

2. **Utwórz katalog logs (jeśli nie istnieje):**
   ```bash
   mkdir -p logs
   ```

3. **Zatrzymaj istniejące procesy PM2:**
   ```bash
   pm2 stop all
   pm2 delete all
   ```

4. **Uruchom aplikację przez PM2:**
   ```bash
   pm2 start ecosystem.config.cjs
   ```

5. **Sprawdź status:**
   ```bash
   pm2 status
   pm2 logs profitflow
   ```

6. **Zapisz konfigurację PM2:**
   ```bash
   pm2 save
   pm2 startup  # (opcjonalnie) uruchom przy starcie systemu
   ```

## Sprawdzanie logów

Jeśli aplikacja nadal nie działa, sprawdź logi:

```bash
# Logi w czasie rzeczywistym
pm2 logs profitflow

# Tylko błędy
pm2 logs profitflow --err

# Tylko output
pm2 logs profitflow --out

# Sprawdź pliki logów bezpośrednio
tail -f logs/pm2-error.log
tail -f logs/pm2-out.log
```

## Rozwiązywanie problemów

### Problem: Port już w użyciu

```bash
# Znajdź proces używający portu 3000
lsof -i :3000
# lub
netstat -tulpn | grep :3000

# Zatrzymaj proces
kill -9 <PID>
```

### Problem: Błąd "Cannot find module"

Upewnij się, że:
1. Wszystkie zależności są zainstalowane: `pnpm install`
2. Aplikacja została zbudowana: `pnpm build`
3. Plik `dist/index.js` istnieje

### Problem: Błąd z bazą danych

Sprawdź zmienne środowiskowe:
```bash
# Sprawdź czy .env istnieje
cat .env

# Sprawdź zmienne w PM2
pm2 env 0
```

### Problem: Aplikacja się restartuje w pętli

Sprawdź logi błędów:
```bash
pm2 logs profitflow --err
```

Częste przyczyny:
- Błąd w kodzie (sprawdź logi)
- Brak zmiennych środowiskowych
- Problem z bazą danych
- Port już w użyciu

## Weryfikacja

Po uruchomieniu sprawdź:
1. Status PM2: `pm2 status` - powinien pokazywać `online`
2. Logi: `pm2 logs profitflow` - powinny pokazywać "Server running on http://localhost:3000/"
3. Aplikacja dostępna: `curl http://localhost:3000/` - powinien zwrócić HTML

## Dodatkowe informacje

- **Fork vs Cluster**: Fork mode jest lepszy dla ES modules, cluster mode może powodować problemy
- **Instances**: Dla większości aplikacji 1 instancja jest wystarczająca
- **Logs**: PM2 automatycznie tworzy katalog `logs/` jeśli nie istnieje
- **Restart**: PM2 automatycznie restartuje aplikację przy crashu (max 10 razy w ciągu minuty)

