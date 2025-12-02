#!/bin/bash

# ===================================
# ProfitFlow - Build Script
# ===================================
# Skrypt do budowania aplikacji produkcyjnej
#
# Użycie:
#   chmod +x build.sh
#   ./build.sh
#

set -e  # Exit on error

echo "=================================="
echo "ProfitFlow - Build Script"
echo "=================================="
echo ""

# Kolory
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

# 1. Sprawdź czy .env istnieje
if [ ! -f .env ]; then
    echo "❌ Błąd: Brak pliku .env"
    echo "Skopiuj .env.production.example do .env i uzupełnij zmienne"
    exit 1
fi

# 2. Sprawdź czy NODE_ENV jest ustawiony
if ! grep -q "NODE_ENV=production" .env; then
    print_info "Ustawianie NODE_ENV=production w .env..."
    echo "NODE_ENV=production" >> .env
fi

# 3. Zainstaluj zależności
print_info "Instalacja zależności..."
pnpm install --frozen-lockfile
print_success "Zależności zainstalowane"

# 4. Sprawdź TypeScript
print_info "Sprawdzanie błędów TypeScript..."
pnpm exec tsc --noEmit || {
    echo "❌ Błędy TypeScript! Napraw je przed budowaniem."
    exit 1
}
print_success "TypeScript OK"

# 5. Wyczyść poprzednie buildy
print_info "Czyszczenie poprzednich buildów..."
rm -rf client/dist
print_success "Poprzednie buildy usunięte"

# 6. Zbuduj frontend
print_info "Budowanie frontendu..."
pnpm build
print_success "Frontend zbudowany"

# 7. Sprawdź czy build się powiódł
if [ ! -d "client/dist" ]; then
    echo "❌ Błąd: Katalog client/dist nie został utworzony"
    exit 1
fi

# 8. Pokaż rozmiar buildu
print_info "Rozmiar buildu:"
du -sh client/dist

echo ""
echo "=================================="
print_success "Build zakończony pomyślnie!"
echo "=================================="
echo ""
print_info "Możesz teraz uruchomić aplikację:"
echo "  - PM2: pm2 start ecosystem.config.js"
echo "  - Docker: docker compose up -d --build"
echo "  - Bezpośrednio: node server/index.js"
echo ""
