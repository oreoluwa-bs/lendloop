"use client"

import { useState } from "react"
import { useMutation, useQuery } from "convex/react"

import { Button } from "@/components/ui/button"
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
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/convex/_generated/api"
import type { Doc } from "@/convex/_generated/dataModel"
import { ListingForm } from "@/features/listings/components/listing-form"
import { ToolCard } from "@/features/listings/components/tool-card"
import { errorMessage } from "@/lib/errors"
import { Package } from "@phosphor-icons/react"

function RemoveListing({ listing }: { listing: Doc<"listings"> }) {
  const remove = useMutation(api.listings.remove)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button variant="destructive" size="sm">
            Remove
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove this listing?</AlertDialogTitle>
          <AlertDialogDescription>
            &ldquo;{listing.name}&rdquo; disappears from the tool library. Loan
            history is kept.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={async () => {
              setError(null)
              try {
                await remove({ listingId: listing._id })
                setOpen(false)
              } catch (err) {
                setError(errorMessage(err))
              }
            }}
          >
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function MyListings() {
  const listings = useQuery(api.listings.mine)

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-balance">
            My listings
          </h1>
          <p className="mt-1 text-pretty text-muted-foreground">
            Tools your neighbours can borrow from you.
          </p>
        </div>
        <ListingForm />
      </div>
      <div className="mt-8">
        {listings === undefined ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Package />
              </EmptyMedia>
              <EmptyTitle>No tools listed yet</EmptyTitle>
              <EmptyDescription>
                List the tools you barely use so neighbours can borrow them.
              </EmptyDescription>
            </EmptyHeader>
            <ListingForm />
          </Empty>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <ToolCard
                key={listing._id}
                tool={{
                  name: listing.name,
                  category: listing.category,
                  condition: listing.condition,
                  description: listing.description,
                  status: listing.status === "on-loan" ? "on-loan" : "available",
                  ownerName: "You",
                  ownerTrustedLender: false,
                }}
                actions={
                  <div className="flex gap-2">
                    <ListingForm listing={listing} />
                    <RemoveListing listing={listing} />
                  </div>
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
