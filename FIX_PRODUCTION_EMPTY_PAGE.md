# Rozwiązywanie problemu z pustą stroną w produkcji

## Problem: Pusta strona po zbudowaniu na serwerze

### Sprawdź:

1. **Czy pliki zostały zbudowane poprawnie**:
   ```bash
   ls -la dist/public/
   # Powinieneś zobaczyć:
   # - index.html
   # - assets/ (folder z plikami JS i CSS)
   ```

2. **Czy index.html istnieje**:
   ```bash
   cat dist/public/index.html
   # Powinien zawierać linki do plików JS i CSS
   ```

3. **Sprawdź logi serwera**:
   ```bash
   pm2 logs profitflow
   # Szukaj komunikatów:
   # [serveStatic] Serving static files from: ...
   # [serveStatic] index.html found at: ...
   ```

4. **Sprawdź czy serwer działa w trybie produkcji**:
   ```bash
   # W ecosystem.config.cjs upewnij się, że:
   NODE_ENV: 'production'
   ```

5. **Sprawdź czy pliki statyczne są serwowane**:
   - Otwórz DevTools w przeglądarce (F12)
   - Przejdź do zakładki Network
   - Odśwież stronę
   - Sprawdź czy pliki JS i CSS się ładują (powinny być z `/assets/`)

### Rozwiązania:

#### 1. Sprawdź ścieżki w index.html

Plik `dist/public/index.html` powinien zawierać:
```html
<script type="module" src="/assets/index-xxxxx.js"></script>
<link rel="stylesheet" href="/assets/index-xxxxx.css">
```

Jeśli ścieżki są niepoprawne (np. `./assets/` zamiast `/assets/`), sprawdź `vite.config.ts`.

#### 2. Sprawdź czy express.static działa

W logach serwera powinieneś widzieć:
```
[serveStatic] Serving static files from: /path/to/dist/public
[serveStatic] index.html found at: /path/to/dist/public/index.html
```

#### 3. Sprawdź czy NODE_ENV jest ustawiony

```bash
# W terminalu serwera:
echo $NODE_ENV
# Powinno być: production

# Lub w PM2:
pm2 env profitflow | grep NODE_ENV
```

#### 4. Sprawdź czy port jest poprawny

```bash
# Sprawdź czy aplikacja nasłuchuje na właściwym porcie
netstat -tulpn | grep :3000
# lub
ss -tulpn | grep :3000
```

#### 5. Sprawdź czy Nginx (jeśli używasz) przekierowuje poprawnie

Jeśli używasz Nginx jako reverse proxy, sprawdź konfigurację:
```nginx
location / {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

#### 6. Sprawdź konsolę przeglądarki

Otwórz DevTools (F12) → Console i sprawdź błędy:
- 404 dla plików JS/CSS?
- Błędy CORS?
- Błędy JavaScript?

#### 7. Sprawdź czy wszystkie pliki są w dist/public

```bash
# Sprawdź strukturę:
tree dist/public/
# lub
find dist/public -type f
```

Powinieneś zobaczyć:
- `index.html`
- `assets/index-*.js`
- `assets/index-*.css`
- Inne pliki statyczne (jeśli są)

### Jeśli nadal nie działa:

1. **Zbuduj ponownie**:
   ```bash
   rm -rf dist
   pnpm build
   ```

2. **Sprawdź uprawnienia**:
   ```bash
   chmod -R 755 dist/
   ```

3. **Sprawdź czy PM2 używa właściwego katalogu**:
   ```bash
   pm2 show profitflow
   # Sprawdź "cwd" (current working directory)
   ```

4. **Uruchom serwer bezpośrednio** (bez PM2) do testów:
   ```bash
   NODE_ENV=production node dist/index.js
   ```

