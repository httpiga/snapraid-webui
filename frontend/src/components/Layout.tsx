import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  HardDrive,
  Play,
  Calendar,
  FileText,
  Settings,
  Database,
  PanelLeftClose,
  PanelLeftOpen,
  Cross,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/theme/ModeToggle";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Disks", href: "/disks", icon: HardDrive },
  { name: "Operations", href: "/operations", icon: Play },
  { name: "Schedules", href: "/schedules", icon: Calendar },
  { name: "Recovery", href: "/recovery", icon: Cross },
  { name: "Logs", href: "/logs", icon: FileText },
  { name: "Settings", href: "/settings", icon: Settings },
];

const SIDEBAR_WIDTH_EXPANDED = "16rem"; /* 256px / w-64 */
const SIDEBAR_WIDTH_COLLAPSED = "4rem"; /* 64px / w-16 */

export function Layout() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className="fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-card transition-[width] duration-200 ease-in-out"
        style={{
          width: collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED,
        }}
      >
        <div
          className={cn(
            "flex h-16 shrink-0 items-center border-b transition-[padding] duration-200",
            collapsed ? "px-2 justify-center" : "px-4 justify-between"
          )}
        >
          {!collapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <>
                <Database className="h-6 w-6 shrink-0" />
                <span className="text-lg font-semibold whitespace-nowrap truncate">
                  SnapRAID
                </span>
              </>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-2">
          {navigation.map((item) => {
            const isActive =
              item.href === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                title={collapsed ? item.name : undefined}
                className={cn(
                  "flex items-center rounded-lg py-2 text-sm font-medium transition-colors",
                  collapsed ? "justify-center px-0" : "gap-3 px-3",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && item.name}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t p-2">
          <div className={cn("flex", collapsed ? "justify-center" : "justify-start")}>
            <ModeToggle />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main
        className="min-h-screen transition-[margin,width] duration-200 ease-in-out"
        style={{
          marginLeft: collapsed
            ? SIDEBAR_WIDTH_COLLAPSED
            : SIDEBAR_WIDTH_EXPANDED,
          width: collapsed
            ? `calc(100vw - ${SIDEBAR_WIDTH_COLLAPSED})`
            : `calc(100vw - ${SIDEBAR_WIDTH_EXPANDED})`,
        }}
      >
        <div className="container mx-auto max-w-full p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
