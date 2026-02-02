import { Router, type IRouter } from "express";
import path from "path";
import fs from "fs/promises";
import type {
  FileSystemEntry,
  FileSystemResponse,
} from "@snapraid-webui/shared";

const router: IRouter = Router();
const basePath = path.parse(process.cwd()).root;

router.get("/fs", async (req, res) => {
  try {
    const requestedPath =
      typeof req.query.path === "string" ? req.query.path : "";
    const resolvedPath = requestedPath
      ? path.resolve(basePath, requestedPath)
      : basePath;

    if (!resolvedPath.startsWith(basePath)) {
      res.status(400).json({ error: "Path outside of base directory" });
      return;
    }

    const stats = await fs.stat(resolvedPath).catch(() => null);
    if (!stats || !stats.isDirectory()) {
      res.status(404).json({ error: "Directory not found" });
      return;
    }

    const dirents = await fs.readdir(resolvedPath, { withFileTypes: true });
    const entries: FileSystemEntry[] = [];

    for (const dirent of dirents) {
      if (dirent.isSymbolicLink()) {
        continue;
      }

      const fullPath = path.join(resolvedPath, dirent.name);
      let size: number | undefined;

      if (dirent.isFile()) {
        const entryStats = await fs.stat(fullPath).catch(() => null);
        size = entryStats?.size;
      }

      entries.push({
        name: dirent.name,
        path: fullPath,
        isDirectory: dirent.isDirectory(),
        size,
      });
    }

    entries.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) {
        return a.isDirectory ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    const parentPath =
      resolvedPath === basePath ? null : path.dirname(resolvedPath);

    const response: FileSystemResponse = {
      basePath,
      path: resolvedPath,
      parentPath:
        parentPath && parentPath.startsWith(basePath) ? parentPath : null,
      entries,
    };

    res.json(response);
  } catch (error) {
    console.error("Error reading filesystem:", error);
    res.status(500).json({ error: "Failed to read directory" });
  }
});

export default router;
