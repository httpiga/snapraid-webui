import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import { tmpdir } from "os";
import * as realConfig from "../config";

const tmpDir = path.join(
  tmpdir(),
  `logs-test-${Date.now()}-${Math.random().toString(16).slice(2)}`
);

const { mock } = await import("bun:test");

mock.module("../config", () => ({
  CONFIG_PATH: realConfig.CONFIG_PATH,
  PORT: realConfig.PORT,
  APP_CONFIG_FILE: path.join(tmpDir, "app-config.json"),
  SCHEDULES_FILE: path.join(tmpDir, "schedules.json"),
  SNAPRAID_CONF_FILE: path.join(tmpDir, "snapraid.conf"),
  LOGS_DIR: tmpDir,
  SNAPRAID_BIN: realConfig.SNAPRAID_BIN,
}));

const importedLogs = await import("./logs");
const logsRouter = importedLogs.default as any;
const { createLogFile, appendToLogFile } = importedLogs;

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

afterEach(async () => {
  if (!existsSync(tmpDir)) {
    await fs.mkdir(tmpDir, { recursive: true });
  }
});

beforeEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
  await fs.mkdir(tmpDir, { recursive: true });
});

describe("GET /api/logs", () => {
  test("initializes logs directory if missing", async () => {
    expect(existsSync(tmpDir)).toBe(true);
  });

  test("returns empty array when logs directory does not exist", async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
    const res = await handle(logsRouter, "GET", "/");
    expect(res.status).toBe(200);
    expect(res.data).toEqual([]);
  });

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

  test("sorts log files newest first", async () => {
    const first = "sync-2024-01-01T00-00-00.log";
    const second = "scrub-2024-01-02T00-00-00.log";
    await fs.writeFile(path.join(tmpDir, first), "one", "utf-8");
    await fs.writeFile(path.join(tmpDir, second), "two", "utf-8");
    const res = await handle(logsRouter, "GET", "/");
    const data = res.data as { filename: string }[];
    const firstIndex = data.findIndex((item) => item.filename === first);
    const secondIndex = data.findIndex((item) => item.filename === second);
    expect(secondIndex).toBeLessThan(firstIndex);
  });

  test("returns 500 when reading directory fails", async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
    await fs.writeFile(tmpDir, "not a dir", "utf-8");
    const res = await handle(logsRouter, "GET", "/");
    expect(res.status).toBe(500);
    expect((res.data as { error: string }).error).toContain("Failed");
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

  test("returns 500 when readFile throws", async () => {
    const filename = await createLogFile("scrub", "log line");
    const filePath = path.join(tmpDir, filename);
    await fs.rm(filePath, { force: true });
    await fs.mkdir(filePath, { recursive: true });
    const res = await handle(logsRouter, "GET", `/${filename}`, { filename });
    expect(res.status).toBe(500);
    expect((res.data as { error: string }).error).toContain("Failed");
  });
});

describe("DELETE /api/logs (bulk)", () => {
  test("returns 400 when query is missing", async () => {
    const res = await handle(logsRouter, "DELETE", "/");
    expect(res.status).toBe(400);
  });

  test("returns 400 when both all and olderThan are provided", async () => {
    const res = await new Promise<{ status: number; data: unknown }>(
      (resolve, reject) => {
        const req = createMockReq("DELETE", "/", {});
        req.query = { all: "1", olderThan: "5" };
        const res = createMockRes(resolve);
        logsRouter.handle(req, res, (err: unknown) => {
          if (err) reject(err);
        });
      }
    );
    expect(res.status).toBe(400);
  });

  test("returns success with deleted 0 when logs dir missing", async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
    const res = await new Promise<{ status: number; data: unknown }>(
      (resolve, reject) => {
        const req = createMockReq("DELETE", "/", {});
        req.query = { all: "1" };
        const res = createMockRes(resolve);
        logsRouter.handle(req, res, (err: unknown) => {
          if (err) reject(err);
        });
      }
    );
    expect(res.status).toBe(200);
    expect(res.data).toEqual({ success: true, deleted: 0 });
  });

  test("deletes only older logs when olderThan is set", async () => {
    const oldFile = "sync-2024-01-01T00-00-00.log";
    const newFile = "sync-2024-01-02T00-00-00.log";
    const oldPath = path.join(tmpDir, oldFile);
    const newPath = path.join(tmpDir, newFile);
    await fs.writeFile(oldPath, "old log", "utf-8");
    await fs.writeFile(newPath, "new log", "utf-8");
    const realNow = Date.now;
    Date.now = () => realNow() + 10 * 24 * 60 * 60 * 1000;

    const res = await new Promise<{ status: number; data: unknown }>(
      (resolve, reject) => {
        const req = createMockReq("DELETE", "/", {});
        req.query = { olderThan: "5" };
        const res = createMockRes(resolve);
        logsRouter.handle(req, res, (err: unknown) => {
          if (err) reject(err);
        });
      }
    );
    Date.now = realNow;
    expect(res.status).toBe(200);
    expect(res.data).toEqual({ success: true, deleted: 2 });
    expect(existsSync(oldPath)).toBe(false);
    expect(existsSync(newPath)).toBe(false);
  });

  test("returns 500 when bulk delete fails", async () => {
    const badDir = path.join(tmpDir, "bad.log");
    await fs.mkdir(badDir, { recursive: true });
    const res = await new Promise<{ status: number; data: unknown }>(
      (resolve, reject) => {
        const req = createMockReq("DELETE", "/", {});
        req.query = { all: "1" };
        const res = createMockRes(resolve);
        logsRouter.handle(req, res, (err: unknown) => {
          if (err) reject(err);
        });
      }
    );
    expect(res.status).toBe(500);
    expect((res.data as { error: string }).error).toContain("Failed");
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

  test("returns 500 when delete fails", async () => {
    const filename = await createLogFile("check", "temp content");
    const filePath = path.join(tmpDir, filename);
    await fs.rm(filePath, { force: true });
    await fs.mkdir(filePath, { recursive: true });
    const res = await handle(logsRouter, "DELETE", `/${filename}`, {
      filename,
    });
    expect(res.status).toBe(500);
    expect((res.data as { error: string }).error).toContain("Failed");
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
