# Naprawa błędu "No procedure found on path" na produkcji

## Problem

Błąd występuje, ponieważ zbudowana aplikacja na produkcji nie zawiera wszystkich procedur tRPC lub router nie został poprawnie zbudowany.

**Typowe błędy:**
- `No procedure found on path "employeeCV.get"`
- `No procedure found on path "dashboard.getTopEmployees"`
- `No procedure found on path "dashboard.getTopEmployeesByYear"`
- `No procedure found on path "dashboard.getProjectProfitability"`
- (i inne procedury tRPC)
- `No procedure found on path "dashboard.getProjectProfitability"`
- Inne procedury tRPC

**Przyczyna:** esbuild nie bundluje poprawnie wszystkich procedur tRPC podczas buildu aplikacji.

## Rozwiązanie

### Krok 1: Zatrzymaj aplikację

```bash
pm2 stop profitflow
# lub
pm2 delete profitflow
```

### Krok 2: Wyczyść poprzednie buildy

```bash
# Usuń katalog dist
rm -rf dist/

# Usuń również build frontendu (jeśli istnieje)
rm -rf client/dist/
```

### Krok 3: Zainstaluj zależności ponownie

```bash
# Zainstaluj wszystkie zależności
pnpm install --frozen-lockfile

# Sprawdź, czy nie ma błędów
pnpm exec tsc --noEmit
```

### Krok 4: Zbuduj aplikację ponownie

```bash
# Uruchom pełny build
pnpm build

# Sprawdź, czy dist/index.js został utworzony
ls -la dist/

# Sprawdź rozmiar pliku (powinien być duży, kilka MB)
du -sh dist/index.js
```

### Krok 5: Sprawdź, czy router jest poprawnie zbudowany

```bash
# Sprawdź, czy plik zawiera różne procedury
grep -i "employeeCV" dist/index.js | head -5
grep -i "getTopEmployees" dist/index.js | head -5
grep -i "getProjectProfitability" dist/index.js | head -5

# Sprawdź rozmiar pliku (powinien być duży - kilka MB)
du -sh dist/index.js

# Sprawdź, czy zawiera router definitions
grep -i "router\|procedure" dist/index.js | head -10
```

### Krok 6: Uruchom aplikację ponownie

```bash
# Uruchom z PM2
pm2 start ecosystem.config.cjs

# Sprawdź logi
pm2 logs profitflow --lines 50

# Sprawdź status
pm2 status
```

### Krok 7: Wyczyść cache przeglądarki

W przeglądarce:
1. Otwórz DevTools (F12)
2. Kliknij prawym przyciskiem na przycisk odświeżania
3. Wybierz "Wyczyść cache i twarde odświeżenie" (Hard Reload)

LUB użyj skrótu:
- **Chrome/Edge**: `Ctrl+Shift+R` (Windows) lub `Cmd+Shift+R` (Mac)
- **Firefox**: `Ctrl+F5` (Windows) lub `Cmd+Shift+R` (Mac)

## Alternatywne rozwiązanie: Sprawdź konfigurację esbuild

Jeśli problem nadal występuje, sprawdź, czy esbuild poprawnie bundluje router:

```bash
# Sprawdź zawartość zbudowanego pliku
node -e "const fs = require('fs'); const content = fs.readFileSync('dist/index.js', 'utf8'); 
console.log('employeeCV:', content.includes('employeeCV') ? 'OK' : 'ERROR');
console.log('getTopEmployees:', content.includes('getTopEmployees') ? 'OK' : 'ERROR');
console.log('getProjectProfitability:', content.includes('getProjectProfitability') ? 'OK' : 'ERROR');
console.log('File size:', (content.length / 1024 / 1024).toFixed(2), 'MB');"
```

### Jeśli procedury nadal nie są w buildzie (plik dist/index.js ma mniej niż 1MB):

**Problem**: esbuild z `--packages=external` nie bundluje wszystkich zależności, co powoduje, że router nie jest w pełni zbudowany.

**Rozwiązanie 1: Zmień konfigurację buildu (zalecane)**

Edytuj `package.json` i zmień linię build:

```json
"build": "vite build && esbuild server/_core/index.ts --platform=node --bundle --format=esm --outdir=dist --external:express --external:mysql2 --external:@trpc/server"
```

To bundluje wszystkie zależności oprócz tych, które muszą być zewnętrzne (express, mysql2, @trpc/server).

**Rozwiązanie 2: Sprawdź, czy plik jest poprawnie zbudowany**

```bash
# Sprawdź rozmiar pliku
du -sh dist/index.js
# Powinien mieć przynajmniej 1-2 MB

# Sprawdź, czy zawiera router
grep -c "appRouter\|router\|procedure" dist/index.js
# Powinno zwrócić setki/tysiące dopasowań

# Sprawdź, czy zawiera konkretne procedury
grep -i "getTopEmployees\|employeeCV\|getProjectProfitability" dist/index.js | wc -l
# Powinno zwrócić więcej niż 0
```

**Rozwiązanie 3: Jeśli plik jest za mały, użyj pełnego bundlowania**

```json
"build": "vite build && esbuild server/_core/index.ts --platform=node --bundle --format=esm --outdir=dist"
```

To zbuduje wszystko w jednym pliku (może być większy, ale zawiera wszystko).

## Jeśli problem nadal występuje

### Opcja 1: Sprawdź, czy wszystkie pliki są skopiowane

```bash
# Sprawdź, czy server/routers.ts istnieje w dist
ls -la dist/server/routers.js 2>/dev/null || echo "Router nie został skopiowany"

# Jeśli nie, sprawdź konfigurację esbuild w package.json
```

### Opcja 2: Użyj bezpośredniego importu (tymczasowe rozwiązanie)

Jeśli esbuild nie bundluje poprawnie, możesz spróbować zmienić konfigurację buildu w `package.json`:

```json
"build": "vite build && esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist --banner:js='import { createRequire } from \"module\"; const require = createRequire(import.meta.url);'"
```

### Opcja 3: Sprawdź logi serwera

```bash
# Zobacz szczegółowe logi
pm2 logs profitflow --lines 100 --nostream

# Sprawdź, czy są błędy podczas startu
pm2 logs profitflow --err --lines 50
```

## Weryfikacja

Po wykonaniu wszystkich kroków:

1. Otwórz aplikację w przeglądarce
2. Wyczyść cache przeglądarki (`Ctrl+Shift+R` lub `Cmd+Shift+R`)
3. Sprawdź różne strony:
   - Dashboard - powinien załadować się bez błędów
   - CV pracownika - powinien załadować się bez błędów
4. Sprawdź konsolę przeglądarki (F12) - nie powinno być błędów o brakujących procedurach
5. Sprawdź Network tab - zapytania do tRPC powinny zwracać 200 OK:
   - `dashboard.getTopEmployees`
   - `dashboard.getTopEmployeesByYear`
   - `dashboard.getProjectProfitability`
   - `employeeCV.get`

## Kontakt

Jeśli problem nadal występuje, sprawdź:
- Logi PM2: `pm2 logs profitflow`
- Logi systemowe: `journalctl -u profitflow -n 50`
- Status aplikacji: `pm2 status`

