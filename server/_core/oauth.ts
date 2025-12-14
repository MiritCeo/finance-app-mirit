import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import bcrypt from "bcrypt";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  // Logowanie dla administratorów (email + hasło)
  app.post("/api/auth/admin-login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: "Email i hasło są wymagane" });
        return;
      }

      // Znajdź administratora po emailu w tabeli employees
      // Administrator powinien mieć konto w employees z email i passwordHash
      const adminEmployee = await db.getEmployeeByEmail(email);
      if (!adminEmployee || !adminEmployee.isActive) {
        res.status(401).json({ error: "Nieprawidłowy email lub hasło" });
        return;
      }

      // Sprawdź czy administrator ma ustawione hasło
      if (!adminEmployee.passwordHash) {
        res.status(401).json({ error: "Hasło nie zostało ustawione. Skontaktuj się z administratorem systemu." });
        return;
      }

      // Sprawdź hasło
      const isValidPassword = await bcrypt.compare(password, adminEmployee.passwordHash);
      if (!isValidPassword) {
        res.status(401).json({ error: "Nieprawidłowy email lub hasło" });
        return;
      }

      // Sprawdź czy istnieje użytkownik z employee_ prefixem (stary format)
      // Jeśli tak, usuń go lub zaktualizuj
      const oldEmployeeOpenId = `employee_${adminEmployee.id}`;
      const oldUser = await db.getUserByOpenId(oldEmployeeOpenId);
      if (oldUser) {
        console.log("[Auth] Admin login - found old employee user, deleting:", oldEmployeeOpenId);
        // Usuń starego użytkownika z employee_ prefixem
        const dbInstance = await db.getDb();
        if (dbInstance) {
          await dbInstance.delete(users).where(eq(users.openId, oldEmployeeOpenId));
        }
      }
      
      // Sprawdź czy ten employee ma powiązany user z rolą admin
      // Jeśli nie, utwórz/aktualizuj user z rolą admin
      const openId = `admin_${adminEmployee.id}`;
      console.log("[Auth] Admin login - upserting user with role 'admin'", { openId, email: adminEmployee.email });
      await db.upsertUser({
        openId,
        name: `${adminEmployee.firstName} ${adminEmployee.lastName}`,
        email: adminEmployee.email || null,
        loginMethod: "admin",
        role: "admin",
        employeeId: adminEmployee.id,
        lastSignedIn: new Date(),
      });
      
      // Sprawdź czy użytkownik został poprawnie utworzony/zaktualizowany
      const createdUser = await db.getUserByOpenId(openId);
      console.log("[Auth] Admin login - user after upsert:", JSON.stringify({
        id: createdUser?.id,
        openId: createdUser?.openId,
        role: createdUser?.role,
        employeeId: createdUser?.employeeId,
        email: createdUser?.email,
        loginMethod: createdUser?.loginMethod
      }, null, 2));

      // Utwórz token sesji
      const sessionToken = await sdk.createSessionToken(openId, {
        name: `${adminEmployee.firstName} ${adminEmployee.lastName}`,
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({ success: true, employeeId: adminEmployee.id });
    } catch (error) {
      console.error("[Auth] Admin login failed", error);
      res.status(500).json({ error: "Błąd logowania" });
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
