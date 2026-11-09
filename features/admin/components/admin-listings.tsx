"use client"

import { useMutation, usePaginatedQuery } from "convex/react"
import { useState } from "react"

import { LoadMore } from "@/components/load-more"
import { SearchInput } from "@/components/search-input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { useDebounceValue } from "@/hooks/use-debounce-value"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "@/components/ui/toast"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import {
  StackedCell,
  StackedRow,
} from "@/features/admin/components/stacked-table"
import { TableEmpty } from "@/features/admin/components/table-empty"
import { errorMessage } from "@/lib/errors"
import { SquaresFour } from "@phosphor-icons/react"

const statusStyles: Record<string, string> = {
  available: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
  "on-loan": "bg-amber-500/12 text-amber-600 dark:text-amber-400",
  removed: "bg-zinc-500/12 text-zinc-600 dark:text-zinc-400",
}

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 font-mono text-xs ${
        statusStyles[status] ?? statusStyles.removed
      }`}
    >
      {status}
    </span>
  )
}

export function AdminListings() {
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounceValue(search)
  const {
    results: listings,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.listings.list,
    { search: debouncedSearch.trim() || undefined },
    { initialNumItems: 20 }
  )
  const removeAny = useMutation(api.listings.removeAny)

  function remove(listingId: Id<"listings">, name: string) {
    removeAny({ listingId }).then(
      () => toast.add({ type: "success", title: `${name} removed` }),
      (err) => toast.add({ type: "error", title: errorMessage(err) })
    )
  }

  return (
    <div>
      <div className="border-b px-3 pb-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search tools"
        />
      </div>
      {status !== "LoadingFirstPage" && listings.length === 0 ? (
        <TableEmpty
          icon={<SquaresFour />}
          title="No tools yet"
          description="Tools show up here as neighbours list them."
          searchActive={search.trim().length > 0}
          onClearSearch={() => setSearch("")}
        />
      ) : (
        <>
          <Table>
            <TableHeader className="hidden md:table-header-group">
              <TableRow>
                <TableHead>Tool</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {status === "LoadingFirstPage"
                ? Array.from({ length: 3 }, (_, i) => (
                    <StackedRow key={i}>
                      <StackedCell colSpan={4}>
                        <Skeleton className="h-5 w-full" />
                      </StackedCell>
                    </StackedRow>
                  ))
                : listings.map((listing) => (
                    <StackedRow key={listing._id}>
                      <StackedCell label="Tool" className="font-medium">
                        {listing.name}
                      </StackedCell>
                      <StackedCell
                        label="Owner"
                        className="text-muted-foreground"
                      >
                        {listing.ownerName}
                      </StackedCell>
                      <StackedCell label="Status">
                        <StatusPill status={listing.status} />
                      </StackedCell>
                      <StackedCell
                        label="Actions"
                        className="justify-end gap-2"
                      >
                        <AlertDialog>
                          <AlertDialogTrigger
                            render={
                              <Button size="sm" variant="outline">
                                Remove
                              </Button>
                            }
                          />
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Remove {listing.name}?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                This pulls the tool from the library for
                                everyone, even mid-loan. This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  remove(listing._id, listing.name)
                                }
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </StackedCell>
                    </StackedRow>
                  ))}
            </TableBody>
          </Table>
          <LoadMore status={status} loadMore={loadMore} />
        </>
      )}
    </div>
  )
}
