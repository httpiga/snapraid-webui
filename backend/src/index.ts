import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync, mkdirSync } from "fs";
import { createServer } from "http";

import { PORT, CONFIG_PATH, LOGS_DIR } from "./config.js";
import configRoutes from "./routes/config.js";
import snapraidRoutes from "./routes/snapraid.js";
import logsRoutes from "./routes/logs.js";
import schedulesRoutes from "./routes/schedules.js";
import notificationsRoutes from "./routes/notifications.js";
import authRoutes from "./routes/auth.js";
import { initializeWebSocket } from "./websocket.js";
import { initializeScheduler } from "./services/scheduler.js";
import { createSessionMiddleware, authMiddleware } from "./middleware/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

// Ensure config directory exists
if (!existsSync(CONFIG_PATH)) {
  mkdirSync(CONFIG_PATH, { recursive: true });
  console.log(`Created config directory: ${CONFIG_PATH}`);
}

// Ensure logs directory exists
if (!existsSync(LOGS_DIR)) {
  mkdirSync(LOGS_DIR, { recursive: true });
  console.log(`Created logs directory: ${LOGS_DIR}`);
}

// Middleware
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Initialize session middleware
const sessionMiddleware = await createSessionMiddleware();
app.use(sessionMiddleware);

// Auth middleware (checks if auth is enabled and validates session)
app.use("/api", authMiddleware());

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/config", configRoutes);
app.use("/api", snapraidRoutes);
app.use("/api/logs", logsRoutes);
app.use("/api/schedules", schedulesRoutes);
app.use("/api/notifications", notificationsRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Serve static files from frontend build in production
const frontendPath = path.join(__dirname, "../../frontend/dist");
if (existsSync(frontendPath)) {
  app.use(express.static(frontendPath));

  // Catch-all route for SPA
  app.get("*", (_req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
  });
} else {
  // Development mode - frontend runs separately
  app.get("/", (_req, res) => {
    res.json({
      message: "SnapRAID Web UI API",
      docs: "Frontend not built. Run `pnpm run build:frontend` or access frontend at http://localhost:5173 in development.",
    });
  });
}

// Initialize WebSocket
initializeWebSocket(server);

// Initialize scheduler
initializeScheduler().catch(console.error);

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║           SnapRAID Web UI Server                      ║
╠═══════════════════════════════════════════════════════╣
║  Server running on: http://localhost:${PORT.toString().padEnd(16)}║
║  WebSocket: ws://localhost:${PORT}/ws${" ".repeat(20)}║
║  Config path: ${CONFIG_PATH.slice(0, 38).padEnd(38)}║
╚═══════════════════════════════════════════════════════╝
  `);
});

export { app, server };
