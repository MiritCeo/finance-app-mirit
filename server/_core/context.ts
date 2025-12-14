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
  // Try to authenticate via session cookie (for employees, admins or OAuth users)
  try {
    const user = await sdk.authenticateRequest(opts.req);
    return {
      req: opts.req,
      res: opts.res,
      user,
    };
  } catch (error: any) {
    // Authentication failed - user is not logged in
    // Return null user (no fallback to standalone mode)
    return {
      req: opts.req,
      res: opts.res,
      user: null,
    };
  }
}
