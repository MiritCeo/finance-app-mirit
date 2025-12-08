# Rozwiązywanie problemu z pamięcią podczas budowania

## Problem: "Killed" (exit code 137)

Błąd występuje, gdy serwer nie ma wystarczającej ilości pamięci RAM do zbudowania aplikacji.

## Rozwiązania:

### 1. Zwiększenie limitu pamięci Node.js (ZROBIONE)

W `package.json` dodano `NODE_OPTIONS='--max-old-space-size=4096'` do skryptu build.
To zwiększa limit pamięci do 4GB.

### 2. Zwiększenie swap na serwerze

Jeśli serwer ma mało RAM, możesz zwiększyć swap:

```bash
# Sprawdź aktualny swap
free -h

# Utwórz plik swap (np. 2GB)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Aby swap był trwały po restarcie, dodaj do /etc/fstab:
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 3. Budowanie w częściach

Możesz zbudować aplikację w częściach:

```bash
# Najpierw zbuduj tylko frontend
cd client
NODE_OPTIONS='--max-old-space-size=4096' pnpm build

# Potem zbuduj backend
cd ..
pnpm run build:server
```

### 4. Sprawdzenie dostępnej pamięci

```bash
# Sprawdź ile masz RAM
free -h

# Sprawdź użycie podczas budowania
htop
# lub
top
```

### 5. Alternatywne rozwiązanie: Budowanie lokalnie

Jeśli serwer ma bardzo mało pamięci, możesz:
1. Zbudować aplikację lokalnie (na swoim komputerze)
2. Wgrać folder `dist` na serwer
3. Uruchomić tylko `pnpm start` na serwerze

### 6. Optymalizacja Vite (ZROBIONE)

W `vite.config.ts` dodano:
- `chunkSizeWarningLimit: 1000` - zmniejsza ostrzeżenia
- `manualChunks` - dzieli duże biblioteki na osobne chunki

## Sprawdzenie po naprawie:

```bash
# Zbuduj aplikację
pnpm build

# Jeśli nadal nie działa, spróbuj z większym limitem:
NODE_OPTIONS='--max-old-space-size=6144' pnpm build
```

## Jeśli nadal nie działa:

1. **Zwiększ swap** (patrz punkt 2)
2. **Zwiększ limit pamięci** do 6GB lub 8GB w `package.json`
3. **Zbuduj lokalnie** i wgraj na serwer
4. **Sprawdź logi** systemowe: `dmesg | grep -i kill`

