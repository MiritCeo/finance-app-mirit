/**
 * HRappka API Integration
 * 
 * Dokumentacja API: https://hrappka.docs.apiary.io/#reference/0/authentication/auth
 * 
 * Moduł do komunikacji z zewnętrznym systemem HRappka w celu:
 * - Pobierania danych o godzinach pracy pracowników
 * - Synchronizacji danych kadrowych
 */

import { ENV } from "./env";

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Konfiguracja połączenia z HRappka API
 */
export interface HRappkaConfig {
  baseUrl: string;
  apiBaseUrl?: string; // Opcjonalnie - inny baseUrl dla endpointów API (jeśli różny od baseUrl)
  email: string;
  password: string;
  companyId: number;
  authenticateOldApi?: boolean;
  token?: string; // Opcjonalnie - jeśli mamy już token, możemy go użyć
}

/**
 * Odpowiedź z autentykacji HRappka API
 */
export interface HRappkaAuthResponse {
  success?: boolean;
  token: string;
  expiresIn?: number;
  tokenType?: string;
  refreshToken?: string;
}

/**
 * Surowa odpowiedź z HRappka API dla pracownika (pełne dane z POST)
 */
interface HRappkaEmployeeRawResponseFull {
  employee: {
    usr_id: number;
    usr_name: string;
    usr_email: string | null;
    usr_state: string;
    usr_deleted: boolean;
    usr_blocked: boolean;
  };
  employeePersonal: {
    up_first_name: string;
    up_last_name: string;
    up_middle_name?: string;
  };
  employeeContacts?: {
    EMAIL?: Array<{
      uc_value: string;
    }>;
    PHONE?: Array<{
      uc_value: string;
    }>;
  };
  employeeRole?: string;
}

/**
 * Uproszczona odpowiedź z HRappka API dla pracownika (z GET)
 */
interface HRappkaEmployeeRawResponseSimple {
  id: number;
  name: string;
  state: string | null;
  id_search_data?: string;
  address_search_data?: string;
  contact_search_data?: string;
  countActiveEmployeeContracts?: number;
  countEmployeeContracts?: number;
  countActiveCivilContracts?: number;
  countCivilContracts?: number;
}

/**
 * Typ unii dla obu formatów odpowiedzi
 */
type HRappkaEmployeeRawResponse = HRappkaEmployeeRawResponseFull | HRappkaEmployeeRawResponseSimple;

/**
 * Dane pracownika z HRappka (zmapowane)
 */
export interface HRappkaEmployee {
  id: number;
  firstName: string;
  lastName: string;
  email?: string;
  employeeNumber?: string;
  position?: string;
  isActive?: boolean;
}

/**
 * Raport godzinowy z HRappka
 */
export interface HRappkaTimeReport {
  employeeId: number;
  date: string; // YYYY-MM-DD
  hours: number;
  description?: string;
  projectId?: number;
  projectName?: string;
}

/**
 * Wydarzenie kalendarzowe z HRappka API
 */
export interface HRappkaCalendarEvent {
  cuce_id: number;
  cuce_date: string; // YYYY-MM-DD
  cuce_time_from?: string; // HH:MM
  cuce_time_to?: string; // HH:MM
  cuce_amount?: string; // Godziny jako string (np. "8.00") - stary format
  cuce_quantity?: string; // Godziny jako string (np. "8.00000") - nowy format
  cuce_description?: string;
  cuce_category?: string;
  cuce_category_detail?: string;
  cuce_category_detail_additional?: string;
  cuce_deleted?: boolean;
  cuce_realization_state?: string;
  title?: string; // np. "08:00-16:00 | 8 h"
}

/**
 * Umowa z HRappka
 */
export interface HRappkaContract {
  cuc_id: number;
  cuc_user_fkey: number;
  cuc_type: string; // np. "EMPLOYMENT_CONTRACT", "ORDER_CONTRACT"
  cuc_start_date: string; // YYYY-MM-DD
  cuc_end_date: string | null; // YYYY-MM-DD lub null
  cuc_state: string; // np. "UNSETTLED", "SETTLED"
  cuc_number?: string;
  cuc_position_name?: string;
}

/**
 * Rozliczenie z HRappka
 */
export interface HRappkaSettlement {
  settlement_id: number;
  settlement_from: string; // YYYY-MM-DD
  settlement_to: string; // YYYY-MM-DD
  cash_netto: string; // Kwota netto
  cash_brutto: string; // Kwota brutto
  cash_netto_to_pay: string; // Do wypłaty
  contract_type: string;
}

/**
 * Informacje o pracowniku z HRappka (dla panelu pracownika)
 */
export interface HRappkaEmployeeInfo {
  totalHoursThisMonth: number; // Łączna ilość zaraportowanych godzin w bieżącym miesiącu
  totalHoursThisYear: number; // Łączna ilość zaraportowanych godzin w bieżącym roku
  totalHoursThisWeek: number; // Łączna ilość zaraportowanych godzin w bieżącym tygodniu
  averageHoursPerDay: number; // Średnia godzin dziennie w bieżącym miesiącu
  vacationDaysRemaining?: number; // Pozostałe dni urlopu (jeśli dostępne w API)
  contractEndDate?: string; // Data zakończenia umowy (YYYY-MM-DD)
  contractStartDate?: string; // Data rozpoczęcia umowy (YYYY-MM-DD)
  contractType?: string; // Typ umowy (np. "EMPLOYMENT_CONTRACT")
  yesterdayHoursReported: boolean; // Czy godziny zostały uzupełnione wczoraj
  yesterdayHours?: number; // Ilość godzin wczoraj (jeśli były)
  lastSettlement?: HRappkaSettlement; // Ostatnie rozliczenie
}

/**
 * Odpowiedź z kalendarza HRappka
 */
export interface HRappkaCalendarResponse {
  success: boolean;
  events: Record<string, HRappkaCalendarEvent[]>; // Klucz to data (YYYY-MM-DD)
}

/**
 * Opcje dla żądań API
 */
export interface HRappkaApiOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: Record<string, unknown>;
  query?: Record<string, string | number | boolean>;
  headers?: Record<string, string>;
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Pobiera konfigurację HRappka API ze zmiennych środowiskowych
 */
