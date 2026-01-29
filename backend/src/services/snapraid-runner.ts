import { spawn, type ChildProcess } from "child_process";
import path from "path";
import type {
  SnapRaidCommand,
  RunningJob,
  SnapRaidStatus,
  DiffReport,
  SmartReport,
} from "@snapraid-webui/shared";
import { SNAPRAID_BIN } from "../config.js";
import {
  parseStatusOutput,
  parseDiffOutput,
  parseSmartOutput,
} from "./parsers/index.js";

type OutputCallback = (chunk: string) => void;

export class SnapRaidRunner {
  private currentProcess: ChildProcess | null = null;
  private currentJob: RunningJob | null = null;

  /**
   * Get the currently running job, if any
   */
  getCurrentJob(): RunningJob | null {
    return this.currentJob;
  }

  /**
   * Check if a command is currently running
   */
  isRunning(): boolean {
    return this.currentProcess !== null;
  }

  /**
   * Execute a SnapRAID command
   */
  async executeCommand(
    command: SnapRaidCommand,
    configPath: string,
    onOutput?: OutputCallback,
    args: string[] = []
  ): Promise<{ exitCode: number; output: string }> {
    if (this.isRunning()) {
      throw new Error("Another command is already running");
    }

    return new Promise((resolve, reject) => {
      const fullArgs = ["-c", configPath, ...args, command];

      // Run with cwd = parent of config dir so relative paths in config (e.g. mock-disks/) resolve
      const cwd = path.dirname(path.dirname(configPath));

      console.log(`Executing: ${SNAPRAID_BIN} ${fullArgs.join(" ")}`);

      const process = spawn(SNAPRAID_BIN, fullArgs, {
        stdio: ["ignore", "pipe", "pipe"],
        cwd,
      });

      this.currentProcess = process;
      this.currentJob = {
        command,
        configPath,
        startTime: new Date().toISOString(),
        processId: process.pid?.toString() || "unknown",
      };

      let output = "";

      process.stdout?.on("data", (data: Buffer) => {
        const chunk = data.toString();
        output += chunk;
        onOutput?.(chunk);
      });

      process.stderr?.on("data", (data: Buffer) => {
        const chunk = data.toString();
        output += chunk;
        onOutput?.(chunk);
      });

      process.on("close", (code) => {
        this.currentProcess = null;
        this.currentJob = null;
        resolve({ exitCode: code ?? 0, output });
      });

      process.on("error", (err: NodeJS.ErrnoException) => {
        this.currentProcess = null;
        this.currentJob = null;
        if (err.code === "ENOENT") {
          const notFound = new Error("SnapRAID binary not found") as Error & {
            code: string;
          };
          notFound.code = "SNAPRAID_NOT_FOUND";
          reject(notFound);
        } else {
          reject(err);
        }
      });
    });
  }

  /**
   * Abort the currently running command
   */
  abort(): boolean {
    if (!this.currentProcess) {
      return false;
    }

    // Send SIGTERM first for graceful shutdown
    this.currentProcess.kill("SIGTERM");

    // If still running after 5 seconds, force kill
    setTimeout(() => {
      if (this.currentProcess) {
        this.currentProcess.kill("SIGKILL");
      }
    }, 5000);

    return true;
  }

  /**
   * Get the status of the SnapRAID array
   */
  async getStatus(configPath: string): Promise<SnapRaidStatus> {
    const { output } = await this.executeCommand("status", configPath);
    return parseStatusOutput(output);
  }

  /**
   * Get the diff (changes since last sync)
   */
  async getDiff(configPath: string): Promise<DiffReport> {
    const { output } = await this.executeCommand("diff", configPath);
    return parseDiffOutput(output);
  }

  /**
   * Get SMART disk information
   */
  async getSmart(configPath: string): Promise<SmartReport> {
    const { output } = await this.executeCommand("smart", configPath);
    return parseSmartOutput(output);
  }

  /**
   * Run sync command with optional pre-sync safety checks
   */
  async runSync(
    configPath: string,
    onOutput?: OutputCallback,
    options: {
      preHash?: boolean;
      forceEmpty?: boolean;
      forceZero?: boolean;
    } = {}
  ): Promise<{ exitCode: number; output: string }> {
    const args: string[] = [];

    if (options.preHash) {
      args.push("--pre-hash");
    }
    if (options.forceEmpty) {
      args.push("--force-empty");
    }
    if (options.forceZero) {
      args.push("--force-zero");
    }

    return this.executeCommand("sync", configPath, onOutput, args);
  }

  /**
   * Run scrub command
   */
  async runScrub(
    configPath: string,
    onOutput?: OutputCallback,
    options: {
      plan?: number | "bad" | "new" | "full";
      olderThan?: number;
    } = {}
  ): Promise<{ exitCode: number; output: string }> {
    const args: string[] = [];

    if (options.plan !== undefined) {
      args.push("-p", options.plan.toString());
    }
    if (options.olderThan !== undefined) {
      args.push("-o", options.olderThan.toString());
    }

    return this.executeCommand("scrub", configPath, onOutput, args);
  }

  /**
   * Run fix command to recover files
   */
  async runFix(
    configPath: string,
    onOutput?: OutputCallback,
    options: {
      filter?: string;
      filterMissing?: boolean;
      filterError?: boolean;
      filterDisk?: string;
    } = {}
  ): Promise<{ exitCode: number; output: string }> {
    const args: string[] = [];

    if (options.filter) {
      args.push("-f", options.filter);
    }
    if (options.filterMissing) {
      args.push("-m");
    }
    if (options.filterError) {
      args.push("-e");
    }
    if (options.filterDisk) {
      args.push("-d", options.filterDisk);
    }

    return this.executeCommand("fix", configPath, onOutput, args);
  }

  /**
   * Run check command
   */
  async runCheck(
    configPath: string,
    onOutput?: OutputCallback,
    options: {
      auditOnly?: boolean;
      filter?: string;
    } = {}
  ): Promise<{ exitCode: number; output: string }> {
    const args: string[] = [];

    if (options.auditOnly) {
      args.push("-a");
    }
    if (options.filter) {
      args.push("-f", options.filter);
    }

    return this.executeCommand("check", configPath, onOutput, args);
  }
}

// Singleton instance
export const snapraidRunner = new SnapRaidRunner();
