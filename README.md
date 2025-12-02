# ProfitFlow

System zarządzania finansami dla firm software house - kompleksowe narzędzie do monitorowania przychodów, kosztów pracowników, projektów i rentowności.

---

## 🚀 Funkcje

### 📊 Dashboard finansowy
- Przegląd kluczowych wskaźników (KPI)
- Całkowity przychód miesięczny
- Koszty pracowników i koszty stałe
- Zysk operacyjny z marżą
- Dokładne wyniki miesięczne z raportów rocznych
- Wykres trendów finansowych (ostatnie 12 miesięcy)

### 👥 Zarządzanie pracownikami
- Baza pracowników z różnymi typami umów (UoP, B2B, zlecenie, zlecenie studenckie)
- Kalkulacja kosztów pracownika (z urlopami)
- Stawki godzinowe dla klienta i koszty wewnętrzne
- Raporty roczne pracowników
- Przypisania do projektów

### 📈 Projekty i klienci
- Zarządzanie klientami i projektami
- Modele rozliczeniowe (Time & Material, Fixed Price)
- Śledzenie przychodów z projektów
- Przypisania pracowników do projektów

### ⏱ Raportowanie godzin
- Miesięczne raportowanie godzin pracy
- Historia raportów z danymi finansowymi
- Szczegółowe wpisy godzinowe dzień po dniu
- Automatyczne obliczanie przychodów i kosztów

### 🧮 Symulator wynagrodzeń
- Kalkulator wynagrodzeń dla różnych form zatrudnienia
- Porównanie efektywności podatkowej
- Symulacja wynagrodzenia właściciela firmy
- Optymalizacja kosztów zatrudnienia

### 💰 Koszty stałe
- Zarządzanie kosztami stałymi firmy
- Kategorie kosztów (wynajem, oprogramowanie, marketing, księgowość, inne)
- Miesięczne i roczne zestawienia

---

## 📋 Wymagania

- **Node.js**: 22.x (LTS)
- **pnpm**: 9.x
- **MySQL**: 8.0+ lub **TiDB**: 7.x+
- **System**: Ubuntu 20.04+ / Debian 11+ / CentOS 8+
- **RAM**: Min. 2 GB (zalecane 4 GB)
- **Dysk**: Min. 10 GB wolnego miejsca

---

## 🔧 Quick Start

### 1. Sklonuj repozytorium

```bash
git clone <your-repo-url>
cd profitflow
```

### 2. Uruchom skrypt instalacyjny

```bash
chmod +x setup.sh
./setup.sh
```

Skrypt automatycznie:
- Zaktualizuje system
- Zainstaluje Node.js 22.x i pnpm
- Opcjonalnie zainstaluje MySQL, PM2, Nginx
- Zainstaluje zależności projektu
- Utworzy plik .env z przykładowymi wartościami
- Wygeneruje JWT_SECRET

### 3. Skonfiguruj zmienne środowiskowe

```bash
nano .env
```

Wypełnij wymagane zmienne (szczegóły w [ENV_VARIABLES.md](ENV_VARIABLES.md)):

```bash
DATABASE_URL="mysql://profitflow:haslo@localhost:3306/profitflow"
JWT_SECRET="<wygenerowany_automatycznie>"
NODE_ENV="production"
PORT=3000
OWNER_NAME="Twoje Imię"
VITE_APP_TITLE="ProfitFlow"
```

### 4. Skonfiguruj bazę danych

#### Opcja A: Lokalna baza MySQL

```bash
sudo mysql -u root -p
```

