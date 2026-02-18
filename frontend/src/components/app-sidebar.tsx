"use client"

import * as React from "react"
import { Link, useLocation } from "react-router-dom"
import {
  LayoutDashboard,
  HardDrive,
  Play,
  Calendar,
  FileText,
  Settings,
  Database,
  Cross,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ModeToggle } from "@/components/theme/ModeToggle"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useSidebar } from "./ui/use-sidebar"

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Disks", href: "/disks", icon: HardDrive },
  { name: "Operations", href: "/operations", icon: Play },
  { name: "Schedules", href: "/schedules", icon: Calendar },
  { name: "Recovery", href: "/recovery", icon: Cross },
  { name: "Logs", href: "/logs", icon: FileText },
  { name: "Settings", href: "/settings", icon: Settings },
]

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const location = useLocation()
  const { state } = useSidebar()
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 min-w-0">
          <>
            <Database className="h-6 w-6 shrink-0" />
            {state === "expanded" && (
              <span className="text-lg font-semibold whitespace-nowrap truncate">
                SnapRAID
              </span>
            )}
          </>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {navigation.map((item) => {
              const isActive =
                item.href === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(item.href)
              return (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.name}
                    isActive={isActive}
                    className={cn(
                      isActive &&
                        "bg-sidebar-accent text-sidebar-accent-foreground",
                    )}
                  >
                    <Link to={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex w-full items-center px-2 py-2">
              <ModeToggle />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
