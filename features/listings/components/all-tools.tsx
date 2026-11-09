"use client"

import { useUser } from "@clerk/nextjs"
import { usePaginatedQuery, useQuery } from "convex/react"
import Link from "next/link"
import { useDeferredValue, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { LoadMore } from "@/components/load-more"
import { SearchInput } from "@/components/search-input"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/convex/_generated/api"
import { RequestDialog } from "@/features/listings/components/request-dialog"
import { ToolCard } from "@/features/listings/components/tool-card"
import { categories, categoryLabels } from "@/features/listings/lib/categories"
import { Package } from "@phosphor-icons/react"

export function AllTools({ active }: { active?: string }) {
  const { isSignedIn } = useUser()
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)
  const category = categories.includes(active as (typeof categories)[number])
    ? active!
    : "all"
  const categoryFilter = (category === "all" ? undefined : category) as
    (typeof categories)[number] | undefined
  const {
    results: tools,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.listings.list,
    isSignedIn
      ? {
          category: categoryFilter,
          search: deferredSearch.trim() || undefined,
        }
      : "skip",
    { initialNumItems: 21 }
  )
  const me = useQuery(api.users.whoami, isSignedIn ? {} : "skip")

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search tools"
          className="w-full sm:w-56"
        />
        {(["all", ...categories] as const).map((c) => (
          <Button
            key={c}
            size="sm"
            variant={category === c ? "default" : "outline"}
            className="font-mono"
            nativeButton={false}
            render={
              <Link href={c === "all" ? "/tools" : `/tools?category=${c}`} />
            }
          >
            {c === "all" ? "All" : categoryLabels[c]}
          </Button>
        ))}
      </div>
      <div className="mt-6">
        {status === "LoadingFirstPage" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : tools.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Package />
              </EmptyMedia>
              <EmptyTitle>
                {search
                  ? "No tools match"
                  : category === "all"
                    ? "No tools listed yet"
                    : `Nothing in ${categoryLabels[category] ?? category}`}
              </EmptyTitle>
              <EmptyDescription>
                {search
                  ? "Search matches tool names — try another word."
                  : category === "all"
                    ? "Nothing in the library right now. List the first one."
                    : "Try another category — or list one of your own."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tools.map((tool) => (
                <ToolCard
                  key={tool._id}
                  tool={tool}
                  actions={
                    isSignedIn &&
                    me?._id !== tool.ownerId &&
                    tool.status === "available" ? (
                      <RequestDialog
                        listingId={tool._id}
                        toolName={tool.name}
                      />
                    ) : null
                  }
                />
              ))}
            </div>
            <LoadMore status={status} loadMore={loadMore} />
          </>
        )}
      </div>
    </div>
  )
}
