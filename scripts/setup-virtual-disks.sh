#!/usr/bin/env bash
# Create three virtual disk images and mount them at mock-disks/ so SnapRAID
# sees separate devices (avoids "content files on the same disk" warning).
# macOS only (uses hdiutil). For Linux, use losetup + mkfs + mount.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
IMAGES_DIR="$ROOT/.virtual-disk-images"
MOCK_DISKS="$ROOT/mock-disks"
SIZE="100m"

usage() {
  echo "Usage: $0 [setup|teardown]"
  echo "  setup    - Create 3 sparse disk images, mount at mock-disks/, run seed (default)"
  echo "  teardown - Unmount and leave images in .virtual-disk-images/"
  exit 1
}

teardown() {
  echo "Unmounting virtual disks..."
  for name in parity disk1 disk2; do
    mp="$MOCK_DISKS/$name"
    if [ -d "$mp" ] && mount | grep -q "$mp"; then
      hdiutil detach "$mp" -force 2>/dev/null || true
      echo "  detached $mp"
    fi
  done
  echo "Done. Images left in $IMAGES_DIR (delete manually if you want to recreate)."
}

setup() {
  if [ "$(uname)" != "Darwin" ]; then
    echo "This script is for macOS (uses hdiutil)."
    echo "On Linux you can use: losetup, mkfs, mount with separate loop devices."
    exit 1
  fi

  echo "Using repo root: $ROOT"
  echo "Images dir:      $IMAGES_DIR"
  echo "Mount points:   $MOCK_DISKS/parity, $MOCK_DISKS/disk1, $MOCK_DISKS/disk2"
  echo ""

  # Teardown first if already mounted
  for name in parity disk1 disk2; do
    mp="$MOCK_DISKS/$name"
    if [ -d "$mp" ] && mount | grep -q "$mp"; then
      echo "Detaching existing mount: $mp"
      hdiutil detach "$mp" -force 2>/dev/null || true
    fi
  done

  # Empty or create mount point dirs (don’t delete dirs, so we can mount over them)
  for name in parity disk1 disk2; do
    mp="$MOCK_DISKS/$name"
    mkdir -p "$mp"
    # If not a mount point, clear contents so we can mount
    if ! mount | grep -q "$mp"; then
      rm -rf "${mp:?}"/*
    fi
  done

  mkdir -p "$IMAGES_DIR"

  # Create sparse images if missing (-type SPARSE creates .dmg.sparseimage)
  for name in parity disk1 disk2; do
    img="$IMAGES_DIR/$name.dmg.sparseimage"
    if [ ! -f "$img" ]; then
      echo "Creating $img ($SIZE)..."
      hdiutil create -size "$SIZE" -fs HFS+J -volname "$name" -type SPARSE -ov "$IMAGES_DIR/$name.dmg"
    else
      echo "Using existing $img"
    fi
  done

  # Mount
  echo "Mounting..."
  hdiutil attach "$IMAGES_DIR/parity.dmg.sparseimage" -mountpoint "$MOCK_DISKS/parity" -nobrowse
  hdiutil attach "$IMAGES_DIR/disk1.dmg.sparseimage"  -mountpoint "$MOCK_DISKS/disk1"  -nobrowse
  hdiutil attach "$IMAGES_DIR/disk2.dmg.sparseimage"  -mountpoint "$MOCK_DISKS/disk2"  -nobrowse
  echo "Mounted all three."

  # Seed mock files (snapraid.content / snapraid.parity are created by SnapRAID on first sync)
  echo "Seeding mock files..."
  (cd "$ROOT" && bun run seed:mock-disks)

  echo ""
  echo "Done. Run 'snapraid status' (or use the web UI) and then 'snapraid sync' to create parity."
  echo "To unmount later: $0 teardown"
}

case "${1:-setup}" in
  setup)   setup ;;
  teardown) teardown ;;
  *)       usage ;;
esac
