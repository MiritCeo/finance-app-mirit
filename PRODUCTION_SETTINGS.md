# ⚠️ KRYTYCZNE USTAWIENIA PRODUKCYJNE - NIE ZMIENIAĆ

**Data utworzenia:** 2025-12-08  
**Status:** ✅ DZIAŁAJĄCE - NIE MODYFIKOWAĆ BEZ KONSULTACJI

Ten dokument zawiera kluczowe ustawienia, które zapewniają poprawne działanie aplikacji w środowisku produkcyjnym. **NIE ZMIENIAJ** tych ustawień bez dokładnego zrozumienia konsekwencji.

---

## 📋 Spis treści

1. [PM2 Configuration (`ecosystem.config.cjs`)](#1-pm2-configuration-ecosystemconfigcjs)
2. [Vite Build Configuration (`vite.config.ts`)](#2-vite-build-configuration-viteconfigts)
3. [Package.json Build Scripts](#3-packagejson-build-scripts)
4. [Server Startup (`server/_core/index.ts`)](#4-server-startup-server_coreindexts)
5. [Database Connection (`server/db.ts`)](#5-database-connection-serverdbts)

---

## 1. PM2 Configuration (`ecosystem.config.cjs`)

### ⚠️ KRYTYCZNE USTAWIENIA:

```javascript
{
  name: 'profitflow',
  script: './server/_core/index.ts',  // ✅ NIE ZMIENIAJ - używa tsx
  interpreter: 'pnpm',                 // ✅ NIE ZMIENIAJ
  interpreter_args: 'exec tsx',        // ✅ NIE ZMIENIAJ
  instances: 1,                        // ✅ NIE ZMIENIAJ - cluster mode nie działa z ES modules
  exec_mode: 'fork',                   // ✅ NIE ZMIENIAJ - fork mode dla ES modules
  cwd: __dirname,                      // ✅ NIE ZMIENIAJ - zapewnia poprawne ładowanie .env
}
```

### 🔑 Ładowanie zmiennych środowiskowych:

**WAŻNE:** Plik `.env` jest ładowany na dwa sposoby:
1. W `ecosystem.config.cjs` na początku pliku (dla PM2)
2. W `server/_core/index.ts` w funkcji `startServer()` (dla aplikacji)

**NIE USUWAJ** żadnego z tych mechanizmów - oba są potrzebne!

```javascript
// ✅ NIE USUWAJ - ładowanie .env w ecosystem.config.cjs
const envPath = path.resolve(__dirname, '.env');
const envResult = dotenv.config({ path: envPath });

// ✅ NIE USUWAJ - przekazywanie wszystkich zmiennych do procesu
env: {
  ...(envResult.parsed || {}),  // Wszystkie zmienne z .env
  // + explicite zmienne dla pewności
}
```

---

## 2. Vite Build Configuration (`vite.config.ts`)

### ⚠️ KRYTYCZNE USTAWIENIA:

#### `manualChunks` - Podział na chunki

**PROBLEM ROZWIĄZANY:** `lucide-react` wymaga dostępu do React. Jeśli są w różnych chunkach, pojawia się błąd:
```
Cannot read properties of undefined (reading 'forwardRef')
```

**ROZWIĄZANIE (NIE ZMIENIAJ):**

```typescript
manualChunks: (id) => {
  if (id.includes('node_modules')) {
    // ✅ KRYTYCZNE: React i lucide-react MUSZĄ być w tym samym chunku
    if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
      return 'react-vendor';
    }
    // ✅ KRYTYCZNE: lucide-react MUSI być w react-vendor (razem z React)
    if (id.includes('lucide-react')) {
      return 'react-vendor';  // NIE ZMIENIAJ na osobny chunk!
    }
    if (id.includes('@radix-ui')) {
      return 'radix-ui';
    }
    if (id.includes('recharts')) {
      return 'recharts';
    }
    return 'vendor';
  }
}
```

**⚠️ UWAGA:** Jeśli przeniesiesz `lucide-react` do osobnego chunku (np. `'lucide'`), aplikacja przestanie działać w przeglądarce!

---

## 3. Package.json Build Scripts

### ⚠️ KRYTYCZNE USTAWIENIA:

```json
{
  "scripts": {
    "build": "NODE_OPTIONS='--max-old-space-size=4096' vite build",
    "build:server": "esbuild server/_core/index.ts --platform=node --bundle --format=esm --outdir=dist --packages=external --external:./vite.config*"
  }
}
```

#### `NODE_OPTIONS='--max-old-space-size=4096'`

**Dlaczego jest potrzebne:**
- Build na serwerze produkcyjnym wymaga więcej pamięci
- Bez tego build kończy się błędem: `rendering chunks (90)...Killed` (exit code 137)
- 4096 MB (4 GB) to minimum dla stabilnego buildu

**NIE ZMNIEJSZAJ** tego limitu bez zwiększenia pamięci RAM serwera!

#### `build:server` - esbuild configuration

**WAŻNE:** Flaga `--packages=external` oznacza, że wszystkie pakiety z `node_modules` są externalizowane (nie bundlowane). To zapobiega błędom typu:
- `Error: Dynamic require of "fs" is not supported`
- `Error: Dynamic require of "util" is not supported`

**NIE USUWAJ** `--packages=external`!

---

## 4. Server Startup (`server/_core/index.ts`)

### ⚠️ KRYTYCZNE USTAWIENIA:

#### Ładowanie `.env` w `startServer()`

```typescript
// ✅ NIE USUWAJ - ładowanie .env w aplikacji (nie tylko w PM2)
const envPath = path.resolve(process.cwd(), ".env");
const result = dotenv.config({ path: envPath });
```

**Dlaczego jest potrzebne:**
- PM2 ładuje `.env` w `ecosystem.config.cjs`, ale aplikacja też musi załadować `.env` dla pewności
- Zapewnia dostępność zmiennych środowiskowych w całej aplikacji
- Logowanie pomaga w diagnostyce

#### Test połączenia z bazą danych

```typescript
// ✅ NIE USUWAJ - test połączenia przy starcie
const { getDb } = await import("../db");
const db = await getDb();
if (db) {
  await db.execute({ sql: "SELECT 1 as test", params: [] });
  console.log("[Database] Test połączenia z bazą danych: OK");
}
```

**Dlaczego jest potrzebne:**
- Wykrywa problemy z bazą danych przy starcie (zamiast przy pierwszym zapytaniu)
- Pomaga w diagnostyce problemów produkcyjnych

---

## 5. Database Connection (`server/db.ts`)

### ⚠️ KRYTYCZNE USTAWIENIA:

#### Lazy connection pattern

```typescript
let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db) {
    if (!process.env.DATABASE_URL) {
      console.error("[Database] DATABASE_URL is not set in environment variables");
      return null;
    }
    try {
      console.log("[Database] Connecting to database...");
      _db = drizzle(process.env.DATABASE_URL);
      console.log("[Database] Connected successfully");
    } catch (error) {
      console.error("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
```

**NIE ZMIENIAJ** tego wzorca - lazy connection jest poprawny i wydajny.

---

## 🔍 Checklist przed zmianą ustawień

Przed modyfikacją któregokolwiek z powyższych ustawień:

- [ ] Czy rozumiem, dlaczego to ustawienie jest krytyczne?
- [ ] Czy mam backup działającej konfiguracji?
- [ ] Czy przetestowałem zmiany w środowisku deweloperskim?
- [ ] Czy mam plan rollbacku w przypadku problemów?
- [ ] Czy skonsultowałem się z dokumentacją?

---

## 📝 Historia zmian

| Data | Zmiana | Powód |
|------|--------|-------|
| 2025-12-08 | Utworzono dokumentację | Aplikacja działa na produkcji - zapisać ustawienia |
| 2025-12-08 | `lucide-react` w `react-vendor` chunk | Naprawiono błąd `forwardRef` |
| 2025-12-08 | Dodano test połączenia z bazą przy starcie | Lepsza diagnostyka |
| 2025-12-08 | `NODE_OPTIONS='--max-old-space-size=4096'` | Naprawiono out-of-memory podczas buildu |

---

## 🚨 Ostrzeżenie

**NIE MODYFIKUJ** tych ustawień bez:
1. Dokładnego zrozumienia konsekwencji
2. Testowania w środowisku deweloperskim
3. Mając plan rollbacku
4. Backup działającej konfiguracji

Zmiany w tych ustawieniach mogą spowodować:
- ❌ Aplikacja nie startuje
- ❌ Błędy w przeglądarce (`forwardRef`, `require`, etc.)
- ❌ Brak dostępu do zmiennych środowiskowych
- ❌ Problemy z połączeniem do bazy danych
- ❌ Build kończy się błędem out-of-memory

---

**Ostatnia aktualizacja:** 2025-12-08  
**Status aplikacji:** ✅ DZIAŁAJĄCA NA PRODUKCJI

