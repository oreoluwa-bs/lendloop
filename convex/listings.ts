import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { requireAdmin, upsertUser } from "./lib/auth"
import { categoryValidator, conditionValidator } from "./lib/validators"

const listingFields = {
  name: v.string(),
  category: categoryValidator,
  condition: conditionValidator,
  description: v.string(),
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    if (!(await ctx.auth.getUserIdentity())) throw new Error("Not authenticated")
    // ponytail: in-memory filter, fine at this scale; index on by_status when listings grow
    const listings = await ctx.db.query("listings").collect()
    return listings.filter((l) => l.status !== "removed")
  },
})

export const create = mutation({
  args: listingFields,
  handler: async (ctx, args) => {
    const user = await upsertUser(ctx)
    return await ctx.db.insert("listings", {
      ...args,
      ownerId: user._id,
      status: "available",
    })
  },
})

export const edit = mutation({
  args: { listingId: v.id("listings"), ...listingFields },
  handler: async (ctx, args) => {
    const user = await upsertUser(ctx)
    const { listingId, ...fields } = args
    const listing = await ctx.db.get(listingId)
    if (!listing) throw new Error("Listing not found")
    if (listing.ownerId !== user._id) throw new Error("Not your listing")
    if (listing.status !== "available") throw new Error("Listing is not available")
    await ctx.db.patch(listingId, fields)
  },
})

export const remove = mutation({
  args: { listingId: v.id("listings") },
  handler: async (ctx, args) => {
    const user = await upsertUser(ctx)
    const listing = await ctx.db.get(args.listingId)
    if (!listing) throw new Error("Listing not found")
    if (listing.ownerId !== user._id) throw new Error("Not your listing")
    if (listing.status !== "available") throw new Error("Listing is not available")
    await ctx.db.patch(args.listingId, { status: "removed" })
  },
})

export const removeAny = mutation({
  args: { listingId: v.id("listings") },
  handler: async (ctx, args) => {
    const admin = await upsertUser(ctx)
    requireAdmin(admin)
    const listing = await ctx.db.get(args.listingId)
    if (!listing) throw new Error("Listing not found")
    await ctx.db.patch(args.listingId, { status: "removed" })
  },
})
