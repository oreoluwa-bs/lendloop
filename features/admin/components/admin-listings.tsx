"use client"

import { useMutation, useQuery } from "convex/react"

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
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "@/components/ui/toast"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { errorMessage } from "@/lib/errors"

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
  const listings = useQuery(api.listings.list, {})
  const removeAny = useMutation(api.listings.removeAny)

  function remove(listingId: Id<"listings">, name: string) {
    removeAny({ listingId }).then(
      () => toast.add({ type: "success", title: `${name} removed` }),
      (err) => toast.add({ type: "error", title: errorMessage(err) })
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tool</TableHead>
          <TableHead>Owner</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {listings === undefined
          ? Array.from({ length: 3 }, (_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={4}>
                  <Skeleton className="h-5" />
                </TableCell>
              </TableRow>
            ))
          : listings.map((listing) => (
              <TableRow key={listing._id}>
                <TableCell className="font-medium">{listing.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {listing.ownerName}
                </TableCell>
                <TableCell>
                  <StatusPill status={listing.status} />
                </TableCell>
                <TableCell className="text-right">
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
                          This pulls the tool from the library for everyone,
                          even mid-loan. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => remove(listing._id, listing.name)}
                        >
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
      </TableBody>
    </Table>
  )
}
