import { SealCheck } from "@phosphor-icons/react"
import { cn } from "cn"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
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
  ownerName: string
  ownerTrustedLender: boolean
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
        <p className="font-mono text-xs text-muted-foreground">
          condition · {conditionLabels[tool.condition] ?? tool.condition}
        </p>
        <div className="flex items-center gap-2 text-sm">
          <span
            className={cn(
              "size-1.5 rounded-full",
              tool.status === "available"
                ? "bg-primary"
                : "bg-muted-foreground/40"
            )}
            aria-hidden
          />
          <span className="text-muted-foreground">
            {tool.status === "available" ? "Available" : "On loan"}
          </span>
        </div>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <span className="truncate">{tool.ownerName}</span>
            {tool.ownerTrustedLender && (
              <Badge variant="secondary" className="gap-1 font-mono text-xs">
                <SealCheck aria-hidden />
                Trusted
              </Badge>
            )}
          </div>
          {actions}
        </div>
      </CardContent>
    </Card>
  )
}
