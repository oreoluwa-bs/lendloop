import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getUser, requireAdmin, upsertUser } from "./lib/auth"
import { roleValidator } from "./lib/validators"

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
