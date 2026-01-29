# SnapRAID Web UI

A modern, self-hosted web interface for managing [SnapRAID](https://www.snapraid.it/) installations. Execute commands, manage configurations, schedule operations, and receive notifications - all through your browser.

## Features

- **Dashboard** - Real-time status overview, disk health, and recent activity
- **Disk Management** - Configure data and parity disks through visual or raw editor
- **Command Execution** - Run sync, scrub, check, fix, and more with live output streaming
- **Scheduling** - Automate sync and scrub operations with cron-based scheduling
- **File Recovery** - Browse and restore accidentally deleted files
- **Notifications** - Get alerts via Discord, Telegram, Slack, or Email
- **Optional Auth** - Protect your instance with username/password authentication

## Quick Start

### Using Docker (Recommended)

1. Create a `docker-compose.yml`:

```yaml
services:
  snapraid-webui:
    image: ghcr.io/httpiga/snapraid-webui:latest
    container_name: snapraid-webui
    restart: unless-stopped
    volumes:
      # SnapRAID binary from host (required)
      - /usr/bin/snapraid:/usr/bin/snapraid:ro
      # Persistent config folder (required)
      - ./config:/app/config
      # Mount your data disks (adjust to your setup)
      - /mnt/disk1:/mnt/disk1
      - /mnt/disk2:/mnt/disk2
      - /mnt/disk3:/mnt/disk3
      # Mount your parity disk(s)
      - /mnt/parity:/mnt/parity
    ports:
      - "3000:3000"
    environment:
      - TZ=Europe/Rome
    privileged: true
```

2. Start the container:

```bash
docker compose up -d
```

3. Open http://localhost:3000 in your browser

### Environment Variables

| Variable             | Description              | Default                                       |
| -------------------- | ------------------------ | --------------------------------------------- |
| `TZ`                 | Timezone                 | `UTC`                                         |
| `AUTH_ENABLED`       | Enable authentication    | `false`                                       |
| `AUTH_USERNAME`      | Username for auth        | `admin`                                       |
| `AUTH_PASSWORD_HASH` | Bcrypt hash of password  | -                                             |
| `CONFIG_PATH`        | Path to config directory | `/app/config`                                 |
| `SNAPRAID_BIN`       | Path to snapraid binary  | `/usr/bin/snapraid` or `snapraid` (from PATH) |

## Development

### Prerequisites

- [Bun](https://bun.sh/) >= 1.0
- SnapRAID installed on your system

### Setup

```bash
# Clone the repository
git clone https://github.com/httpiga/snapraid-webui.git
cd snapraid-webui

# Install dependencies
bun install

# Start development servers
bun run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3000

### Local dev: virtual disks (macOS)

SnapRAID requires content files on **different disks** (different devices). Using plain folders under `mock-disks/` makes SnapRAID treat them as the same disk and report: "Content files on the same disk".

To satisfy SnapRAID locally without real disks, use three **virtual disk images** (macOS only):

```bash
# Create 3 sparse disk images, mount at mock-disks/, seed sample files
bun run setup:virtual-disks

# When done (optional): unmount; images stay in .virtual-disk-images/
bun run teardown:virtual-disks
```

Then run `snapraid status` and `snapraid sync` from the web UI or CLI. On Linux you can achieve the same with `losetup` + separate loop devices and mount points.

### Project Structure

```
snapraid-webui/
├── backend/          # Bun/Express API server
├── frontend/         # React/Vite application
├── shared/           # Shared TypeScript types
└── docker/           # Docker configuration
```

## Tech Stack

- **Runtime**: Bun
- **Backend**: Express
- **Frontend**: React 19, Vite, React Router v7
- **UI**: shadcn/ui, Tailwind CSS
- **State**: Redux Toolkit + RTK Query
- **Scheduling**: node-cron

## License

MIT
