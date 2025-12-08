# Rozwiązywanie problemu z zmiennymi środowiskowymi w PM2

## Problem: DATABASE_URL is not set

### Diagnostyka:

1. **Sprawdź czy PM2 został zrestartowany**:
   ```bash
   pm2 delete profitflow
   pm2 start ecosystem.config.cjs
   ```

2. **Sprawdź logi PM2 przy starcie**:
   ```bash
   pm2 logs profitflow --lines 50
   ```
   
   Powinieneś zobaczyć:
   ```
   [PM2] Załadowano .env z: /home/mirit-ceo/finance-app/.env
   [PM2] DATABASE_URL: ustawiony (mysql://...)
   ```

3. **Sprawdź czy .env jest wczytywany**:
   ```bash
   # Sprawdź czy plik istnieje
   ls -la /home/mirit-ceo/finance-app/.env
   
   # Sprawdź zawartość (bez wyświetlania wartości)
   grep -E "^DATABASE_URL=" /home/mirit-ceo/finance-app/.env
   ```

4. **Sprawdź zmienne środowiskowe w PM2**:
   ```bash
   pm2 env profitflow | grep DATABASE_URL
   ```

5. **Sprawdź czy PM2 widzi zmienne**:
   ```bash
   pm2 show profitflow
   # Sprawdź sekcję "env"
   ```

### Rozwiązania:

#### Rozwiązanie 1: Upewnij się, że PM2 został zrestartowany

```bash
# Zatrzymaj PM2
pm2 delete profitflow

# Uruchom ponownie z nową konfiguracją
pm2 start ecosystem.config.cjs

# Sprawdź logi
pm2 logs profitflow --lines 50
```

#### Rozwiązanie 2: Sprawdź czy .env jest wczytywany przez PM2

W logach PM2 (nie aplikacji) powinieneś widzieć:
```
[PM2] Załadowano .env z: /home/mirit-ceo/finance-app/.env
```

Jeśli nie widzisz tego komunikatu, sprawdź:
- Czy plik `.env` istnieje w `/home/mirit-ceo/finance-app/.env`
- Czy `dotenv` jest zainstalowany: `pnpm list dotenv`

#### Rozwiązanie 3: Przekaż zmienne bezpośrednio w PM2

Jeśli nadal nie działa, możesz przekazać zmienne bezpośrednio:

```bash
# Uruchom PM2 z zmiennymi z .env
export $(cat .env | xargs) && pm2 start ecosystem.config.cjs
```

#### Rozwiązanie 4: Użyj pliku .env w katalogu z PM2

Upewnij się, że `.env` jest w tym samym katalogu co `ecosystem.config.cjs`:
```bash
cd /home/mirit-ceo/finance-app
ls -la .env ecosystem.config.cjs
```

#### Rozwiązanie 5: Sprawdź uprawnienia

```bash
# Sprawdź uprawnienia pliku .env
ls -la .env
# Powinno być: -rw-r--r-- lub podobne (czytelny)

# Jeśli nie, zmień uprawnienia:
chmod 644 .env
```

### Sprawdzenie po naprawie:

Po restarcie PM2 sprawdź:

1. **Logi PM2**:
   ```bash
   pm2 logs profitflow --lines 20
   ```
   
   Powinieneś zobaczyć:
   ```
   [PM2] Załadowano .env z: ...
   [Env] Załadowano plik .env z: ...
   [Env] DATABASE_URL: ustawiony
   [Database] Connecting to database...
   [Database] Connected successfully
   ```

2. **Zmienne w PM2**:
   ```bash
   pm2 env profitflow
   ```
   
   Powinieneś zobaczyć `DATABASE_URL=mysql://...`

3. **Aplikacja działa**:
   - Otwórz IP serwera w przeglądarce
   - Sprawdź konsolę przeglądarki (F12)
   - Sprawdź czy nie ma błędów 404 dla plików JS/CSS

### Jeśli nadal nie działa:

1. **Sprawdź czy .env jest poprawnie sformatowany**:
   ```bash
   cat .env | grep DATABASE_URL
   # Powinno być: DATABASE_URL=mysql://... (BEZ cudzysłowów)
   ```

2. **Sprawdź czy nie ma ukrytych znaków**:
   ```bash
   cat -A .env | grep DATABASE_URL
   # Sprawdź czy nie ma dziwnych znaków na końcu
   ```

3. **Przetestuj ręcznie**:
   ```bash
   # Załaduj .env ręcznie
   export $(cat .env | xargs)
   
   # Sprawdź czy zmienna jest dostępna
   echo $DATABASE_URL
   
   # Uruchom aplikację bezpośrednio
   NODE_ENV=production pnpm exec tsx server/_core/index.ts
   ```

