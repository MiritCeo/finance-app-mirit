# ProfitFlow - Deployment Guide

Kompletny przewodnik wdrożenia aplikacji ProfitFlow na serwerze produkcyjnym.

---

## Spis treści

1. [Wymagania systemowe](#wymagania-systemowe)
2. [Przygotowanie środowiska](#przygotowanie-środowiska)
3. [Instalacja zależności](#instalacja-zależności)
4. [Konfiguracja bazy danych](#konfiguracja-bazy-danych)
5. [Konfiguracja zmiennych środowiskowych](#konfiguracja-zmiennych-środowiskowych)
6. [Budowanie aplikacji](#budowanie-aplikacji)
7. [Deployment z Docker](#deployment-z-docker)
8. [Deployment bez Docker (PM2)](#deployment-bez-docker-pm2)
9. [Konfiguracja Nginx](#konfiguracja-nginx)
10. [SSL/HTTPS](#sslhttps)
11. [Migracje i seeding](#migracje-i-seeding)
12. [Monitoring i logi](#monitoring-i-logi)
13. [Troubleshooting](#troubleshooting)

---

## Wymagania systemowe

### Minimalne wymagania

- **System operacyjny**: Ubuntu 20.04+ / Debian 11+ / CentOS 8+
- **CPU**: 2 rdzenie
- **RAM**: 2 GB
- **Dysk**: 10 GB wolnego miejsca
- **Node.js**: 22.x (LTS)
- **pnpm**: 9.x
- **MySQL**: 8.0+ lub **TiDB**: 7.x+

### Zalecane wymagania

- **CPU**: 4+ rdzenie
- **RAM**: 4+ GB
- **Dysk**: 20+ GB SSD
- **Backup**: Automatyczne kopie zapasowe bazy danych

---

## Przygotowanie środowiska

### 1. Aktualizacja systemu

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Instalacja Node.js 22.x

```bash
# Dodaj repozytorium NodeSource
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -

# Zainstaluj Node.js
sudo apt install -y nodejs

# Sprawdź wersję
node --version  # Powinno pokazać v22.x.x
```

### 3. Instalacja pnpm

```bash
npm install -g pnpm@latest

# Sprawdź wersję
pnpm --version
```

### 4. Instalacja Git

```bash
sudo apt install -y git
```

---

## Instalacja zależności

### 1. Sklonuj repozytorium

```bash
cd /var/www
sudo mkdir -p profitflow
sudo chown $USER:$USER profitflow
cd profitflow

# Jeśli masz repozytorium Git
git clone <your-repo-url> .

# Lub skopiuj pliki ręcznie
```

### 2. Zainstaluj zależności

```bash
pnpm install --frozen-lockfile
```

---

## Konfiguracja bazy danych

### Opcja 1: MySQL 8.0+

#### Instalacja MySQL

```bash
sudo apt install -y mysql-server
sudo mysql_secure_installation
```

#### Utworzenie bazy danych i użytkownika

```bash
sudo mysql -u root -p
```

```sql
CREATE DATABASE profitflow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'profitflow'@'localhost' IDENTIFIED BY 'STRONG_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON profitflow.* TO 'profitflow'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Opcja 2: TiDB Cloud (zalecane dla produkcji)

1. Załóż konto na [TiDB Cloud](https://tidbcloud.com/)
2. Utwórz nowy klaster (Free Tier dostępny)
3. Pobierz connection string z panelu

---

## Konfiguracja zmiennych środowiskowych

### 1. Skopiuj przykładowy plik

```bash
cp .env.example .env
```

### 2. Edytuj plik .env

```bash
nano .env
```

### 3. Wypełnij wymagane zmienne

```env
# === BAZA DANYCH ===
DATABASE_URL="mysql://profitflow:TWOJE_HASLO@localhost:3306/profitflow"

# === JWT SECRET (wygeneruj losowy string) ===
JWT_SECRET="WYGENERUJ_LOSOWY_STRING_64_ZNAKI"

# === OAUTH (opcjonalne - jeśli nie używasz Manus OAuth) ===
OAUTH_SERVER_URL="https://api.manus.im"
VITE_OAUTH_PORTAL_URL="https://manus.im/oauth"
VITE_APP_ID="your-app-id"

# === WŁAŚCICIEL APLIKACJI ===
OWNER_OPEN_ID="your-open-id"
OWNER_NAME="Twoje Imię i Nazwisko"

# === APLIKACJA ===
VITE_APP_TITLE="ProfitFlow"
VITE_APP_LOGO="/logo.svg"
NODE_ENV="production"
PORT=3000

# === ANALYTICS (opcjonalne) ===
VITE_ANALYTICS_WEBSITE_ID=""
VITE_ANALYTICS_ENDPOINT=""

# === FORGE API (opcjonalne - tylko jeśli używasz Manus) ===
BUILT_IN_FORGE_API_URL=""
BUILT_IN_FORGE_API_KEY=""
VITE_FRONTEND_FORGE_API_KEY=""
VITE_FRONTEND_FORGE_API_URL=""
```

### Generowanie JWT_SECRET

```bash
# Wygeneruj losowy string 64 znaki
openssl rand -base64 48
```

---

## Budowanie aplikacji

### 1. Uruchom migracje bazy danych

```bash
pnpm db:push
```

### 2. (Opcjonalnie) Załaduj przykładowe dane

```bash
pnpm exec tsx scripts/seedRealistic.ts
```

### 3. Zbuduj frontend

```bash
pnpm build
```

Zbudowane pliki znajdą się w `client/dist/`.

---

## Deployment z Docker

### 1. Zainstaluj Docker i Docker Compose

```bash
# Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Docker Compose
sudo apt install -y docker-compose-plugin

# Dodaj użytkownika do grupy docker
sudo usermod -aG docker $USER
newgrp docker
```

### 2. Zbuduj i uruchom kontenery

```bash
docker compose up -d --build
```

### 3. Sprawdź status

```bash
docker compose ps
docker compose logs -f app
```

### 4. Zatrzymanie

```bash
docker compose down
```

---

## Deployment bez Docker (PM2)

### 1. Zainstaluj PM2

```bash
npm install -g pm2
```

### 2. Uruchom aplikację

```bash
pm2 start ecosystem.config.js
```

### 3. Zapisz konfigurację PM2

```bash
pm2 save
pm2 startup
# Wykonaj komendę którą PM2 wyświetli
```

### 4. Zarządzanie aplikacją

```bash
# Status
pm2 status

# Logi
pm2 logs profitflow

# Restart
pm2 restart profitflow

# Stop
pm2 stop profitflow

# Usuń z PM2
pm2 delete profitflow
```

---

## Konfiguracja Nginx

### 1. Zainstaluj Nginx

```bash
sudo apt install -y nginx
```

### 2. Utwórz konfigurację

```bash
sudo nano /etc/nginx/sites-available/profitflow
```

Wklej zawartość z pliku `nginx.conf` (w katalogu projektu).

### 3. Aktywuj konfigurację

```bash
sudo ln -s /etc/nginx/sites-available/profitflow /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4. Konfiguracja firewall

```bash
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## SSL/HTTPS

### Opcja 1: Let's Encrypt (zalecane)

```bash
# Zainstaluj Certbot
sudo apt install -y certbot python3-certbot-nginx

# Wygeneruj certyfikat
sudo certbot --nginx -d twoja-domena.pl

# Automatyczne odnowienie
sudo certbot renew --dry-run
```

### Opcja 2: Własny certyfikat

Umieść pliki certyfikatu w `/etc/nginx/ssl/` i zaktualizuj konfigurację Nginx.

---

## Migracje i seeding

### Migracje bazy danych

```bash
# Wygeneruj nową migrację
pnpm db:generate

# Zastosuj migracje
pnpm db:push

# Sprawdź status
pnpm db:studio
```

### Seeding danych

```bash
# Załaduj rzetelne dane testowe
pnpm exec tsx scripts/seedRealistic.ts

# Lub własny seeder
pnpm exec tsx scripts/seed.ts
```

---

## Monitoring i logi

### PM2 Monitoring

```bash
# Dashboard
pm2 monit

# Logi w czasie rzeczywistym
pm2 logs profitflow --lines 100

# Metryki
pm2 show profitflow
```

### Docker Monitoring

```bash
# Logi
docker compose logs -f app

# Statystyki zasobów
docker stats

# Sprawdź zdrowie kontenera
docker compose ps
```

### Logi Nginx

```bash
# Access logs
sudo tail -f /var/log/nginx/access.log

# Error logs
sudo tail -f /var/log/nginx/error.log
```

---

## Troubleshooting

### Problem: Aplikacja nie startuje

**Sprawdź logi:**
```bash
pm2 logs profitflow
# lub
docker compose logs app
```

**Typowe przyczyny:**
- Błędne zmienne środowiskowe w `.env`
- Brak połączenia z bazą danych
- Port 3000 już zajęty

### Problem: Błąd połączenia z bazą danych

**Sprawdź:**
1. Czy MySQL działa: `sudo systemctl status mysql`
2. Czy DATABASE_URL jest poprawny
3. Czy użytkownik ma uprawnienia

**Test połączenia:**
```bash
mysql -u profitflow -p -h localhost profitflow
```

### Problem: 502 Bad Gateway w Nginx

**Sprawdź:**
1. Czy aplikacja działa: `pm2 status` lub `docker compose ps`
2. Czy port w Nginx odpowiada portowi aplikacji
3. Logi Nginx: `sudo tail -f /var/log/nginx/error.log`

### Problem: Brak modułów Node.js

```bash
# Wyczyść cache i przeinstaluj
rm -rf node_modules pnpm-lock.yaml
pnpm install --frozen-lockfile
```

### Problem: Błędy TypeScript podczas budowania

```bash
# Sprawdź błędy
pnpm exec tsc --noEmit

# Wyczyść cache
rm -rf client/dist server/dist
pnpm build
```

---

## Backup i restore

### Backup bazy danych

```bash
# Utwórz backup
mysqldump -u profitflow -p profitflow > backup_$(date +%Y%m%d_%H%M%S).sql

# Lub z kompresją
mysqldump -u profitflow -p profitflow | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Restore bazy danych

```bash
# Z pliku SQL
mysql -u profitflow -p profitflow < backup.sql

# Z kompresji
gunzip < backup.sql.gz | mysql -u profitflow -p profitflow
```

### Automatyczny backup (cron)

```bash
# Edytuj crontab
crontab -e

# Dodaj backup o 2:00 każdego dnia
0 2 * * * mysqldump -u profitflow -pHASLO profitflow | gzip > /backups/profitflow_$(date +\%Y\%m\%d).sql.gz
```

---

## Aktualizacje

### Aktualizacja aplikacji

```bash
# Pobierz najnowszy kod
git pull origin main

# Zainstaluj zależności
pnpm install

# Uruchom migracje
pnpm db:push

# Zbuduj frontend
pnpm build

# Restart aplikacji
pm2 restart profitflow
# lub
docker compose up -d --build
```

---

## Bezpieczeństwo

### Checklist bezpieczeństwa

- [ ] Zmień domyślne hasła bazy danych
- [ ] Użyj silnego JWT_SECRET (min. 64 znaki)
- [ ] Włącz SSL/HTTPS
- [ ] Konfiguruj firewall (ufw)
- [ ] Regularnie aktualizuj system i zależności
- [ ] Włącz automatyczne backupy
- [ ] Ogranicz dostęp SSH (klucze zamiast haseł)
- [ ] Monitoruj logi pod kątem podejrzanej aktywności

---

## Wsparcie

W razie problemów:
1. Sprawdź sekcję [Troubleshooting](#troubleshooting)
2. Przejrzyj logi aplikacji i serwera
3. Sprawdź dokumentację MySQL/TiDB
4. Skontaktuj się z zespołem rozwoju

---

**Ostatnia aktualizacja**: Grudzień 2024  
**Wersja dokumentacji**: 1.0
