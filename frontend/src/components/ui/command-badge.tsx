import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { badgeVariants } from "@/components/ui/badge-variants"
import { COMMAND_ICONS, COMMAND_LABELS } from "@/lib/commands"
import { cn } from "@/lib/utils"
import type { SnapRaidCommand } from "@shared/types"
import type { VariantProps } from "class-variance-authority"

export interface CommandBadgeProps
  extends
    Omit<React.ComponentProps<typeof Badge>, "children" | "variant">,
    VariantProps<typeof badgeVariants> {
  /** The command enum value (e.g. Command.SYNC or "sync"). */
  command: SnapRaidCommand
  /** Optional: render icon on the right instead of left. Default is "start". */
  iconPosition?: "start" | "end"
}

/**
 * Renders a badge with the command icon and display name.
 * Follows shadcn Badge "With Icon" pattern: data-icon="inline-start" | "inline-end".
 *
 * @see https://ui.shadcn.com/docs/components/radix/badge#with-icon
 */
function CommandBadge({
  command,
  iconPosition = "start",
  className,
  ...props
}: CommandBadgeProps) {
  const Icon = COMMAND_ICONS[command]
  const label = COMMAND_LABELS[command]
  const iconDataAttr = iconPosition === "end" ? "inline-end" : "inline-start"

  return (
    <Badge variant="outline" className={cn(className)} {...props}>
      <Icon data-icon={iconDataAttr} className="size-3" />
      {label}
    </Badge>
  )
}

export { CommandBadge }
