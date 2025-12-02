#!/bin/bash

# ===================================
# ProfitFlow - DigitalOcean Setup Script
# ===================================
# Automatyczny skrypt konfiguracji serwera DigitalOcean
# dla aplikacji ProfitFlow
#
# Użycie:
#   chmod +x do-setup.sh
#   ./do-setup.sh
#

set -e  # Exit on error

echo "========================================="
echo "ProfitFlow - DigitalOcean Setup"
echo "========================================="
echo ""

# Kolory
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

print_step() {
    echo -e "${BLUE}▶${NC} $1"
}

# Sprawdź czy skrypt jest uruchomiony jako root
if [ "$EUID" -eq 0 ]; then
    print_error "Nie uruchamiaj tego skryptu jako root. Użyj sudo tylko gdy będzie potrzebne."
    exit 1
fi

# Banner
echo "Ten skrypt skonfiguruje Twój serwer DigitalOcean dla ProfitFlow:"
echo "  • Aktualizacja systemu"
echo "  • Konfiguracja firewall (UFW)"
echo "  • Instalacja fail2ban"
echo "  • Konfiguracja swap (2GB)"
echo "  • Instalacja Node.js 22.x"
echo "  • Instalacja pnpm"
echo "  • Instalacja MySQL 8.0"
echo "  • Instalacja PM2"
echo "  • Instalacja Nginx"
echo "  • Instalacja zależności projektu"
echo ""
read -p "Kontynuować? (t/n): " confirm
if [ "$confirm" != "t" ] && [ "$confirm" != "T" ]; then
    echo "Przerwano."
    exit 0
fi
echo ""

# ===========================================
# 1. Aktualizacja systemu
# ===========================================
print_step "1/10 Aktualizacja systemu..."
sudo apt update && sudo apt upgrade -y
print_success "System zaktualizowany"
echo ""

# ===========================================
# 2. Konfiguracja firewall (UFW)
# ===========================================
print_step "2/10 Konfiguracja firewall..."
sudo ufw --force enable
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
print_success "Firewall skonfigurowany (SSH, HTTP, HTTPS)"
echo ""

# ===========================================
# 3. Instalacja fail2ban
# ===========================================
print_step "3/10 Instalacja fail2ban..."
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
print_success "Fail2ban zainstalowany i uruchomiony"
echo ""

# ===========================================
# 4. Konfiguracja swap (2GB)
# ===========================================
print_step "4/10 Konfiguracja swap (2GB)..."
if [ ! -f /swapfile ]; then
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    print_success "Swap 2GB utworzony"
else
    print_info "Swap już istnieje"
fi
echo ""

# ===========================================
# 5. Instalacja Node.js 22.x
# ===========================================
print_step "5/10 Instalacja Node.js 22.x..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt install -y nodejs
    NODE_VERSION=$(node --version)
    print_success "Node.js zainstalowany: $NODE_VERSION"
else
    NODE_VERSION=$(node --version)
    print_info "Node.js już zainstalowany: $NODE_VERSION"
fi
echo ""

# ===========================================
# 6. Instalacja pnpm
# ===========================================
print_step "6/10 Instalacja pnpm..."
if ! command -v pnpm &> /dev/null; then
    sudo npm install -g pnpm@latest
    PNPM_VERSION=$(pnpm --version)
    print_success "pnpm zainstalowany: $PNPM_VERSION"
else
    PNPM_VERSION=$(pnpm --version)
    print_info "pnpm już zainstalowany: $PNPM_VERSION"
fi
echo ""

# ===========================================
# 7. Instalacja MySQL 8.0
# ===========================================
print_step "7/10 Instalacja MySQL 8.0..."
if ! command -v mysql &> /dev/null; then
    sudo apt install -y mysql-server
    sudo systemctl start mysql
    sudo systemctl enable mysql
    print_success "MySQL zainstalowany"
    echo ""
    print_info "Uruchamianie mysql_secure_installation..."
    print_info "Ustaw silne hasło root i odpowiedz 'Y' na wszystkie pytania"
    echo ""
    sudo mysql_secure_installation
