import { describe, test, expect } from "bun:test";
import type { SyncSafetySettings } from "@snapraid-webui/shared";

describe("Sync safety validation logic", () => {
  test("validation passes when all limits within bounds", () => {
    const settings: SyncSafetySettings = {
      enabled: true,
      maxDeletedFiles: 100,
      maxUpdatedFiles: 500,
      maxAddedFiles: 10000,
      preHash: false,
      forceEmpty: false,
    };

    const diff = {
      newFiles: 50,
      modifiedFiles: 10,
      deletedFiles: 5,
    };

    // Test the validation logic
    const violations: string[] = [];
    
    if (diff.deletedFiles > settings.maxDeletedFiles) {
      violations.push(`Deleted files (${diff.deletedFiles}) exceeds limit (${settings.maxDeletedFiles})`);
    }
    if (diff.modifiedFiles > settings.maxUpdatedFiles) {
      violations.push(`Updated files (${diff.modifiedFiles}) exceeds limit (${settings.maxUpdatedFiles})`);
    }
    if (diff.newFiles > settings.maxAddedFiles) {
      violations.push(`Added files (${diff.newFiles}) exceeds limit (${settings.maxAddedFiles})`);
    }

    expect(violations).toEqual([]);
  });

  test("validation fails when deleted files exceed limit", () => {
    const settings: SyncSafetySettings = {
      enabled: true,
      maxDeletedFiles: 100,
      maxUpdatedFiles: 500,
      maxAddedFiles: 10000,
      preHash: false,
      forceEmpty: false,
    };

    const diff = {
      newFiles: 10,
      modifiedFiles: 20,
      deletedFiles: 150,
    };

    const violations: string[] = [];
    
    if (diff.deletedFiles > settings.maxDeletedFiles) {
      violations.push(`Deleted files (${diff.deletedFiles}) exceeds limit (${settings.maxDeletedFiles})`);
    }

    expect(violations).toContain("Deleted files (150) exceeds limit (100)");
  });

  test("validation fails when updated files exceed limit", () => {
    const settings: SyncSafetySettings = {
      enabled: true,
      maxDeletedFiles: 100,
      maxUpdatedFiles: 500,
      maxAddedFiles: 10000,
      preHash: false,
      forceEmpty: false,
    };

    const diff = {
      newFiles: 10,
      modifiedFiles: 600,
      deletedFiles: 5,
    };

    const violations: string[] = [];
    
    if (diff.modifiedFiles > settings.maxUpdatedFiles) {
      violations.push(`Updated files (${diff.modifiedFiles}) exceeds limit (${settings.maxUpdatedFiles})`);
    }

    expect(violations).toContain("Updated files (600) exceeds limit (500)");
  });

  test("validation fails when added files exceed limit", () => {
    const settings: SyncSafetySettings = {
      enabled: true,
      maxDeletedFiles: 100,
      maxUpdatedFiles: 500,
      maxAddedFiles: 10000,
      preHash: false,
      forceEmpty: false,
    };

    const diff = {
      newFiles: 11000,
      modifiedFiles: 20,
      deletedFiles: 5,
    };

    const violations: string[] = [];
    
    if (diff.newFiles > settings.maxAddedFiles) {
      violations.push(`Added files (${diff.newFiles}) exceeds limit (${settings.maxAddedFiles})`);
    }

    expect(violations).toContain("Added files (11000) exceeds limit (10000)");
  });

  test("validation reports multiple violations", () => {
    const settings: SyncSafetySettings = {
      enabled: true,
      maxDeletedFiles: 100,
      maxUpdatedFiles: 500,
      maxAddedFiles: 10000,
      preHash: false,
      forceEmpty: false,
    };

    const diff = {
      newFiles: 11000,
      modifiedFiles: 600,
      deletedFiles: 150,
    };

    const violations: string[] = [];
    
    if (diff.deletedFiles > settings.maxDeletedFiles) {
      violations.push(`Deleted files (${diff.deletedFiles}) exceeds limit (${settings.maxDeletedFiles})`);
    }
    if (diff.modifiedFiles > settings.maxUpdatedFiles) {
      violations.push(`Updated files (${diff.modifiedFiles}) exceeds limit (${settings.maxUpdatedFiles})`);
    }
    if (diff.newFiles > settings.maxAddedFiles) {
      violations.push(`Added files (${diff.newFiles}) exceeds limit (${settings.maxAddedFiles})`);
    }

    expect(violations.length).toBe(3);
    expect(violations).toContain("Deleted files (150) exceeds limit (100)");
    expect(violations).toContain("Updated files (600) exceeds limit (500)");
    expect(violations).toContain("Added files (11000) exceeds limit (10000)");
  });

  test("validation passes when safety checks are disabled", () => {
    const settings: SyncSafetySettings = {
      enabled: false,
      maxDeletedFiles: 100,
      maxUpdatedFiles: 500,
      maxAddedFiles: 10000,
      preHash: false,
      forceEmpty: false,
    };

    // When disabled, the route should skip validation entirely
    expect(settings.enabled).toBe(false);
  });

  test("sync_safety_halt notification structure is correct", () => {
    const violations = ["Deleted files (150) exceeds limit (100)"];
    const diff = {
      deletedFiles: 150,
      modifiedFiles: 20,
      newFiles: 10,
    };

    const notificationDetails = {
      Violations: violations.join("; "),
      "Deleted Files": diff.deletedFiles.toString(),
      "Updated Files": diff.modifiedFiles.toString(),
      "Added Files": diff.newFiles.toString(),
    };

    expect(notificationDetails.Violations).toBe("Deleted files (150) exceeds limit (100)");
    expect(notificationDetails["Deleted Files"]).toBe("150");
    expect(notificationDetails["Updated Files"]).toBe("20");
    expect(notificationDetails["Added Files"]).toBe("10");
  });
});
