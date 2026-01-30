import { describe, test, expect } from "bun:test";
import * as parsers from "./index";
import {
  parseStatusOutput,
  parseDiffOutput,
  parseSmartOutput,
  parseDiskStatus,
} from "./index";

describe("parseStatusOutput", () => {
  test("default status for empty output", () => {
    const status = parseStatusOutput("");
    expect(status.hasErrors).toBe(false);
    expect(status.hasWarnings).toBe(false);
    expect(status.parityUpToDate).toBe(true);
    expect(status.newFiles).toBe(0);
    expect(status.modifiedFiles).toBe(0);
    expect(status.deletedFiles).toBe(0);
    expect(status.rawOutput).toBe("");
  });

  test("sets hasErrors when DANGER and errors present", () => {
    const status = parseStatusOutput(
      "DANGER! In the array there are 2 errors!"
    );
    expect(status.hasErrors).toBe(true);
  });

  test("sets hasWarnings when WARNING! present", () => {
    const status = parseStatusOutput("WARNING! Low free space on disk");
    expect(status.hasWarnings).toBe(true);
  });

  test("sets parityUpToDate false when NOT fully synced", () => {
    const status = parseStatusOutput("The array is NOT fully synced.");
    expect(status.parityUpToDate).toBe(false);
  });

  test("sets parityUpToDate false when sync in progress", () => {
    const status = parseStatusOutput("You have a sync in progress at 45%");
    expect(status.parityUpToDate).toBe(false);
  });

  test("sets parityUpToDate true when no sync in progress", () => {
    const status = parseStatusOutput("No sync is in progress.");
    expect(status.parityUpToDate).toBe(true);
  });

  test("parses scrub percentage from 'X% of the array is not scrubbed'", () => {
    const status = parseStatusOutput("30% of the array is not scrubbed");
    expect(status.scrubPercentage).toBe(70);
  });

  test("sets scrub 100 when full array was scrubbed", () => {
    const status = parseStatusOutput("The full array was scrubbed");
    expect(status.scrubPercentage).toBe(100);
  });

  test("parses total files", () => {
    const status = parseStatusOutput(" 12345 files in the array");
    expect(status.totalFiles).toBe(12345);
  });

  test("parses fragmented files", () => {
    const status = parseStatusOutput(" 100 fragmented files");
    expect(status.fragmentedFiles).toBe(100);
  });

  test("parses total used GB", () => {
    const status = parseStatusOutput(" 500.5 GB used");
    expect(status.totalUsedGB).toBe(500.5);
  });
});

describe("parseDiffOutput", () => {
  test("returns report with zero counts for empty output", () => {
    const report = parseDiffOutput("");
    expect(report.files).toEqual([]);
    expect(report.totalFiles).toBe(0);
    expect(report.equalFiles).toBe(0);
    expect(report.newFiles).toBe(0);
    expect(report.modifiedFiles).toBe(0);
    expect(report.deletedFiles).toBe(0);
    expect(report.rawOutput).toBe("");
  });

  test("parses file entries add/remove/update/equal", () => {
    const output = [
      "add    /new/file.txt",
      "remove /deleted/file.txt",
      "update /modified/file.txt",
      "equal  /unchanged/file.txt",
    ].join("\n");
    const report = parseDiffOutput(output);
    expect(report.files).toHaveLength(4);
    expect(report.files[0].status).toBe("added");
    expect(report.files[0].name).toBe("/new/file.txt");
    expect(report.files[1].status).toBe("removed");
    expect(report.files[2].status).toBe("updated");
    expect(report.files[3].status).toBe("equal");
  });

  test("parses summary line counts", () => {
    const output = " 10 equal, 2 added, 1 removed, 0 updated";
    const report = parseDiffOutput(output);
    expect(report.equalFiles).toBe(10);
    expect(report.newFiles).toBe(2);
    expect(report.deletedFiles).toBe(1);
    expect(report.modifiedFiles).toBe(0);
  });
});

describe("parseSmartOutput", () => {
  test("returns empty disks for empty output", () => {
    const report = parseSmartOutput("");
    expect(report.disks).toEqual([]);
    expect(report.rawOutput).toBe("");
  });

  test("parses disk line", () => {
    const output =
      "  32C   7601       -   0%   4TB     S3YJNA0M123456  /dev/sda  d1";
    const report = parseSmartOutput(output);
    expect(report.disks).toHaveLength(1);
    expect(report.disks[0].name).toBe("d1");
    expect(report.disks[0].device).toBe("/dev/sda");
    expect(report.disks[0].temperature).toBe(32);
    expect(report.disks[0].powerOnHours).toBe(7601);
    expect(report.disks[0].failureProbability).toBe(0);
    expect(report.disks[0].serial).toBe("S3YJNA0M123456");
    expect(report.disks[0].size).toBe("4TB");
  });
});

describe("parsers index", () => {
  test("exports all parser functions", () => {
    expect(typeof parsers.parseStatusOutput).toBe("function");
    expect(typeof parsers.parseDiffOutput).toBe("function");
    expect(typeof parsers.parseSmartOutput).toBe("function");
    expect(typeof parsers.parseDiskStatus).toBe("function");
  });
});

describe("parseDiskStatus", () => {
  test("returns empty array for empty output", () => {
    const disks = parseDiskStatus("");
    expect(disks).toEqual([]);
  });

  test("parses disk info line", () => {
    const output = "d1  12345 files, 500.25 GB";
    const disks = parseDiskStatus(output);
    expect(disks).toHaveLength(1);
    expect(disks[0].name).toBe("d1");
    expect(disks[0].files).toBe(12345);
    expect(disks[0].usedGB).toBe(500.25);
  });
});
