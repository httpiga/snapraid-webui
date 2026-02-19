import { useEffect, useState } from "react"
import { Theme, ThemeProviderContext, ThemeProviderProps } from "./useTheme"

const VALID_THEMES = new Set<Theme>(["light", "dark", "system"])

function readStoredTheme(storageKey: string, fallback: Theme): Theme {
  if (typeof window === "undefined") {
    return fallback
  }
  try {
    const stored = window.localStorage.getItem(storageKey)
    return stored && VALID_THEMES.has(stored as Theme)
      ? (stored as Theme)
      : fallback
  } catch {
    return fallback
  }
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const storedTheme = readStoredTheme(storageKey, defaultTheme)
  const [userOverride, setUserOverride] = useState<Theme | null>(null)
  const theme = userOverride ?? storedTheme

  useEffect(() => {
    const root = window.document.documentElement

    root.classList.remove("light", "dark")

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light"

      root.classList.add(systemTheme)
      return
    }

    root.classList.add(theme)
  }, [theme])

  const value = {
    theme,
    setTheme: (newTheme: Theme) => {
      try {
        window.localStorage.setItem(storageKey, newTheme)
      } catch {
        // Ignore storage write failures (e.g., privacy mode).
      }
      setUserOverride(newTheme)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}
