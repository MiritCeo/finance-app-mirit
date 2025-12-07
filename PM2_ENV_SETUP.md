# Konfiguracja zmiennych środowiskowych dla PM2

## Problem

PM2 potrzebuje dostępu do zmiennych środowiskowych (DATABASE_URL, JWT_SECRET, itp.), aby aplikacja mogła działać poprawnie.

## Rozwiązanie

Istnieje kilka sposobów ustawienia zmiennych środowiskowych dla PM2:

### Opcja 1: Plik .env (Zalecane)

PM2 automatycznie załaduje zmienne z pliku `.env` w katalogu głównym projektu, jeśli używasz PM2 w wersji 2.5.0+.

1. **Utwórz plik `.env` w katalogu głównym projektu:**
   ```bash
   nano .env
   ```

2. **Dodaj wszystkie wymagane zmienne:**
   ```bash
   NODE_ENV=production
   PORT=3000
   DATABASE_URL=mysql://user:password@host:port/database
   JWT_SECRET=twoj-sekret-klucz-minimum-64-znaki
   VITE_APP_ID=twoj-app-id
   OWNER_OPEN_ID=twoj-open-id
   # ... inne zmienne
   ```

3. **Uruchom PM2 z flagą `--update-env`:**
   ```bash
   pm2 start ecosystem.config.cjs --update-env
   ```

### Opcja 2: Zmienne systemowe

Ustaw zmienne środowiskowe w systemie operacyjnym:

**Linux (dla użytkownika):**
```bash
# Dodaj do ~/.bashrc lub ~/.profile
export DATABASE_URL="mysql://user:password@host:port/database"
export JWT_SECRET="twoj-sekret-klucz"
export NODE_ENV="production"
export PORT=3000
# ... inne zmienne

# Załaduj zmienne
source ~/.bashrc
```

**Linux (systemowo - dla wszystkich użytkowników):**
```bash
# Utwórz plik /etc/environment lub użyj systemd
sudo nano /etc/environment
```

### Opcja 3: Bezpośrednio w ecosystem.config.cjs (NIEZALECANE)

Możesz dodać zmienne bezpośrednio do `ecosystem.config.cjs`, ale **NIE RÓB TEGO** dla wrażliwych danych (JWT_SECRET, hasła do bazy danych), ponieważ plik może być commitowany do repozytorium.

```javascript
env: {
  NODE_ENV: 'production',
  PORT: 3000,
  DATABASE_URL: process.env.DATABASE_URL, // Ładuj z systemu
  JWT_SECRET: process.env.JWT_SECRET,     // Ładuj z systemu
  // ...
}
```

## Weryfikacja

Sprawdź, czy PM2 widzi zmienne środowiskowe:

```bash
# Sprawdź zmienne dla procesu
pm2 env 0

# Sprawdź wszystkie zmienne
pm2 show profitflow | grep env
```

## Rozwiązywanie problemów

### Problem: PM2 nie widzi zmiennych z .env

**Rozwiązanie:**
1. Upewnij się, że plik `.env` jest w katalogu głównym projektu
2. Uruchom PM2 z flagą `--update-env`:
   ```bash
   pm2 delete all
   pm2 start ecosystem.config.cjs --update-env
   ```
3. Lub użyj `pm2-dotenv`:
   ```bash
   pnpm add -D pm2-dotenv
   ```
   I dodaj do `ecosystem.config.cjs`:
   ```javascript
   require('pm2-dotenv').config();
   ```

### Problem: Zmienne nie są ładowane po restarcie

**Rozwiązanie:**
1. Upewnij się, że zmienne są ustawione w systemie (nie tylko w sesji terminala)
2. Użyj `pm2 save` po ustawieniu zmiennych:
   ```bash
   pm2 save
   ```

### Problem: Aplikacja nie może połączyć się z bazą danych

**Rozwiązanie:**
1. Sprawdź, czy `DATABASE_URL` jest poprawnie ustawione:
   ```bash
   pm2 env 0 | grep DATABASE_URL
   ```
2. Sprawdź, czy baza danych jest dostępna:
   ```bash
   mysql -h host -u user -p
   ```

## Wymagane zmienne środowiskowe

Zobacz [ENV_VARIABLES.md](ENV_VARIABLES.md) dla pełnej listy zmiennych środowiskowych.

**Minimum wymagane:**
- `NODE_ENV=production`
- `DATABASE_URL` - connection string do bazy danych
- `JWT_SECRET` - sekret do podpisywania JWT (min. 64 znaki)

## Bezpieczeństwo

⚠️ **WAŻNE:**
- **NIGDY** nie commituj pliku `.env` do repozytorium
- **NIGDY** nie dodawaj wrażliwych danych (hasła, sekrety) bezpośrednio do `ecosystem.config.cjs`
- Używaj zmiennych systemowych lub pliku `.env` (dodanego do `.gitignore`)
- Regularnie rotuj sekrety (JWT_SECRET, hasła do bazy danych)

## Przykład kompletnej konfiguracji

1. **Utwórz `.env`:**
   ```bash
   cat > .env << EOF
   NODE_ENV=production
   PORT=3000
   DATABASE_URL=mysql://user:password@host:port/database
   JWT_SECRET=$(openssl rand -base64 48)
   VITE_APP_ID=your-app-id
   OWNER_OPEN_ID=your-open-id
   EOF
   ```

2. **Uruchom PM2:**
   ```bash
   pm2 start ecosystem.config.cjs --update-env
   pm2 save
   ```

3. **Sprawdź:**
   ```bash
   pm2 logs profitflow
   pm2 status
   ```

