# Ustawienie DATABASE_URL w PM2

## Problem

PM2 nie widzi zmiennej `DATABASE_URL`, więc aplikacja nie może połączyć się z bazą danych.

## Rozwiązanie

### Opcja 1: Użyj pliku .env (Zalecane)

1. **Utwórz lub edytuj plik `.env` w katalogu głównym projektu:**
   ```bash
   cd ~/finance-app
   nano .env
   ```

2. **Dodaj `DATABASE_URL`:**
   ```bash
   DATABASE_URL="mysql://user:password@host:port/database"
   NODE_ENV=production
   PORT=3000
   JWT_SECRET="twoj-sekret-klucz"
   # ... inne zmienne
   ```

3. **Uruchom PM2 z flagą `--update-env`:**
   ```bash
   pm2 delete all
   pm2 start ecosystem.config.cjs --update-env
   ```

### Opcja 2: Dodaj do ecosystem.config.cjs

Edytuj `ecosystem.config.cjs` i dodaj zmienne do sekcji `env`:

```javascript
env: {
  NODE_ENV: 'production',
  PORT: 3000,
  DATABASE_URL: process.env.DATABASE_URL || "mysql://user:password@host:port/database",
  JWT_SECRET: process.env.JWT_SECRET || "",
  // ... inne zmienne
}
```

**UWAGA:** Nie dodawaj wrażliwych danych (hasła, sekrety) bezpośrednio do pliku, jeśli commitujesz go do repozytorium!

### Opcja 3: Ustaw w systemie

```bash
export DATABASE_URL="mysql://user:password@host:port/database"
export JWT_SECRET="twoj-sekret-klucz"
export NODE_ENV="production"

pm2 restart ecosystem.config.cjs
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

## Weryfikacja

Po ustawieniu sprawdź:

```bash
# Sprawdź zmienne w PM2
pm2 env 0 | grep DATABASE_URL

# Sprawdź logi
pm2 logs profitflow | grep -i database
```

Powinieneś zobaczyć:
```
[Database] Connecting to database...
[Database] Connected successfully
```

## Kompletna procedura

```bash
# 1. Przejdź do katalogu projektu
cd ~/finance-app

# 2. Sprawdź, czy .env istnieje
cat .env | grep DATABASE_URL

# 3. Jeśli nie istnieje, utwórz
nano .env
# Dodaj: DATABASE_URL="mysql://..."

# 4. Zatrzymaj PM2
pm2 stop all
pm2 delete all

# 5. Uruchom z --update-env
pm2 start ecosystem.config.cjs --update-env

# 6. Sprawdź zmienne
pm2 env 0 | grep DATABASE_URL

# 7. Sprawdź logi
pm2 logs profitflow
```

## Rozwiązywanie problemów

### Problem: PM2 nadal nie widzi DATABASE_URL

**Rozwiązanie:**
```bash
# Sprawdź, czy .env jest w katalogu głównym
ls -la .env

# Sprawdź zawartość .env
cat .env

# Uruchom PM2 z --update-env
pm2 delete all
pm2 start ecosystem.config.cjs --update-env

# Sprawdź zmienne
pm2 env 0
```

### Problem: Błąd połączenia z bazą danych

**Sprawdź:**
1. Czy `DATABASE_URL` jest poprawnie sformatowane
2. Czy baza danych jest dostępna:
   ```bash
   mysql -h host -u user -p
   ```
3. Czy użytkownik ma uprawnienia

### Problem: Zmienne nie są ładowane po restarcie

**Rozwiązanie:**
```bash
# Użyj pm2 save
pm2 save

# Lub ustaw zmienne w systemie (dodaj do ~/.bashrc)
export DATABASE_URL="..."
```

