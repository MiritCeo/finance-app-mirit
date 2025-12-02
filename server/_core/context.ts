import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  // Standalone mode: auto-login as owner (no OAuth)
  const user: User = {
    id: 1,
    openId: process.env.OWNER_OPEN_ID || "admin",
    name: process.env.OWNER_NAME || "Admin",
    email: "admin@profitflow.local",
    loginMethod: "standalone",
    role: "admin" as const,
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
