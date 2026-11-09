"use client"

import { useQuery } from "convex/react"

import { Card, CardContent } from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/convex/_generated/api"
import { SignInCta } from "@/features/auth/components/sign-in-cta"
import {
  Package,
  CookingPot,
  Hammer,
  Plant,
  Tent,
  Wrench,
} from "@phosphor-icons/react"

const categoryMeta: Record<
  string,
  { label: string; Icon: typeof Wrench; color: string }
> = {
  "power-tools": {
    label: "Power tools",
    Icon: Wrench,
    color: "bg-amber-500/12 text-amber-600 dark:text-amber-400",
  },
  garden: {
    label: "Garden",
    Icon: Plant,
    color: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
  },
  kitchen: {
    label: "Kitchen",
    Icon: CookingPot,
    color: "bg-rose-500/12 text-rose-600 dark:text-rose-400",
  },
  camping: {
    label: "Camping",
    Icon: Tent,
    color: "bg-sky-500/12 text-sky-600 dark:text-sky-400",
  },
  other: {
    label: "Other",
    Icon: Hammer,
    color: "bg-zinc-500/12 text-zinc-600 dark:text-zinc-400",
  },
}

const fallbackCategory = categoryMeta.other

function ToolGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
  )
}

export function ToolsList() {
  const tools = useQuery(api.listings.listPublic)

  return (
    <section id="tools" className="container mx-auto py-16">
      <h2 className="text-2xl font-semibold tracking-tight text-balance">
        Available now
      </h2>
      <p className="mt-2 text-pretty text-muted-foreground">
        Tools ready to borrow from your neighbors.
      </p>
      <div className="mt-8">
        {tools === undefined ? (
          <ToolGrid>
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </ToolGrid>
        ) : tools.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Package />
              </EmptyMedia>
              <EmptyTitle>No tools listed yet</EmptyTitle>
              <EmptyDescription>
                Nothing is available right now. Sign in to lend the first one.
              </EmptyDescription>
            </EmptyHeader>
            <SignInCta size="sm" />
          </Empty>
        ) : (
          <ToolGrid>
            {tools.map((tool) => {
              const { label, Icon, color } =
                categoryMeta[tool.category] ?? fallbackCategory
              return (
                <Card key={tool.name}>
                  <CardContent className="flex items-center gap-4">
                    <span
                      role="img"
                      aria-label={label}
                      className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${color}`}
                    >
                      <Icon className="size-5" />
                    </span>
                    <span className="font-medium">{tool.name}</span>
                  </CardContent>
                </Card>
              )
            })}
          </ToolGrid>
        )}
      </div>
    </section>
  )
}
