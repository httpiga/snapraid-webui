import { Router, type IRouter } from "express";
import fs from "fs/promises";
import { existsSync, mkdirSync } from "fs";
import path from "path";
import type { LogFile, SnapRaidCommand } from "@snapraid-webui/shared";
import { LOGS_DIR } from "../config.js";

const router: IRouter = Router();

// Ensure logs directory exists
if (!existsSync(LOGS_DIR)) {
  mkdirSync(LOGS_DIR, { recursive: true });
}

/**
 * GET /api/logs
 * List all log files
 */
router.get("/", async (_req, res) => {
  try {
    if (!existsSync(LOGS_DIR)) {
      res.json([]);
      return;
    }

    const files = await fs.readdir(LOGS_DIR);
    const logFiles: LogFile[] = [];

    for (const filename of files) {
      if (!filename.endsWith(".log")) continue;

      const filePath = path.join(LOGS_DIR, filename);
      const stats = await fs.stat(filePath);

      // Parse command from filename (e.g., "sync-2024-01-15T10-30-00.log")
      const commandMatch = filename.match(/^([a-z]+)-/);
      const command = (commandMatch?.[1] || "unknown") as SnapRaidCommand;

      // Parse timestamp from filename
      const timestampMatch = filename.match(
        /-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})\.log$/,
      );
      let timestamp = stats.mtime.toISOString();
      if (timestampMatch) {
        timestamp = timestampMatch[1].replace(/-/g, (m, i) =>
          i > 9 ? ":" : m,
        );
      }

      // Peek at start of file to detect scheduled vs manual (scheduled logs start with "=== Scheduled:")
      let scheduled = false;
      try {
        const handle = await fs.open(filePath, "r");
        const buf = Buffer.alloc(200);
        const { bytesRead } = await handle.read(buf, 0, 200, 0);
        await handle.close();
        if (bytesRead > 0) {
          scheduled = buf
            .toString("utf-8", 0, bytesRead)
            .includes("=== Scheduled:");
        }
      } catch {
        // Keep scheduled false if read fails
      }

      logFiles.push({
        filename,
        path: filePath,
        command,
        timestamp,
        size: stats.size,
        scheduled,
      });
    }

    // Sort by timestamp descending (newest first)
    logFiles.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    res.json(logFiles);
  } catch (error) {
    console.error("Error listing logs:", error);
    res.status(500).json({ error: "Failed to list log files" });
  }
});

/**
 * GET /api/logs/:filename
 * Get the content of a specific log file
 */
router.get("/:filename", async (req, res) => {
  try {
    const { filename } = req.params;

    // Security: prevent directory traversal
    if (filename.includes("..") || filename.includes("/")) {
      res.status(400).json({ error: "Invalid filename" });
      return;
    }

    const filePath = path.join(LOGS_DIR, filename);

    if (!existsSync(filePath)) {
      res.status(404).json({ error: "Log file not found" });
      return;
    }

    const content = await fs.readFile(filePath, "utf-8");
    res.json(content);
  } catch (error) {
    console.error("Error reading log:", error);
    res.status(500).json({ error: "Failed to read log file" });
  }
});

/**
 * DELETE /api/logs?all=1
 * Delete all log files
 *
 * DELETE /api/logs?olderThan=30
 * Delete log files older than N days
 */
router.delete("/", async (req, res) => {
  try {
    const all = req.query.all === "1" || req.query.all === "true";
    const olderThanParam = req.query.olderThan;
    const olderThanDays =
      olderThanParam != null ? parseInt(String(olderThanParam), 10) : NaN;

    if (!all && Number.isNaN(olderThanDays)) {
      res.status(400).json({
        error:
          "Specify query 'all=1' to delete all logs or 'olderThan=N' for logs older than N days",
      });
      return;
    }

    if (all && !Number.isNaN(olderThanDays)) {
      res.status(400).json({
        error: "Use either 'all=1' or 'olderThan=N', not both",
      });
      return;
    }

    if (!existsSync(LOGS_DIR)) {
      res.json({ success: true, deleted: 0 });
      return;
    }

    const files = await fs.readdir(LOGS_DIR);
    const cutoff =
      !Number.isNaN(olderThanDays) && olderThanDays > 0
        ? Date.now() - olderThanDays * 24 * 60 * 60 * 1000
        : 0;
    let deleted = 0;

    for (const filename of files) {
      if (!filename.endsWith(".log")) continue;

      const filePath = path.join(LOGS_DIR, filename);
      const stats = await fs.stat(filePath);
      const mtime = stats.mtime.getTime();

      if (all || mtime < cutoff) {
        await fs.unlink(filePath);
        deleted++;
      }
    }

    res.json({ success: true, deleted });
  } catch (error) {
    console.error("Error bulk deleting logs:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete log files",
    });
  }
});

/**
 * DELETE /api/logs/:filename
 * Delete a specific log file
 */
router.delete("/:filename", async (req, res) => {
  try {
    const { filename } = req.params;

    // Security: prevent directory traversal
    if (filename.includes("..") || filename.includes("/")) {
      res.status(400).json({ error: "Invalid filename" });
      return;
    }

    const filePath = path.join(LOGS_DIR, filename);

    if (!existsSync(filePath)) {
      res.status(404).json({ error: "Log file not found" });
      return;
    }

    await fs.unlink(filePath);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting log:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to delete log file" });
  }
});

/**
 * Create a log file for a command execution
 */
export async function createLogFile(
  command: SnapRaidCommand,
  content: string,
): Promise<string> {
  const timestamp = new Date()
    .toISOString()
    .replace(/:/g, "-")
    .replace(/\.\d{3}Z$/, "");
  const filename = `${command}-${timestamp}.log`;
  const filePath = path.join(LOGS_DIR, filename);

  await fs.writeFile(filePath, content, "utf-8");
  return filename;
}

/**
 * Append to a log file
 */
export async function appendToLogFile(
  filename: string,
  content: string,
): Promise<void> {
  const filePath = path.join(LOGS_DIR, filename);
  await fs.appendFile(filePath, content, "utf-8");
}

export default router;
