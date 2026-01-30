import { describe, test, expect } from "bun:test";
import path from "path";
import fs from "fs/promises";
import { mkdtempSync, existsSync } from "fs";
import { tmpdir } from "os";
import * as realConfig from "../config";

const tmpDir = mkdtempSync(path.join(tmpdir(), "logs-test-"));

// Mock config before importing logs (LOGS_DIR must point to temp dir); preserve other exports for other tests
const { mock } = await import("bun:test");
mock.module("../config", () => ({
  CONFIG_PATH: realConfig.CONFIG_PATH,
  PORT: realConfig.PORT,
  APP_CONFIG_FILE: realConfig.APP_CONFIG_FILE,
  SCHEDULES_FILE: realConfig.SCHEDULES_FILE,
  SNAPRAID_CONF_FILE: realConfig.SNAPRAID_CONF_FILE,
  LOGS_DIR: tmpDir,
  SNAPRAID_BIN: realConfig.SNAPRAID_BIN,
}));

const {
  default: logsRouter,
  createLogFile,
  appendToLogFile,
} = await import("./logs");

function createMockReq(
  method: string,
  path: string,
  params: Record<string, string> = {}
) {
  return {
    method,
    url: path,
    path,
    params,
    query: {},
    headers: {},
    body: undefined,
  } as any;
}

function createMockRes(
  resolve: (r: { status: number; data: unknown; text: string }) => void
) {
  let statusCode = 200;
  let data: unknown = null;
  let text = "";
  const finish = () => {
    if (!res.__done) {
      res.__done = true;
      resolve({ status: statusCode, data, text });
    }
  };
  const res: any = {
    __done: false,
    __resolve: resolve,
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(payload: unknown) {
      data = payload;
      text = JSON.stringify(payload);
      finish();
      return res;
    },
    send(payload: string | unknown) {
      text = typeof payload === "string" ? payload : JSON.stringify(payload);
      data = payload;
      finish();
      return res;
    },
    setHeader() {
      return res;
    },
    end() {
      finish();
    },
  };
  return res;
}

function handle(
  router: any,
  method: string,
  path: string,
  params: Record<string, string> = {}
): Promise<{ status: number; data: unknown; text: string }> {
  return new Promise((resolve, reject) => {
    const req = createMockReq(method, path, params);
    const res = createMockRes(resolve);
    router.handle(req, res, (err: unknown) => {
      if (err) reject(err);
      else if (!res.__done)
        res.__resolve({ status: 404, data: { error: "no route" }, text: "{}" });
    });
  });
}

describe("GET /api/logs", () => {
  test("returns empty array when no log files", async () => {
    const res = await handle(logsRouter, "GET", "/");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
    expect((res.data as unknown[]).length).toBe(0);
  });

  test("returns list of log files with parsed command and timestamp", async () => {
    const filename = await createLogFile(
      "sync",
      "=== Scheduled: Nightly ===\nLine 1\n"
    );
    const res = await handle(logsRouter, "GET", "/");
    expect(res.status).toBe(200);
    const data = res.data as {
      filename: string;
      command: string;
      scheduled: boolean;
      size: number;
    }[];
    expect(data.length).toBeGreaterThanOrEqual(1);
    const found = data.find((f) => f.filename === filename);
    expect(found).toBeDefined();
    expect(found!.command).toBe("sync");
    expect(found!.scheduled).toBe(true);
    expect(found!.size).toBeGreaterThan(0);
  });
});

describe("GET /api/logs/:filename", () => {
  test("returns 400 for filename with .. (single segment)", async () => {
    const res = await handle(logsRouter, "GET", "/..", { filename: ".." });
    expect(res.status).toBe(400);
    expect((res.data as { error: string }).error).toContain("Invalid");
  });

  test("returns 404 when file does not exist", async () => {
    const res = await handle(logsRouter, "GET", "/nonexistent.log", {
      filename: "nonexistent.log",
    });
    expect(res.status).toBe(404);
    expect((res.data as { error: string }).error).toContain("not found");
  });

  test("returns log content when file exists", async () => {
    const filename = await createLogFile("scrub", "log line one\nline two");
    const res = await handle(logsRouter, "GET", `/${filename}`, { filename });
    expect(res.status).toBe(200);
    expect(res.text).toContain("log line one");
    expect(res.text).toContain("line two");
  });
});

describe("DELETE /api/logs/:filename", () => {
  test("returns 400 for invalid filename (..)", async () => {
    const res = await handle(logsRouter, "DELETE", "/..", { filename: ".." });
    expect(res.status).toBe(400);
  });

  test("returns 404 when file does not exist", async () => {
    const res = await handle(logsRouter, "DELETE", "/nonexistent.log", {
      filename: "nonexistent.log",
    });
    expect(res.status).toBe(404);
  });

  test("deletes file and returns success", async () => {
    const filename = await createLogFile("check", "temp content");
    const filePath = path.join(tmpDir, filename);
    expect(existsSync(filePath)).toBe(true);
    const res = await handle(logsRouter, "DELETE", `/${filename}`, {
      filename,
    });
    expect(res.status).toBe(200);
    expect((res.data as { success: boolean }).success).toBe(true);
    try {
      await fs.access(filePath);
      expect(true).toBe(false);
    } catch {
      // expected: file removed
    }
  });
});

describe("createLogFile", () => {
  test("creates file with command and timestamp in name", async () => {
    const filename = await createLogFile("sync", "content here");
    expect(filename).toMatch(/^sync-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.log$/);
    const filePath = path.join(tmpDir, filename);
    const content = await fs.readFile(filePath, "utf-8");
    expect(content).toBe("content here");
  });
});

describe("appendToLogFile", () => {
  test("appends content to existing file", async () => {
    const filename = await createLogFile("sync", "first\n");
    await appendToLogFile(filename, "second\n");
    const filePath = path.join(tmpDir, filename);
    const content = await fs.readFile(filePath, "utf-8");
    expect(content).toBe("first\nsecond\n");
  });
});
