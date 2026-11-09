"use client"

import { useUser } from "@clerk/nextjs"
import { useMutation, useQuery } from "convex/react"
import Link from "next/link"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
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
import type { Doc, Id } from "@/convex/_generated/dataModel"
import { errorMessage } from "@/lib/errors"
import { Handshake, Package } from "@phosphor-icons/react"

type Loan = Doc<"loans"> & {
  listingName: string
  counterpartyName: string
  isMineAsLender: boolean
}

const statusLabels: Record<string, string> = {
  requested: "Requested",
  approved: "Approved",
  declined: "Declined",
  returned: "Returned",
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant={status === "approved" ? "default" : "outline"}
      className="font-mono text-xs"
    >
      {statusLabels[status] ?? status}
    </Badge>
  )
}

function LoanRow({
  loan,
  side,
  onError,
  error,
}: {
  loan: Loan
  side: "borrowed" | "lent"
  error: string | null
  onError: (message: string | null) => void
}) {
  const approve = useMutation(api.loans.approve)
  const decline = useMutation(api.loans.decline)
  const markReturned = useMutation(api.loans.markReturned)

  async function act(fn: () => Promise<unknown>) {
    onError(null)
    try {
      await fn()
    } catch (err) {
      onError(errorMessage(err))
    }
  }

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border py-4 last:border-b-0">
      <div className="min-w-0 grow">
        <p className="truncate font-medium">{loan.listingName}</p>
        <p className="truncate text-sm text-muted-foreground">
          {side === "lent" ? "to" : "from"} {loan.counterpartyName}
        </p>
        {error && (
          <p role="alert" className="mt-1 text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
      <p className="font-mono text-xs text-muted-foreground tabular-nums">
        {loan.startDate} → {loan.endDate}
      </p>
      <StatusBadge status={loan.status} />
      <div className="flex gap-2">
        {side === "lent" && loan.status === "requested" && (
          <>
            <Button
              size="sm"
              onClick={() => act(() => approve({ loanId: loan._id }))}
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => act(() => decline({ loanId: loan._id }))}
            >
              Decline
            </Button>
          </>
        )}
        {loan.status === "approved" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => act(() => markReturned({ loanId: loan._id }))}
          >
            Mark returned
          </Button>
        )}
      </div>
    </li>
  )
}

export function LoanList({ side }: { side: "borrowed" | "lent" }) {
  const { isSignedIn } = useUser()
  const loans = useQuery(api.loans.listMine, isSignedIn ? {} : "skip")
  const [error, setError] = useState<{
    id: Id<"loans">
    message: string
  } | null>(null)

  const rows =
    loans?.filter((loan) => loan.isMineAsLender === (side === "lent")) ?? null

  return (
    <div className="mt-8">
      {rows === null ? (
        <div className="grid gap-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-16" />
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
            render={<Link href={side === "lent" ? "/my-listings" : "/"} />}
          >
            {side === "lent" ? "List a tool" : "Browse tools"}
          </Button>
        </Empty>
      ) : (
        <ul>
          {rows.map((loan) => (
            <LoanRow
              key={loan._id}
              loan={loan}
              side={side}
              error={error?.id === loan._id ? error.message : null}
              onError={(message) =>
                setError(message ? { id: loan._id, message } : null)
              }
            />
          ))}
        </ul>
      )}
    </div>
  )
}
