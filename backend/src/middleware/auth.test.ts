import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import type { NextFunction, Request, Response } from "express";
import { authMiddleware } from "./auth";

const envBackup = { ...process.env };

const resetEnv = () => {
  for (const key of Object.keys(process.env)) {
    delete process.env[key];
  }
  Object.assign(process.env, envBackup);
};

const createMockRes = () => {
  let statusCode = 200;
  let payload: unknown = undefined;
  const res = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(body: unknown) {
      payload = body;
      return res;
    },
  } as Response & { statusCode?: number; payload?: unknown };
  Object.defineProperty(res, "statusCode", { get: () => statusCode });
  Object.defineProperty(res, "payload", { get: () => payload });
  return res;
};

const runMiddleware = async (req: Partial<Request>, res: Response) => {
  let nextCalled = false;
  const next: NextFunction = () => {
    nextCalled = true;
  };
  await authMiddleware()(req as Request, res, next);
  return nextCalled;
};

beforeEach(() => {
  resetEnv();
});

afterEach(() => {
  resetEnv();
});

describe("authMiddleware", () => {
  test("allows requests when authentication is disabled", async () => {
    delete process.env.AUTH_ENABLED;
    delete process.env.AUTH_PASSWORD_HASH;

    const req = { path: "/api/config" } as Partial<Request>;
    const res = createMockRes();

    const nextCalled = await runMiddleware(req, res);

    expect(nextCalled).toBe(true);
    expect((res as any).statusCode).toBe(200);
  });

  test("allows requests when session is authenticated and username matches", async () => {
    process.env.AUTH_ENABLED = "true";
    process.env.AUTH_USERNAME = "admin";
    process.env.AUTH_PASSWORD_HASH = "hash";

    const req = {
      path: "/api/config",
      session: { authenticated: true, username: "admin" },
    } as Partial<Request>;
    const res = createMockRes();

    const nextCalled = await runMiddleware(req, res);

    expect(nextCalled).toBe(true);
    expect((res as any).statusCode).toBe(200);
  });

  test("rejects requests when session is missing or username mismatched", async () => {
    process.env.AUTH_ENABLED = "true";
    process.env.AUTH_USERNAME = "admin";
    process.env.AUTH_PASSWORD_HASH = "hash";

    const session = { authenticated: true, username: "other" };
    const req = {
      path: "/api/config",
      session,
    } as Partial<Request>;
    const res = createMockRes();

    const nextCalled = await runMiddleware(req, res);

    expect(nextCalled).toBe(false);
    expect((res as any).statusCode).toBe(401);
    expect((res as any).payload).toEqual({ error: "Authentication required" });
    expect(session).toEqual({ authenticated: false, username: "" });
  });
});