```sql
CREATE DATABASE profitflow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'profitflow'@'localhost' IDENTIFIED BY 'TWOJE_HASLO';
GRANT ALL PRIVILEGES ON profitflow.* TO 'profitflow'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

#### Opcja B: TiDB Cloud (zalecane)

1. Załóż konto na [TiDB Cloud](https://tidbcloud.com/)
2. Utwórz klaster (Free Tier dostępny)
3. Skopiuj connection string do .env

### 5. Uruchom migracje

```bash
pnpm db:push
```

### 6. (Opcjonalnie) Załaduj przykładowe dane

```bash
pnpm exec tsx scripts/seedRealistic.ts
```

To utworzy:
- 12 pracowników z różnymi typami umów
- 4 klientów i 4 projekty
- 4 koszty stałe
- Raporty miesięczne za ostatnie 3 miesiące
- 768 wpisów godzinowych

### 7. Zbuduj aplikację

```bash
chmod +x build.sh
./build.sh
```

### 8. Uruchom aplikację

#### Opcja A: PM2 (zalecane dla produkcji)

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### Opcja B: Docker Compose

```bash
docker compose up -d --build
```

#### Opcja C: Bezpośrednio

```bash
node server/index.js
```

### 9. Otwórz w przeglądarce

```
http://localhost:3000
```

---

## 📚 Dokumentacja

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Kompletny przewodnik wdrożenia
- **[ENV_VARIABLES.md](ENV_VARIABLES.md)** - Dokumentacja zmiennych środowiskowych

---

## 🏗 Architektura

### Stack technologiczny

**Frontend:**
- React 19
- Tailwind CSS 4
- shadcn/ui
- tRPC Client
- Recharts (wykresy)
- Wouter (routing)

**Backend:**
- Node.js 22
- Express 4
- tRPC 11
- Drizzle ORM
- MySQL 8 / TiDB

**DevOps:**
- Docker & Docker Compose
- PM2 (process manager)
- Nginx (reverse proxy)

### Struktura projektu

```
profitflow/
├── client/              # Frontend React
│   ├── public/         # Statyczne pliki
│   └── src/
│       ├── components/ # Komponenty UI
│       ├── pages/      # Strony aplikacji
│       ├── contexts/   # React contexts
│       ├── hooks/      # Custom hooks
│       └── lib/        # Biblioteki (tRPC client)
├── server/             # Backend Express + tRPC
│   ├── _core/         # Core framework (OAuth, context, tRPC)
│   ├── db.ts          # Query helpers
│   ├── routers.ts     # tRPC procedures
│   └── salaryCalculator.ts # Logika kalkulacji wynagrodzeń
├── drizzle/           # Schema i migracje bazy danych
├── scripts/           # Skrypty pomocnicze (seed, etc.)
├── shared/            # Współdzielone typy i stałe
└── storage/           # Helpery S3 (opcjonalne)
```

---

## 🔒 Bezpieczeństwo

- ✅ JWT authentication
- ✅ Bezpieczne sesje (httpOnly cookies)
- ✅ CORS protection
- ✅ SQL injection protection (Drizzle ORM)
- ✅ XSS protection
- ✅ SSL/HTTPS support

**Checklist bezpieczeństwa przed wdrożeniem:**

- [ ] Zmień domyślne hasła bazy danych
- [ ] Użyj silnego JWT_SECRET (min. 64 znaki)
- [ ] Włącz SSL/HTTPS
- [ ] Skonfiguruj firewall
- [ ] Regularnie aktualizuj system i zależności
- [ ] Włącz automatyczne backupy bazy danych
- [ ] Ogranicz dostęp SSH (klucze zamiast haseł)

---

## 🧪 Testowanie

```bash
# Uruchom testy
pnpm test

# Sprawdź TypeScript
pnpm exec tsc --noEmit
```

---

## 📊 Monitoring

### PM2 Monitoring

```bash
# Dashboard
pm2 monit

# Logi
pm2 logs profitflow

# Status
pm2 status
```

### Docker Monitoring

```bash
# Logi
docker compose logs -f app

# Statystyki
docker stats
```

---

## 🔄 Aktualizacje

```bash
# Pobierz najnowszy kod
git pull origin main

# Zainstaluj zależności
pnpm install

# Uruchom migracje
pnpm db:push

# Zbuduj aplikację
pnpm build

# Restart
pm2 restart profitflow
# lub
docker compose up -d --build
```

---

## 🐛 Troubleshooting

### Aplikacja nie startuje

```bash
# Sprawdź logi
pm2 logs profitflow
# lub
docker compose logs app

# Sprawdź czy port 3000 jest wolny
sudo lsof -i :3000
```

### Błąd połączenia z bazą danych

```bash
# Test połączenia
mysql -u profitflow -p -h localhost profitflow

# Sprawdź status MySQL
sudo systemctl status mysql
```

### 502 Bad Gateway w Nginx

```bash
# Sprawdź czy aplikacja działa
pm2 status

# Sprawdź logi Nginx
sudo tail -f /var/log/nginx/error.log
```

Więcej w [DEPLOYMENT.md](DEPLOYMENT.md#troubleshooting).

---

## 📦 Backup i Restore

### Backup bazy danych

```bash
# Utwórz backup
mysqldump -u profitflow -p profitflow | gzip > backup_$(date +%Y%m%d).sql.gz

# Automatyczny backup (cron)
crontab -e
# Dodaj: 0 2 * * * mysqldump -u profitflow -pHASLO profitflow | gzip > /backups/profitflow_$(date +\%Y\%m\%d).sql.gz
```

### Restore bazy danych

```bash
# Z kompresji
gunzip < backup.sql.gz | mysql -u profitflow -p profitflow
```

---

## 🤝 Wsparcie

W razie problemów:
1. Sprawdź [DEPLOYMENT.md](DEPLOYMENT.md#troubleshooting)
2. Przejrzyj logi aplikacji
3. Sprawdź [ENV_VARIABLES.md](ENV_VARIABLES.md)

---

## 📝 Licencja

Proprietary - Wszystkie prawa zastrzeżone

---

## 👨‍💻 Autorzy

Mateusz Garbarczyk - Właściciel i główny developer

---

**Ostatnia aktualizacja**: Grudzień 2024  
**Wersja**: 1.0.0
