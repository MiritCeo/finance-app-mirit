# Rozwiązanie błędu builda z Tailwind CSS na produkcji

## Problem

Podczas budowania aplikacji na produkcji (`pnpm build`) występują błędy związane z natywnymi modułami Tailwind CSS i LightningCSS:

```
✘ [ERROR] No loader is configured for ".node" files: node_modules/.pnpm/@tailwindcss+oxide-linux-x64-musl@4.1.14/...
✘ [ERROR] No loader is configured for ".node" files: node_modules/.pnpm/@tailwindcss+oxide-linux-x64-gnu@4.1.14/...
✘ [ERROR] Could not resolve "../pkg" (lightningcss)
✘ [ERROR] Could not resolve "@babel/preset-typescript/package.json"
```

## Przyczyna

Esbuild próbuje zbudować backend (`server/_core/index.ts`), który importuje `setupVite` z `server/_core/vite.ts`. Ten plik importuje `vite.config.ts`, który z kolei importuje moduły Tailwind CSS zawierające natywne moduły `.node`. W produkcji `setupVite` nie jest używane (tylko `serveStatic`), ale esbuild próbuje zbudować wszystkie zależności.

## Rozwiązanie

### 1. Dynamiczny import vite.config

Zmieniono import `viteConfig` w `server/_core/vite.ts` na dynamiczny import, aby esbuild nie próbował go bundlować:

```typescript
// Przed:
import viteConfig from "../../vite.config";

// Po:
const viteConfig = await import("../../vite.config");
```

### 2. Wykluczenie modułów frontendowych w esbuild

Zaktualizowano skrypt build w `package.json`, aby wykluczyć wszystkie moduły związane z frontendem:

```json
{
  "build": "vite build && esbuild server/_core/index.ts --platform=node --bundle --format=esm --outdir=dist --external:express --external:mysql2 --external:@trpc/server --external:vite --external:@tailwindcss/* --external:lightningcss --external:@babel/* --external:@vitejs/* --external:@builder.io/* --external:postcss --external:autoprefixer --external:./vite.config*"
}
```

**Uwaga:** Esbuild nie obsługuje `**` w ścieżkach external, więc nie można używać `./client/**` ani `./dist/**`. Te katalogi i tak nie są bundlowane przez esbuild, więc nie są potrzebne.

## Instrukcje dla produkcji

1. **Zaciągnij najnowsze zmiany z repozytorium:**
   ```bash
   git pull origin main
   ```

2. **Zainstaluj zależności:**
   ```bash
   pnpm install
   ```

3. **Zbuduj aplikację:**
   ```bash
   pnpm build
   ```

4. **Uruchom aplikację:**
   ```bash
   pnpm start
   # lub z PM2:
   pm2 start ecosystem.config.cjs
   ```

## Weryfikacja

Po zbudowaniu aplikacji sprawdź, czy:
- Plik `dist/index.js` został utworzony
- Rozmiar pliku jest rozsądny (kilka MB, nie 188KB)
- Aplikacja uruchamia się bez błędów

Jeśli nadal występują problemy, sprawdź:
- Czy wszystkie zależności są zainstalowane (`pnpm install`)
- Czy nie ma konfliktów wersji pakietów
- Czy środowisko Node.js jest zgodne (sprawdź `package.json` -> `engines`)

## Dodatkowe informacje

- W produkcji `setupVite` nie jest wywoływane - używane jest tylko `serveStatic`
- Moduły Tailwind CSS i LightningCSS są potrzebne tylko w development
- Dynamiczny import `vite.config` zapewnia, że esbuild nie próbuje go bundlować w produkcji

