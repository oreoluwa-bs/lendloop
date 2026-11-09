import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getUser, requireAdmin, requireUser, upsertUser } from "./lib/auth"

function isValidRange(start: string, end: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end))
    return false
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
      throw new Error("Listing not found")
    if (listing.ownerId === user._id)
      throw new Error("Cannot borrow your own listing")
    if (listing.status !== "available")
      throw new Error("Listing is not available")
    if (!isValidRange(args.startDate, args.endDate))
      throw new Error("Invalid date range")
    return await ctx.db.insert("loans", {
      listingId: args.listingId,
      lenderId: listing.ownerId,
      borrowerId: user._id,
      startDate: args.startDate,
      endDate: args.endDate,
      status: "requested",
    })
  },
})

export const approve = mutation({
  args: { loanId: v.id("loans") },
  handler: async (ctx, args) => {
    const user = await upsertUser(ctx)
    const loan = await ctx.db.get(args.loanId)
    if (!loan) throw new Error("Loan not found")
    if (loan.lenderId !== user._id)
      throw new Error("Only the lender can approve")
    if (loan.status !== "requested") throw new Error("Loan is not pending")
    await ctx.db.patch(loan._id, { status: "approved" })
    await ctx.db.patch(loan.listingId, { status: "on-loan" })
  },
})

export const decline = mutation({
  args: { loanId: v.id("loans") },
  handler: async (ctx, args) => {
    const user = await upsertUser(ctx)
    const loan = await ctx.db.get(args.loanId)
    if (!loan) throw new Error("Loan not found")
    if (loan.lenderId !== user._id)
      throw new Error("Only the lender can decline")
    if (loan.status !== "requested") throw new Error("Loan is not pending")
    await ctx.db.patch(loan._id, { status: "declined" })
  },
})

export const markReturned = mutation({
  args: { loanId: v.id("loans") },
  handler: async (ctx, args) => {
    const user = await upsertUser(ctx)
    const loan = await ctx.db.get(args.loanId)
    if (!loan) throw new Error("Loan not found")
    if (loan.lenderId !== user._id && loan.borrowerId !== user._id)
      throw new Error("Not part of this loan")
    if (loan.status !== "approved") throw new Error("Loan is not active")
    await ctx.db.patch(loan._id, { status: "returned" })
    // don't resurrect a listing an admin removed while it was on loan
    const listing = await ctx.db.get(loan.listingId)
    if (listing?.status === "on-loan") {
      await ctx.db.patch(loan.listingId, { status: "available" })
    }
  },
})

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    if (!(await ctx.auth.getUserIdentity()))
      throw new Error("Not authenticated")
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
    return [...asLender, ...asBorrower]
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
