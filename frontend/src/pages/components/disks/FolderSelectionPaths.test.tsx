import "@/test-setup"
import { describe, test, expect, mock, afterEach } from "bun:test"
import { cleanup, fireEvent, render } from "@testing-library/react"

let selectedPath = "/mnt/disk"

mock.module("@/components/FileSystemDialog", () => ({
  FileSystemDialog: ({
    open,
    onSelect,
  }: {
    open: boolean
    onSelect: (path: string) => void
  }) => {
    if (!open) {
      return null
    }

    return (
      <button type="button" onClick={() => onSelect(selectedPath)}>
        Pick folder
      </button>
    )
  },
}))


afterEach(() => {
  cleanup()
})
const { ParityDisksCard } = await import("./ParityDisksCard")
const { ContentFilesCard } = await import("./ContentFilesCard")

describe("disk folder selection path mapping", () => {
  test("parity selection appends snapraid.parity to selected folder", () => {
    selectedPath = "/mnt/parity///"
    const updates: Array<{ index: number; value: string }> = []

    const { container, getByRole } = render(
      <ParityDisksCard
        parity={[""]}
        onAdd={() => {}}
        onRemove={() => {}}
        onUpdate={(index, value) => updates.push({ index, value })}
      />,
    )

    const folderButton = container.querySelector("svg.lucide-folder-open")?.closest("button")
    expect(folderButton).not.toBeNull()
    fireEvent.click(folderButton as HTMLButtonElement)
    fireEvent.click(getByRole("button", { name: "Pick folder" }))

    expect(updates).toEqual([
      { index: 0, value: "/mnt/parity/snapraid.parity" },
    ])
  })

  test("content selection appends snapraid.content and updates index 0", () => {
    selectedPath = "/mnt/disk1/"
    const updates: Array<{ index: number; value: string }> = []

    const { container, getAllByRole } = render(
      <ContentFilesCard
        content={["", "/existing/snapraid.content"]}
        onAdd={() => {}}
        onRemove={() => {}}
        onUpdate={(index, value) => updates.push({ index, value })}
      />,
    )

    const folderButton = container.querySelector("svg.lucide-folder-open")?.closest("button")
    expect(folderButton).not.toBeNull()
    fireEvent.click(folderButton as HTMLButtonElement)
    fireEvent.click(getAllByRole("button", { name: "Pick folder" })[0])

    expect(updates).toEqual([
      { index: 0, value: "/mnt/disk1/snapraid.content" },
    ])
  })
})
