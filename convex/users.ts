import { v } from "convex/values"
import { internalMutation, mutation, query } from "./_generated/server"
import { getUser, requireAdmin, upsertUser } from "./lib/auth"
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

export const setRole = mutation({
  args: { userId: v.id("users"), role: roleValidator },
  handler: async (ctx, args) => {
    const admin = await upsertUser(ctx)
    requireAdmin(admin)
    const target = await ctx.db.get(args.userId)
    if (!target) throw new Error("User not found")
    if (target.role === "admin" && args.role === "user") {
      const admins = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("role"), "admin"))
        .collect()
      if (admins.length <= 1) throw new Error("Cannot demote the last admin")
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
