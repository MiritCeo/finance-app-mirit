import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import bcrypt from "bcrypt";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  // Lokalne logowanie dla developmentu (bez OAuth)
  app.get("/api/auth/local-login", async (req: Request, res: Response) => {
    try {
      const ownerOpenId = process.env.OWNER_OPEN_ID || "admin";
      const ownerName = process.env.OWNER_NAME || "Administrator";
      
      // Sprawdź czy JWT_SECRET jest ustawiony
      if (!process.env.JWT_SECRET) {
        console.error("[Auth] JWT_SECRET is not set in environment variables");
        res.status(500).json({ error: "JWT_SECRET is not configured. Please set JWT_SECRET in .env file." });
        return;
      }

      // Utwórz lub zaktualizuj użytkownika
      await db.upsertUser({
        openId: ownerOpenId,
        name: ownerName,
        email: "admin@localhost",
        loginMethod: "local",
        role: "admin",
        lastSignedIn: new Date(),
      });

      // Utwórz token sesji
      const sessionToken = await sdk.createSessionToken(ownerOpenId, {
        name: ownerName,
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/");
    } catch (error: any) {
      console.error("[Auth] Local login failed", error);
      console.error("[Auth] Error details:", error.message, error.stack);
      res.status(500).json({ 
        error: "Local login failed",
        details: error.message || "Unknown error"
      });
    }
  });

  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });

  // Logowanie dla pracowników (email + hasło)
  app.post("/api/auth/employee-login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: "Email i hasło są wymagane" });
        return;
      }

      // Znajdź pracownika po emailu
      const employee = await db.getEmployeeByEmail(email);
      if (!employee || !employee.isActive) {
        res.status(401).json({ error: "Nieprawidłowy email lub hasło" });
        return;
      }

      // Sprawdź czy pracownik ma ustawione hasło
      if (!employee.passwordHash) {
        res.status(401).json({ error: "Hasło nie zostało ustawione. Skontaktuj się z administratorem." });
        return;
      }

      // Sprawdź hasło
      const isValidPassword = await bcrypt.compare(password, employee.passwordHash);
      if (!isValidPassword) {
        res.status(401).json({ error: "Nieprawidłowy email lub hasło" });
        return;
      }

      // Utwórz lub zaktualizuj użytkownika z rolą "employee"
      const openId = `employee_${employee.id}`;
      await db.upsertUser({
        openId,
        name: `${employee.firstName} ${employee.lastName}`,
        email: employee.email || null,
        loginMethod: "employee",
        role: "employee",
        employeeId: employee.id,
        lastSignedIn: new Date(),
      });

      // Utwórz token sesji
      const sessionToken = await sdk.createSessionToken(openId, {
        name: `${employee.firstName} ${employee.lastName}`,
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({ success: true, employeeId: employee.id });
    } catch (error) {
      console.error("[Auth] Employee login failed", error);
      res.status(500).json({ error: "Błąd logowania" });
    }
  });
}