export function getHRappkaConfig(): HRappkaConfig {
  const baseUrl = ENV.hrappkaBaseUrl;
  if (!baseUrl) {
    throw new Error("HRAPPKA_BASE_URL is not configured");
  }

  const email = ENV.hrappkaEmail;
  if (!email) {
    throw new Error("HRAPPKA_EMAIL is not configured");
  }

  const password = ENV.hrappkaPassword;
  if (!password) {
    throw new Error("HRAPPKA_PASSWORD is not configured");
  }

  const companyId = ENV.hrappkaCompanyId;
  if (!companyId) {
    throw new Error("HRAPPKA_COMPANY_ID is not configured");
  }

  // Sprawdź czy jest osobny baseUrl dla API endpointów
  const apiBaseUrl = process.env.HRAPPKA_API_BASE_URL;
  
  return {
    baseUrl: baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl,
    apiBaseUrl: apiBaseUrl ? (apiBaseUrl.endsWith("/") ? apiBaseUrl.slice(0, -1) : apiBaseUrl) : undefined,
    email,
    password,
    companyId: Number(companyId),
    // authenticateOldApi jest ignorowane - zawsze używamy true dla starych endpointów
    // Nawet jeśli w .env jest false, dla starych endpointów MUSI być true
    authenticateOldApi: true, // ZAWSZE true dla kompatybilności ze starymi endpointami
    token: ENV.hrappkaToken || undefined,
  };
}

// ============================================================================
// Authentication
// ============================================================================

/**
 * Cache dla tokena autentykacji
 */
let authTokenCache: {
  token: string;
  expiresAt: number;
  authenticateOldApi?: boolean; // Flaga wskazująca, czy token został uzyskany z authenticateOldApi: true
} | null = null;

/**
 * Autentykacja w HRappka API
 * 
 * Zgodnie z dokumentacją: https://hrappka.docs.apiary.io/#reference/0/authentication/auth
 * 
 * Wymagane parametry:
 * - email: Email administratora
 * - password: Hasło administratora
 * - companyId: ID firmy
 * 
 * @returns Token autentykacji
 */
