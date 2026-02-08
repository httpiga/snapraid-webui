import { useState, useEffect } from "react"

/**
 * Keeps local state in sync with query data (e.g. from RTK Query).
 * When `data` changes from the server, local state is updated.
 * Useful for editable settings that start from server state.
 */
export function useSyncedSettings<T>(data: T | undefined): [
  T | null,
  React.Dispatch<React.SetStateAction<T | null>>,
] {
  const [state, setState] = useState<T | null>(null)

  useEffect(() => {
    if (data !== undefined) {
      setState(data)
    }
  }, [data])

  return [state, setState]
}
