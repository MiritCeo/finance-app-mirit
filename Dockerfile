# Multi-stage build dla ProfitFlow

# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Zainstaluj pnpm
RUN npm install -g pnpm@latest

# Skopiuj pliki package
COPY package.json pnpm-lock.yaml ./
COPY client/package.json ./client/
COPY server/package.json ./server/

# Zainstaluj zależności
RUN pnpm install --frozen-lockfile

# Skopiuj kod źródłowy
COPY . .

# Zbuduj frontend
RUN pnpm build

# Stage 2: Production
FROM node:22-alpine

WORKDIR /app

# Zainstaluj pnpm
RUN npm install -g pnpm@latest

# Skopiuj pliki package
COPY package.json pnpm-lock.yaml ./
COPY client/package.json ./client/
COPY server/package.json ./server/

# Zainstaluj tylko production dependencies
RUN pnpm install --frozen-lockfile --prod

# Skopiuj zbudowane pliki z buildera
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/storage ./storage

# Skopiuj pliki konfiguracyjne
COPY drizzle.config.ts ./
COPY tsconfig.json ./

# Ustaw zmienne środowiskowe
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start aplikacji
CMD ["node", "server/index.js"]
