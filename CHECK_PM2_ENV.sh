#!/bin/bash
# Skrypt do sprawdzania zmiennych środowiskowych w PM2

echo "=== Status PM2 ==="
pm2 status

echo ""
echo "=== Informacje o procesie profitflow ==="
pm2 show profitflow | grep -A 50 "env:"

echo ""
echo "=== Logi PM2 (ostatnie 30 linii) ==="
pm2 logs profitflow --lines 30 --nostream

echo ""
echo "=== Sprawdzenie .env ==="
if [ -f .env ]; then
    echo "Plik .env istnieje"
    echo "DATABASE_URL w .env: $(grep -E '^DATABASE_URL=' .env | head -c 50)..."
else
    echo "BŁĄD: Plik .env nie istnieje!"
fi

