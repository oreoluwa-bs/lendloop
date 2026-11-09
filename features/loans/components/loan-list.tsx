"use client"

import { useUser } from "@clerk/nextjs"
import { useMutation, usePaginatedQuery } from "convex/react"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"

import { LoadMore } from "@/components/load-more"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/components/ui/toast"
import { api } from "@/convex/_generated/api"
import type { Doc, Id } from "@/convex/_generated/dataModel"
import {
  categoryColors,
  categoryIcons,
  categoryLabels,
} from "@/features/listings/lib/categories"
import { StatusPill } from "@/features/loans/components/status-pill"
import { errorMessage } from "@/lib/errors"
import { timeAgo } from "@/lib/utils"
import { Handshake, Package } from "@phosphor-icons/react"

type Loan = Doc<"loans"> & {
  listingName: string
  category: string
  counterpartyName: string
  isMineAsLender: boolean
  lastAutomationEvent: {
    type: string
    detail: string | null
    at: number
  } | null
}

const eventLabels: Record<string, string> = {
  "reminder-sent": "Reminder sent",
  "webhook-failed": "Notification delivery failed",
  "workflow-failed": "Automation run failed",
}

function LoanCard({
  loan,
  side,
  onError,
  error,
  highlighted,
}: {
  loan: Loan
  side: "borrowed" | "lent"
  error: string | null
  onError: (message: string | null) => void
  highlighted?: boolean
}) {
  const approve = useMutation(api.loans.approve)
  const decline = useMutation(api.loans.decline)
  const markReturned = useMutation(api.loans.markReturned)
  const CategoryIcon = categoryIcons[loan.category] ?? categoryIcons.other

  async function act(fn: () => Promise<unknown>, done: string) {
    onError(null)
    try {
      await fn()
      toast.add({ type: "success", title: done })
    } catch (err) {
      onError(errorMessage(err))
    }
  }

  return (
    <Card
      id={loan._id}
      className={highlighted ? "ring-2 ring-primary" : undefined}
    >
      <CardContent className="flex h-full flex-col gap-3">
        <div className="flex items-center gap-4">
          <span
            role="img"
            aria-label={categoryLabels[loan.category] ?? categoryLabels.other}
            className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
              categoryColors[loan.category] ?? categoryColors.other
            }`}
          >
            <CategoryIcon className="size-5" />
          </span>
          <h3 className="min-w-0 grow truncate font-medium">
            {loan.listingName}
          </h3>
          <StatusPill status={loan.status} />
        </div>
        <p className="truncate text-sm text-muted-foreground">
          {side === "lent" ? "to" : "from"} {loan.counterpartyName}
        </p>
        <p className="font-mono text-xs text-muted-foreground tabular-nums">
          {loan.startDate} → {loan.endDate}
        </p>
        {loan.lastAutomationEvent && (
          <p className="text-xs text-muted-foreground">
            {eventLabels[loan.lastAutomationEvent.type] ?? "Automation event"}{" "}
            {timeAgo(loan.lastAutomationEvent.at)}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="mt-auto flex flex-wrap justify-end gap-2 pt-1">
          {side === "lent" && loan.status === "requested" && (
            <>
              <Button
                size="sm"
                onClick={() =>
                  act(() => approve({ loanId: loan._id }), "Request approved")
                }
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  act(() => decline({ loanId: loan._id }), "Request declined")
                }
              >
                Decline
              </Button>
            </>
          )}
          {loan.status === "approved" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                act(
                  () => markReturned({ loanId: loan._id }),
                  "Marked as returned"
                )
              }
            >
              Mark returned
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function LoanList({
  side,
  highlight,
}: {
  side: "borrowed" | "lent"
  highlight?: string
}) {
  const { isSignedIn } = useUser()
  const {
    results: rows,
    status,
    loadMore,
  } = usePaginatedQuery(api.loans.listMine, isSignedIn ? { side } : "skip", {
    initialNumItems: 20,
  })
  const [error, setError] = useState<{
    id: Id<"loans">
    message: string
  } | null>(null)

  // deep-linked from a notification (?loan=<id>): scroll the row into view
  // once it is rendered
  const scrolled = useRef(false)
  useEffect(() => {
    if (!highlight || scrolled.current) return
    const el = document.getElementById(highlight)
    if (el) {
      el.scrollIntoView({ block: "center" })
      scrolled.current = true
    }
  }, [highlight, rows])

  return (
    <div className="mt-8">
      {status === "LoadingFirstPage" ? (
        <div className="grid gap-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              {side === "lent" ? <Handshake /> : <Package />}
            </EmptyMedia>
            <EmptyTitle>
              {side === "lent" ? "No incoming requests" : "No requests yet"}
            </EmptyTitle>
            <EmptyDescription>
              {side === "lent"
                ? "When a neighbour asks for one of your tools, it shows up here."
                : "Find a tool in the library and ask to borrow it."}
            </EmptyDescription>
          </EmptyHeader>
          <Button
            nativeButton={false}
            render={<Link href={side === "lent" ? "/my-listings" : "/tools"} />}
          >
            {side === "lent" ? "List a tool" : "Browse tools"}
          </Button>
        </Empty>
      ) : (
        <>
          <div className="grid gap-3">
            {rows.map((loan) => (
              <LoanCard
                key={loan._id}
                loan={loan}
                side={side}
                highlighted={highlight === loan._id}
                error={error?.id === loan._id ? error.message : null}
                onError={(message) =>
                  setError(message ? { id: loan._id, message } : null)
                }
              />
            ))}
          </div>
          <LoadMore status={status} loadMore={loadMore} />
        </>
      )}
    </div>
  )
}
