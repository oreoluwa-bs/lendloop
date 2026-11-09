import { SealCheck } from "@phosphor-icons/react"
import { cn } from "cn"

import { Card, CardContent } from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  categoryColors,
  categoryIcons,
  categoryLabels,
  conditionLabels,
} from "@/features/listings/lib/categories"

export type Tool = {
  name: string
  category: string
  condition: string
  description: string
  status: "available" | "on-loan"
  ownerName?: string
  ownerTrustedLender?: boolean
}

export function ToolCard({
  tool,
  actions,
}: {
  tool: Tool
  actions?: React.ReactNode
}) {
  const Icon = categoryIcons[tool.category] ?? categoryIcons.other
  return (
    <Card>
      <CardContent className="flex h-full flex-col gap-3">
        <div className="flex items-center gap-4">
          <span
            role="img"
            aria-label={categoryLabels[tool.category] ?? categoryLabels.other}
            className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
              categoryColors[tool.category] ?? categoryColors.other
            }`}
          >
            <Icon className="size-5" />
          </span>
          <h3 className="font-medium">{tool.name}</h3>
        </div>
        <p className="line-clamp-2 text-pretty text-sm text-muted-foreground">
          {tool.description}
        </p>
        <p className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
          <span
            className={cn(
              "size-1.5 shrink-0 rounded-full",
              tool.status === "available"
                ? "bg-emerald-500"
                : "bg-zinc-400 dark:bg-zinc-500"
            )}
            aria-hidden
          />
          {tool.status === "available" ? "Available" : "On loan"}
          {" · "}
          {conditionLabels[tool.condition] ?? tool.condition} condition
        </p>
        {(tool.ownerName || actions) && (
          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-1">
            {tool.ownerName ? (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <span className="truncate">{tool.ownerName}</span>
                {tool.ownerTrustedLender && (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <span className="flex items-center text-emerald-600 dark:text-emerald-400" />
                      }
                    >
                      <SealCheck aria-hidden />
                      <span className="sr-only">Trusted lender</span>
                    </TooltipTrigger>
                    <TooltipContent>Trusted lender</TooltipContent>
                  </Tooltip>
                )}
              </div>
            ) : (
              <span />
            )}
            {actions}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
