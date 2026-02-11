import { WebSocketServer, WebSocket } from "ws"
import type { Server } from "http"
import type { WSMessage, SnapRaidCommand } from "@snapraid-webui/shared"
import { snapraidRunner } from "./services/snapraid-runner"
import { SNAPRAID_CONF_FILE } from "./config"
import { createLogFile, appendToLogFile } from "./services/command-log"
import { validateSyncSafetyWithNotification } from "./services/sync-safety"
import {
  prepareArgs,
  executeWithNotification,
} from "./services/command-execution"

// Connected clients
const clients = new Set<WebSocket>()

// Current command state
let currentLogFile: string | null = null

/**
 * Broadcast a message to all connected clients
 */
function broadcast(message: WSMessage): void {
  const data = JSON.stringify(message)
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data)
    }
  }
}

/**
 * Handle output from SnapRAID commands
 */
async function handleOutput(chunk: string): Promise<void> {
  // Broadcast to all clients
  broadcast({
    type: "output",
    chunk,
    timestamp: new Date().toISOString(),
  })

  // Append to log file
  if (currentLogFile) {
    await appendToLogFile(currentLogFile, chunk).catch(console.error)
  }
}

/**
 * Execute a command with WebSocket output streaming
 */
export async function executeCommandWithStreaming(
  command: SnapRaidCommand,
  args: string[] = [],
  options?: { diffOutput?: string },
): Promise<{ exitCode: number; output: string }> {
  // Create log file if not already created (e.g., by sync safety validation)
  if (!currentLogFile) {
    currentLogFile = await createLogFile(
      command,
      `=== SnapRAID ${command} started at ${new Date().toISOString()} ===\n`,
    )

    // Notify clients that command started
    broadcast({
      type: "status",
      command,
      timestamp: new Date().toISOString(),
    })
  }

  try {
    const result = await executeWithNotification(
      command,
      SNAPRAID_CONF_FILE,
      args,
      { onOutput: handleOutput, diffOutput: options?.diffOutput },
    )

    // Append completion to log
    if (currentLogFile) {
      await appendToLogFile(
        currentLogFile,
        `\n=== Command completed with exit code ${
          result.exitCode
        } at ${new Date().toISOString()} ===\n`,
      )
    }

    // Notify clients that command completed
    broadcast({
      type: "complete",
      command,
      exitCode: result.exitCode,
      timestamp: new Date().toISOString(),
    })

    return result
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error"

    // Append error to log
    if (currentLogFile) {
      await appendToLogFile(
        currentLogFile,
        `\n=== ERROR: ${errorMessage} ===\n`,
      )
    }

    // Notify clients of error
    broadcast({
      type: "error",
      error: errorMessage,
      timestamp: new Date().toISOString(),
    })

    throw error
  } finally {
    currentLogFile = null
  }
}

/**
 * Initialize WebSocket server
 */
export function initializeWebSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: "/ws" })

  wss.on("error", (err) => {
    console.error("WebSocket server error:", err)
  })

  wss.on("connection", (ws) => {
    console.log("WebSocket client connected")
    clients.add(ws)

    // Send connected message
    ws.send(
      JSON.stringify({
        type: "connected",
        timestamp: new Date().toISOString(),
      } satisfies WSMessage),
    )

    // Send current job status if any
    const currentJob = snapraidRunner.getCurrentJob()
    if (currentJob) {
      ws.send(
        JSON.stringify({
          type: "status",
          command: currentJob.command,
          timestamp: currentJob.startTime,
        } satisfies WSMessage),
      )
    }

    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString())

        // Handle incoming commands from clients
        if (message.type === "command") {
          const { command, args = [], syncSafetySettings } = message

          if (snapraidRunner.isRunning()) {
            ws.send(
              JSON.stringify({
                type: "error",
                error: "Another command is already running",
                timestamp: new Date().toISOString(),
              } satisfies WSMessage),
            )
            return
          }

          const finalArgs = await prepareArgs(command, args)

          let diffOutput = ""
          // Check sync safety before running sync command
          if (command === "sync") {
            // Create log file before validation so diff output is captured
            currentLogFile = await createLogFile(
              command,
              `=== SnapRAID ${command} started at ${new Date().toISOString()} ===\n`,
            )

            // Notify clients that command started
            broadcast({
              type: "status",
              command,
              timestamp: new Date().toISOString(),
            })

            // Validate sync safety with output streaming; capture diff output for notification
            // If explicit settings provided (from Operations page), use them
            // Otherwise load from config (for scheduled syncs)
            const outputWithCapture = (chunk: string) => {
              handleOutput(chunk)
              diffOutput += chunk
            }
            const validation = await validateSyncSafetyWithNotification(
              SNAPRAID_CONF_FILE,
              outputWithCapture,
              syncSafetySettings,
            )

            if (!validation.safe) {
              // Append failure to log
              if (currentLogFile) {
                await appendToLogFile(
                  currentLogFile,
                  `\n=== Sync halted by safety checks at ${new Date().toISOString()} ===\n`,
                )
              }

              // Notify clients that command completed with error
              broadcast({
                type: "error",
                error: `Sync halted: ${validation.violations.join("; ")}`,
                timestamp: new Date().toISOString(),
              })

              currentLogFile = null
              return
            }
          }

          // Execute command in background (include diff output for sync notification)
          const streamOptions = command === "sync" ? { diffOutput } : undefined
          executeCommandWithStreaming(command, finalArgs, streamOptions).catch(
            console.error,
          )
        }

        // Handle abort request
        if (message.type === "abort") {
          const aborted = snapraidRunner.abort()
          ws.send(
            JSON.stringify({
              type: aborted ? "status" : "error",
              error: aborted ? undefined : "No command is running",
              timestamp: new Date().toISOString(),
            } satisfies WSMessage),
          )
        }
      } catch (error) {
        console.error("Error handling WebSocket message:", error)
      }
    })

    ws.on("close", () => {
      console.log("WebSocket client disconnected")
      clients.delete(ws)
    })

    ws.on("error", (error) => {
      console.error("WebSocket error:", error)
      clients.delete(ws)
    })
  })

  console.log("WebSocket server initialized at /ws")
  return wss
}

/**
 * Get the number of connected clients
 */
export function getConnectedClientCount(): number {
  return clients.size
}
