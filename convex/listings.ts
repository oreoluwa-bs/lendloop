import { v } from "convex/values"
import { internalMutation, mutation, query } from "./_generated/server"
import { getUser, requireAdmin, upsertUser } from "./lib/auth"
import { categoryValidator, conditionValidator } from "./lib/validators"

const listingFields = {
  name: v.string(),
  category: categoryValidator,
  condition: conditionValidator,
  description: v.string(),
}

export const listPublic = query({
  args: {},
  handler: async (ctx) => {
    const listings = await ctx.db
      .query("listings")
      .withIndex("by_status", (q) => q.eq("status", "available"))
      .collect()
    return listings.map((l) => ({
      _id: l._id,
      name: l.name,
      category: l.category,
    }))
  },
})

export const list = query({
  args: {},
  handler: async (ctx) => {
    if (!(await ctx.auth.getUserIdentity()))
      throw new Error("Not authenticated")
    const available = await ctx.db
      .query("listings")
      .withIndex("by_status", (q) => q.eq("status", "available"))
      .collect()
    const onLoan = await ctx.db
      .query("listings")
      .withIndex("by_status", (q) => q.eq("status", "on-loan"))
      .collect()
    return await Promise.all(
      [...available, ...onLoan].map(async (l) => {
        const owner = await ctx.db.get(l.ownerId)
        return {
          _id: l._id,
          name: l.name,
          category: l.category,
          condition: l.condition,
          description: l.description,
          status:
            l.status === "on-loan"
              ? ("on-loan" as const)
              : ("available" as const),
          ownerId: l.ownerId,
          ownerName: owner?.name ?? "Neighbor",
          ownerTrustedLender: owner?.trustedLender ?? false,
        }
      })
    )
  },
})

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await getUser(ctx)
    if (!user) return []
    const listings = await ctx.db
      .query("listings")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect()
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
    if (listing.status !== "available")
      throw new Error("Listing is not available")
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
    if (listing.status !== "available")
      throw new Error("Listing is not available")
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

const seedTools = [
  { name: "DeWalt Cordless Drill", category: "power-tools" },
  { name: "Circular Saw", category: "power-tools" },
  { name: "Pressure Washer", category: "garden" },
  { name: "Hedge Trimmer", category: "garden" },
  { name: "Stand Mixer", category: "kitchen" },
  { name: "Espresso Machine", category: "kitchen" },
  { name: "4-Person Tent", category: "camping" },
  { name: "Sleeping Bags", category: "camping" },
  { name: "Extension Ladder", category: "other" },
] as const

// ponytail: demo seed, one-shot via `npx convex run listings:seed`; drop before real data
export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("listings").take(1)
    if (existing.length > 0) return
    const user = await ctx.db.insert("users", {
      tokenIdentifier: "seed",
      name: "LendLoop Depot",
      role: "user",
      trustedLender: true,
    })
    for (const tool of seedTools) {
      await ctx.db.insert("listings", {
        ...tool,
        condition: "good",
        description: "",
        ownerId: user,
        status: "available",
      })
    }
  },
})
