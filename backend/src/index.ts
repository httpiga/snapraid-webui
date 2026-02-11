import express, { type Express } from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import path from "path"
import { existsSync, mkdirSync } from "fs"
import { createServer } from "http"

import { PORT, CONFIG_PATH, LOGS_DIR } from "./config"
import configRoutes from "./routes/config"
import snapraidRoutes from "./routes/snapraid"
import logsRoutes from "./routes/logs"
import schedulesRoutes from "./routes/schedules"
import notificationsRoutes from "./routes/notifications"
import syncSafetyRoutes from "./routes/sync-safety"
import advancedRoutes from "./routes/advanced"
import authRoutes from "./routes/auth"
import filesystemRoutes from "./routes/filesystem"
import { initializeWebSocket } from "./websocket"
import { initializeScheduler } from "./services/scheduler"
import { createSessionMiddleware, authMiddleware } from "./middleware/auth"
import { errorMiddleware } from "./middleware/async-handler"

/**
 * Bun test discovery/execution can evaluate non-test source files in some CI setups.
 * Guard server startup side-effects in that mode to keep unit tests isolated.
 */
export function isTestRuntime(
  argv: string[] = process.argv,
  nodeEnv: string | undefined = process.env.NODE_ENV,
): boolean {
  return (
    nodeEnv === "test" ||
    argv.some((arg) => arg === "test" || arg.includes("bun:test"))
  )
}

const app: Express = express()
const server = createServer(app)

// Ensure config directory exists
if (!existsSync(CONFIG_PATH)) {
  mkdirSync(CONFIG_PATH, { recursive: true })
  console.log(`Created config directory: ${CONFIG_PATH}`)
}

// Ensure logs directory exists
if (!existsSync(LOGS_DIR)) {
  mkdirSync(LOGS_DIR, { recursive: true })
  console.log(`Created logs directory: ${LOGS_DIR}`)
}

// Middleware
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
)
app.use(express.json())
app.use(cookieParser())

// Initialize session middleware
const sessionMiddleware = await createSessionMiddleware()
app.use(sessionMiddleware)

// Auth middleware (checks if auth is enabled and validates session)
app.use("/api", authMiddleware())

// API Routes
app.use("/api/auth", authRoutes)
app.use("/api/config", configRoutes)
app.use("/api", snapraidRoutes)
app.use("/api/logs", logsRoutes)
app.use("/api/schedules", schedulesRoutes)
app.use("/api/notifications", notificationsRoutes)
app.use("/api/sync-safety", syncSafetyRoutes)
app.use("/api/advanced", advancedRoutes)
app.use("/api", filesystemRoutes)

// Error handling for async route handlers (must be after routes)
app.use(errorMiddleware)

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() })
})

// Serve static files from frontend build in production
const frontendPath = path.join(import.meta.dir, "../../frontend/dist")
if (existsSync(frontendPath)) {
  app.use(express.static(frontendPath))

  // Catch-all route for SPA
  app.get("*", (_req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"))
  })
} else {
  // Development mode - frontend runs separately
  app.get("/", (_req, res) => {
    res.json({
      message: "SnapRAID Web UI API",
      docs: "Frontend not built. Run `pnpm run build:frontend` or access frontend at http://localhost:5173 in development.",
    })
  })
}

async function startServer(): Promise<void> {
  // Initialize WebSocket
  initializeWebSocket(server)

  // Initialize scheduler
  initializeScheduler().catch(console.error)

  server.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════╗
║           SnapRAID Web UI Server                      ║
╠═══════════════════════════════════════════════════════╣
║  Server running on: http://localhost:${PORT.toString().padEnd(16)}║
║  WebSocket: ws://localhost:${PORT}/ws${" ".repeat(20)}║
║  Config path: ${CONFIG_PATH.slice(0, 38).padEnd(38)}║
╚═══════════════════════════════════════════════════════╝
  `)
  })
}

if (import.meta.main && !isTestRuntime()) {
  startServer().catch((error) => {
    console.error("Failed to start server:", error)
    process.exit(1)
  })
}

export { app, server, startServer }
