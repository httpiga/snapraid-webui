import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MOCK_DISKS = join(ROOT, "mock-disks");
const CONFIG_EXAMPLE = join(ROOT, "config.example", "snapraid.conf");
const CONFIG_OUT = join(ROOT, "config", "snapraid.conf");

const SEED_FILES: Array<{ path: string; content: string }> = [
  {
    path: "disk1/sample-movie.mkv.txt",
    content: `Mock file representing a media file on disk1.
SnapRAID will checksum this when you run sync.
Rename to .mkv if you want to test exclude patterns.
`,
  },
  {
    path: "disk1/docs/readme.txt",
    content: `Seed data for mock disk1.
Used by local development and tests.
`,
  },
  {
    path: "disk2/backup-2024.dat",
    content: `Mock backup.
`,
  },
  {
    path: "disk2/photos/landscape.jpg.txt",
    content: `A beautiful landscape.
`,
  },
  { path: "parity/here-goes-the-parity-file.txt", content: "" },
];

const SNAPRAID_CONF = `# SnapRAID config for local development with mock disks
# Paths are relative to the repo root (backend cwd when running dev).

# Parity file (must NOT be on a data disk)
parity mock-disks/parity/snapraid.parity

# Content files (at least 2; one per data disk + redundancy)
content mock-disks/disk1/snapraid.content
content mock-disks/disk2/snapraid.content

# Data disks (name and path with trailing slash)
data d1 mock-disks/disk1/
data d2 mock-disks/disk2/
`;

async function seedMockDisks() {
  console.log("Seeding mock disks at", MOCK_DISKS);

  for (const { path: relativePath, content } of SEED_FILES) {
    const fullPath = join(MOCK_DISKS, relativePath);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, content, "utf-8");
    console.log("  wrote", relativePath);
  }

  await mkdir(dirname(CONFIG_OUT), { recursive: true });
  try {
    await writeFile(
      CONFIG_OUT,
      await readFile(CONFIG_EXAMPLE, "utf-8"),
      "utf-8"
    );
    console.log("  wrote config/snapraid.conf from config.example");
  } catch (err) {
    await writeFile(CONFIG_OUT, SNAPRAID_CONF, "utf-8");
    console.log("  wrote config/snapraid.conf (embedded)");
  }

  console.log("Done.");
}

seedMockDisks().catch((err) => {
  console.error(err);
  process.exit(1);
});
