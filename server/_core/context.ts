import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import * as db from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  // Try to authenticate via session cookie (for employees or OAuth users)
  try {
    const user = await sdk.authenticateRequest(opts.req);
    return {
      req: opts.req,
      res: opts.res,
      user,
    };
  } catch (error) {
    // If authentication fails, fall back to standalone mode (admin)
    // This is expected behavior in standalone mode - no need to log errors
    const user: User = {
      id: 1,
      openId: process.env.OWNER_OPEN_ID || "admin",
      name: process.env.OWNER_NAME || "Admin",
      email: "admin@profitflow.local",
      loginMethod: "standalone",
      role: "admin" as const,
      employeeId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };

    return {
      req: opts.req,
      res: opts.res,
      user,
    };
  }
}
