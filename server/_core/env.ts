// Funkcja do debugowania zmiennych środowiskowych (wywoływana dynamicznie po załadowaniu .env)
export function debugEnvVars() {
  if (process.env.NODE_ENV !== "production") {
    console.log("[ENV Debug] Sprawdzanie zmiennych środowiskowych:");
    console.log("[ENV Debug] BUILT_IN_FORGE_API_KEY:", process.env.BUILT_IN_FORGE_API_KEY ? `ustawiony (${process.env.BUILT_IN_FORGE_API_KEY.substring(0, 10)}...)` : "BRAK");
    console.log("[ENV Debug] OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? `ustawiony (${process.env.OPENAI_API_KEY.substring(0, 10)}...)` : "BRAK");
    console.log("[ENV Debug] Wszystkie zmienne z 'API' lub 'KEY':", 
      Object.keys(process.env).filter(k => k.includes('API') || k.includes('KEY')).join(', '));
  }
}

// ENV jest tworzony przy załadowaniu modułu - wartości mogą być puste jeśli .env nie został jeszcze załadowany
// W takim przypadku wartości będą aktualizowane po załadowaniu .env przez process.env
export const ENV = {
  get appId() { return process.env.VITE_APP_ID ?? ""; },
  get cookieSecret() { return process.env.JWT_SECRET ?? ""; },
  get databaseUrl() { return process.env.DATABASE_URL ?? ""; },
  get oAuthServerUrl() { return process.env.OAUTH_SERVER_URL ?? ""; },
  get ownerOpenId() { return process.env.OWNER_OPEN_ID ?? ""; },
  get isProduction() { return process.env.NODE_ENV === "production"; },
  get isStandalone() { return !this.oAuthServerUrl || this.oAuthServerUrl.length === 0; },
  get forgeApiUrl() { return process.env.BUILT_IN_FORGE_API_URL ?? ""; },
  // Użyj OPENAI_API_KEY jako fallback jeśli BUILT_IN_FORGE_API_KEY nie jest ustawiony
  get forgeApiKey() { return process.env.BUILT_IN_FORGE_API_KEY ?? process.env.OPENAI_API_KEY ?? ""; },
  get openaiApiKey() { return process.env.OPENAI_API_KEY ?? ""; },
};
