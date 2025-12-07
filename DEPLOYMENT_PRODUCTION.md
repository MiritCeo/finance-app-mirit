# ProfitFlow - Instrukcje Wdrożenia na Produkcję

Kompletny przewodnik wdrożenia aplikacji ProfitFlow na serwer produkcyjny.

---

## 📋 Spis treści

1. [Wymagania systemowe](#wymagania-systemowe)
2. [Instalacja z repozytorium Git](#instalacja-z-repozytorium-git)
3. [Konfiguracja środowiska](#konfiguracja-środowiska)
4. [Konfiguracja bazy danych](#konfiguracja-bazy-danych)
5. [Budowanie aplikacji](#budowanie-aplikacji)
6. [Uruchomienie aplikacji](#uruchomienie-aplikacji)
7. [Konfiguracja Nginx (opcjonalnie)](#konfiguracja-nginx-opcjonalnie)
8. [Aktualizacje](#aktualizacje)
9. [Backup i Restore](#backup-i-restore)
10. [Troubleshooting](#troubleshooting)

---

## 🔧 Wymagania systemowe

### Minimalne wymagania:
- **OS**: Ubuntu 20.04+ / Debian 11+ / CentOS 8+ / RHEL 8+
- **Node.js**: 22.x (LTS)
- **pnpm**: 10.x
- **MySQL**: 8.0+ lub **TiDB**: 7.x+
- **RAM**: Min. 2 GB (zalecane 4 GB)
- **Dysk**: Min. 10 GB wolnego miejsca
- **CPU**: Min. 2 rdzenie

### Zalecane dla produkcji:
- **RAM**: 4-8 GB
- **Dysk**: 20+ GB (SSD)
- **CPU**: 4+ rdzenie
- **Backup**: Automatyczne backupy bazy danych

---

## 📥 Instalacja z repozytorium Git

### 1. Sklonuj repozytorium

```bash
# Przejdź do katalogu, gdzie chcesz zainstalować aplikację
cd /var/www  # lub inny katalog

# Sklonuj repozytorium
git clone <URL_REPOZYTORIUM> profitflow
cd profitflow

# Sprawdź, czy jesteś na właściwej gałęzi (zwykle main lub master)
git branch
git checkout main  # lub master
```

### 2. Zainstaluj Node.js 22.x

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Sprawdź wersję
node --version  # Powinno pokazać v22.x.x
npm --version
```

### 3. Zainstaluj pnpm

**Opcja A: Użyj corepack (zalecane - wbudowane w Node.js 16+)**

```bash
# Włącz corepack
sudo corepack enable

# Zainstaluj najnowszą wersję pnpm
sudo corepack prepare pnpm@latest --activate

# Sprawdź wersję
pnpm --version  # Powinno pokazać 10.x.x
```

**Opcja B: Instalacja przez npm (jeśli corepack nie działa)**

```bash
# Zainstaluj pnpm globalnie z sudo
sudo npm install -g pnpm@latest

# Sprawdź wersję
pnpm --version  # Powinno pokazać 10.x.x
```

**Opcja C: Napraw uprawnienia (jeśli masz błąd EACCES)**

```bash
# Zmień właściciela katalogu npm global
sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}

# Następnie zainstaluj pnpm bez sudo
npm install -g pnpm@latest
```

**Opcja D: Użyj nvm (Node Version Manager) - najlepsze rozwiązanie**

```bash
# Zainstaluj nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Załaduj nvm
source ~/.bashrc

# Zainstaluj Node.js przez nvm
nvm install 22
nvm use 22
nvm alias default 22

# Zainstaluj pnpm (nie potrzebujesz sudo)
npm install -g pnpm@latest
```

### 4. Zainstaluj zależności projektu

```bash
# Zainstaluj wszystkie zależności
pnpm install --frozen-lockfile

# Sprawdź, czy instalacja się powiodła
pnpm list --depth=0
```

---

## ⚙️ Konfiguracja środowiska

### 1. Utwórz plik .env

```bash
# Skopiuj przykładowy plik (jeśli istnieje)
cp .env.example .env

# Lub utwórz nowy plik
touch .env
```

### 2. Edytuj plik .env

```bash
nano .env
```

### 3. Wypełnij wymagane zmienne środowiskowe

```env
# ============================================
# BAZA DANYCH
# ============================================
# Format: mysql://username:password@host:port/database
DATABASE_URL="mysql://profitflow:TWOJE_SILNE_HASLO@localhost:3306/profitflow"

# ============================================
# BEZPIECZEŃSTWO
# ============================================
# Wygeneruj silny JWT_SECRET (min. 64 znaki)
# Użyj: openssl rand -base64 48
JWT_SECRET="WYGENERUJ_LOSOWY_STRING_64_ZNAKI"

# ============================================
# ŚRODOWISKO
# ============================================
NODE_ENV="production"
PORT=3000

# ============================================
# WŁAŚCICIEL APLIKACJI
# ============================================
OWNER_OPEN_ID="admin"  # ID właściciela (dla OAuth)
OWNER_NAME="Twoje Imię i Nazwisko"

# ============================================
# APLIKACJA
# ============================================
VITE_APP_TITLE="Mirit sp. z o.o. - Finanse"
VITE_APP_LOGO="/logo.svg"

# ============================================
# OPENAI API (dla generowania CV)
# ============================================
OPENAI_API_KEY="YOUR_OPENAI_API_KEY_HERE"

# ============================================
# OAUTH (opcjonalne - jeśli używasz Manus OAuth)
# ============================================
OAUTH_SERVER_URL="https://api.manus.im"
VITE_OAUTH_PORTAL_URL="https://manus.im/oauth"
VITE_APP_ID="your-app-id"

# ============================================
# ANALYTICS (opcjonalne)
# ============================================
VITE_ANALYTICS_WEBSITE_ID=""
VITE_ANALYTICS_ENDPOINT=""

# ============================================
# FORGE API (opcjonalne - tylko jeśli używasz Manus)
# ============================================
BUILT_IN_FORGE_API_URL=""
BUILT_IN_FORGE_API_KEY=""
VITE_FRONTEND_FORGE_API_KEY=""
VITE_FRONTEND_FORGE_API_URL=""
```

### 4. Generowanie JWT_SECRET

```bash
# Wygeneruj silny losowy string (64 znaki)
openssl rand -base64 48

# Skopiuj wygenerowany string do pliku .env jako wartość JWT_SECRET
```

### 5. Zabezpiecz plik .env

```bash
# Ustaw odpowiednie uprawnienia (tylko właściciel może czytać)
chmod 600 .env

# Sprawdź uprawnienia
ls -la .env
# Powinno pokazać: -rw------- (600)
```

---

## 🗄️ Konfiguracja bazy danych

### Opcja A: Lokalna baza MySQL

#### 1. Instalacja MySQL

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y mysql-server

# Uruchom MySQL
sudo systemctl start mysql
sudo systemctl enable mysql

# Zabezpiecz instalację
sudo mysql_secure_installation
```

#### 2. Utworzenie bazy danych i użytkownika

```bash
# Zaloguj się do MySQL jako root
sudo mysql -u root -p
```

W konsoli MySQL wykonaj:

```sql
-- Utwórz bazę danych
CREATE DATABASE profitflow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Utwórz użytkownika
CREATE USER 'profitflow'@'localhost' IDENTIFIED BY 'TWOJE_SILNE_HASLO';

-- Nadaj uprawnienia
GRANT ALL PRIVILEGES ON profitflow.* TO 'profitflow'@'localhost';

-- Zastosuj zmiany
FLUSH PRIVILEGES;

-- Sprawdź uprawnienia
SHOW GRANTS FOR 'profitflow'@'localhost';

-- Wyjdź
EXIT;
```

#### 3. Zaktualizuj DATABASE_URL w .env

```env
DATABASE_URL="mysql://profitflow:TWOJE_SILNE_HASLO@localhost:3306/profitflow"
```

### Opcja B: TiDB Cloud (zalecane dla produkcji)

1. Załóż konto na [TiDB Cloud](https://tidbcloud.com/)
2. Utwórz nowy klaster (Free Tier dostępny)
3. Pobierz connection string z panelu
4. Zaktualizuj DATABASE_URL w .env:

```env
DATABASE_URL="mysql://user.root:password@gateway01.eu-central-1.prod.aws.tidbcloud.com:4000/profitflow?ssl={\"minVersion\":\"TLSv1.2\",\"rejectUnauthorized\":true}"
```

---

## 🏗️ Budowanie aplikacji

### 1. Sprawdź konfigurację

```bash
# Sprawdź, czy plik .env istnieje i jest poprawnie skonfigurowany
cat .env | grep -E "DATABASE_URL|JWT_SECRET|NODE_ENV"

# Sprawdź TypeScript (opcjonalnie)
pnpm exec tsc --noEmit
```

### 2. Uruchom migracje bazy danych

```bash
# Utwórz tabele w bazie danych
pnpm db:push

# Sprawdź, czy migracje się powiodły
# (powinno pokazać komunikaty o utworzonych tabelach)
```

### 3. Zbuduj aplikację

**WAŻNE**: Przed budowaniem wyczyść poprzednie buildy, aby uniknąć problemów z cache:

```bash
# Wyczyść poprzednie buildy
rm -rf dist/ client/dist/

# Zbuduj aplikację
chmod +x build.sh
./build.sh

# Sprawdź, czy build się powiódł
ls -la dist/index.js
# Plik powinien istnieć i mieć rozmiar kilku MB
```

```bash
# Nadaj uprawnienia wykonywania dla build.sh
chmod +x build.sh

# Sprawdź uprawnienia
ls -la build.sh
# Powinno pokazać: -rwxr-xr-x (755)

# Użyj skryptu build.sh (zalecane)
./build.sh

# LUB ręcznie:
pnpm build
```

Skrypt `build.sh` automatycznie:
- Sprawdzi konfigurację .env
- Zainstaluje zależności
- Sprawdzi TypeScript
- Zbuduje frontend
- Wyświetli rozmiar buildu

### 4. Sprawdź build

```bash
# Sprawdź, czy katalog dist został utworzony
ls -la dist/

# Sprawdź rozmiar
du -sh dist/
```

---

## 🚀 Uruchomienie aplikacji

### Opcja A: PM2 (zalecane dla produkcji)

#### 1. Instalacja PM2

```bash
# Zainstaluj PM2 globalnie
npm install -g pm2

# Sprawdź wersję
pm2 --version
```

#### 2. Utwórz katalog na logi

```bash
mkdir -p logs
```

#### 3. Uruchom aplikację

```bash
# Uruchom aplikację z PM2
pm2 start ecosystem.config.cjs

# Sprawdź status
pm2 status

# Zobacz logi
pm2 logs profitflow

# Zapisz konfigurację PM2 (automatyczny restart po reboot)
pm2 save

# Skonfiguruj PM2 do uruchamiania przy starcie systemu
pm2 startup
# Wykonaj komendę, którą PM2 wyświetli (zwykle sudo ...)
```

#### 4. Przydatne komendy PM2

```bash
# Status aplikacji
pm2 status

# Logi w czasie rzeczywistym
pm2 logs profitflow

# Restart aplikacji
pm2 restart profitflow

# Stop aplikacji
pm2 stop profitflow

# Usuń aplikację z PM2
pm2 delete profitflow

# Monitorowanie (dashboard)
pm2 monit

# Informacje o aplikacji
pm2 info profitflow
```

### Opcja B: Docker Compose

#### 1. Skonfiguruj docker-compose.yml

Upewnij się, że `docker-compose.yml` ma poprawne zmienne środowiskowe.

#### 2. Zbuduj i uruchom

```bash
# Zbuduj i uruchom kontenery
docker compose up -d --build

# Sprawdź status
docker compose ps

# Zobacz logi
docker compose logs -f app

# Stop
docker compose down

# Restart
docker compose restart app
```

### Opcja C: Bezpośrednio (tylko do testów)

```bash
# Uruchom bezpośrednio (nie zalecane dla produkcji)
# Po zbudowaniu aplikacji użyj:
node dist/index.js

# LUB jeśli używasz tsx (development):
pnpm exec tsx server/_core/index.ts
```

---

## 🌐 Konfiguracja Nginx (opcjonalnie)

### 1. Instalacja Nginx

```bash
sudo apt install -y nginx
```

### 2. Konfiguracja reverse proxy

```bash
# Utwórz konfigurację
sudo nano /etc/nginx/sites-available/profitflow
```

Dodaj konfigurację:

```nginx
server {
    listen 80;
    server_name twoja-domena.com www.twoja-domena.com;

    # Przekierowanie na HTTPS (opcjonalnie)
    # return 301 https://$server_name$request_uri;

    # Dla HTTP (bez SSL)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. Aktywuj konfigurację

```bash
# Utwórz link symboliczny
sudo ln -s /etc/nginx/sites-available/profitflow /etc/nginx/sites-enabled/

# Sprawdź konfigurację
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Sprawdź status
sudo systemctl status nginx
```

### 4. Konfiguracja SSL (Let's Encrypt)

```bash
# Zainstaluj Certbot
sudo apt install -y certbot python3-certbot-nginx

# Uzyskaj certyfikat SSL
sudo certbot --nginx -d twoja-domena.com -d www.twoja-domena.com

# Automatyczne odnowienie (już skonfigurowane w cron)
sudo certbot renew --dry-run
```

---

## 🔄 Aktualizacje

### Proces aktualizacji aplikacji

```bash
# 1. Przejdź do katalogu aplikacji
cd /var/www/profitflow

# 2. Zatrzymaj aplikację (jeśli używasz PM2)
pm2 stop profitflow

# 3. Pobierz najnowsze zmiany z Git
git pull origin main  # lub master

# 4. Zainstaluj nowe zależności
pnpm install --frozen-lockfile

# 5. Uruchom migracje bazy danych (jeśli są nowe)
pnpm db:push

# 6. Zbuduj aplikację
./build.sh
# lub
pnpm build

# 7. Restart aplikacji
pm2 restart profitflow

# 8. Sprawdź logi
pm2 logs profitflow --lines 50
```

### Automatyczna aktualizacja (opcjonalnie)

Możesz utworzyć skrypt do automatycznej aktualizacji:

```bash
#!/bin/bash
# update.sh

cd /var/www/profitflow
git pull origin main
pnpm install --frozen-lockfile
pnpm db:push
./build.sh
pm2 restart profitflow
```

```bash
chmod +x update.sh
```

---

## 💾 Backup i Restore

### Backup bazy danych

#### Automatyczny backup (cron)

```bash
# Utwórz katalog na backupy
mkdir -p /backups/profitflow

# Utwórz skrypt backupu
nano /usr/local/bin/backup-profitflow.sh
```

Dodaj:

```bash
#!/bin/bash
BACKUP_DIR="/backups/profitflow"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="profitflow"
DB_USER="profitflow"
DB_PASS="TWOJE_HASLO"

# Backup
mysqldump -u $DB_USER -p$DB_PASS $DB_NAME | gzip > $BACKUP_DIR/profitflow_$DATE.sql.gz

# Usuń backupy starsze niż 30 dni
find $BACKUP_DIR -name "profitflow_*.sql.gz" -mtime +30 -delete

echo "Backup utworzony: profitflow_$DATE.sql.gz"
```

```bash
# Nadaj uprawnienia
chmod +x /usr/local/bin/backup-profitflow.sh

# Dodaj do cron (codziennie o 2:00)
crontab -e
# Dodaj:
0 2 * * * /usr/local/bin/backup-profitflow.sh >> /var/log/profitflow-backup.log 2>&1
```

#### Ręczny backup

```bash
# Backup
mysqldump -u profitflow -p profitflow | gzip > backup_$(date +%Y%m%d).sql.gz

# Backup z TiDB Cloud (użyj mysqldump z connection string)
mysqldump -h gateway01.eu-central-1.prod.aws.tidbcloud.com \
  -P 4000 \
  -u user.root \
  -p \
  profitflow | gzip > backup_$(date +%Y%m%d).sql.gz
```

### Restore bazy danych

```bash
# Z kompresji
gunzip < backup_20241201.sql.gz | mysql -u profitflow -p profitflow

# Bez kompresji
mysql -u profitflow -p profitflow < backup.sql
```

---

## 🐛 Troubleshooting

### Aplikacja nie startuje

```bash
# Sprawdź logi PM2
pm2 logs profitflow --lines 100

# Sprawdź logi systemowe
journalctl -u profitflow -n 50

# Sprawdź, czy port 3000 jest wolny
sudo lsof -i :3000

# Sprawdź zmienne środowiskowe
pm2 env profitflow
```

### Błąd połączenia z bazą danych

```bash
# Test połączenia MySQL
mysql -u profitflow -p -h localhost profitflow

# Sprawdź status MySQL
sudo systemctl status mysql

# Sprawdź logi MySQL
sudo tail -f /var/log/mysql/error.log

# Sprawdź DATABASE_URL w .env
cat .env | grep DATABASE_URL
```

### Błąd "Cannot find module"

```bash
# Zainstaluj zależności ponownie
pnpm install --frozen-lockfile

# Sprawdź, czy node_modules istnieje
ls -la node_modules/

# Wyczyść cache i zainstaluj ponownie
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### 502 Bad Gateway w Nginx

```bash
# Sprawdź, czy aplikacja działa
pm2 status

# Sprawdź logi Nginx
sudo tail -f /var/log/nginx/error.log

# Sprawdź konfigurację Nginx
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### Problemy z pamięcią

```bash
# Sprawdź użycie pamięci
free -h

# Sprawdź użycie pamięci przez aplikację
pm2 monit

# Zwiększ limit pamięci w ecosystem.config.cjs
# max_memory_restart: '1G'
```

### Błąd "No procedure found on path" (dowolna procedura tRPC)

Ten błąd oznacza, że router tRPC nie został poprawnie zbudowany. Może dotyczyć:
- `employeeCV.get`
- `dashboard.getTopEmployees`
- `dashboard.getTopEmployeesByYear`
- `dashboard.getProjectProfitability`
- Inne procedury tRPC

**Rozwiązanie:**

```bash
# 1. Zatrzymaj aplikację
pm2 stop profitflow

# 2. Wyczyść buildy (WAŻNE!)
rm -rf dist/ client/dist/

# 3. Zainstaluj zależności
pnpm install --frozen-lockfile

# 4. Zbuduj ponownie
pnpm build

# 5. Sprawdź rozmiar pliku (WAŻNE - powinien być 2-5 MB, nie 188KB!)
du -sh dist/index.js

# Jeśli plik ma mniej niż 1MB, problem jest w konfiguracji buildu
# Zobacz: FIX_BUILD_SIZE.md

# 6. Sprawdź, czy router został zbudowany
grep -i "employeeCV\|getTopEmployees\|getProjectProfitability" dist/index.js | head -5

# 7. Uruchom ponownie
pm2 start ecosystem.config.cjs

# 8. Sprawdź logi
pm2 logs profitflow --lines 50

# 9. Wyczyść cache przeglądarki (Ctrl+Shift+R lub Cmd+Shift+R)
```

**Szczegółowe instrukcje w pliku [FIX_PRODUCTION_CV.md](FIX_PRODUCTION_CV.md)**

### Problemy z uprawnieniami

```bash
# Sprawdź uprawnienia plików
ls -la

# Napraw uprawnienia
chmod 600 .env
chmod 755 build.sh
chmod -R 755 dist/
```

---

## ✅ Checklist przed wdrożeniem

- [ ] Node.js 22.x zainstalowany
- [ ] pnpm zainstalowany
- [ ] Repozytorium sklonowane
- [ ] Zależności zainstalowane (`pnpm install`)
- [ ] Plik `.env` utworzony i skonfigurowany
- [ ] `JWT_SECRET` wygenerowany (min. 64 znaki)
- [ ] `DATABASE_URL` skonfigurowany
- [ ] `OPENAI_API_KEY` ustawiony (jeśli używane)
- [ ] Baza danych utworzona
- [ ] Migracje uruchomione (`pnpm db:push`)
- [ ] Aplikacja zbudowana (`pnpm build`)
- [ ] Aplikacja uruchomiona (PM2/Docker)
- [ ] Port 3000 dostępny
- [ ] Nginx skonfigurowany (opcjonalnie)
- [ ] SSL skonfigurowany (opcjonalnie)
- [ ] Backupy skonfigurowane
- [ ] Firewall skonfigurowany
- [ ] Monitoring skonfigurowany

---

## 📞 Wsparcie

W razie problemów:
1. Sprawdź logi aplikacji (`pm2 logs profitflow`)
2. Sprawdź logi systemowe (`journalctl -u profitflow`)
3. Sprawdź dokumentację w `README.md` i `ENV_VARIABLES.md`
4. Sprawdź sekcję [Troubleshooting](#troubleshooting)

---

**Ostatnia aktualizacja**: Grudzień 2024  
**Wersja**: 1.0.0

