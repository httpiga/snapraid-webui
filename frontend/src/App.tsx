import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Disks } from "./pages/Disks";
import { Operations } from "./pages/Operations";
import { Schedules } from "./pages/Schedules";
import { Recovery } from "./pages/Recovery";
import { Logs } from "./pages/Logs";
import { Settings } from "./pages/Settings";
import { Toaster } from "./components/ui/sonner";
import { AuthGate } from "./components/AuthGate";
import { ThemeProvider } from "./components/theme/ThemeProvider";

function App() {
  return (
    <>
      <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
        <Routes>
          <Route
            path="/"
            element={
              <AuthGate>
                <Layout />
              </AuthGate>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="disks" element={<Disks />} />
            <Route path="operations" element={<Operations />} />
            <Route path="schedules" element={<Schedules />} />
            <Route path="recovery" element={<Recovery />} />
            <Route path="logs" element={<Logs />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
        <Toaster />
      </ThemeProvider>
    </>
  );
}

export default App;
