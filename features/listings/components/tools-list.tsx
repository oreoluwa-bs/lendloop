"use client"

import { useQuery } from "convex/react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/convex/_generated/api"
import { SignInCta } from "@/features/auth/components/sign-in-cta"
import { Package } from "@phosphor-icons/react"

const categoryLabels: Record<string, string> = {
  "power-tools": "Power tools",
  garden: "Garden",
  kitchen: "Kitchen",
  camping: "Camping",
  other: "Other",
}

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
            {tools.map((tool) => (
              <Card key={tool.name}>
                <CardContent className="flex items-center justify-between gap-4">
                  <span className="font-medium">{tool.name}</span>
                  <Badge variant="outline" className="font-mono">
                    {categoryLabels[tool.category] ?? tool.category}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </ToolGrid>
        )}
      </div>
    </section>
  )
}
