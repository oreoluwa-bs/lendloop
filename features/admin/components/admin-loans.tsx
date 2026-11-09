"use client"

import { usePaginatedQuery } from "convex/react"
import { useState } from "react"

import { LoadMore } from "@/components/load-more"
import { useDebounceValue } from "@/hooks/use-debounce-value"
import { SearchInput } from "@/components/search-input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { api } from "@/convex/_generated/api"
import {
  StackedCell,
  StackedRow,
} from "@/features/admin/components/stacked-table"
import { StatusPill } from "@/features/loans/components/status-pill"

export function AdminLoans() {
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounceValue(search)
  const {
    results: loans,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.loans.listAll,
    { search: debouncedSearch.trim() || undefined },
    { initialNumItems: 20 }
  )

  return (
    <div>
      <div className="border-b px-3 pb-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search tool, lender or borrower"
        />
      </div>
      <Table>
        <TableHeader className="hidden md:table-header-group">
          <TableRow>
            <TableHead>Tool</TableHead>
            <TableHead>Lender</TableHead>
            <TableHead>Borrower</TableHead>
            <TableHead>Dates</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {status === "LoadingFirstPage"
            ? Array.from({ length: 3 }, (_, i) => (
                <StackedRow key={i}>
                  <StackedCell colSpan={5}>
                    <Skeleton className="h-5 w-full" />
                  </StackedCell>
                </StackedRow>
              ))
            : loans.map((loan) => (
                <StackedRow key={loan._id}>
                  <StackedCell label="Tool" className="font-medium">
                    {loan.listingName}
                  </StackedCell>
                  <StackedCell label="Lender" className="text-muted-foreground">
                    {loan.lenderName}
                  </StackedCell>
                  <StackedCell
                    label="Borrower"
                    className="text-muted-foreground"
                  >
                    {loan.borrowerName}
                  </StackedCell>
                  <StackedCell
                    label="Dates"
                    className="font-mono text-xs tabular-nums"
                  >
                    {loan.startDate} → {loan.endDate}
                  </StackedCell>
                  <StackedCell label="Status">
                    <StatusPill status={loan.status} />
                  </StackedCell>
                </StackedRow>
              ))}
        </TableBody>
      </Table>
      <LoadMore status={status} loadMore={loadMore} />
    </div>
  )
}
