# ProfitFlow - Zmienne Środowiskowe

Kompletna dokumentacja wszystkich zmiennych środowiskowych używanych w aplikacji ProfitFlow.

---

## Spis treści

1. [Wymagane zmienne](#wymagane-zmienne)
2. [Opcjonalne zmienne](#opcjonalne-zmienne)
3. [Zmienne Docker](#zmienne-docker)
4. [Przykłady konfiguracji](#przykłady-konfiguracji)

---

## Wymagane zmienne

Te zmienne **MUSZĄ** być ustawione aby aplikacja działała poprawnie.

### DATABASE_URL

**Typ**: String  
**Wymagane**: Tak  
**Opis**: Connection string do bazy danych MySQL/TiDB

**Format**:
```
mysql://username:password@host:port/database
```

**Przykłady**:

```bash
# Lokalna baza MySQL
DATABASE_URL="mysql://profitflow:haslo123@localhost:3306/profitflow"

# MySQL w Docker
DATABASE_URL="mysql://profitflow:haslo123@db:3306/profitflow"

# TiDB Cloud
DATABASE_URL="mysql://user.root:password@gateway01.eu-central-1.prod.aws.tidbcloud.com:4000/profitflow?ssl={\"minVersion\":\"TLSv1.2\",\"rejectUnauthorized\":true}"

# TiDB Cloud z SSL (zalecane)
DATABASE_URL="mysql://user:pass@host:4000/profitflow?ssl={\"minVersion\":\"TLSv1.2\"}"
```

**Uwagi**:
- Użytkownik musi mieć pełne uprawnienia do bazy danych
- Baza musi używać charset `utf8mb4` i collation `utf8mb4_unicode_ci`
- Dla TiDB Cloud zawsze używaj SSL

---

### JWT_SECRET

**Typ**: String  
**Wymagane**: Tak  
**Opis**: Sekret używany do podpisywania tokenów JWT (sesje użytkowników)

**Wymagania**:
- Minimum 64 znaki
- Losowy, nieprzewidywalny string
- **NIGDY** nie commituj do repozytorium

**Generowanie**:
```bash
# Wygeneruj silny JWT_SECRET
openssl rand -base64 48
```

**Przykład**:
```bash
JWT_SECRET="xK9mP2vL8qN4rT6wY3zA5bC7dE9fG1hJ3kM5nP7qR9sT1uV3wX5yZ7aB9cD1eF3g"
```

---

### NODE_ENV

**Typ**: String  
**Wymagane**: Tak  
**Wartości**: `development`, `production`, `test`  
**Domyślnie**: `development`

**Przykład**:
```bash
NODE_ENV="production"
```

**Wpływ**:
- `production`: Optymalizacje, brak szczegółowych logów błędów
- `development`: Hot reload, szczegółowe błędy, debug mode
- `test`: Używane podczas testów

---

### PORT

**Typ**: Number  
**Wymagane**: Nie  
**Domyślnie**: `3000`  
**Opis**: Port na którym nasłuchuje serwer

**Przykład**:
```bash
PORT=3000
```

---

## Opcjonalne zmienne

Te zmienne są opcjonalne - aplikacja będzie działać bez nich, ale niektóre funkcje mogą być niedostępne.

### OWNER_OPEN_ID

**Typ**: String  
**Wymagane**: Nie  
**Domyślnie**: `"admin"`  
**Opis**: Identyfikator właściciela aplikacji (używany w OAuth Manus)

**Przykład**:
```bash
OWNER_OPEN_ID="admin"
```

---

### OWNER_NAME

**Typ**: String  
**Wymagane**: Nie  
**Domyślnie**: `"Administrator"`  
**Opis**: Nazwa właściciela aplikacji

**Przykład**:
```bash
OWNER_NAME="Jan Kowalski"
```

---

### VITE_APP_TITLE

**Typ**: String  
**Wymagane**: Nie  
**Domyślnie**: `"ProfitFlow"`  
**Opis**: Tytuł aplikacji wyświetlany w przeglądarce

**Przykład**:
```bash
VITE_APP_TITLE="ProfitFlow - Zarządzanie Finansami"
```

---

### VITE_APP_LOGO

**Typ**: String  
**Wymagane**: Nie  
**Domyślnie**: `"/logo.svg"`  
**Opis**: Ścieżka do logo aplikacji

**Przykład**:
```bash
VITE_APP_LOGO="/logo.svg"
```

---

### OAUTH_SERVER_URL

**Typ**: String  
**Wymagane**: Nie (tylko jeśli używasz Manus OAuth)  
**Opis**: URL serwera OAuth Manus

**Przykład**:
```bash
OAUTH_SERVER_URL="https://api.manus.im"
```

**Uwaga**: Jeśli nie używasz Manus OAuth, zostaw puste lub usuń tę zmienną.

---

### VITE_OAUTH_PORTAL_URL

**Typ**: String  
**Wymagane**: Nie (tylko jeśli używasz Manus OAuth)  
**Opis**: URL portalu OAuth Manus

**Przykład**:
```bash
VITE_OAUTH_PORTAL_URL="https://manus.im/oauth"
```

---

### VITE_APP_ID

**Typ**: String  
**Wymagane**: Nie (tylko jeśli używasz Manus OAuth)  
**Opis**: ID aplikacji w systemie Manus OAuth

**Przykład**:
```bash
VITE_APP_ID="your-app-id-here"
```

---

### VITE_ANALYTICS_WEBSITE_ID

**Typ**: String  
**Wymagane**: Nie  
**Opis**: ID strony w systemie analytics (np. Umami, Plausible)

**Przykład**:
```bash
VITE_ANALYTICS_WEBSITE_ID="abc123def456"
```

---

### VITE_ANALYTICS_ENDPOINT

**Typ**: String  
**Wymagane**: Nie  
**Opis**: Endpoint API analytics

**Przykład**:
```bash
VITE_ANALYTICS_ENDPOINT="https://analytics.example.com/api"
```

---

### BUILT_IN_FORGE_API_URL

**Typ**: String  
**Wymagane**: Nie (tylko jeśli używasz Manus Forge API)  
**Opis**: URL Manus Forge API (backend)

---

### BUILT_IN_FORGE_API_KEY

**Typ**: String  
**Wymagane**: Nie (tylko jeśli używasz Manus Forge API)  
**Opis**: Klucz API Manus Forge (backend)

---

### VITE_FRONTEND_FORGE_API_URL

**Typ**: String  
**Wymagane**: Nie (tylko jeśli używasz Manus Forge API)  
**Opis**: URL Manus Forge API (frontend)

---

### VITE_FRONTEND_FORGE_API_KEY

**Typ**: String  
**Wymagane**: Nie (tylko jeśli używasz Manus Forge API)  
**Opis**: Klucz API Manus Forge (frontend)

---

### LOG_LEVEL

**Typ**: String  
**Wymagane**: Nie  
**Wartości**: `error`, `warn`, `info`, `debug`  
**Domyślnie**: `info`  
**Opis**: Poziom logowania

**Przykład**:
```bash
LOG_LEVEL="info"
```

---

### SESSION_COOKIE_NAME

**Typ**: String  
**Wymagane**: Nie  
**Domyślnie**: `"profitflow_session"`  
**Opis**: Nazwa cookie sesji

**Przykład**:
```bash
SESSION_COOKIE_NAME="profitflow_session"
```

---

### SESSION_COOKIE_MAX_AGE

**Typ**: Number (milisekundy)  
**Wymagane**: Nie  
**Domyślnie**: `2592000000` (30 dni)  
**Opis**: Maksymalny wiek cookie sesji

**Przykład**:
```bash
SESSION_COOKIE_MAX_AGE=2592000000  # 30 dni
```

---

### CORS_ORIGINS

**Typ**: String (oddzielone przecinkami)  
**Wymagane**: Nie  
**Opis**: Lista dozwolonych origin dla CORS

**Przykład**:
```bash
CORS_ORIGINS="http://localhost:3000,https://profitflow.example.com,https://www.profitflow.example.com"
```

---

## Zmienne Docker

Te zmienne są używane tylko w `docker-compose.yml`.

### MYSQL_ROOT_PASSWORD

**Typ**: String  
**Wymagane**: Tak (dla Docker Compose z MySQL)  
**Opis**: Hasło root dla MySQL w kontenerze

**Przykład**:
```bash
MYSQL_ROOT_PASSWORD="super_silne_haslo_root_123"
```

---

### MYSQL_PASSWORD

**Typ**: String  
**Wymagane**: Tak (dla Docker Compose z MySQL)  
**Opis**: Hasło użytkownika aplikacji dla MySQL w kontenerze

**Przykład**:
```bash
MYSQL_PASSWORD="haslo_profitflow_123"
```

---

## Przykłady konfiguracji

### Minimalna konfiguracja (lokalna baza MySQL)

```bash
DATABASE_URL="mysql://profitflow:haslo123@localhost:3306/profitflow"
JWT_SECRET="xK9mP2vL8qN4rT6wY3zA5bC7dE9fG1hJ3kM5nP7qR9sT1uV3wX5yZ7aB9cD1eF3g"
NODE_ENV="production"
PORT=3000
OWNER_NAME="Jan Kowalski"
VITE_APP_TITLE="ProfitFlow"
```

---

### Konfiguracja z TiDB Cloud

```bash
DATABASE_URL="mysql://user.root:password@gateway01.eu-central-1.prod.aws.tidbcloud.com:4000/profitflow?ssl={\"minVersion\":\"TLSv1.2\",\"rejectUnauthorized\":true}"
JWT_SECRET="xK9mP2vL8qN4rT6wY3zA5bC7dE9fG1hJ3kM5nP7qR9sT1uV3wX5yZ7aB9cD1eF3g"
NODE_ENV="production"
PORT=3000
OWNER_NAME="Firma XYZ"
VITE_APP_TITLE="ProfitFlow - Firma XYZ"
```

---

### Konfiguracja Docker Compose

```bash
# Aplikacja
DATABASE_URL="mysql://profitflow:haslo123@db:3306/profitflow"
JWT_SECRET="xK9mP2vL8qN4rT6wY3zA5bC7dE9fG1hJ3kM5nP7qR9sT1uV3wX5yZ7aB9cD1eF3g"
NODE_ENV="production"
PORT=3000

# MySQL w Docker
MYSQL_ROOT_PASSWORD="super_silne_haslo_root"
MYSQL_PASSWORD="haslo123"
```

---

### Konfiguracja z Manus OAuth

```bash
DATABASE_URL="mysql://profitflow:haslo123@localhost:3306/profitflow"
JWT_SECRET="xK9mP2vL8qN4rT6wY3zA5bC7dE9fG1hJ3kM5nP7qR9sT1uV3wX5yZ7aB9cD1eF3g"
NODE_ENV="production"
PORT=3000

# OAuth
OAUTH_SERVER_URL="https://api.manus.im"
VITE_OAUTH_PORTAL_URL="https://manus.im/oauth"
VITE_APP_ID="your-app-id"
OWNER_OPEN_ID="your-open-id"
OWNER_NAME="Jan Kowalski"

# Forge API
BUILT_IN_FORGE_API_URL="https://forge.manus.im"
BUILT_IN_FORGE_API_KEY="your-backend-key"
VITE_FRONTEND_FORGE_API_URL="https://forge.manus.im"
VITE_FRONTEND_FORGE_API_KEY="your-frontend-key"
```

---

## Bezpieczeństwo

### ⚠️ NIGDY nie commituj pliku .env do repozytorium!

Upewnij się że `.env` jest w `.gitignore`:

```bash
# .gitignore
.env
.env.local
.env.production
.env.*.local
```

### ✅ Dobre praktyki:

1. **Używaj silnych haseł** - min. 16 znaków, losowe
2. **Rotacja sekretów** - Zmieniaj JWT_SECRET co kilka miesięcy
3. **Różne sekrety** - Używaj różnych sekretów dla dev/staging/production
4. **Backup** - Przechowuj kopię zmiennych w bezpiecznym miejscu (np. password manager)
5. **Ograniczony dostęp** - Tylko administratorzy powinni mieć dostęp do .env

---

## Troubleshooting

### Problem: "Database connection failed"

**Sprawdź**:
1. Czy DATABASE_URL jest poprawny
2. Czy baza danych działa: `systemctl status mysql`
3. Czy użytkownik ma uprawnienia
4. Czy port nie jest zablokowany przez firewall

**Test połączenia**:
```bash
mysql -u profitflow -p -h localhost profitflow
```

---

### Problem: "JWT verification failed"

**Sprawdź**:
1. Czy JWT_SECRET jest ustawiony
2. Czy JWT_SECRET ma min. 64 znaki
3. Czy JWT_SECRET nie zmienił się od ostatniego logowania (wymaga ponownego logowania)

---

### Problem: "Port 3000 already in use"

**Rozwiązanie**:
1. Zmień PORT w .env na inny (np. 3001)
2. Lub zatrzymaj proces używający portu 3000

**Znajdź proces**:
```bash
sudo lsof -i :3000
```

---

**Ostatnia aktualizacja**: Grudzień 2024  
**Wersja dokumentacji**: 1.0
