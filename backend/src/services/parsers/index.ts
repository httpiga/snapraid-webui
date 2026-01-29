import type {
  SnapRaidStatus,
  DiffReport,
  SmartReport,
  DiskStatusInfo,
  SmartDiskInfo,
  DiffFileInfo,
} from "@snapraid-webui/shared";

/**
 * Parse the output of `snapraid status` command
 */
export function parseStatusOutput(output: string): SnapRaidStatus {
  const status: SnapRaidStatus = {
    hasErrors: false,
    hasWarnings: false,
    parityUpToDate: true,
    newFiles: 0,
    modifiedFiles: 0,
    deletedFiles: 0,
    rawOutput: output,
  };

  const lines = output.split("\n");

  for (const line of lines) {
    // Actual array errors only: "DANGER! In the array there are X errors!" (not "No error detected")
    if (line.includes("DANGER!") && line.includes("errors")) {
      status.hasErrors = true;
    }
    // Warnings: "WARNING! ..." (free space, scrub dates, etc.) — separate from errors
    if (line.includes("WARNING!")) {
      status.hasWarnings = true;
    }

    // Check parity status (SnapRAID status output: "No sync is in progress" vs "NOT fully synced" / "sync in progress at X%")
    if (
      line.includes("NOT fully synced") ||
      line.includes("You have a sync in progress at")
    ) {
      status.parityUpToDate = false;
    } else if (line.includes("No sync is in progress")) {
      status.parityUpToDate = true;
    }

    // new/modified/deleted counts come from 'snapraid diff', not status; status parser leaves them 0

    // Scrub coverage: "X% of the array is not scrubbed" -> coverage = 100 - X; "The full array was scrubbed" -> 100%
    const notScrubbedMatch = line.match(
      /(\d+)%\s+of\s+the\s+array\s+is\s+not\s+scrubbed/i
    );
    if (notScrubbedMatch) {
      status.scrubPercentage = 100 - parseInt(notScrubbedMatch[1], 10);
    } else if (line.includes("The full array was scrubbed")) {
      status.scrubPercentage = 100;
    }

    // Parse total files
    const totalFilesMatch = line.match(/(\d+)\s+files/i);
    if (totalFilesMatch) {
      status.totalFiles = parseInt(totalFilesMatch[1], 10);
    }

    // Parse fragmented files
    const fragmentedMatch = line.match(/(\d+)\s+fragmented/i);
    if (fragmentedMatch) {
      status.fragmentedFiles = parseInt(fragmentedMatch[1], 10);
    }

    // Parse disk usage (simplified)
    const gbMatch = line.match(/(\d+(?:\.\d+)?)\s*GB/i);
    if (gbMatch && !status.totalUsedGB) {
      status.totalUsedGB = parseFloat(gbMatch[1]);
    }
  }

  return status;
}

/**
 * Parse the output of `snapraid diff` command
 */
export function parseDiffOutput(output: string): DiffReport {
  const report: DiffReport = {
    files: [],
    totalFiles: 0,
    equalFiles: 0,
    newFiles: 0,
    modifiedFiles: 0,
    deletedFiles: 0,
    movedFiles: 0,
    copiedFiles: 0,
    restoredFiles: 0,
    timestamp: new Date().toISOString(),
    rawOutput: output,
  };

  const lines = output.split("\n");

  for (const line of lines) {
    // Parse file entries
    const fileMatch = line.match(
      /^(add|remove|update|move|copy|restore|equal)\s+(.+)$/i
    );
    if (fileMatch) {
      const [, statusStr, name] = fileMatch;
      const statusMap: Record<string, DiffFileInfo["status"]> = {
        add: "added",
        remove: "removed",
        update: "updated",
        move: "moved",
        copy: "copied",
        restore: "restored",
        equal: "equal",
      };

      report.files.push({
        status: statusMap[statusStr.toLowerCase()] || "equal",
        name: name.trim(),
      });
    }

    // Parse summary line
    const summaryMatch = line.match(
      /(\d+)\s+(equal|added|removed|updated|moved|copied|restored)/gi
    );
    if (summaryMatch) {
      for (const match of summaryMatch) {
        const [count, type] = match.split(/\s+/);
        const num = parseInt(count, 10);

        switch (type.toLowerCase()) {
          case "equal":
            report.equalFiles = num;
            break;
          case "added":
            report.newFiles = num;
            break;
          case "removed":
            report.deletedFiles = num;
            break;
          case "updated":
            report.modifiedFiles = num;
            break;
          case "moved":
            report.movedFiles = num;
            break;
          case "copied":
            report.copiedFiles = num;
            break;
          case "restored":
            report.restoredFiles = num;
            break;
        }
      }
    }
  }

  report.totalFiles =
    report.files.length ||
    report.equalFiles +
      report.newFiles +
      report.deletedFiles +
      report.modifiedFiles +
      report.movedFiles +
      report.copiedFiles +
      report.restoredFiles;

  return report;
}

/**
 * Parse the output of `snapraid smart` command
 */
export function parseSmartOutput(output: string): SmartReport {
  const report: SmartReport = {
    disks: [],
    timestamp: new Date().toISOString(),
    rawOutput: output,
  };

  const lines = output.split("\n");
  let currentDisk: SmartDiskInfo | null = null;

  for (const line of lines) {
    // Parse disk header line
    // Format: "Temp  Power   Error   FP Size       Serial          Device    Disk"
    // Or device lines like: "  32C   7601       -   0%   4TB     S3YJNA0M123456  /dev/sda  d1"
    const diskMatch = line.match(
      /^\s*(\d+)C?\s+(\d+)\s+(\S+)\s+(\d+)%?\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s*$/
    );
    if (diskMatch) {
      const [, temp, power, _error, failProb, size, serial, device, name] =
        diskMatch;

      report.disks.push({
        name,
        device,
        status: "OK",
        temperature: parseInt(temp, 10),
        powerOnHours: parseInt(power, 10),
        failureProbability: parseInt(failProb, 10),
        serial,
        size,
      });
    }

    // Check for FAIL/PREFAIL status
    if (line.includes("FAIL") || line.includes("PREFAIL")) {
      const status = line.includes("PREFAIL") ? "PREFAIL" : "FAIL";
      // Try to find which disk this applies to
      const nameMatch = line.match(/\b([a-zA-Z][a-zA-Z0-9]*)\b/);
      if (nameMatch && report.disks.length > 0) {
        const disk = report.disks.find((d) => d.name === nameMatch[1]);
        if (disk) {
          disk.status = status;
        }
      }
    }
  }

  return report;
}

/**
 * Parse disk status from status output
 */
export function parseDiskStatus(output: string): DiskStatusInfo[] {
  const disks: DiskStatusInfo[] = [];
  const lines = output.split("\n");

  for (const line of lines) {
    // Look for disk info lines
    // Format varies, but typically: "d1  12345 files, 500 GB"
    const diskMatch = line.match(
      /^([a-zA-Z0-9]+)\s+(\d+)\s+files.*?(\d+(?:\.\d+)?)\s*GB/i
    );
    if (diskMatch) {
      const [, name, files, usedGB] = diskMatch;

      disks.push({
        name,
        files: parseInt(files, 10),
        fragmentedFiles: 0,
        excessFragments: 0,
        wastedGB: 0,
        usedGB: parseFloat(usedGB),
        freeGB: 0, // Would need more parsing to determine
        usePercent: 0,
      });
    }
  }

  return disks;
}
