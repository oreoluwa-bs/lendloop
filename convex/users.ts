import { paginationOptsValidator } from "convex/server"
import { ConvexError, v } from "convex/values"
import type { Doc } from "./_generated/dataModel"
import { internalMutation, mutation, query } from "./_generated/server"
import { getUser, requireAdmin, requireUser, upsertUser } from "./lib/auth"
import { roleValidator } from "./lib/validators"

// Bootstrap the first admin from a terminal (clients cannot call internal functions):
//   npx convex data users
//   npx convex run users:bootstrapAdmin '{"userId":"<id from above>"}'

export const bootstrapAdmin = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { role: "admin" })
  },
})

export const whoami = query({
  args: {},
  handler: async (ctx) => {
    return await getUser(ctx)
  },
})

export const listAll = query({
  args: {
    paginationOpts: paginationOptsValidator,
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireUser(ctx)
    requireAdmin(admin)
    const shape = (u: Doc<"users">) => ({
      _id: u._id,
      name: u.name ?? "Neighbor",
      role: u.role,
      trustedLender: u.trustedLender,
    })
    const text = args.search?.trim().slice(0, 100)
    if (text) {
      // name search returns one bounded page
      const matches = await ctx.db
        .query("users")
        .withSearchIndex("search_name", (s) => s.search("name", text))
        .take(50)
      return { page: matches.map(shape), isDone: true, continueCursor: "" }
    }
    const page = await ctx.db
      .query("users")
      .order("desc")
      .paginate(args.paginationOpts)
    return {
      ...page,
      page: page.page.map(shape),
    }
  },
})

export const setRole = mutation({
  args: { userId: v.id("users"), role: roleValidator },
  handler: async (ctx, args) => {
    const admin = await upsertUser(ctx)
    requireAdmin(admin)
    const target = await ctx.db.get(args.userId)
    if (!target) throw new ConvexError("User not found")
    if (target.role === "admin" && args.role === "user") {
      const admins = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("role"), "admin"))
        .collect()
      if (admins.length <= 1)
        throw new ConvexError("Cannot demote the last admin")
    }
    await ctx.db.patch(args.userId, { role: args.role })
  },
})

export const setTrustedLender = mutation({
  args: { userId: v.id("users"), trustedLender: v.boolean() },
  handler: async (ctx, args) => {
    const admin = await upsertUser(ctx)
    requireAdmin(admin)
    await ctx.db.patch(args.userId, { trustedLender: args.trustedLender })
  },
})
