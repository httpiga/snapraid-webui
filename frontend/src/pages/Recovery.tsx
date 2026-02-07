import { useState } from "react"
import { useWebSocket } from "@/hooks/use-websocket"
import { useGetConfigQuery } from "@/store/api"
import { toast } from "sonner"
import { PageHeader } from "@/pages/components/PageHeader"
import { RecoveryWarning } from "@/pages/components/recovery/RecoveryWarning"
import { RecoveryOptionsCard } from "@/pages/components/recovery/RecoveryOptionsCard"
import { RecoveryOutputCard } from "@/pages/components/recovery/RecoveryOutputCard"

export function Recovery() {
  const [filterPath, setFilterPath] = useState("")
  const [filterMissing, setFilterMissing] = useState(true)
  const [filterError, setFilterError] = useState(false)
  const [filterDisk, setFilterDisk] = useState("")

  const { data: config } = useGetConfigQuery()
  const diskNames = config?.data ? Object.keys(config.data).sort() : []

  const {
    isConnected,
    isCommandRunning,
    currentCommand,
    output,
    sendCommand,
    abort,
    clearOutput,
  } = useWebSocket({
    onComplete: (exitCode) => {
      if (exitCode === 0) {
        toast.success("Recovery completed", {
          description: `Exit code: ${exitCode}`,
        })
      } else {
        toast.error("Recovery failed", {
          description: `Exit code: ${exitCode}`,
        })
      }
    },
    onError: (error) => {
      toast.error("Recovery error", { description: error })
    },
  })

  const handleStartRecovery = () => {
    const args: string[] = []

    if (filterPath) {
      args.push("-f", filterPath)
    }
    if (filterMissing) {
      args.push("-m")
    }
    if (filterError) {
      args.push("-e")
    }
    if (filterDisk) {
      args.push("-d", filterDisk)
    }

    clearOutput()
    sendCommand("fix", args)
  }

  const handleAbort = () => {
    abort()
  }

  const handleRecoverDeleted = () => {
    setFilterPath("")
    setFilterMissing(true)
    setFilterError(false)
    setFilterDisk("")
  }

  const handleFixErrors = () => {
    setFilterPath("")
    setFilterMissing(false)
    setFilterError(true)
    setFilterDisk("")
  }

  const handleFullRecovery = () => {
    setFilterPath("")
    setFilterMissing(true)
    setFilterError(true)
    setFilterDisk("")
  }

  const isRecovering = isCommandRunning && currentCommand === "fix"

  return (
    <div className="space-y-6">
      <PageHeader
        title="File Recovery"
        description="Restore deleted or corrupted files using parity data"
      />

      <RecoveryWarning />

      <div className="grid gap-6 md:grid-cols-2">
        <RecoveryOptionsCard
          filterPath={filterPath}
          filterMissing={filterMissing}
          filterError={filterError}
          filterDisk={filterDisk}
          diskNames={diskNames}
          isRecovering={isRecovering}
          isConnected={isConnected}
          onFilterPathChange={setFilterPath}
          onFilterMissingChange={setFilterMissing}
          onFilterErrorChange={setFilterError}
          onFilterDiskChange={setFilterDisk}
          onRecoverDeleted={handleRecoverDeleted}
          onFixErrors={handleFixErrors}
          onFullRecovery={handleFullRecovery}
          onStartRecovery={handleStartRecovery}
          onStopRecovery={handleAbort}
        />

        <RecoveryOutputCard
          isRecovering={isRecovering}
          output={output}
          onClear={clearOutput}
        />
      </div>
    </div>
  )
}