else
    print_info "MySQL już zainstalowany"
fi
echo ""

# ===========================================
# 8. Instalacja PM2
# ===========================================
print_step "8/10 Instalacja PM2..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
    print_success "PM2 zainstalowany"
else
    print_info "PM2 już zainstalowany"
fi
echo ""

# ===========================================
# 9. Instalacja Nginx
# ===========================================
print_step "9/10 Instalacja Nginx..."
if ! command -v nginx &> /dev/null; then
    sudo apt install -y nginx
    sudo systemctl start nginx
    sudo systemctl enable nginx
    print_success "Nginx zainstalowany"
else
    print_info "Nginx już zainstalowany"
fi
echo ""

# ===========================================
# 10. Instalacja zależności projektu
# ===========================================
print_step "10/10 Instalacja zależności projektu..."
if [ -f "package.json" ]; then
    pnpm install --frozen-lockfile
    print_success "Zależności zainstalowane"
else
    print_info "Brak package.json - pomiń instalację zależności"
fi
echo ""

# ===========================================
# Konfiguracja .env
# ===========================================
print_step "Konfiguracja zmiennych środowiskowych..."
if [ ! -f .env ]; then
    if [ -f .env.production.example ]; then
        cp .env.production.example .env
        print_success "Plik .env utworzony z .env.production.example"
        
        # Generowanie JWT_SECRET
        print_info "Generowanie JWT_SECRET..."
        JWT_SECRET=$(openssl rand -base64 48)
        sed -i "s|JWT_SECRET=\"WYGENERUJ_LOSOWY_STRING_64_ZNAKI_TUTAJ\"|JWT_SECRET=\"$JWT_SECRET\"|g" .env
        print_success "JWT_SECRET wygenerowany"
    else
        print_error "Brak pliku .env.production.example"
    fi
else
    print_info "Plik .env już istnieje"
fi
echo ""

# ===========================================
# Utworzenie katalogów
# ===========================================
print_step "Tworzenie katalogów..."
mkdir -p logs uploads backups
print_success "Katalogi utworzone (logs, uploads, backups)"
echo ""

# ===========================================
# Podsumowanie
# ===========================================
echo "========================================="
print_success "Konfiguracja serwera zakończona!"
echo "========================================="
echo ""
print_info "Status zainstalowanych komponentów:"
echo "  • Node.js: $(node --version)"
echo "  • pnpm: $(pnpm --version)"
echo "  • MySQL: $(mysql --version | awk '{print $3}')"
echo "  • PM2: $(pm2 --version)"
echo "  • Nginx: $(nginx -v 2>&1 | awk '{print $3}')"
echo ""
print_info "Następne kroki:"
echo "1. Skonfiguruj bazę danych MySQL:"
echo "   sudo mysql -u root -p"
echo "   CREATE DATABASE profitflow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
echo "   CREATE USER 'profitflow'@'localhost' IDENTIFIED BY 'SILNE_HASLO';"
echo "   GRANT ALL PRIVILEGES ON profitflow.* TO 'profitflow'@'localhost';"
echo "   FLUSH PRIVILEGES;"
echo "   EXIT;"
echo ""
echo "2. Edytuj plik .env i uzupełnij DATABASE_URL:"
echo "   nano .env"
echo ""
echo "3. Uruchom migracje:"
echo "   pnpm db:push"
echo ""
echo "4. (Opcjonalnie) Załaduj dane testowe:"
echo "   pnpm exec tsx scripts/seedRealistic.ts"
echo ""
echo "5. Zbuduj aplikację:"
echo "   chmod +x build.sh && ./build.sh"
echo ""
echo "6. Uruchom aplikację:"
echo "   pm2 start ecosystem.config.js"
echo "   pm2 save"
echo "   pm2 startup"
echo ""
echo "7. Skonfiguruj Nginx (zobacz DIGITALOCEAN_SETUP.md)"
echo ""
print_info "Dokumentacja: DIGITALOCEAN_SETUP.md"
echo ""
