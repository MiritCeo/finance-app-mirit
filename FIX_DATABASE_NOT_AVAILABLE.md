# Rozwiązanie błędu "Database not available"

## Problem

Aplikacja zwraca błąd: `Error: Database not available`

## Przyczyna

Błąd występuje, gdy `DATABASE_URL` nie jest ustawione w zmiennych środowiskowych dostępnych dla aplikacji uruchomionej przez PM2.

## Rozwiązanie

### Krok 1: Sprawdź, czy DATABASE_URL jest ustawione w PM2

```bash
pm2 env 0 | grep DATABASE_URL
```

Jeśli nie widzisz `DATABASE_URL`, musisz je ustawić.

### Krok 2: Ustaw DATABASE_URL

**Opcja A: Użyj pliku .env (Zalecane)**

1. Utwórz lub edytuj plik `.env` w katalogu głównym projektu:
   ```bash
   nano .env
   ```

2. Dodaj `DATABASE_URL`:
   ```bash
   DATABASE_URL="mysql://user:password@host:port/database"
   ```

3. Uruchom PM2 z flagą `--update-env`:
   ```bash
   pm2 delete all
   pm2 start ecosystem.config.cjs --update-env
   ```

**Opcja B: Ustaw w systemie**

```bash
export DATABASE_URL="mysql://user:password@host:port/database"
pm2 restart ecosystem.config.cjs
```

**Opcja C: Dodaj do ecosystem.config.cjs (NIEZALECANE dla produkcji)**

```javascript
env: {
  NODE_ENV: 'production',
  PORT: 3000,
  DATABASE_URL: process.env.DATABASE_URL, // Ładuj z systemu
  // ...
}
```

### Krok 3: Sprawdź logi PM2

Po ustawieniu `DATABASE_URL`, sprawdź logi:

```bash
pm2 logs profitflow
```

Powinieneś zobaczyć:
```
[Database] Connecting to database...
[Database] Connected successfully
```

Jeśli widzisz błąd, sprawdź:
- Czy `DATABASE_URL` jest poprawnie sformatowane
- Czy baza danych jest dostępna
- Czy użytkownik ma uprawnienia do bazy danych

### Krok 4: Weryfikacja

Sprawdź, czy aplikacja może połączyć się z bazą:

```bash
# Sprawdź zmienne w PM2
pm2 env 0

# Sprawdź logi
pm2 logs profitflow | grep -i database
```

## Format DATABASE_URL

### MySQL lokalny:
```
DATABASE_URL="mysql://username:password@localhost:3306/database_name"
```

### TiDB Cloud:
```
DATABASE_URL="mysql://user.root:password@gateway01.eu-central-1.prod.aws.tidbcloud.com:4000/database_name?ssl={\"minVersion\":\"TLSv1.2\",\"rejectUnauthorized\":true}"
```

### MySQL w Docker:
```
DATABASE_URL="mysql://username:password@db:3306/database_name"
```

## Rozwiązywanie problemów

### Problem: DATABASE_URL jest ustawione, ale nadal błąd

**Sprawdź:**
1. Czy connection string jest poprawny (sprawdź cudzysłowy, znaki specjalne)
2. Czy baza danych jest dostępna:
   ```bash
   mysql -h host -u user -p
   ```
3. Czy użytkownik ma uprawnienia:
   ```sql
   SHOW GRANTS FOR 'user'@'host';
   ```

### Problem: PM2 nie widzi zmiennych z .env

**Rozwiązanie:**
```bash
# Użyj --update-env
pm2 delete all
pm2 start ecosystem.config.cjs --update-env

# Lub zainstaluj pm2-dotenv
pnpm add -D pm2-dotenv
```

I dodaj do `ecosystem.config.cjs`:
```javascript
require('pm2-dotenv').config();
```

### Problem: Błąd połączenia z bazą danych

**Sprawdź logi:**
```bash
pm2 logs profitflow | grep -i "failed\|error"
```

**Możliwe przyczyny:**
- Nieprawidłowe hasło
- Baza danych nie istnieje
- Host nie jest dostępny
- Problem z SSL (dla TiDB Cloud)

## Kompletna procedura

```bash
# 1. Sprawdź, czy .env istnieje
cat .env | grep DATABASE_URL

# 2. Jeśli nie istnieje, utwórz
nano .env
# Dodaj: DATABASE_URL="mysql://..."

# 3. Zatrzymaj PM2
pm2 stop all
pm2 delete all

# 4. Uruchom z --update-env
pm2 start ecosystem.config.cjs --update-env

# 5. Sprawdź logi
pm2 logs profitflow

# 6. Sprawdź zmienne
pm2 env 0 | grep DATABASE_URL
```

## Bezpieczeństwo

⚠️ **WAŻNE:**
- **NIGDY** nie commituj pliku `.env` do repozytorium
- **NIGDY** nie dodawaj `DATABASE_URL` z hasłem bezpośrednio do `ecosystem.config.cjs`
- Używaj zmiennych systemowych lub pliku `.env` (dodanego do `.gitignore`)

