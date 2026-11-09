"use client"

import { MagnifyingGlass } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

/**
 * Empty state for an admin table. While a search is active it offers the one
 * useful next step: clearing it.
 */
export function TableEmpty({
  icon,
  title,
  description,
  searchActive,
  onClearSearch,
}: {
  icon: React.ReactNode
  title: string
  description: string
  searchActive: boolean
  onClearSearch: () => void
}) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          {searchActive ? <MagnifyingGlass /> : icon}
        </EmptyMedia>
        <EmptyTitle>{searchActive ? "No matches" : title}</EmptyTitle>
        <EmptyDescription>
          {searchActive
            ? "Nothing matches that search. Try another word."
            : description}
        </EmptyDescription>
      </EmptyHeader>
      {searchActive && (
        <Button variant="outline" size="sm" onClick={onClearSearch}>
          Clear search
        </Button>
      )}
    </Empty>
  )
}
