"use client"

import { Button } from "@/components/ui/button"

export function LoadMore({
  status,
  loadMore,
}: {
  status: "LoadingFirstPage" | "LoadingMore" | "CanLoadMore" | "Exhausted"
  loadMore: (numItems: number) => void
}) {
  if (status !== "CanLoadMore") return null
  return (
    <div className="flex justify-center p-3">
      <Button variant="outline" size="sm" onClick={() => loadMore(20)}>
        Load more
      </Button>
    </div>
  )
}
