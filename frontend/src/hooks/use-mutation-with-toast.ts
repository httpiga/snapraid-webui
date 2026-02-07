import { useCallback } from "react"
import { toast } from "sonner"
import { getApiErrorMessage } from "@/lib/api-error"

type MutationTrigger<TArg> = (arg: TArg) => { unwrap: () => Promise<unknown> }

export interface UseMutationWithToastOptions<TArg> {
  successMessage: string
  errorMessage?: string
  /** If true, rethrow after showing error toast (e.g. for callers that need to handle) */
  rethrow?: boolean
  /** Called with the arg on success (e.g. to update local state) */
  onSuccess?: (arg: TArg) => void
}

/**
 * Wraps an RTK Query mutation trigger to show success/error toasts and optionally rethrow.
 */
export function useMutationWithToast<TArg>(
  trigger: MutationTrigger<TArg>,
  options: UseMutationWithToastOptions<TArg>,
): (arg: TArg) => Promise<void> {
  const {
    successMessage,
    errorMessage = "Request failed",
    rethrow = false,
    onSuccess,
  } = options

  return useCallback(
    async (arg: TArg) => {
      try {
        await trigger(arg).unwrap()
        toast.success(successMessage)
        onSuccess?.(arg)
      } catch (error) {
        toast.error(errorMessage, {
          description: getApiErrorMessage(error),
        })
        if (rethrow) throw error
      }
    },
    [trigger, successMessage, errorMessage, rethrow, onSuccess],
  )
}
