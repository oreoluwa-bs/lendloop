import { paginationOptsValidator } from "convex/server"
import { ConvexError, v } from "convex/values"
import { internalMutation, mutation, query } from "./_generated/server"
import { getUser, requireAdmin, upsertUser } from "./lib/auth"
import { categoryValidator, conditionValidator } from "./lib/validators"

const listingFields = {
  name: v.string(),
  category: categoryValidator,
  condition: conditionValidator,
  description: v.string(),
}

// keep in sync with the caps in features/listings/components/listing-form.tsx
const MAX_NAME = 80
const MAX_DESCRIPTION = 500

function cleanText(args: { name: string; description: string }) {
  const name = args.name.trim()
  const description = args.description.trim()
  if (!name) throw new ConvexError("Name is required")
  if (name.length > MAX_NAME)
    throw new ConvexError(`Name is too long (max ${MAX_NAME})`)
  if (!description) throw new ConvexError("Description is required")
  if (description.length > MAX_DESCRIPTION)
    throw new ConvexError(`Description is too long (max ${MAX_DESCRIPTION})`)
  return { name, description }
}

export const listPublic = query({
  args: {},
  handler: async (ctx) => {
    const listings = await ctx.db
      .query("listings")
      .withIndex("by_status", (q) => q.eq("status", "available"))
      // ponytail: landing-page preview capped at 60; `list` paginates the
      // full catalog on /tools, so nothing is unreachable
      .take(60)
    return listings.map((l) => ({
      _id: l._id,
      name: l.name,
      category: l.category,
    }))
  },
})

export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
    category: v.optional(categoryValidator),
  },
  handler: async (ctx, args) => {
    if (!(await ctx.auth.getUserIdentity()))
      throw new ConvexError("Not authenticated")
    let q = ctx.db
      .query("listings")
      .filter((f) => f.neq(f.field("status"), "removed"))
    if (args.category) {
      q = q.filter((f) => f.eq(f.field("category"), args.category))
    }
    const page = await q.order("desc").paginate(args.paginationOpts)
    return {
      ...page,
      page: await Promise.all(
        page.page.map(async (l) => {
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
      ),
    }
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
      // ponytail: one owner's shelf capped at 100; paginate `mine` if a
      // single neighbour ever outgrows it
      .take(100)
    return listings.filter((l) => l.status !== "removed")
  },
})

export const create = mutation({
  args: listingFields,
  handler: async (ctx, args) => {
    const user = await upsertUser(ctx)
    return await ctx.db.insert("listings", {
      ...args,
      ...cleanText(args),
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
    if (!listing) throw new ConvexError("Listing not found")
    if (listing.ownerId !== user._id) throw new ConvexError("Not your listing")
    if (listing.status !== "available")
      throw new ConvexError("Listing is not available")
    await ctx.db.patch(listingId, { ...fields, ...cleanText(args) })
  },
})

export const remove = mutation({
  args: { listingId: v.id("listings") },
  handler: async (ctx, args) => {
    const user = await upsertUser(ctx)
    const listing = await ctx.db.get(args.listingId)
    if (!listing) throw new ConvexError("Listing not found")
    if (listing.ownerId !== user._id) throw new ConvexError("Not your listing")
    if (listing.status !== "available")
      throw new ConvexError("Listing is not available")
    await ctx.db.patch(args.listingId, { status: "removed" })
  },
})

export const removeAny = mutation({
  args: { listingId: v.id("listings") },
  handler: async (ctx, args) => {
    const admin = await upsertUser(ctx)
    requireAdmin(admin)
    const listing = await ctx.db.get(args.listingId)
    if (!listing) throw new ConvexError("Listing not found")
    await ctx.db.patch(args.listingId, { status: "removed" })
  },
})

const seedNeighbours = [
  {
    name: "Sarah K.",
    trusted: true,
    tools: [
      {
        name: "DeWalt Cordless Drill",
        category: "power-tools",
        condition: "good",
        description: "20V cordless drill with two batteries and a charger.",
      },
      {
        name: "Circular Saw",
        category: "power-tools",
        condition: "good",
        description:
          "7¼-inch blade, barely used. Bring your own extension cord.",
      },
      {
        name: "Extension Ladder",
        category: "other",
        condition: "fair",
        description: "Reaches two storeys. A bit scuffed but solid.",
      },
    ],
  },
  {
    name: "Marco R.",
    trusted: false,
    tools: [
      {
        name: "Pressure Washer",
        category: "garden",
        condition: "good",
        description: "1600 PSI, great for driveways and patio furniture.",
      },
      {
        name: "Hedge Trimmer",
        category: "garden",
        condition: "like-new",
        description: "Electric trimmer, lightweight. Used once last season.",
      },
    ],
  },
  {
    name: "Priya S.",
    trusted: true,
    tools: [
      {
        name: "Stand Mixer",
        category: "kitchen",
        condition: "like-new",
        description: "5-quart mixer with dough hook and whisk attachments.",
      },
      {
        name: "Espresso Machine",
        category: "kitchen",
        condition: "good",
        description: "Single-boiler machine, makes a solid flat white.",
      },
    ],
  },
  {
    name: "Tom B.",
    trusted: false,
    tools: [
      {
        name: "4-Person Tent",
        category: "camping",
        condition: "good",
        description: "Freestanding dome tent with rainfly and stakes.",
      },
      {
        name: "Sleeping Bags",
        category: "camping",
        condition: "fair",
        description: "Two bags rated to 5°C, stuff sacks included.",
      },
    ],
  },
] as const

// ponytail: demo seed, one-shot via `npx convex run listings:seed`; drops and
// replaces only its own rows (tokenIdentifier "seed#…"); drop before real data
export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect()
    const seeded = users.filter((u) => u.tokenIdentifier.startsWith("seed"))
    for (const user of seeded) {
      const listings = await ctx.db
        .query("listings")
        .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
        .collect()
      for (const listing of listings) {
        const loans = await ctx.db
          .query("loans")
          .withIndex("by_listing", (q) => q.eq("listingId", listing._id))
          .collect()
        for (const loan of loans) await ctx.db.delete(loan._id)
        await ctx.db.delete(listing._id)
      }
      await ctx.db.delete(user._id)
    }
    for (const neighbour of seedNeighbours) {
      const user = await ctx.db.insert("users", {
        tokenIdentifier: `seed#${neighbour.name}`,
        name: neighbour.name,
        role: "user",
        trustedLender: neighbour.trusted,
      })
      for (const tool of neighbour.tools) {
        await ctx.db.insert("listings", {
          ...tool,
          ownerId: user,
          status: "available",
        })
      }
    }
  },
})
