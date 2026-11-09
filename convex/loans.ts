import { paginationOptsValidator } from "convex/server"
import { ConvexError, v } from "convex/values"
import type { Doc, Id } from "./_generated/dataModel"
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server"
import { getUser, requireAdmin, requireUser, upsertUser } from "./lib/auth"
import { today } from "./lib/dates"
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
  return start >= today()
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
    if (loan.status !== "requested")
      throw new ConvexError("Loan is not pending")
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
    if (loan.status !== "requested")
      throw new ConvexError("Loan is not pending")
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
  args: {
    side: v.union(v.literal("borrowed"), v.literal("lent")),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    if (!(await ctx.auth.getUserIdentity()))
      throw new ConvexError("Not authenticated")
    const isMineAsLender = args.side === "lent"
    const user = await getUser(ctx)
    if (!user) return { page: [], isDone: true, continueCursor: "" }
    const loans = isMineAsLender
      ? ctx.db
          .query("loans")
          .withIndex("by_lender", (q) => q.eq("lenderId", user._id))
      : ctx.db
          .query("loans")
          .withIndex("by_borrower", (q) => q.eq("borrowerId", user._id))
    const page = await loans.order("desc").paginate(args.paginationOpts)
    return {
      ...page,
      page: await Promise.all(
        page.page.map(async (loan) => {
          const listing = await ctx.db.get(loan.listingId)
          const other = await ctx.db.get(
            isMineAsLender ? loan.borrowerId : loan.lenderId
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
            isMineAsLender,
            lastAutomationEvent: lastEvent[0]
              ? {
                  type: lastEvent[0].type,
                  detail: lastEvent[0].detail ?? null,
                  at: lastEvent[0]._creationTime,
                }
              : null,
          }
        })
      ),
    }
  },
})

// Date ranges a listing is already spoken for; requested + approved block,
// end-exclusive to match the overlap check in `request`.
export const forListing = query({
  args: { listingId: v.id("listings") },
  handler: async (ctx, args) => {
    if (!(await ctx.auth.getUserIdentity()))
      throw new ConvexError("Not authenticated")
    const loans = await ctx.db
      .query("loans")
      .withIndex("by_listing", (q) => q.eq("listingId", args.listingId))
      // ponytail: one listing's booking calendar capped at 200 ranges; the
      // overlap check in `request` stays authoritative past the cap
      .take(200)
    return loans
      .filter((l) => l.status === "requested" || l.status === "approved")
      .map((l) => ({ startDate: l.startDate, endDate: l.endDate }))
  },
})

export const listAll = query({
  args: {
    paginationOpts: paginationOptsValidator,
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    requireAdmin(user)
    const shape = async (loan: Doc<"loans">) => {
      const listing = await ctx.db.get(loan.listingId)
      const lender = await ctx.db.get(loan.lenderId)
      const borrower = await ctx.db.get(loan.borrowerId)
      return {
        ...loan,
        listingName: listing?.name ?? "Unknown tool",
        lenderName: lender?.name ?? "Neighbor",
        borrowerName: borrower?.name ?? "Neighbor",
      }
    }
    const text = args.search?.trim().slice(0, 100)
    if (text) {
      // names live on the joined tables: find matching tools and people,
      // then the loans that reference them
      const listingIds = (
        await ctx.db
          .query("listings")
          .withSearchIndex("search_name", (s) => s.search("name", text))
          .take(25)
      ).map((l) => l._id)
      const userIds = (
        await ctx.db
          .query("users")
          .withSearchIndex("search_name", (s) => s.search("name", text))
          .take(25)
      ).map((u) => u._id)
      const loans =
        listingIds.length + userIds.length === 0
          ? []
          : await ctx.db
              .query("loans")
              .filter((f) =>
                f.or(
                  ...listingIds.map((id) => f.eq(f.field("listingId"), id)),
                  ...userIds.map((id) =>
                    f.or(
                      f.eq(f.field("lenderId"), id),
                      f.eq(f.field("borrowerId"), id)
                    )
                  )
                )
              )
              // ponytail: search returns one page of 50; the filter scans
              // the loans table, so search capped for admin use, not public
              .take(50)
      return {
        page: await Promise.all(loans.map(shape)),
        isDone: true,
        continueCursor: "",
      }
    }
    const page = await ctx.db
      .query("loans")
      .order("desc")
      .paginate(args.paginationOpts)
    return {
      ...page,
      page: await Promise.all(page.page.map(shape)),
    }
  },
})

/**
 * Overdue = approved and past its end date, excluding loans already reminded
 * today so n8n workflow re-runs are no-ops.
 */
export const listOverdue = internalQuery({
  args: {},
  handler: async (ctx) => {
    const todayStr = today()
    const overdue = await ctx.db
      .query("loans")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .filter((q) => q.lt(q.field("endDate"), todayStr))
      // ponytail: reminders capped at 200/day; shard by date range via a
      // scheduled continuation if overdue volume ever hits the cap
      .take(200)
    const results = []
    for (const loan of overdue) {
      // filter lastReminderAt in JS: absent fields are not index/filter-safe
      if (loan.lastReminderAt && loan.lastReminderAt >= todayStr) continue
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
      if (
        !loan ||
        (loan.lastReminderAt && loan.lastReminderAt >= args.sentAt)
      ) {
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