export async function authenticateHRappka(forceRefresh: boolean = false): Promise<string> {
  const config = getHRappkaConfig();

  console.log("[HRappka] Authenticating, baseUrl:", config.baseUrl, "email:", config.email ? `${config.email.substring(0, 3)}***` : "NOT SET", "forceRefresh:", forceRefresh);

  // Sprawdź cache tokena (tylko jeśli nie wymuszamy odświeżenia)
  // Dla starych endpointów (np. /api/employees/get) potrzebujemy tokena z authenticateOldApi: true
  // Jeśli cache nie ma tej flagi, wymuś odświeżenie
  const cacheHasOldApi = authTokenCache?.authenticateOldApi === true;
  const willUseOldApi = config.authenticateOldApi !== false; // Domyślnie true
  
  if (!forceRefresh && authTokenCache && authTokenCache.expiresAt > Date.now()) {
    // Jeśli potrzebujemy authenticateOldApi, ale cache nie ma tej flagi, wymuś odświeżenie
    if (willUseOldApi && !cacheHasOldApi) {
      console.log("[HRappka] Cached token doesn't have authenticateOldApi flag, refreshing...");
      authTokenCache = null;
    } else {
      console.log("[HRappka] Using cached token (expires in", Math.round((authTokenCache.expiresAt - Date.now()) / 1000), "seconds, authenticateOldApi:", cacheHasOldApi, ")");
      return authTokenCache.token;
    }
  } else if (authTokenCache) {
    console.log("[HRappka] Cached token expired or force refresh requested, refreshing...");
    authTokenCache = null; // Wyczyść cache
  }

  // Jeśli mamy token w zmiennych środowiskowych, użyj go (opcjonalnie)
  // ALE: jeśli token jest nieprawidłowy (401), lepiej go zignorować i uzyskać nowy
  if (config.token && !authTokenCache) {
    console.log("[HRappka] Token from env found, but will authenticate to get fresh token");
    // Nie używaj tokena z env - zawsze autentykuj się na nowo, aby mieć świeży token
  }

  // Wykonaj autentykację przez email/password/companyId
  try {
    // Endpoint autentykacji zgodnie z dokumentacją API Blueprint
    // Dokumentacja: /api/v1/auth/login (POST)
    const authUrl = `${config.baseUrl}/api/v1/auth/login`;
    
    const requestBody: Record<string, unknown> = {
      email: config.email,
      password: config.password,
      companyId: config.companyId,
    };

    // authenticateOldApi jest WYMAGANY dla starych endpointów (np. /api/employees/get)
    // Zgodnie z dokumentacją: "Auth old api too - required for all old endpoints"
    // ZAWSZE ustawiamy na true dla starych endpointów (np. /api/employees/get)
    // Nawet jeśli w .env jest false, dla starych endpointów MUSI być true
    requestBody.authenticateOldApi = true;
    
    console.log("[HRappka] Setting authenticateOldApi to true (required for old endpoints like /api/employees/get)");
    
    console.log("[HRappka] Authentication request:", {
      email: config.email ? `${config.email.substring(0, 3)}***` : "NOT SET",
      companyId: config.companyId,
      authenticateOldApi: requestBody.authenticateOldApi,
      requestBodyAuthenticateOldApi: requestBody.authenticateOldApi,
      configAuthenticateOldApi: config.authenticateOldApi,
    });

    // Użyj https modułu Node.js jeśli fetch nie działa (problemy z SSL)
    let response: Response;
    try {
      // Sprawdź czy authenticateOldApi jest poprawnie ustawione
      if (requestBody.authenticateOldApi !== true) {
        console.error("[HRappka] ERROR: authenticateOldApi is not true! Setting to true now.");
        requestBody.authenticateOldApi = true;
      }
      
      const bodyToSend = JSON.stringify(requestBody);
      console.log("[HRappka] Sending authentication request:", {
        url: authUrl,
        body: bodyToSend,
        authenticateOldApi: requestBody.authenticateOldApi,
        parsedBody: JSON.parse(bodyToSend),
      });
      
      response = await fetch(authUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: bodyToSend,
      });
    } catch (fetchError) {
      // Jeśli fetch nie działa (np. problem z SSL), użyj https modułu
      console.warn("[HRappka] Fetch failed, trying with https module:", fetchError instanceof Error ? fetchError.message : String(fetchError));
      const https = await import("https");
      const { URL } = await import("url");
      
      const urlObj = new URL(authUrl);
      const requestBodyStr = JSON.stringify(requestBody);
      
      console.log("[HRappka] Sending authentication request (https fallback):", {
        url: authUrl,
        body: requestBodyStr,
        authenticateOldApi: requestBody.authenticateOldApi,
        parsedBody: JSON.parse(requestBodyStr),
      });
      
      response = await new Promise<Response>((resolve, reject) => {
        const options = {
          hostname: urlObj.hostname,
          port: urlObj.port || 443,
          path: urlObj.pathname + urlObj.search,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Content-Length": Buffer.byteLength(requestBodyStr),
          },
          rejectUnauthorized: false, // Wyłącz weryfikację SSL dla testów
        };
        
        const req = https.request(options, (res) => {
          let data = "";
          res.on("data", (chunk) => {
            data += chunk;
          });
          res.on("end", () => {
            // Stwórz Response-like object
            const responseObj = {
              ok: res.statusCode && res.statusCode >= 200 && res.statusCode < 300,
              status: res.statusCode || 0,
              statusText: res.statusMessage || "",
              headers: new Headers(),
              text: async () => data,
              json: async () => JSON.parse(data),
            } as Response;
            resolve(responseObj as Response);
          });
        });
        
        req.on("error", (error) => {
          reject(error);
        });
        
        req.write(requestBodyStr);
        req.end();
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[HRappka] Authentication failed:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        authUrl,
      });
      throw new Error(
        `HRappka authentication failed (${response.status} ${response.statusText}): ${errorText}`
      );
    }

    const authResponse = await response.json() as { 
      token?: string; 
      success?: boolean; 
      data?: { token?: string; refreshToken?: string };
      expiresIn?: number;
    };
    
    // API może zwracać token na dwa sposoby:
    // 1. {"token": "..."} - bezpośrednio
    // 2. {"success": true, "data": {"token": "..."}} - w obiekcie data
    const token = authResponse.token || authResponse.data?.token;
    
    console.log("[HRappka] Authentication successful, token received:", {
      tokenLength: token?.length || 0,
      expiresIn: authResponse.expiresIn,
      hasToken: !!token,
      tokenPreview: token ? `${token.substring(0, 30)}...` : "NO TOKEN",
      responseFormat: authResponse.data ? "data.token" : "token",
      fullResponse: JSON.stringify(authResponse).substring(0, 300),
    });
    
    if (!token) {
      console.error("[HRappka] No token in response:", JSON.stringify(authResponse, null, 2));
      throw new Error("HRappka API did not return a token in the response");
    }
    
    const authData: HRappkaAuthResponse = {
      token,
      expiresIn: authResponse.expiresIn,
    };

    // Sprawdź czy token nie jest pusty
    if (authData.token.trim().length === 0) {
      console.error("[HRappka] Token is empty string!");
      throw new Error("HRappka API returned an empty token");
    }

    // Cache tokena (domyślnie 1 godzina, jeśli nie podano expiresIn)
    const expiresIn = authData.expiresIn || 3600;
    authTokenCache = {
      token: authData.token,
      expiresAt: Date.now() + expiresIn * 1000,
    };

    console.log("[HRappka] Token cached, expires at:", new Date(authTokenCache.expiresAt).toISOString());
    return authData.token;
  } catch (error) {
    throw new Error(
      `Failed to authenticate with HRappka API: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// ============================================================================
// API Client
// ============================================================================

/**
 * Wykonuje żądanie do HRappka API
 * 
 * @param endpoint - Endpoint API (np. "/api/v1/employees")
 * @param options - Opcje żądania
 * @returns Odpowiedź z API
 */
export async function callHRappkaApi<T = unknown>(
  endpoint: string,
  options: HRappkaApiOptions = {}
): Promise<T> {
  const config = getHRappkaConfig();
  const token = await authenticateHRappka();
  
  // Użyj apiBaseUrl jeśli jest ustawiony, w przeciwnym razie baseUrl
  const apiBaseUrl = config.apiBaseUrl || config.baseUrl;
  
  // Zbuduj pełny URL
  const url = new URL(
    endpoint.startsWith("/") ? endpoint.slice(1) : endpoint,
    apiBaseUrl
  );
  
  console.log("[HRappka] Making API call:", {
    endpoint,
    baseUrl: config.baseUrl,
    fullUrl: url.toString(),
    tokenLength: token.length,
    tokenPreview: token.substring(0, 20) + "...",
  });

  // Dodaj parametry query
  if (options.query) {
    Object.entries(options.query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  // Przygotuj nagłówki
  // Sprawdź czy token nie jest pusty
  if (!token || token.trim().length === 0) {
    console.error("[HRappka] Token is empty or invalid!");
    throw new Error("HRappka authentication token is empty or invalid");
  }
  
  const headers: Record<string, string> = {
    "Accept": "application/json",
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
    ...options.headers,
  };
  
  console.log("[HRappka] Request headers:", {
    Accept: headers.Accept,
    "Content-Type": headers["Content-Type"],
    Authorization: `Bearer ${token.substring(0, 20)}... (length: ${token.length})`,
    url: url.toString(),
    fullUrl: url.toString(),
  });

  // Wykonaj żądanie
  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (fetchError) {
    // Jeśli fetch nie działa (np. problem z SSL), użyj https modułu
    console.warn("[HRappka] Fetch failed, trying with https module:", fetchError instanceof Error ? fetchError.message : String(fetchError));
    const https = await import("https");
    const { URL } = await import("url");
    
    const urlObj = new URL(url.toString());
    const bodyStr = options.body ? JSON.stringify(options.body) : undefined;
    
    response = await new Promise<Response>((resolve, reject) => {
      const httpsOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method: options.method || "GET",
        headers: {
          ...headers,
          ...(bodyStr ? { "Content-Length": Buffer.byteLength(bodyStr) } : {}),
        },
        rejectUnauthorized: false, // Wyłącz weryfikację SSL dla testów
      };
      
      const req = https.request(httpsOptions, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          // Stwórz Response-like object
          const responseObj = {
            ok: res.statusCode && res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode || 0,
            statusText: res.statusMessage || "",
            headers: new Headers(Object.entries(res.headers).map(([k, v]) => [k, Array.isArray(v) ? v.join(", ") : v || ""])),
            text: async () => data,
            json: async () => JSON.parse(data),
          } as Response;
          resolve(responseObj as Response);
        });
      });
      
      req.on("error", (error) => {
        console.error("[HRappka] HTTPS request error:", error);
        reject(error);
      });
      
      // Timeout po 30 sekundach
      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error("Request timeout after 30 seconds"));
      });
      
      if (bodyStr) {
        req.write(bodyStr);
      }
      req.end();
    });
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[HRappka] API request failed:", {
      status: response.status,
      statusText: response.statusText,
      url: url.toString(),
      error: errorText,
      tokenLength: token.length,
      tokenPreview: token.substring(0, 30) + "...",
      hasToken: !!token,
    });
    
    // Jeśli błąd 401 (Unauthorized), wyczyść cache tokena i spróbuj ponownie
    if (response.status === 401) {
      console.warn("[HRappka] 401 Unauthorized - clearing token cache and retrying authentication with forceRefresh");
      authTokenCache = null; // Wyczyść cache
      
      // Spróbuj ponownie z nowym tokenem (wymuś odświeżenie, aby uzyskać token z authenticateOldApi: true)
      try {
        const newToken = await authenticateHRappka(true); // forceRefresh = true
        console.log("[HRappka] Retrying with new token:", {
          url: url.toString(),
          tokenLength: newToken.length,
          tokenPreview: newToken.substring(0, 30) + "...",
        });
        
        // Zaktualizuj nagłówki z nowym tokenem
        const retryHeaders = {
          ...headers,
          "Authorization": `Bearer ${newToken}`,
        };
        
        console.log("[HRappka] Retry request headers:", {
          Authorization: `Bearer ${newToken.substring(0, 20)}...`,
          Accept: retryHeaders.Accept,
          "Content-Type": retryHeaders["Content-Type"],
        });
        
        // Spróbuj ponownie - użyj https modułu dla retry również
        let retryResponse: Response;
        try {
          retryResponse = await fetch(url.toString(), {
            method: options.method || "GET",
            headers: retryHeaders,
            body: options.body ? JSON.stringify(options.body) : undefined,
          });
        } catch (retryFetchError) {
          // Jeśli fetch nie działa, użyj https modułu
          console.warn("[HRappka] Retry fetch failed, using https module:", retryFetchError instanceof Error ? retryFetchError.message : String(retryFetchError));
          const https = await import("https");
          const { URL } = await import("url");
          
          const urlObj = new URL(url.toString());
          const bodyStr = options.body ? JSON.stringify(options.body) : undefined;
          
          retryResponse = await new Promise<Response>((resolve, reject) => {
            const httpsOptions = {
              hostname: urlObj.hostname,
              port: urlObj.port || 443,
              path: urlObj.pathname + urlObj.search,
              method: options.method || "GET",
              headers: {
                ...retryHeaders,
                ...(bodyStr ? { "Content-Length": Buffer.byteLength(bodyStr) } : {}),
              },
              rejectUnauthorized: false,
            };
            
            const req = https.request(httpsOptions, (res) => {
              let data = "";
              res.on("data", (chunk) => {
                data += chunk;
              });
              res.on("end", () => {
                const responseObj = {
                  ok: res.statusCode && res.statusCode >= 200 && res.statusCode < 300,
                  status: res.statusCode || 0,
                  statusText: res.statusMessage || "",
                  headers: new Headers(Object.entries(res.headers).map(([k, v]) => [k, Array.isArray(v) ? v.join(", ") : v || ""])),
                  text: async () => data,
                  json: async () => JSON.parse(data),
                } as Response;
                resolve(responseObj as Response);
              });
            });
            
            req.on("error", (error) => {
              reject(error);
            });
            
            req.setTimeout(30000, () => {
              req.destroy();
              reject(new Error("Retry request timeout after 30 seconds"));
            });
            
            if (bodyStr) {
              req.write(bodyStr);
            }
            req.end();
          });
        }
        
        console.log("[HRappka] Retry response:", {
          status: retryResponse.status,
          statusText: retryResponse.statusText,
          ok: retryResponse.ok,
        });
        
        if (retryResponse.ok) {
          console.log("[HRappka] Retry successful");
          // Przetwarzaj odpowiedź normalnie
          const contentType = retryResponse.headers.get("content-type") || "";
          const text = await retryResponse.text();
          
          if (text.trim().startsWith("<!DOCTYPE") || contentType.includes("text/html")) {
            console.error("[HRappka] API returned HTML instead of JSON. Response preview:", text.substring(0, 200));
            throw new Error("HRappka API returned HTML instead of JSON. The endpoint may not exist or may require different authentication.");
          }
          
          try {
            return JSON.parse(text) as T;
          } catch (parseError) {
            return text as T;
          }
        } else {
          const retryErrorText = await retryResponse.text();
          throw new Error(
            `HRappka API request failed after retry (${retryResponse.status} ${retryResponse.statusText}): ${retryErrorText}`
          );
        }
      } catch (retryError) {
        // Jeśli retry też nie zadziałał, rzuć oryginalny błąd
        throw new Error(
          `HRappka API request failed (${response.status} ${response.statusText}): ${errorText}`
        );
      }
    }
    
    throw new Error(
      `HRappka API request failed (${response.status} ${response.statusText}): ${errorText}`
    );
  }

  // Sprawdź Content-Type
  const contentType = response.headers.get("content-type") || "";
  
  // Próba parsowania odpowiedzi jako JSON
  try {
    const text = await response.text();
    
    // Sprawdź czy to HTML (błąd - API zwróciło stronę HTML)
    if (text.trim().startsWith("<!DOCTYPE") || contentType.includes("text/html")) {
      console.error("[HRappka] API returned HTML instead of JSON. Response preview:", text.substring(0, 200));
      throw new Error("HRappka API returned HTML instead of JSON. The endpoint may not exist or may require different authentication.");
    }
    
    // Spróbuj sparsować jako JSON
    try {
      return JSON.parse(text) as T;
    } catch (parseError) {
      // Jeśli nie jest JSON, zwróć tekst (ale tylko jeśli to nie HTML)
      return text as T;
    }
  } catch (error) {
    // Jeśli błąd parsowania, rzuć wyjątek
    throw error;
  }
}

// ============================================================================
// HRappka API Methods
// ============================================================================

/**
 * Pobiera listę pracowników z HRappka
 * 
 * Endpoint: GET /api/employees/get
 * 
 * @param endpoint - Opcjonalny endpoint (domyślnie: "/api/employees/get" lub z .env)
 * @returns Lista pracowników
 */
export async function getHRappkaEmployees(endpoint?: string): Promise<HRappkaEmployee[]> {
  try {
    // Właściwy endpoint zgodnie z dokumentacją API Blueprint
    // GET /api/employees/get - podstawowa lista (używamy GET)
    // POST /api/employees/get - pełne dane (wymaga EmployeeIds w body)
    const employeesEndpoint = endpoint || process.env.HRAPPKA_EMPLOYEES_ENDPOINT || "/api/employees/get";
    
    console.log("[HRappka] Fetching employees from endpoint:", employeesEndpoint);
    
    // Wymuś odświeżenie tokena, aby upewnić się, że mamy token z authenticateOldApi: true
    // (stary endpoint /api/employees/get wymaga tego)
    // Najpierw wyczyść cache, jeśli nie ma flagi authenticateOldApi
    if (authTokenCache && !authTokenCache.authenticateOldApi) {
      console.log("[HRappka] Clearing cache - token doesn't have authenticateOldApi flag");
      authTokenCache = null;
    }
    
    // Użyj GET dla podstawowej listy zgodnie z dokumentacją API Blueprint
    // Jeśli potrzebujesz pełnych danych, użyj POST z EmployeeIds w body
    const response = await callHRappkaApi<unknown>(employeesEndpoint, {
      method: "GET",
    });
    
    // Sprawdź czy odpowiedź to HTML (błąd - API zwróciło stronę HTML zamiast JSON)
    if (typeof response === "string" && response.trim().startsWith("<!DOCTYPE")) {
      console.error("[HRappka] API returned HTML instead of JSON - endpoint may not exist:", employeesEndpoint);
      throw new Error(`HRappka API endpoint ${employeesEndpoint} returned HTML instead of JSON. The endpoint may not exist or may require different authentication.`);
    }
    
    console.log("[HRappka] Raw response type:", typeof response);
    console.log("[HRappka] Raw response preview:", JSON.stringify(response).substring(0, 500));
    
    // Odpowiedź to tablica obiektów z polami: employee, employeePersonal, employeeContacts, etc.
    let rawEmployees: HRappkaEmployeeRawResponse[] = [];
    
    if (Array.isArray(response)) {
      rawEmployees = response as HRappkaEmployeeRawResponse[];
      console.log("[HRappka] Response is array, length:", rawEmployees.length);
    } else if (response && typeof response === "object") {
      const responseObj = response as Record<string, unknown>;
      
      // Sprawdź różne możliwe klucze
      if ("data" in responseObj && Array.isArray(responseObj.data)) {
        rawEmployees = responseObj.data as HRappkaEmployeeRawResponse[];
        console.log("[HRappka] Found 'data' array, length:", rawEmployees.length);
      } else if ("employees" in responseObj && Array.isArray(responseObj.employees)) {
        rawEmployees = responseObj.employees as HRappkaEmployeeRawResponse[];
        console.log("[HRappka] Found 'employees' array, length:", rawEmployees.length);
      } else {
        console.log("[HRappka] Response object keys:", Object.keys(responseObj));
        throw new Error("Unexpected response format from HRappka API");
      }
    } else {
      throw new Error("Invalid response format from HRappka API");
    }
    
    // Mapuj surowe dane do naszego formatu
    // Obsługujemy dwa formaty: pełny (POST) i uproszczony (GET)
    const mappedEmployees: HRappkaEmployee[] = rawEmployees.map((raw) => {
      // Sprawdź czy to format pełny (z POST) czy uproszczony (z GET)
      if ("employee" in raw && "employeePersonal" in raw) {
        // Format pełny (POST /api/employees/get)
        const fullRaw = raw as HRappkaEmployeeRawResponseFull;
        const employee = fullRaw.employee;
        const personal = fullRaw.employeePersonal;
        const contacts = fullRaw.employeeContacts;
        
        // Pobierz email z kontaktu lub z employee.usr_email
        let email: string | undefined = undefined;
        if (contacts?.EMAIL && contacts.EMAIL.length > 0) {
          email = contacts.EMAIL[0].uc_value;
        } else if (employee.usr_email) {
          email = employee.usr_email;
        }
        
        // Określ czy pracownik jest aktywny
        const isActive = !employee.usr_deleted && 
                         !employee.usr_blocked && 
                         employee.usr_state === "Aktywny";
        
        return {
          id: employee.usr_id,
          firstName: personal.up_first_name || "",
          lastName: personal.up_last_name || "",
          email: email,
          isActive: isActive,
          position: fullRaw.employeeRole || undefined,
        };
      } else {
        // Format uproszczony (GET /api/employees/get)
        const simpleRaw = raw as HRappkaEmployeeRawResponseSimple;
        
        // Parsuj imię i nazwisko z pola "name"
        const nameParts = simpleRaw.name.trim().split(/\s+/);
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";
        
        // Wyciągnij email z contact_search_data (format: " 692512022 jan@jan.com")
        let email: string | undefined = undefined;
        if (simpleRaw.contact_search_data) {
          const emailMatch = simpleRaw.contact_search_data.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
          if (emailMatch) {
            email = emailMatch[0];
          }
        }
        
        // Określ czy pracownik jest aktywny
        const isActive = simpleRaw.state === "Aktywny";
        
        return {
          id: simpleRaw.id,
          firstName: firstName,
          lastName: lastName,
          email: email,
          isActive: isActive,
        };
      }
    });
    
    console.log("[HRappka] Mapped employees count:", mappedEmployees.length);
    return mappedEmployees;
  } catch (error) {
    console.error("[HRappka] Error fetching employees:", error);
    throw error;
  }
}

/**
 * Pobiera kalendarz/godziny pracy dla pracownika z HRappka
 * 
 * Dokumentacja: https://hrappka.docs.apiary.io/#reference/1/calendar/get-employee-calendar
 * Endpoint: POST /api/employees/calendar
 * 
 * @param employeeId - ID pracownika w HRappka (usr_id)
 * @param startDate - Data początkowa (YYYY-MM-DD) - opcjonalna
 * @param endDate - Data końcowa (YYYY-MM-DD) - opcjonalna
 * @param type - Typ wydarzeń: "REAL" lub "NORMALIZED" (domyślnie "REAL")
 * @returns Lista raportów godzinowych
 */
export async function getHRappkaTimeReports(
  employeeId: number,
  startDate?: string,
  endDate?: string,
  type: "REAL" | "NORMALIZED" = "REAL"
): Promise<HRappkaTimeReport[]> {
  try {
    // Endpoint zgodnie z dokumentacją: POST /api/employees/calendar
    const timeReportsEndpoint = process.env.HRAPPKA_TIME_REPORTS_ENDPOINT || "/api/employees/calendar";
    
    // Przygotuj body zgodnie z dokumentacją API Blueprint
    const requestBody: Record<string, unknown> = {
      usr_id: employeeId,
      get_for_all_employees: 0,
      type: type,
    };
    
    if (startDate) {
      requestBody.start = startDate;
    }
    if (endDate) {
      requestBody.end = endDate;
    }
    
    console.log("[HRappka] Fetching calendar for employee:", {
      employeeId,
      startDate,
      endDate,
      type,
      endpoint: timeReportsEndpoint,
    });
    
    const response = await callHRappkaApi<unknown>(
      timeReportsEndpoint,
      {
        method: "POST",
        body: requestBody,
      }
    );
    
    // Loguj surową odpowiedź do debugowania
    console.log("[HRappka] Raw calendar response:", {
      type: typeof response,
      isArray: Array.isArray(response),
      keys: response && typeof response === "object" ? Object.keys(response) : "N/A",
      responsePreview: JSON.stringify(response).substring(0, 2000),
    });
    
    // Jeśli response to string, spróbuj sparsować
    if (typeof response === "string") {
      try {
        const parsed = JSON.parse(response);
        console.log("[HRappka] Parsed string response:", {
          keys: Object.keys(parsed),
          preview: JSON.stringify(parsed).substring(0, 1000),
        });
      } catch (e) {
        console.warn("[HRappka] Could not parse string response");
      }
    }
    
    // Odpowiedź to obiekt z kluczem "events", gdzie każdy klucz to data (YYYY-MM-DD)
    const reports: HRappkaTimeReport[] = [];
    
    // Sprawdź różne możliwe formaty odpowiedzi
    if (response && typeof response === "object") {
      const responseObj = response as Record<string, unknown>;
      
      // Format 1: { success: true, events: { "2024-01-01": [...] } }
      if ("success" in responseObj && "events" in responseObj) {
        const eventsValue = responseObj.events;
        console.log("[HRappka] Events value type:", typeof eventsValue, "isArray:", Array.isArray(eventsValue));
        
        // Sprawdź czy events to obiekt czy tablica
        if (Array.isArray(eventsValue)) {
          console.log("[HRappka] Events is an array with", eventsValue.length, "items");
          // Jeśli to tablica, może trzeba ją przetworzyć inaczej
          // Ale zgodnie z dokumentacją powinien być obiekt z datami jako kluczami
        } else if (eventsValue && typeof eventsValue === "object") {
          const events = eventsValue as Record<string, HRappkaCalendarEvent[]>;
          const eventKeys = Object.keys(events);
          console.log("[HRappka] Found events object with", eventKeys.length, "dates");
          console.log("[HRappka] Event dates:", eventKeys.slice(0, 20)); // Pokaż pierwsze 20 dat
          console.log("[HRappka] Sample event structure:", eventKeys.length > 0 ? JSON.stringify(events[eventKeys[0]]).substring(0, 500) : "No events");
          
          // Jeśli events jest pustym obiektem, sprawdź czy może to jest inna struktura
          if (eventKeys.length === 0) {
            console.warn("[HRappka] Events object is empty. Full events value:", JSON.stringify(eventsValue).substring(0, 1000));
            console.warn("[HRappka] Full response preview:", JSON.stringify(responseObj).substring(0, 3000));
            console.warn("[HRappka] Request was for employee:", employeeId, "dates:", startDate, "to", endDate);
          }
          
          Object.entries(events).forEach(([date, eventsArray]) => {
            if (!Array.isArray(eventsArray)) {
              console.warn(`[HRappka] Events for date ${date} is not an array:`, typeof eventsArray);
              return;
            }
            
            eventsArray.forEach((event) => {
              // Pomiń usunięte wydarzenia
              if (event.cuce_deleted) {
                return;
              }
              
              // Pomiń wydarzenia które nie są zrealizowane
              // REALIZED i REALIZED_FROM_REPORT są prawidłowymi stanami
              if (event.cuce_realization_state && 
                  event.cuce_realization_state !== "REALIZED" && 
                  event.cuce_realization_state !== "REALIZED_FROM_REPORT") {
                console.log(`[HRappka] Skipping event with state: ${event.cuce_realization_state}`);
                return;
              }
              
              // Parsuj godziny z cuce_quantity (nowy format) lub cuce_amount (stary format)
              const hoursStr = event.cuce_quantity || event.cuce_amount || "0";
              const hours = parseFloat(hoursStr);
              if (hours <= 0) {
                console.log(`[HRappka] Skipping event with 0 hours (quantity: ${event.cuce_quantity}, amount: ${event.cuce_amount}):`, event.cuce_id);
                return;
              }
              
              reports.push({
                employeeId: employeeId,
                date: event.cuce_date || date,
                hours: hours,
                description: event.cuce_description || event.cuce_category_detail_additional || event.title,
                projectName: event.cuce_category_detail_additional,
              });
            });
          });
        }
      }
      // Format 2: Bezpośrednio { "2024-01-01": [...] } (bez success)
      else if ("events" in responseObj && !("success" in responseObj)) {
        const events = responseObj.events as Record<string, HRappkaCalendarEvent[]>;
        console.log("[HRappka] Found events object without success field, dates:", Object.keys(events).length);
        
        Object.entries(events).forEach(([date, eventsArray]) => {
          if (!Array.isArray(eventsArray)) {
            return;
          }
          
          eventsArray.forEach((event) => {
            if (event.cuce_deleted) return;
            if (event.cuce_realization_state && event.cuce_realization_state !== "REALIZED") return;
            
            const hours = parseFloat(event.cuce_amount || "0");
            if (hours <= 0) return;
            
            reports.push({
              employeeId: employeeId,
              date: event.cuce_date || date,
              hours: hours,
              description: event.cuce_description || event.cuce_category_detail_additional || event.title,
              projectName: event.cuce_category_detail_additional,
            });
          });
        });
      }
      // Format 3: Tablica wydarzeń bezpośrednio
      else if (Array.isArray(response)) {
        console.log("[HRappka] Response is direct array with", response.length, "items");
        // To nie jest oczekiwany format, ale spróbujmy
      }
      else {
        console.warn("[HRappka] Unexpected response format. Keys:", Object.keys(responseObj));
        console.warn("[HRappka] Full response:", JSON.stringify(responseObj).substring(0, 2000));
      }
    }
    
    console.log(`[HRappka] Fetched ${reports.length} time reports for employee ${employeeId}`);
    if (reports.length === 0) {
      console.warn("[HRappka] No reports found. Response structure:", {
        hasResponse: !!response,
        responseType: typeof response,
        responseKeys: response && typeof response === "object" ? Object.keys(response) : [],
      });
    }
    return reports;
  } catch (error) {
    console.error(`[HRappka] Error fetching time reports for employee ${employeeId}:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      employeeId,
      startDate,
      endDate,
      type,
    });
    // Przekaż bardziej szczegółowy błąd
    if (error instanceof Error) {
      throw new Error(`Nie udało się pobrać godzin z HRappka dla pracownika ${employeeId}: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Pobiera rozliczenia pracownika z HRappka
 * 
 * @param employeeId - ID pracownika w HRappka
 * @param fromDate - Data początkowa (YYYY-MM-DD)
 * @param toDate - Data końcowa (YYYY-MM-DD)
 * @returns Lista rozliczeń pracownika
 */
export async function getHRappkaSettlements(
  employeeId: number,
  fromDate: string,
  toDate: string
): Promise<HRappkaSettlement[]> {
  try {
    const settlementsEndpoint = "/api/settlements/get";
    
    console.log(`[HRappka] Fetching settlements for employee ${employeeId} from ${fromDate} to ${toDate}`);
    
    const response = await callHRappkaApi<Record<string, HRappkaSettlement>>(
      settlementsEndpoint,
      {
        method: "GET",
        query: {
          settlementFrom: fromDate,
          settlementTo: toDate,
          employeesIds: `{${employeeId}}`,
        },
      }
    );
    
    console.log(`[HRappka] Settlements API response:`, {
      type: typeof response,
      isArray: Array.isArray(response),
      keys: response && typeof response === "object" ? Object.keys(response).slice(0, 5) : "N/A",
      responsePreview: JSON.stringify(response).substring(0, 500),
    });
    
    if (response && typeof response === "object") {
      // Odpowiedź to obiekt z kluczami będącymi ID rozliczeń
      const allSettlements = Object.values(response);
      const employeeSettlements = allSettlements.filter(s => s.employee_id === employeeId);
      console.log(`[HRappka] Filtered settlements for employee ${employeeId}:`, employeeSettlements.length, "out of", allSettlements.length);
      return employeeSettlements;
    }
    
    console.log(`[HRappka] No settlements found in response`);
    return [];
  } catch (error) {
    console.error(`[HRappka] Error fetching settlements for employee ${employeeId}:`, error);
    // Nie rzucaj błędu - zwróć pustą listę jeśli nie udało się pobrać
    return [];
  }
}

/**
 * Pobiera umowy pracownika z HRappka
 * 
 * @param employeeId - ID pracownika w HRappka
 * @returns Lista umów pracownika
 */
export async function getHRappkaContracts(employeeId: number): Promise<HRappkaContract[]> {
  try {
    const contractsEndpoint = "/api/contracts/list";
    
    const response = await callHRappkaApi<{ contracts?: HRappkaContract[] }>(
      contractsEndpoint,
      {
        method: "GET",
        query: {
          usr_id: employeeId,
        },
      }
    );
    
    if (response && typeof response === "object" && "contracts" in response) {
      const contracts = response.contracts || [];
      // Filtruj tylko aktywne umowy (nieusunięte)
      return contracts.filter(c => !c.cuc_deleted);
    }
    
    return [];
  } catch (error) {
    console.error(`[HRappka] Error fetching contracts for employee ${employeeId}:`, error);
    // Nie rzucaj błędu - zwróć pustą listę jeśli nie udało się pobrać
    return [];
  }
}

/**
 * Pobiera informacje o pracowniku z HRappka dla panelu pracownika
 * 
 * @param employeeId - ID pracownika w HRappka
 * @returns Informacje o pracowniku (godziny, urlopy, umowa)
 */
export async function getHRappkaEmployeeInfo(employeeId: number): Promise<HRappkaEmployeeInfo> {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    // Oblicz daty dla bieżącego miesiąca
    const monthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    const lastDay = new Date(currentYear, currentMonth, 0).getDate();
    const monthEnd = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    
    // Oblicz daty dla bieżącego roku
    const yearStart = `${currentYear}-01-01`;
    const yearEnd = `${currentYear}-12-31`;
    
    // Oblicz daty dla bieżącego tygodnia (poniedziałek - niedziela)
    const today = new Date(now);
    const dayOfWeek = today.getDay(); // 0 = niedziela, 1 = poniedziałek
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Konwersja: niedziela = 6 dni od poniedziałku
    const weekStartDate = new Date(today);
    weekStartDate.setDate(today.getDate() - daysFromMonday);
    const weekStart = `${weekStartDate.getFullYear()}-${String(weekStartDate.getMonth() + 1).padStart(2, '0')}-${String(weekStartDate.getDate()).padStart(2, '0')}`;
    const weekEnd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    // Pobierz godziny dla bieżącego miesiąca
    const monthReports = await getHRappkaTimeReports(employeeId, monthStart, monthEnd, "REAL");
    const totalHoursThisMonth = monthReports.reduce((sum, report) => sum + (report.hours || 0), 0);
    
    // Pobierz godziny dla bieżącego roku
    const yearReports = await getHRappkaTimeReports(employeeId, yearStart, yearEnd, "REAL");
    const totalHoursThisYear = yearReports.reduce((sum, report) => sum + (report.hours || 0), 0);
    
    // Pobierz godziny dla bieżącego tygodnia
    const weekReports = await getHRappkaTimeReports(employeeId, weekStart, weekEnd, "REAL");
    const totalHoursThisWeek = weekReports.reduce((sum, report) => sum + (report.hours || 0), 0);
    
    // Oblicz średnią godzin dziennie w bieżącym miesiącu (tylko dni które już minęły)
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const todayDay = today.getDate();
    const daysPassed = Math.min(todayDay, daysInMonth);
    const averageHoursPerDay = daysPassed > 0 ? totalHoursThisMonth / daysPassed : 0;
    
    // Sprawdź czy wczoraj były uzupełnione godziny
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    
    const yesterdayReports = await getHRappkaTimeReports(
      employeeId,
      yesterdayStr,
      yesterdayStr,
      "REAL"
    );
    const yesterdayHours = yesterdayReports.reduce((sum, report) => sum + (report.hours || 0), 0);
    const yesterdayHoursReported = yesterdayHours > 0;
    
    // Pobierz umowy pracownika
    const contracts = await getHRappkaContracts(employeeId);
    
    // Znajdź aktywną umowę (najnowszą, nieusuniętą, z najpóźniejszą datą rozpoczęcia)
    const activeContract = contracts
      .filter(c => c.cuc_state !== "SETTLED" && !c.cuc_deleted)
      .sort((a, b) => {
        const dateA = new Date(a.cuc_start_date).getTime();
        const dateB = new Date(b.cuc_start_date).getTime();
        return dateB - dateA; // Najnowsza pierwsza
      })[0];
    
    const contractEndDate = activeContract?.cuc_end_date || undefined;
    const contractStartDate = activeContract?.cuc_start_date || undefined;
    const contractType = activeContract?.cuc_type || undefined;
    
    // Pobierz ostatnie rozliczenie (sprawdź poprzedni miesiąc i bieżący miesiąc)
    let lastSettlement: HRappkaSettlement | undefined = undefined;
    try {
      // Najpierw sprawdź poprzedni miesiąc
      const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
      const prevMonthStart = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;
      const prevMonthLastDay = new Date(prevYear, prevMonth, 0).getDate();
      const prevMonthEnd = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(prevMonthLastDay).padStart(2, '0')}`;
      
      let settlements = await getHRappkaSettlements(employeeId, prevMonthStart, prevMonthEnd);
      console.log(`[HRappka] Found ${settlements.length} settlements for previous month (${prevMonthStart} - ${prevMonthEnd})`);
      
      // Jeśli nie ma w poprzednim miesiącu, sprawdź bieżący miesiąc
      if (settlements.length === 0) {
        settlements = await getHRappkaSettlements(employeeId, monthStart, monthEnd);
        console.log(`[HRappka] Found ${settlements.length} settlements for current month (${monthStart} - ${monthEnd})`);
      }
      
      // Jeśli nadal nie ma, sprawdź ostatnie 3 miesiące
      if (settlements.length === 0) {
        const threeMonthsAgo = new Date(currentYear, currentMonth - 3, 1);
        const threeMonthsAgoStart = `${threeMonthsAgo.getFullYear()}-${String(threeMonthsAgo.getMonth() + 1).padStart(2, '0')}-01`;
        settlements = await getHRappkaSettlements(employeeId, threeMonthsAgoStart, monthEnd);
        console.log(`[HRappka] Found ${settlements.length} settlements for last 3 months (${threeMonthsAgoStart} - ${monthEnd})`);
      }
      
      if (settlements.length > 0) {
        // Znajdź najnowsze rozliczenie
        lastSettlement = settlements.sort((a, b) => {
          const dateA = new Date(a.settlement_to).getTime();
          const dateB = new Date(b.settlement_to).getTime();
          return dateB - dateA;
        })[0];
        console.log(`[HRappka] Selected last settlement:`, {
          id: lastSettlement.settlement_id,
          from: lastSettlement.settlement_from,
          to: lastSettlement.settlement_to,
          netto: lastSettlement.cash_netto_to_pay,
        });
      } else {
        console.log(`[HRappka] No settlements found for employee ${employeeId}`);
      }
    } catch (error) {
      console.warn(`[HRappka] Could not fetch settlements for employee ${employeeId}:`, error);
      // Nie rzucaj błędu - rozliczenia są opcjonalne
    }
    
    // TODO: Pobierz informacje o urlopach z HRappka API
    // Na razie zwracamy undefined - można to rozszerzyć gdy znajdziemy odpowiedni endpoint
    const vacationDaysRemaining = undefined;
    
    return {
      totalHoursThisMonth,
      totalHoursThisYear,
      totalHoursThisWeek,
      averageHoursPerDay,
      vacationDaysRemaining,
      contractEndDate,
      contractStartDate,
      contractType,
      yesterdayHoursReported,
      yesterdayHours: yesterdayHours > 0 ? yesterdayHours : undefined,
      lastSettlement,
    };
  } catch (error) {
    console.error(`[HRappka] Error fetching employee info for ${employeeId}:`, error);
    throw error;
  }
}

