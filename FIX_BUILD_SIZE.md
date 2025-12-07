# Naprawa problemu z małym rozmiarem dist/index.js (188KB)

## Problem

Plik `dist/index.js` ma tylko 188KB, co jest za małe. Normalnie powinien mieć **kilka MB** (2-5 MB), ponieważ zawiera cały router tRPC z wszystkimi procedurami.

**Przyczyna**: esbuild z flagą `--packages=external` nie bundluje wszystkich zależności, co powoduje, że router nie jest w pełni zbudowany.

## Rozwiązanie

### Krok 1: Sprawdź aktualną konfigurację

```bash
# Sprawdź rozmiar pliku
du -sh dist/index.js

# Sprawdź, ile linii ma plik
wc -l dist/index.js

# Sprawdź, czy zawiera router
grep -c "appRouter\|router" dist/index.js
```

### Krok 2: Zmień konfigurację buildu

Edytuj `package.json`:

```bash
nano package.json
```

Znajdź linię:
```json
"build": "vite build && esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist"
```

Zmień na jedną z opcji:

**Opcja A (zalecana - bundluje wszystko oprócz kluczowych modułów):**
```json
"build": "vite build && esbuild server/_core/index.ts --platform=node --bundle --format=esm --outdir=dist --external:express --external:mysql2 --external:@trpc/server"
```

**Opcja B (pełne bundlowanie - wszystko w jednym pliku):**
```json
"build": "vite build && esbuild server/_core/index.ts --platform=node --bundle --format=esm --outdir=dist"
```

### Krok 3: Wyczyść i zbuduj ponownie

```bash
# Zatrzymaj aplikację
pm2 stop profitflow

# Wyczyść buildy
rm -rf dist/ client/dist/

# Zbuduj ponownie
pnpm build

# Sprawdź rozmiar (powinien być większy - 2-5 MB)
du -sh dist/index.js

# Sprawdź, czy zawiera procedury
grep -i "getTopEmployees\|employeeCV\|getProjectProfitability" dist/index.js | head -5
```

### Krok 4: Sprawdź zawartość buildu

```bash
# Sprawdź rozmiar
du -sh dist/index.js
# Powinien mieć przynajmniej 1-2 MB

# Sprawdź liczbę linii
wc -l dist/index.js
# Powinien mieć dziesiątki tysięcy linii

# Sprawdź, czy zawiera router definitions
grep -c "router\|procedure" dist/index.js
# Powinno zwrócić setki/tysiące

# Sprawdź konkretne procedury
echo "Checking procedures:"
grep -i "getTopEmployees" dist/index.js | wc -l
grep -i "employeeCV" dist/index.js | wc -l
grep -i "getProjectProfitability" dist/index.js | wc -l
# Każde powinno zwrócić więcej niż 0
```

### Krok 5: Uruchom aplikację

```bash
# Uruchom z PM2
pm2 start ecosystem.config.cjs

# Sprawdź logi
pm2 logs profitflow --lines 50

# Sprawdź status
pm2 status
```

## Weryfikacja

Po wykonaniu wszystkich kroków:

1. **Sprawdź rozmiar pliku:**
   ```bash
   du -sh dist/index.js
   # Powinien mieć 2-5 MB (nie 188KB!)
   ```

2. **Sprawdź zawartość:**
   ```bash
   # Sprawdź, czy zawiera procedury
   grep -i "getTopEmployees\|employeeCV" dist/index.js | head -3
   # Powinno pokazać dopasowania
   ```

3. **Sprawdź aplikację:**
   - Otwórz Dashboard - powinien działać bez błędów
   - Otwórz CV pracownika - powinien działać
   - Sprawdź konsolę przeglądarki (F12) - nie powinno być błędów

## Jeśli problem nadal występuje

### Sprawdź logi buildu

```bash
# Zbuduj z pełnym outputem
pnpm build 2>&1 | tee build.log

# Sprawdź, czy są błędy
grep -i "error\|warning" build.log
```

### Sprawdź, czy wszystkie importy są poprawnie rozwiązane

```bash
# Sprawdź importy w server/_core/index.ts
grep -i "import.*routers\|from.*routers" server/_core/index.ts

# Sprawdź, czy routers.ts istnieje
ls -la server/routers.ts
```

### Alternatywne rozwiązanie: Użyj tsx zamiast esbuild (tylko do testów)

```bash
# Tymczasowo - nie dla produkcji
pnpm exec tsx server/_core/index.ts
```

Jeśli to działa, problem jest w konfiguracji esbuild.

## Kontakt

Jeśli problem nadal występuje:
- Sprawdź logi PM2: `pm2 logs profitflow`
- Sprawdź logi buildu: `cat build.log`
- Sprawdź rozmiar pliku: `du -sh dist/index.js`

