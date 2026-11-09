import { ConvexError, v } from "convex/values"
import type { Id } from "./_generated/dataModel"
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server"
import { getUser, requireAdmin, requireUser, upsertUser } from "./lib/auth"
import { notify, recordLoanEvent } from "./lib/notifications"
import { loanEventTypeValidator } from "./lib/validators"

function isRealDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const d = new Date(`${s}T00:00:00Z`)
  // round-trip rejects impossible dates like 2030-02-31
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s
}

function isValidRange(start: string, end: string): boolean {
  if (!isRealDate(start) || !isRealDate(end)) return false
  if (end <= start) return false
  return start >= new Date().toISOString().slice(0, 10)
}

export const request = mutation({
  args: {
    listingId: v.id("listings"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await upsertUser(ctx)
    const listing = await ctx.db.get(args.listingId)
    if (!listing || listing.status === "removed")
      throw new ConvexError("Listing not found")
    if (listing.ownerId === user._id)
      throw new ConvexError("Cannot borrow your own listing")
    if (listing.status !== "available")
      throw new ConvexError("Listing is not available")
    if (!isValidRange(args.startDate, args.endDate))
      throw new ConvexError("Invalid date range")
    // one physical tool: block overlapping requested/approved loans.
    // end-exclusive, so back-to-back loans sharing the handover day are fine.
    // ponytail: full scan of the listing's loans; fine at neighborhood scale
    const existing = await ctx.db
      .query("loans")
      .withIndex("by_listing", (q) => q.eq("listingId", args.listingId))
      .collect()
    if (
      existing.some(
        (l) =>
          (l.status === "requested" || l.status === "approved") &&
          args.startDate < l.endDate &&
          l.startDate < args.endDate
      )
    )
      throw new ConvexError("Those dates overlap an existing request")
    const loanId = await ctx.db.insert("loans", {
      listingId: args.listingId,
      lenderId: listing.ownerId,
      borrowerId: user._id,
      startDate: args.startDate,
      endDate: args.endDate,
      status: "requested",
    })
    await notify(ctx, {
      recipientId: listing.ownerId,
      type: "loan-requested",
      loanId,
    })
    return loanId
  },
})

export const approve = mutation({
  args: { loanId: v.id("loans") },
  handler: async (ctx, args) => {
    const user = await upsertUser(ctx)
    const loan = await ctx.db.get(args.loanId)
    if (!loan) throw new ConvexError("Loan not found")
    if (loan.lenderId !== user._id)
      throw new ConvexError("Only the lender can approve")
    if (loan.status !== "requested") throw new ConvexError("Loan is not pending")
    await ctx.db.patch(loan._id, { status: "approved" })
    await ctx.db.patch(loan.listingId, { status: "on-loan" })
    await notify(ctx, {
      recipientId: loan.borrowerId,
      type: "loan-approved",
      loanId: loan._id,
    })
  },
})

export const decline = mutation({
  args: { loanId: v.id("loans") },
  handler: async (ctx, args) => {
    const user = await upsertUser(ctx)
    const loan = await ctx.db.get(args.loanId)
    if (!loan) throw new ConvexError("Loan not found")
    if (loan.lenderId !== user._id)
      throw new ConvexError("Only the lender can decline")
    if (loan.status !== "requested") throw new ConvexError("Loan is not pending")
    await ctx.db.patch(loan._id, { status: "declined" })
    await notify(ctx, {
      recipientId: loan.borrowerId,
      type: "loan-declined",
      loanId: loan._id,
    })
  },
})

export const markReturned = mutation({
  args: { loanId: v.id("loans") },
  handler: async (ctx, args) => {
    const user = await upsertUser(ctx)
    const loan = await ctx.db.get(args.loanId)
    if (!loan) throw new ConvexError("Loan not found")
    if (loan.lenderId !== user._id && loan.borrowerId !== user._id)
      throw new ConvexError("Not part of this loan")
    if (loan.status !== "approved") throw new ConvexError("Loan is not active")
    await ctx.db.patch(loan._id, { status: "returned" })
    // don't resurrect a listing an admin removed while it was on loan
    const listing = await ctx.db.get(loan.listingId)
    if (listing?.status === "on-loan") {
      await ctx.db.patch(loan.listingId, { status: "available" })
    }
    await notify(ctx, {
      recipientId: loan.lenderId === user._id ? loan.borrowerId : loan.lenderId,
      type: "loan-returned",
      loanId: loan._id,
    })
  },
})

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    if (!(await ctx.auth.getUserIdentity()))
      throw new ConvexError("Not authenticated")
    const user = await getUser(ctx)
    if (!user) return []
    const asLender = await ctx.db
      .query("loans")
      .withIndex("by_lender", (q) => q.eq("lenderId", user._id))
      .collect()
    const asBorrower = await ctx.db
      .query("loans")
      .withIndex("by_borrower", (q) => q.eq("borrowerId", user._id))
      .collect()
    return await Promise.all(
      [...asLender, ...asBorrower].map(async (loan) => {
        const listing = await ctx.db.get(loan.listingId)
        const other = await ctx.db.get(
          loan.lenderId === user._id ? loan.borrowerId : loan.lenderId
        )
        const lastEvent = await ctx.db
          .query("loanEvents")
          .withIndex("by_loan", (q) => q.eq("loanId", loan._id))
          .order("desc")
          .take(1)
        return {
          ...loan,
          listingName: listing?.name ?? "Unknown tool",
          category: listing?.category ?? "other",
          counterpartyName: other?.name ?? "Neighbor",
          isMineAsLender: loan.lenderId === user._id,
          lastAutomationEvent: lastEvent[0]
            ? {
                type: lastEvent[0].type,
                detail: lastEvent[0].detail ?? null,
                at: lastEvent[0]._creationTime,
              }
            : null,
        }
      })
    )
  },
})

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx)
    requireAdmin(user)
    return await ctx.db.query("loans").collect()
  },
})

