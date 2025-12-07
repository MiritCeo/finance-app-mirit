# Naprawa błędu "Invalid package.json in package.json"

## Problem

Błąd "Invalid package.json in package.json" może wystąpić z kilku powodów:
1. Niepoprawna składnia JSON w `package.json`
2. Problem z konfiguracją esbuild
3. Problem z pnpm cache

## Rozwiązanie

### Krok 1: Sprawdź składnię JSON

```bash
# Sprawdź, czy JSON jest poprawny
node -e "JSON.parse(require('fs').readFileSync('package.json', 'utf8')); console.log('JSON is valid')"

# LUB użyj jq (jeśli zainstalowany)
jq . package.json > /dev/null && echo "JSON is valid"
```

### Krok 2: Wyczyść cache pnpm

```bash
# Wyczyść cache pnpm
pnpm store prune

# Wyczyść node_modules
rm -rf node_modules pnpm-lock.yaml

# Zainstaluj ponownie
pnpm install
```

### Krok 3: Sprawdź konfigurację buildu

Upewnij się, że w `package.json` linia build jest poprawna:

```json
"build": "vite build && esbuild server/_core/index.ts --platform=node --bundle --format=esm --outdir=dist --external:express --external:mysql2 --external:@trpc/server"
```

**WAŻNE**: Nie używaj `--packages=external` - to powoduje problemy z bundlowaniem.

### Krok 4: Sprawdź, czy nie ma ukrytych znaków

```bash
# Sprawdź, czy nie ma problemów z kodowaniem
file package.json

# Sprawdź, czy nie ma BOM (Byte Order Mark)
head -c 3 package.json | od -An -tx1
# Powinno pokazać: 7b 22 6e (dla { "n)
# Jeśli pokazuje: ef bb bf - masz BOM, usuń go
```

### Krok 5: Jeśli problem nadal występuje

Spróbuj zbudować bez esbuild (tylko do testów):

```bash
# Tymczasowo - sprawdź, czy problem jest w esbuild
vite build

# Jeśli vite build działa, problem jest w esbuild
# Sprawdź wersję esbuild
pnpm list esbuild
```

## Alternatywne rozwiązanie

Jeśli problem nadal występuje, spróbuj użyć innej konfiguracji buildu:

```json
"build": "vite build && esbuild server/_core/index.ts --platform=node --bundle --format=esm --outdir=dist --external:express --external:mysql2 --external:@trpc/server --external:dotenv"
```

LUB pełne bundlowanie (wszystko w jednym pliku):

```json
"build": "vite build && esbuild server/_core/index.ts --platform=node --bundle --format=esm --outdir=dist"
```

## Weryfikacja

Po naprawie:

```bash
# Sprawdź, czy build działa
pnpm build

# Sprawdź, czy dist/index.js został utworzony
ls -la dist/index.js

# Sprawdź rozmiar (powinien być 2-5 MB)
du -sh dist/index.js
```

