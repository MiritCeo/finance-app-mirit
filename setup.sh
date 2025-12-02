#!/bin/bash

# ===================================
# ProfitFlow - Setup Script
# ===================================
# Automatyczny skrypt instalacyjny dla Ubuntu/Debian
#
# Użycie:
#   chmod +x setup.sh
#   ./setup.sh
#

set -e  # Exit on error

echo "=================================="
echo "ProfitFlow - Setup Script"
echo "=================================="
echo ""

# Kolory dla outputu
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Funkcje pomocnicze
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

# Sprawdź czy skrypt jest uruchomiony jako root
if [ "$EUID" -eq 0 ]; then
    print_error "Nie uruchamiaj tego skryptu jako root. Użyj sudo tylko gdy będzie potrzebne."
    exit 1
fi

# 1. Aktualizacja systemu
print_info "Aktualizacja systemu..."
sudo apt update && sudo apt upgrade -y
print_success "System zaktualizowany"

# 2. Instalacja Node.js 22.x
print_info "Sprawdzanie Node.js..."
if ! command -v node &> /dev/null; then
    print_info "Instalacja Node.js 22.x..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt install -y nodejs
    print_success "Node.js zainstalowany"
else
    NODE_VERSION=$(node --version)
    print_success "Node.js już zainstalowany: $NODE_VERSION"
fi

# 3. Instalacja pnpm
print_info "Sprawdzanie pnpm..."
if ! command -v pnpm &> /dev/null; then
    print_info "Instalacja pnpm..."
    sudo npm install -g pnpm@latest
    print_success "pnpm zainstalowany"
else
    PNPM_VERSION=$(pnpm --version)
    print_success "pnpm już zainstalowany: $PNPM_VERSION"
fi

# 4. Instalacja MySQL (opcjonalnie)
read -p "Czy chcesz zainstalować MySQL lokalnie? (t/n): " install_mysql
if [ "$install_mysql" = "t" ] || [ "$install_mysql" = "T" ]; then
    print_info "Instalacja MySQL..."
    sudo apt install -y mysql-server
    sudo systemctl start mysql
    sudo systemctl enable mysql
    print_success "MySQL zainstalowany"
    
    print_info "Uruchamianie mysql_secure_installation..."
    sudo mysql_secure_installation
fi

# 5. Instalacja PM2 (opcjonalnie)
read -p "Czy chcesz zainstalować PM2? (t/n): " install_pm2
if [ "$install_pm2" = "t" ] || [ "$install_pm2" = "T" ]; then
    print_info "Instalacja PM2..."
    sudo npm install -g pm2
    print_success "PM2 zainstalowany"
fi

# 6. Instalacja Nginx (opcjonalnie)
read -p "Czy chcesz zainstalować Nginx? (t/n): " install_nginx
if [ "$install_nginx" = "t" ] || [ "$install_nginx" = "T" ]; then
    print_info "Instalacja Nginx..."
    sudo apt install -y nginx
    sudo systemctl start nginx
    sudo systemctl enable nginx
    print_success "Nginx zainstalowany"
fi

# 7. Instalacja zależności projektu
print_info "Instalacja zależności projektu..."
pnpm install --frozen-lockfile
print_success "Zależności zainstalowane"

# 8. Konfiguracja zmiennych środowiskowych
if [ ! -f .env ]; then
    print_info "Tworzenie pliku .env..."
    if [ -f .env.production.example ]; then
        cp .env.production.example .env
        print_success "Plik .env utworzony z .env.production.example"
        print_info "WAŻNE: Edytuj plik .env i uzupełnij wymagane zmienne!"
    else
        print_error "Brak pliku .env.production.example"
    fi
else
    print_success "Plik .env już istnieje"
fi

# 9. Generowanie JWT_SECRET
if [ -f .env ]; then
    if grep -q "WYGENERUJ_LOSOWY_STRING" .env; then
        print_info "Generowanie JWT_SECRET..."
        JWT_SECRET=$(openssl rand -base64 48)
        sed -i "s|JWT_SECRET=\"WYGENERUJ_LOSOWY_STRING_64_ZNAKI_TUTAJ\"|JWT_SECRET=\"$JWT_SECRET\"|g" .env
        print_success "JWT_SECRET wygenerowany"
    fi
fi

# 10. Utworzenie katalogu logs
print_info "Tworzenie katalogów..."
mkdir -p logs uploads
print_success "Katalogi utworzone"

echo ""
echo "=================================="
print_success "Instalacja zakończona!"
echo "=================================="
echo ""
print_info "Następne kroki:"
echo "1. Edytuj plik .env i uzupełnij DATABASE_URL"
echo "2. Uruchom migracje: pnpm db:push"
echo "3. (Opcjonalnie) Załaduj dane testowe: pnpm exec tsx scripts/seedRealistic.ts"
echo "4. Zbuduj aplikację: pnpm build"
echo "5. Uruchom aplikację:"
echo "   - Z PM2: pm2 start ecosystem.config.js"
echo "   - Lub bezpośrednio: node server/index.js"
echo ""
print_info "Dokumentacja: Przeczytaj DEPLOYMENT.md"
echo ""
