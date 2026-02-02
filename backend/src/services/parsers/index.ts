import type {
  SnapRaidStatus,
  DiffReport,
  DiskStatusInfo,
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

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

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

    // Parse totals line: " --------..." then next line has total used/free in 5th and 6th columns
    if (line.includes("--------") && lines[i + 1]) {
      const totalsLine = lines[i + 1];
      const totalsMatch = totalsLine.match(
        /^\s*\d+\s+\d+\s+\d+\s+[\d.-]+\s+(\d+)\s+(\d+|-)\s/
      );
      if (totalsMatch) {
        status.totalUsedGB = parseFloat(totalsMatch[1]);
        const freeStr = totalsMatch[2].trim();
        status.totalFreeGB =
          freeStr === "" || freeStr === "-" ? undefined : parseFloat(freeStr);
      }
    }

    // Fallback: line like " 500.5 GB used" when totals line not present
    if (status.totalUsedGB === undefined) {
      const gbMatch = line.match(/(\d+(?:\.\d+)?)\s*GB/i);
      if (gbMatch) {
        status.totalUsedGB = parseFloat(gbMatch[1]);
      }
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
 * Parse disk status from status output.
 * SnapRAID status uses fixed-width columns:
 * " Files Fragmented Excess Wasted Used Free Use Name"
 * Per-disk line: 8u 8u 8u 8.1f 8llu 8llu N% name (or " -" for free when unknown)
 */
export function parseDiskStatus(output: string): DiskStatusInfo[] {
  const disks: DiskStatusInfo[] = [];
  const lines = output.split("\n");

  for (const line of lines) {
    // Skip header and separator lines
    if (
      line.includes("Files") &&
      line.includes("Fragmented") &&
      line.includes("Name")
    ) {
      continue;
    }
    if (line.includes("--------")) {
      continue;
    }

    // Fixed-width format: files frag excess wasted used free use% name (use% can be " - " when unknown)
    const diskMatch = line.match(
      /^\s*(\d+)\s+(\d+)\s+(\d+)\s+([\d.]+|-)\s+(\d+)\s+(\d+|\s*-\s*)\s+(?:\d+%|-)\s+(\S+)$/
    );
    if (diskMatch) {
      const [, files, fragmented, excess, _wasted, usedGB, freeStr, name] =
        diskMatch;
      const freeGB =
        freeStr.trim() === "" || freeStr.trim() === "-"
          ? 0
          : parseFloat(freeStr.trim());
      const used = parseFloat(usedGB);
      const totalGB = used + freeGB;
      disks.push({
        name,
        files: parseInt(files, 10),
        fragmentedFiles: parseInt(fragmented, 10),
        excessFragments: parseInt(excess, 10),
        wastedGB: 0,
        usedGB: used,
        freeGB,
        usePercent:
          totalGB > 0 ? Math.round((used / totalGB) * 100) : 0,
      });
      continue;
    }

    // Legacy format: "d1  12345 files, 500.25 GB" (for compatibility)
    const legacyMatch = line.match(
      /^([a-zA-Z0-9]+)\s+(\d+)\s+files.*?(\d+(?:\.\d+)?)\s*GB/i
    );
    if (legacyMatch) {
      const [, name, files, usedGB] = legacyMatch;
      disks.push({
        name,
        files: parseInt(files, 10),
        fragmentedFiles: 0,
        excessFragments: 0,
        wastedGB: 0,
        usedGB: parseFloat(usedGB),
        freeGB: 0,
        usePercent: 0,
      });
    }
  }

  return disks;
}
