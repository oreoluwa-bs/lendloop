"use client"

import { useQuery } from "convex/react"

import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { api } from "@/convex/_generated/api"
import { StatusPill } from "@/features/loans/components/status-pill"

export function AdminLoans() {
  const loans = useQuery(api.loans.listAll, {})

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tool</TableHead>
          <TableHead>Lender</TableHead>
          <TableHead>Borrower</TableHead>
          <TableHead>Dates</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loans === undefined
          ? Array.from({ length: 3 }, (_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={5}>
                  <Skeleton className="h-5" />
                </TableCell>
              </TableRow>
            ))
          : loans.map((loan) => (
              <TableRow key={loan._id}>
                <TableCell className="font-medium">
                  {loan.listingName}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {loan.lenderName}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {loan.borrowerName}
                </TableCell>
                <TableCell className="font-mono text-xs tabular-nums">
                  {loan.startDate} → {loan.endDate}
                </TableCell>
                <TableCell>
                  <StatusPill status={loan.status} />
                </TableCell>
              </TableRow>
            ))}
      </TableBody>
    </Table>
  )
}
