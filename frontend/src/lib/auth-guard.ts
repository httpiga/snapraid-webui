import type { AuthStatus } from "@shared/types"

export type AuthGateState = "loading" | "login" | "app"

export const getAuthGateState = (
  isLoading: boolean,
  status?: AuthStatus | null,
): AuthGateState => {
  if (isLoading || !status) {
    return "loading"
  }

  if (status.enabled && !status.authenticated) {
    return "login"
  }

  return "app"
}
