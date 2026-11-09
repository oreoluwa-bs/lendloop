import { ConvexError, v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { requireUser, upsertUser } from "./lib/auth"

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    if (!(await ctx.auth.getUserIdentity()))
      throw new ConvexError("Not authenticated")
    const user = await requireUser(ctx)
    const items = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(50)
    // ponytail: unread counted over the latest 50; use @convex-dev/aggregate
    // for exact counts once notification volume warrants it
    return {
      items,
      unreadCount: items.filter((n) => n.readAt === undefined).length,
    }
  },
})

export const markRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const user = await upsertUser(ctx)
    const notification = await ctx.db.get(args.notificationId)
    if (!notification || notification.userId !== user._id)
      throw new ConvexError("Notification not found")
    if (notification.readAt === undefined) {
      await ctx.db.patch(notification._id, { readAt: Date.now() })
    }
  },
})

export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await upsertUser(ctx)
    // ponytail: caps at the latest 100; iterate the index if it ever overflows
    const items = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(100)
    const now = Date.now()
    for (const notification of items) {
      if (notification.readAt === undefined) {
        await ctx.db.patch(notification._id, { readAt: now })
      }
    }
  },
})
