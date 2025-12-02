# ProfitFlow - Deployment na DigitalOcean

Kompletna instrukcja krok po kroku: od zakupu serwera do uruchomienia aplikacji ProfitFlow na DigitalOcean.

---

## Spis treści

1. [Zakup i konfiguracja konta DigitalOcean](#zakup-i-konfiguracja-konta-digitalocean)
2. [Tworzenie Droplet (serwera)](#tworzenie-droplet-serwera)
3. [Konfiguracja SSH](#konfiguracja-ssh)
4. [Pierwsze logowanie i zabezpieczenie serwera](#pierwsze-logowanie-i-zabezpieczenie-serwera)
5. [Deployment aplikacji ProfitFlow](#deployment-aplikacji-profitflow)
6. [Konfiguracja domeny](#konfiguracja-domeny)
7. [Instalacja SSL (HTTPS)](#instalacja-ssl-https)
8. [Konfiguracja backupów](#konfiguracja-backupów)
9. [Monitoring i utrzymanie](#monitoring-i-utrzymanie)

---

## Zakup i konfiguracja konta DigitalOcean

### Krok 1: Rejestracja konta

1. **Przejdź na stronę DigitalOcean:**
   - Otwórz: https://www.digitalocean.com/

2. **Załóż konto:**
   - Kliknij **"Sign Up"** w prawym górnym rogu
   - Możesz zarejestrować się przez:
     * Email
     * Google
     * GitHub

3. **Weryfikacja email:**
   - Sprawdź swoją skrzynkę email
   - Kliknij link weryfikacyjny

### Krok 2: Dodanie metody płatności

1. **Przejdź do Billing:**
   - Po zalogowaniu kliknij swój avatar (prawy górny róg)
   - Wybierz **"Billing"**

2. **Dodaj kartę kredytową:**
   - Kliknij **"Add Payment Method"**
   - Wybierz **"Credit Card"**
   - Wypełnij dane karty
   - DigitalOcean pobierze $1 na weryfikację (zwrot automatyczny)

**Alternatywnie - PayPal:**
   - Możesz też użyć PayPal
   - Kliknij **"PayPal"** zamiast karty

### Krok 3: Bonus powitalny (opcjonalnie)

DigitalOcean często oferuje bonusy dla nowych użytkowników:
- Szukaj kodów promocyjnych (np. "$200 credit for 60 days")
- Wpisz kod w sekcji **Billing → Promo Code**

---

## Tworzenie Droplet (serwera)

### Krok 1: Rozpocznij tworzenie Droplet

1. **Kliknij "Create"** (zielony przycisk w prawym górnym rogu)
2. Wybierz **"Droplets"**

### Krok 2: Wybór regionu

**Zalecane regiony dla Polski:**
- **Frankfurt, Germany** (FRA1) - najlepszy ping (~15ms)
- **Amsterdam, Netherlands** (AMS3) - dobry ping (~20ms)
- **London, UK** (LON1) - akceptowalny ping (~30ms)

**Wybierz:** Frankfurt (FRA1)

### Krok 3: Wybór obrazu systemu

1. **Choose an image:**
   - Wybierz zakładkę **"OS"**
   - Wybierz **"Ubuntu"**
   - Wersja: **"22.04 (LTS) x64"** ✅

### Krok 4: Wybór rozmiaru Droplet

**Dla ProfitFlow zalecamy:**

**Opcja 1: Basic Droplet (zalecane na start)**
- **Plan:** Basic
- **CPU options:** Regular
- **Rozmiar:** 
  * **$24/miesiąc** - 2 vCPU, 4 GB RAM, 80 GB SSD, 4 TB transfer
  * ✅ To wybierz

**Opcja 2: Budżetowa (dla testów)**
- **$18/miesiąc** - 2 vCPU, 2 GB RAM, 60 GB SSD
- Uwaga: Może być wolniejsza przy większym ruchu

**Opcja 3: Premium (dla produkcji z dużym ruchem)**
- **$48/miesiąc** - 4 vCPU, 8 GB RAM, 160 GB SSD

### Krok 5: Wybór metody uwierzytelniania

**WAŻNE: Użyj SSH key (bezpieczniejsze niż hasło)**

#### Generowanie SSH key (jeśli nie masz):

**Na Windows (PowerShell):**
```powershell
ssh-keygen -t ed25519 -C "twoj-email@example.com"
```

**Na Mac/Linux (Terminal):**
```bash
ssh-keygen -t ed25519 -C "twoj-email@example.com"
```

- Naciśnij Enter (domyślna lokalizacja: `~/.ssh/id_ed25519`)
- Możesz ustawić hasło (opcjonalnie, ale zalecane)

#### Dodanie SSH key do DigitalOcean:

1. **Skopiuj klucz publiczny:**

**Windows PowerShell:**
```powershell
Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub
```

**Mac/Linux:**
```bash
cat ~/.ssh/id_ed25519.pub
```

2. **W panelu DigitalOcean:**
   - W sekcji **"Authentication"** kliknij **"New SSH Key"**
   - Wklej skopiowany klucz
   - Nadaj nazwę (np. "Mój laptop")
   - Kliknij **"Add SSH Key"**

3. **Zaznacz dodany klucz** w liście

### Krok 6: Dodatkowe opcje (opcjonalne)

**Backups:**
- ☑️ **Enable backups** (+20% ceny, ~$5/miesiąc)
- Automatyczne cotygodniowe snapshoty
- Zalecane dla produkcji

**Monitoring:**
- ☑️ **Improved metrics** (darmowe)
- Szczegółowe metryki CPU, RAM, dysku

**IPv6:**
- ☐ Zostaw wyłączone (nie potrzebne)

### Krok 7: Finalizacja

1. **Hostname:**
   - Nadaj nazwę serwerowi (np. "profitflow-prod")

2. **Tags:** (opcjonalnie)
   - Możesz dodać tagi (np. "production", "profitflow")

3. **Project:**
   - Zostaw domyślny projekt lub utwórz nowy

4. **Kliknij "Create Droplet"** (zielony przycisk na dole)

**Czas tworzenia:** ~60 sekund

---

## Konfiguracja SSH

### Krok 1: Pobierz adres IP serwera

1. Po utworzeniu Droplet zobaczysz go na liście
2. Skopiuj **adres IP** (np. `142.93.xxx.xxx`)

### Krok 2: Pierwsze połączenie SSH

**Na Windows (PowerShell) / Mac / Linux:**

```bash
ssh root@142.93.xxx.xxx
```

Zamień `142.93.xxx.xxx` na swój adres IP.

**Przy pierwszym połączeniu:**
- Zobaczysz komunikat o fingerprint
- Wpisz `yes` i naciśnij Enter

**Powinieneś zobaczyć:**
```
Welcome to Ubuntu 22.04.3 LTS
root@profitflow-prod:~#
```

✅ Jesteś zalogowany!

---

## Pierwsze logowanie i zabezpieczenie serwera

### Krok 1: Aktualizacja systemu

```bash
apt update && apt upgrade -y
```

Czas: ~2-5 minut

### Krok 2: Utworzenie użytkownika (nie używaj root)

```bash
# Utwórz nowego użytkownika
adduser profitflow

# Dodaj do grupy sudo
usermod -aG sudo profitflow

# Skopiuj SSH key do nowego użytkownika
rsync --archive --chown=profitflow:profitflow ~/.ssh /home/profitflow
```

### Krok 3: Testuj nowego użytkownika

**W nowym oknie terminala:**
```bash
ssh profitflow@142.93.xxx.xxx
```

Jeśli działa, możesz zamknąć sesję root.

### Krok 4: Konfiguracja firewall (UFW)

```bash
# Zezwól na SSH
sudo ufw allow OpenSSH

# Zezwól na HTTP i HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Włącz firewall
sudo ufw enable

# Sprawdź status
sudo ufw status
```

### Krok 5: Instalacja fail2ban (ochrona przed bruteforce)

```bash
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### Krok 6: Wyłącz logowanie root przez SSH (opcjonalnie, zalecane)

```bash
sudo nano /etc/ssh/sshd_config
```

Znajdź linię:
```
PermitRootLogin yes
```

Zmień na:
```
PermitRootLogin no
```

Zapisz (Ctrl+X, Y, Enter) i zrestartuj SSH:
```bash
sudo systemctl restart sshd
```

---

## Deployment aplikacji ProfitFlow

### Krok 1: Pobierz projekt na swój komputer

1. W Manus kliknij **"View"** na karcie projektu
2. Przejdź do zakładki **"Code"**
3. Kliknij **"Download all files"**
4. Zapisz plik `profitflow.zip`

### Krok 2: Prześlij projekt na serwer

**Z Twojego komputera:**

```bash
scp profitflow.zip profitflow@142.93.xxx.xxx:/home/profitflow/
```

Zamień IP na swój adres.

### Krok 3: Zaloguj się na serwer

```bash
ssh profitflow@142.93.xxx.xxx
```

### Krok 4: Rozpakuj projekt

```bash
cd /home/profitflow
unzip profitflow.zip
cd profitflow
```

### Krok 5: Uruchom automatyczny skrypt instalacyjny

```bash
chmod +x setup.sh
./setup.sh
```

**Skrypt zapyta Cię o:**
- Czy zainstalować MySQL lokalnie? → **t** (tak)
- Czy zainstalować PM2? → **t** (tak)
- Czy zainstalować Nginx? → **t** (tak)

**Czas instalacji:** ~10-15 minut

### Krok 6: Skonfiguruj bazę danych MySQL

Po instalacji MySQL uruchomi się `mysql_secure_installation`:

1. **Set root password?** → Y (ustaw silne hasło)
2. **Remove anonymous users?** → Y
3. **Disallow root login remotely?** → Y
4. **Remove test database?** → Y
5. **Reload privilege tables?** → Y

**Utwórz bazę danych:**
```bash
sudo mysql -u root -p
```

Wpisz hasło root, które właśnie ustawiłeś.

```sql
CREATE DATABASE profitflow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'profitflow'@'localhost' IDENTIFIED BY 'SILNE_HASLO_TUTAJ';
GRANT ALL PRIVILEGES ON profitflow.* TO 'profitflow'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Krok 7: Skonfiguruj zmienne środowiskowe

```bash
nano .env
```

**Wypełnij:**
```bash
DATABASE_URL="mysql://profitflow:TWOJE_HASLO@localhost:3306/profitflow"
JWT_SECRET="<już wygenerowany przez setup.sh>"
NODE_ENV="production"
PORT=3000
OWNER_NAME="Twoje Imię"
VITE_APP_TITLE="ProfitFlow"
```

Zapisz (Ctrl+X, Y, Enter).

### Krok 8: Uruchom migracje bazy danych

```bash
pnpm db:push
```

### Krok 9: (Opcjonalnie) Załaduj przykładowe dane

```bash
pnpm exec tsx scripts/seedRealistic.ts
```

### Krok 10: Zbuduj aplikację

```bash
chmod +x build.sh
./build.sh
```

### Krok 11: Uruchom aplikację z PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

**Skopiuj i wykonaj komendę** którą PM2 wyświetli (zaczyna się od `sudo`).

### Krok 12: Sprawdź czy działa

```bash
pm2 status
pm2 logs profitflow
```

**Test w przeglądarce:**
```
http://142.93.xxx.xxx:3000
```

✅ Aplikacja powinna działać!

---

## Konfiguracja domeny

### Krok 1: Kup domenę (jeśli nie masz)

**Polecane rejestry:**
- **OVH.pl** - https://www.ovh.pl/domeny/
- **nazwa.pl** - https://www.nazwa.pl/
- **Cloudflare** - https://www.cloudflare.com/products/registrar/

**Cena:** ~50-100 zł/rok za domenę .pl

### Krok 2: Skonfiguruj DNS

W panelu swojego rejestru domen dodaj rekordy DNS:

**Typ A (IPv4):**
```
Nazwa: @
Typ: A
Wartość: 142.93.xxx.xxx (Twój IP DigitalOcean)
TTL: 3600
```

**Typ A dla www:**
```
Nazwa: www
Typ: A
Wartość: 142.93.xxx.xxx
TTL: 3600
```

**Czas propagacji:** 5 minut - 24 godziny (zazwyczaj ~30 minut)

### Krok 3: Konfiguracja Nginx

```bash
sudo nano /etc/nginx/sites-available/profitflow
```

**Wklej konfigurację:**
```nginx
server {
    listen 80;
    server_name twoja-domena.pl www.twoja-domena.pl;

    client_max_body_size 50M;

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

Zamień `twoja-domena.pl` na swoją domenę.

**Aktywuj konfigurację:**
```bash
sudo ln -s /etc/nginx/sites-available/profitflow /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

**Test:**
```
http://twoja-domena.pl
```

---

## Instalacja SSL (HTTPS)

### Krok 1: Zainstaluj Certbot

```bash
sudo apt install certbot python3-certbot-nginx -y
```

### Krok 2: Wygeneruj certyfikat SSL

```bash
sudo certbot --nginx -d twoja-domena.pl -d www.twoja-domena.pl
```

**Certbot zapyta:**
1. **Email address:** Podaj swój email
2. **Terms of Service:** Y (akceptuj)
3. **Share email with EFF:** N (opcjonalnie)

**Certbot automatycznie:**
- Wygeneruje certyfikat
- Skonfiguruje Nginx dla HTTPS
- Ustawi przekierowanie HTTP → HTTPS

### Krok 3: Test automatycznego odnowienia

```bash
sudo certbot renew --dry-run
```

Jeśli nie ma błędów, certyfikat będzie automatycznie odnawiany co 90 dni.

**Test w przeglądarce:**
```
https://twoja-domena.pl
```

✅ Powinieneś zobaczyć kłódkę (bezpieczne połączenie)!

---

## Konfiguracja backupów

### Opcja 1: DigitalOcean Backups (zalecane)

**Włącz w panelu DigitalOcean:**
1. Przejdź do swojego Droplet
2. Kliknij **"Backups"** w menu bocznym
3. Kliknij **"Enable Backups"**
4. Koszt: +20% ceny Droplet (~$5/miesiąc)

**Zalety:**
- Automatyczne cotygodniowe snapshoty
- Łatwy restore jednym kliknięciem
- Przechowywane przez 4 tygodnie

### Opcja 2: Własne backupy bazy danych

**Skrypt backup:**
```bash
sudo nano /usr/local/bin/backup-profitflow.sh
```

**Wklej:**
```bash
#!/bin/bash
BACKUP_DIR="/home/profitflow/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup bazy danych
mysqldump -u profitflow -p'TWOJE_HASLO' profitflow | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Usuń backupy starsze niż 7 dni
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

**Nadaj uprawnienia:**
```bash
sudo chmod +x /usr/local/bin/backup-profitflow.sh
```

**Dodaj do cron (codziennie o 2:00):**
```bash
crontab -e
```

Dodaj linię:
```
0 2 * * * /usr/local/bin/backup-profitflow.sh >> /var/log/backup-profitflow.log 2>&1
```

---

## Monitoring i utrzymanie

### Monitoring PM2

```bash
# Status aplikacji
pm2 status

# Logi w czasie rzeczywistym
pm2 logs profitflow

# Metryki
pm2 monit
```

### Monitoring serwera

**DigitalOcean Monitoring (darmowe):**
1. W panelu przejdź do swojego Droplet
2. Kliknij **"Graphs"**
3. Zobacz: CPU, RAM, Dysk, Network

### Aktualizacje systemu

**Co miesiąc uruchom:**
```bash
sudo apt update && sudo apt upgrade -y
sudo reboot
```

### Aktualizacja aplikacji ProfitFlow

```bash
cd /home/profitflow/profitflow
git pull origin main  # Jeśli używasz Git
# lub skopiuj nową wersję przez scp

pnpm install
pnpm db:push
pnpm build
pm2 restart profitflow
```

---

## Troubleshooting

### Problem: Nie mogę się połączyć przez SSH

**Sprawdź:**
1. Czy używasz poprawnego IP
2. Czy firewall zezwala na SSH: `sudo ufw status`
3. Czy SSH działa: `sudo systemctl status sshd`

### Problem: Aplikacja nie działa (502 Bad Gateway)

```bash
# Sprawdź PM2
pm2 status
pm2 logs profitflow

# Sprawdź Nginx
sudo nginx -t
sudo systemctl status nginx

# Restart aplikacji
pm2 restart profitflow
```

### Problem: Baza danych nie działa

```bash
# Sprawdź MySQL
sudo systemctl status mysql

# Test połączenia
mysql -u profitflow -p profitflow

# Restart MySQL
sudo systemctl restart mysql
```

### Problem: Brak miejsca na dysku

```bash
# Sprawdź użycie dysku
df -h

# Wyczyść logi PM2
pm2 flush

# Wyczyść stare backupy
rm /home/profitflow/backups/db_old*.sql.gz
```

---

## Koszty miesięczne (podsumowanie)

| Pozycja | Koszt |
|---------|-------|
| Droplet Basic (4GB RAM) | $24 |
| Backups (+20%) | $5 |
| Domena .pl | ~$1 (50 zł/rok) |
| **RAZEM** | **~$30/miesiąc (~120 zł)** |

---

## Checklist po deployment

- [ ] Serwer utworzony i zabezpieczony
- [ ] Firewall skonfigurowany (UFW)
- [ ] Fail2ban zainstalowany
- [ ] Aplikacja działa na porcie 3000
- [ ] PM2 uruchomiony i zapisany
- [ ] Nginx skonfigurowany
- [ ] Domena wskazuje na serwer
- [ ] SSL zainstalowany i działa (HTTPS)
- [ ] Backupy włączone
- [ ] Monitoring działa

---

## Wsparcie

Jeśli masz problemy:
1. Sprawdź logi: `pm2 logs profitflow`
2. Sprawdź [DEPLOYMENT.md](DEPLOYMENT.md#troubleshooting)
3. Sprawdź dokumentację DigitalOcean: https://docs.digitalocean.com/

---

**Gratulacje! 🎉**  
Twoja aplikacja ProfitFlow działa na DigitalOcean!

**Ostatnia aktualizacja**: Grudzień 2024  
**Wersja dokumentacji**: 1.0
