# Rozwiązanie błędu "Dynamic require of 'fs' is not supported"

## Problem

Po zbudowaniu aplikacji i uruchomieniu przez PM2 występuje błąd:

```
Error: Dynamic require of "fs" is not supported
    at file:///home/mirit-ceo/finance-app/dist/index.js:11:9
    at node_modules/.pnpm/dotenv@17.2.3/node_modules/dotenv/lib/main.js
```

## Przyczyna

Esbuild bundluje moduł `dotenv`, który wewnętrznie używa `require("fs")` (CommonJS). Po zbudowaniu do ES modules (`--format=esm`), dynamiczne `require()` nie działa, ponieważ ES modules używają `import` zamiast `require`.

## Rozwiązanie

Oznaczono `dotenv` jako external w konfiguracji esbuild, aby nie był bundlowany:

```json
{
  "build": "vite build && esbuild server/_core/index.ts --platform=node --bundle --format=esm --outdir=dist --external:dotenv ..."
}
```

Dzięki temu `dotenv` pozostaje jako zewnętrzny moduł i jest ładowany przez Node.js w runtime, gdzie może używać `require()`.

## Instrukcje dla produkcji

1. **Zaktualizuj kod** (jeśli jeszcze nie):
   ```bash
   git pull origin main
   ```

2. **Zbuduj aplikację ponownie:**
   ```bash
   pnpm build
   ```

3. **Zatrzymaj PM2:**
   ```bash
   pm2 stop all
   pm2 delete all
   ```

4. **Uruchom aplikację:**
   ```bash
   pm2 start ecosystem.config.cjs
   ```

5. **Sprawdź logi:**
   ```bash
   pm2 logs profitflow
   ```

## Weryfikacja

Po uruchomieniu sprawdź, czy:
- Aplikacja startuje bez błędów
- Logi nie pokazują błędów z `dotenv` lub `require`
- Aplikacja poprawnie ładuje zmienne środowiskowe z `.env`

## Dodatkowe informacje

- `dotenv` musi być zainstalowany w `node_modules` (jest w `dependencies`)
- Zmienne środowiskowe są ładowane przez `import "dotenv/config"` na początku `server/_core/index.ts`
- W produkcji upewnij się, że plik `.env` istnieje i zawiera wszystkie wymagane zmienne

## Inne moduły, które mogą wymagać external

Jeśli pojawią się podobne błędy z innymi modułami, dodaj je do listy external w `package.json`:
- Moduły używające `require()` wewnętrznie
- Moduły z natywnymi rozszerzeniami (`.node`)
- Moduły, które nie są kompatybilne z ES modules

