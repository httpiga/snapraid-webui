import { Link, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  HardDrive,
  Play,
  Calendar,
  RotateCcw,
  FileText,
  Settings,
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Disks", href: "/disks", icon: HardDrive },
  { name: "Operations", href: "/operations", icon: Play },
  { name: "Schedules", href: "/schedules", icon: Calendar },
  { name: "Recovery", href: "/recovery", icon: RotateCcw },
  { name: "Logs", href: "/logs", icon: FileText },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r bg-card">
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <Database className="h-6 w-6" />
          <span className="text-lg font-semibold">SnapRAID</span>
        </div>
        <nav className="flex flex-col gap-1 p-4">
          {navigation.map((item) => {
            const isActive =
              item.href === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="pl-64">
        <div className="container mx-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
