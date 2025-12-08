#!/bin/bash

echo "========================================="
echo "PM2 Diagnostic Script"
echo "========================================="
echo ""

echo "1. Checking PM2 status..."
pm2 status
echo ""

echo "2. Checking PM2 logs (last 20 lines)..."
pm2 logs profitflow --lines 20 --nostream
echo ""

echo "3. Checking if port 3000 is in use..."
if command -v lsof &> /dev/null; then
    lsof -i :3000 || echo "Port 3000 is not in use"
elif command -v netstat &> /dev/null; then
    netstat -tulpn | grep :3000 || echo "Port 3000 is not in use"
elif command -v ss &> /dev/null; then
    ss -tulpn | grep :3000 || echo "Port 3000 is not in use"
else
    echo "Cannot check port (lsof/netstat/ss not available)"
fi
echo ""

echo "4. Checking if dist/public exists..."
if [ -d "dist/public" ]; then
    echo "✓ dist/public exists"
    echo "  Contents:"
    ls -la dist/public/ | head -10
    echo ""
    if [ -f "dist/public/index.html" ]; then
        echo "✓ index.html exists"
        echo "  Size: $(du -h dist/public/index.html | cut -f1)"
    else
        echo "✗ index.html NOT FOUND"
    fi
    if [ -d "dist/public/assets" ]; then
        echo "✓ assets directory exists"
        echo "  Files: $(ls dist/public/assets/ | wc -l) files"
    else
        echo "✗ assets directory NOT FOUND"
    fi
else
    echo "✗ dist/public does NOT exist"
    echo "  Run 'pnpm build' to build the application"
fi
echo ""

echo "5. Checking environment variables in PM2..."
pm2 env 0 | grep -E "(NODE_ENV|PORT|DATABASE_URL|JWT_SECRET)" || echo "No environment variables found"
echo ""

echo "6. Testing HTTP connection..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ | grep -q "200\|404\|500"; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/)
    echo "✓ Server responds with HTTP $HTTP_CODE"
else
    echo "✗ Server does not respond"
fi
echo ""

echo "7. Checking if .env file exists..."
if [ -f ".env" ]; then
    echo "✓ .env file exists"
    echo "  Size: $(du -h .env | cut -f1)"
    echo "  Contains DATABASE_URL: $(grep -q DATABASE_URL .env && echo 'yes' || echo 'no')"
    echo "  Contains JWT_SECRET: $(grep -q JWT_SECRET .env && echo 'yes' || echo 'no')"
else
    echo "✗ .env file does NOT exist"
fi
echo ""

echo "========================================="
echo "Diagnostic complete"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. If dist/public is missing, run: pnpm build"
echo "2. If PM2 is not running, run: pm2 start ecosystem.config.cjs --update-env"
echo "3. Check full logs: pm2 logs profitflow"
echo "4. Check errors: pm2 logs profitflow --err"

