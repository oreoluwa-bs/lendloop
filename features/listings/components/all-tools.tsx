"use client"

import { useState } from "react"
import { useUser } from "@clerk/nextjs"
import { useQuery } from "convex/react"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/convex/_generated/api"
import { RequestDialog } from "@/features/listings/components/request-dialog"
import { ToolCard } from "@/features/listings/components/tool-card"
import {
  categories,
  categoryLabels,
} from "@/features/listings/lib/categories"
import { Package } from "@phosphor-icons/react"

export function AllTools() {
  const { isSignedIn } = useUser()
  const tools = useQuery(api.listings.list, isSignedIn ? {} : "skip")
  const me = useQuery(api.users.whoami, isSignedIn ? {} : "skip")
  const [active, setActive] = useState<string>("all")

  const filtered =
    tools?.filter((tool) => active === "all" || tool.category === active) ?? null

  return (
    <div className="mt-8">
      <div className="flex flex-wrap gap-2">
        {(["all", ...categories] as const).map((c) => (
          <Button
            key={c}
            size="sm"
            variant={active === c ? "default" : "outline"}
            className="font-mono"
            onClick={() => setActive(c)}
          >
            {c === "all" ? "All" : categoryLabels[c]}
          </Button>
        ))}
      </div>
      <div className="mt-6">
        {filtered === null ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Package />
              </EmptyMedia>
              <EmptyTitle>
                {active === "all"
                  ? "No tools listed yet"
                  : `Nothing in ${categoryLabels[active] ?? active}`}
              </EmptyTitle>
              <EmptyDescription>
                {active === "all"
                  ? "Nothing in the library right now. List the first one."
                  : "Try another category — or list one of your own."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((tool) => (
              <ToolCard
                key={tool._id}
                tool={tool}
                actions={
                  isSignedIn &&
                  me?._id !== tool.ownerId &&
                  tool.status === "available" ? (
                    <RequestDialog listingId={tool._id} toolName={tool.name} />
                  ) : null
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
