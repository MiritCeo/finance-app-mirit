# Rozwiązanie problemu z bundlowaniem w produkcji - użycie tsx

## Problem

Esbuild bundluje moduły, które używają `require()` wewnętrznie (np. `axios`, `form-data`, `combined-stream`), co powoduje błędy "Dynamic require is not supported" w ES modules.

## Rozwiązanie

Zamiast bundlowania kodu przez esbuild, używamy `tsx` do uruchamiania TypeScript bezpośrednio w produkcji. To rozwiązuje problem z `require()`, ponieważ moduły są ładowane przez Node.js w runtime.

## Zmiany

### 1. package.json

- `tsx` został przeniesiony z `devDependencies` do `dependencies`
- Skrypt `build` teraz tylko buduje frontend (`vite build`)
- Dodano skrypt `build:server` (opcjonalny, dla bundlowania jeśli potrzeba)

### 2. ecosystem.config.cjs

- `script` zmieniony z `./dist/index.js` na `./server/_core/index.ts`
- `interpreter` ustawiony na `pnpm`
- `interpreter_args` ustawiony na `exec tsx`

## Instrukcje dla produkcji

### 1. Zaktualizuj kod (jeśli używasz git):

```bash
git pull origin main
```

### 2. Zainstaluj zależności:

```bash
pnpm install
```

To zainstaluje `tsx` jako dependency (nie tylko devDependency).

### 3. Zbuduj frontend:

```bash
pnpm build
```

To zbuduje tylko frontend do `dist/public/`.

### 4. Zatrzymaj PM2:

```bash
pm2 stop all
pm2 delete all
```

### 5. Uruchom PM2:

```bash
pm2 start ecosystem.config.cjs --update-env
```

### 6. Sprawdź logi:

```bash
pm2 logs profitflow
```

## Weryfikacja

Po uruchomieniu sprawdź:
- Aplikacja startuje bez błędów "Dynamic require"
- Logi pokazują "Server running on http://localhost:3000/"
- Aplikacja działa w przeglądarce

## Zalety tego podejścia

1. **Brak problemów z bundlowaniem** - moduły są ładowane przez Node.js w runtime
2. **Prostsza konfiguracja** - nie trzeba konfigurować external dla każdego modułu
3. **Szybszy development** - zmiany w kodzie są widoczne od razu (bez rebuildu)

## Wady

1. **Wolniejszy start** - TypeScript jest kompilowany w runtime (ale to zazwyczaj < 1 sekunda)
2. **Większe zużycie pamięci** - tsx musi być w pamięci

## Alternatywne rozwiązanie (jeśli tsx nie działa)

Jeśli `tsx` nie działa w PM2, możesz użyć:

```javascript
// ecosystem.config.cjs
{
  name: 'profitflow',
  script: './node_modules/.bin/tsx',
  args: './server/_core/index.ts',
  // ...
}
```

Lub użyć `node --loader` (wymaga Node.js 20.6+):

```javascript
{
  name: 'profitflow',
  script: './server/_core/index.ts',
  interpreter: 'node',
  interpreter_args: '--loader tsx/esm',
  // ...
}
```

## Rozwiązywanie problemów

### Problem: PM2 nie może znaleźć tsx

**Rozwiązanie:**
```bash
# Sprawdź, czy tsx jest zainstalowany
which tsx
pnpm exec which tsx

# Jeśli nie, zainstaluj
pnpm install
```

### Problem: Błąd "Cannot find module tsx"

**Rozwiązanie:**
```bash
# Upewnij się, że tsx jest w dependencies (nie devDependencies)
grep tsx package.json

# Zainstaluj zależności
pnpm install
```

### Problem: Aplikacja startuje wolno

To normalne - TypeScript jest kompilowany w runtime. Jeśli to problem, możesz użyć `build:server` do bundlowania, ale wtedy musisz rozwiązać problem z external modules.