/**
 * Overdue = approved and past its end date, excluding loans already reminded
 * today so n8n workflow re-runs are no-ops.
 */
export const listOverdue = internalQuery({
  args: {},
  handler: async (ctx) => {
    const today = new Date().toISOString().slice(0, 10)
    const overdue = await ctx.db
      .query("loans")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .filter((q) => q.lt(q.field("endDate"), today))
      .take(200)
    const results = []
    for (const loan of overdue) {
      // filter lastReminderAt in JS: absent fields are not index/filter-safe
      if (loan.lastReminderAt && loan.lastReminderAt >= today) continue
      const listing = await ctx.db.get(loan.listingId)
      const borrower = await ctx.db.get(loan.borrowerId)
      results.push({
        loanId: loan._id,
        listingName: listing?.name ?? "Unknown tool",
        borrowerName: borrower?.name ?? "Neighbor",
        borrowerEmail: borrower?.email ?? null,
        startDate: loan.startDate,
        endDate: loan.endDate,
      })
    }
    return results
  },
})

/**
 * Idempotent reminder write-back from n8n: skips any loan already reminded on
 * or after `sentAt`, so retries never duplicate reminders or notifications.
 */
export const markReminded = internalMutation({
  args: { sentAt: v.string(), loanIds: v.array(v.id("loans")) },
  handler: async (ctx, args) => {
    const reminded: Id<"loans">[] = []
    const skipped: Id<"loans">[] = []
    for (const loanId of args.loanIds) {
      const loan = await ctx.db.get(loanId)
      if (!loan || (loan.lastReminderAt && loan.lastReminderAt >= args.sentAt)) {
        skipped.push(loanId)
        continue
      }
      await ctx.db.patch(loanId, { lastReminderAt: args.sentAt })
      await notify(ctx, {
        recipientId: loan.borrowerId,
        type: "overdue-reminder",
        loanId,
      })
      await recordLoanEvent(ctx, { loanId, type: "reminder-sent" })
      reminded.push(loanId)
    }
    return { reminded, skipped }
  },
})

/** Generic automation activity row, used by HTTP write-backs and failures. */
export const recordEvent = internalMutation({
  args: {
    loanId: v.optional(v.id("loans")),
    type: loanEventTypeValidator,
    detail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await recordLoanEvent(ctx, args)
  },
})