/**
 * Pobiera wszystkie raporty godzinowe dla wszystkich pracowników
 * 
 * UWAGA: Ten endpoint może nie być dostępny w API HRappka.
 * Zamiast tego, pobierz listę pracowników i dla każdego wywołaj getHRappkaTimeReports.
 * 
 * @param startDate - Data początkowa (YYYY-MM-DD)
 * @param endDate - Data końcowa (YYYY-MM-DD)
 * @param endpoint - Opcjonalny endpoint (domyślnie: "/calendar" lub z .env)
 * @returns Lista raportów godzinowych z przypisanym employeeId
 */
export async function getAllHRappkaTimeReports(
  startDate: string,
  endDate: string,
  endpoint?: string
): Promise<HRappkaTimeReport[]> {
  try {
    // Endpoint można dostosować przez parametr lub zmienną środowiskową
    const allTimeReportsEndpoint = endpoint || 
      process.env.HRAPPKA_ALL_TIME_REPORTS_ENDPOINT || 
      "/calendar";
    
    const response = await callHRappkaApi<{ data?: HRappkaTimeReport[]; reports?: HRappkaTimeReport[] }>(
      allTimeReportsEndpoint,
      {
        method: "GET",
        query: {
          startDate,
          endDate,
        },
      }
    );
    
    // Obsługa różnych formatów odpowiedzi
    if (Array.isArray(response)) {
      return response;
    }
    if (response && typeof response === "object") {
      if ("data" in response && Array.isArray(response.data)) {
        return response.data;
      }
      if ("reports" in response && Array.isArray(response.reports)) {
        return response.reports;
      }
    }
    
    return [];
  } catch (error) {
    console.error("[HRappka] Error fetching all time reports:", error);
    throw error;
  }
}

/**
 * Testuje połączenie z HRappka API
 * 
 * @returns true jeśli połączenie działa
 */
export async function testHRappkaConnection(): Promise<boolean> {
  try {
    await authenticateHRappka();
    // Można dodać dodatkowy test endpoint, np. /api/v1/health
    return true;
  } catch (error) {
    console.error("[HRappka] Connection test failed:", error);
    return false;
  }
}

