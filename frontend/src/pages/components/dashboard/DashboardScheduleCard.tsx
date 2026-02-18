import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { CommandBadge } from "@/components/ui/command-badge"
import { Calendar } from "lucide-react"
import type { Schedule } from "@shared/types"

function formatNextRun(isoString: string | undefined): string {
  if (!isoString) return "—"
  const date = new Date(isoString)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const timeStr = date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  })
  if (dateOnly.getTime() === today.getTime()) {
    return `Today at ${timeStr}`
  }
  if (dateOnly.getTime() === tomorrow.getTime()) {
    return `Tomorrow at ${timeStr}`
  }
  return (
    date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    }) + ` at ${timeStr}`
  )
}

interface DashboardScheduleCardProps {
  schedules: Schedule[]
  isLoading?: boolean
}

export function DashboardScheduleCard({
  schedules,
  isLoading,
}: DashboardScheduleCardProps) {
  const enabled = schedules.filter((schedule) => schedule.enabled)
  const sorted = [...enabled].sort((a, b) => {
    const aTime = a.nextRun ? new Date(a.nextRun).getTime() : Infinity
    const bTime = b.nextRun ? new Date(b.nextRun).getTime() : Infinity
    return aTime - bTime
  })

  return (
    <Card className="lg:col-span-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Next scheduled operations
        </CardTitle>
        <CardDescription>
          Upcoming runs from your schedules (enabled only)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <ul className="divide-y divide-border">
            {[1, 2, 3, 4].map((i) => (
              <li
                key={i}
                className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"
              >
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-4 flex-1 min-w-[120px]" />
                <Skeleton className="h-4 w-24 shrink-0" />
              </li>
            ))}
          </ul>
        ) : sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No upcoming scheduled operations. Add schedules from the Schedules
            page.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {sorted.slice(0, 10).map((schedule) => (
              <li
                key={schedule.id}
                className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"
              >
                <CommandBadge command={schedule.command} />
                <span className="font-medium flex-1 min-w-0">
                  {schedule.name}
                </span>
                <span className="text-sm text-muted-foreground shrink-0">
                  {formatNextRun(schedule.nextRun)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
