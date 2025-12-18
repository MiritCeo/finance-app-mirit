# Endpointy HRappka API

Dokumentacja endpointów używanych w integracji z HRappka API.

---

## 📋 Lista endpointów

### 1. Autentykacja

**Endpoint**: `POST /api/authenticate`  
**Dokumentacja**: https://hrappka.docs.apiary.io/#reference/0/authentication/auth

**Request Body**:
```json
{
  "email": "admin@firma.pl",
  "password": "haslo",
  "companyId": "19631A"
}
```

**Response**:
```json
{
  "token": "eyJ0eXAiOiJKV1QiLCJh...",
  "expiresIn": 3600
}
```

---

### 2. Lista pracowników

**Endpoint**: `GET /api/employees/get`  
**Dokumentacja**: https://hrappka.docs.apiary.io/#reference/0/employees/get-full-data

**Headers**:
```
Authorization: Bearer {token}
Accept: application/json
```

**Response**: Tablica obiektów z danymi pracowników:
```json
[
  {
    "employee": {
      "usr_id": 3946,
      "usr_name": "Audit Pracownik",
      "usr_state": "Aktywny",
      ...
    },
    "employeePersonal": {
      "up_first_name": "Pracownik",
      "up_last_name": "Audit",
      ...
    },
    "employeeContacts": {
      "EMAIL": [{"uc_value": "test@example.com"}],
      "PHONE": [{"uc_value": "500100200"}]
    },
    ...
  }
]
```

---

### 3. Kalendarz pracownika (godziny pracy)

**Endpoint**: `GET /calendar/employee/{employeeId}`  
**Dokumentacja**: https://hrappka.docs.apiary.io/#reference/1/calendar/get-employee-calendar

**Headers**:
```
Authorization: Bearer {token}
Accept: application/json
```

**Query Parameters** (opcjonalne):
- `startDate` - Data początkowa (format: YYYY-MM-DD)
- `endDate` - Data końcowa (format: YYYY-MM-DD)

**Response**: Dane kalendarza pracownika z godzinami pracy

---

## 🔧 Konfiguracja endpointów

Możesz dostosować endpointy przez zmienne środowiskowe w `.env`:

```bash
# Endpoint do pobierania pracowników (domyślnie: /api/employees/get)
HRAPPKA_EMPLOYEES_ENDPOINT="/api/employees/get"

# Endpoint do pobierania kalendarza (domyślnie: /calendar/employee/{employeeId})
HRAPPKA_TIME_REPORTS_ENDPOINT="/calendar/employee/{employeeId}"

# Endpoint do pobierania wszystkich raportów (jeśli dostępny)
HRAPPKA_ALL_TIME_REPORTS_ENDPOINT="/calendar"
```

---

## 📚 Pełna dokumentacja

Wszystkie endpointy są opisane w dokumentacji HRappka API:
- **Główna dokumentacja**: https://hrappka.docs.apiary.io/#
- **Autentykacja**: https://hrappka.docs.apiary.io/#reference/0/authentication/auth
- **Lista pracowników**: https://hrappka.docs.apiary.io/#reference/0/employees/get-list
- **Kalendarz pracownika**: https://hrappka.docs.apiary.io/#reference/1/calendar/get-employee-calendar

---

**Ostatnia aktualizacja**: Styczeń 2025

