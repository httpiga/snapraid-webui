import { Routes, Route } from "react-router-dom"
import { Layout } from "./components/Layout"
import { Dashboard } from "./pages/Dashboard"
import { Disks } from "./pages/Disks"
import { Operations } from "./pages/Operations"
import { Schedules } from "./pages/Schedules"
import { Recovery } from "./pages/Recovery"
import { Logs } from "./pages/Logs"
import { Settings } from "./pages/Settings"
import { Toaster } from "./components/ui/sonner"
import { ThemeProvider } from "./components/theme/ThemeProvider"
import { AuthGate } from "./components/auth/AuthGate"
import { TooltipProvider } from "./components/ui/tooltip"

function App() {
  return (
    <>
      <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
        <TooltipProvider>
          <AuthGate>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="disks" element={<Disks />} />
                <Route path="operations" element={<Operations />} />
                <Route path="schedules" element={<Schedules />} />
                <Route path="recovery" element={<Recovery />} />
                <Route path="logs" element={<Logs />} />
                <Route path="settings" element={<Settings />} />
              </Route>
            </Routes>
          </AuthGate>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </>
  )
}

export default App
