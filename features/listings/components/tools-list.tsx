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
  categoryColors,
  categoryIcons,
  categoryLabels,
} from "@/features/listings/lib/categories"
import { Package } from "@phosphor-icons/react"

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
              const Icon = categoryIcons[tool.category] ?? categoryIcons.other
              return (
                <Card key={tool.name}>
                  <CardContent className="flex items-center gap-4">
                    <span
                      role="img"
                      aria-label={
                        categoryLabels[tool.category] ?? categoryLabels.other
                      }
                      className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                        categoryColors[tool.category] ?? categoryColors.other
                      }`}
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
