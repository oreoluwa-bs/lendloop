import { ConvexError } from "convex/values"
import type { Doc } from "../_generated/dataModel"
import type { MutationCtx, QueryCtx } from "../_generated/server"

export async function getUser(ctx: QueryCtx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return null
  return await ctx.db
    .query("users")
    .withIndex("by_token", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier)
    )
    .unique()
}

export async function requireUser(ctx: QueryCtx): Promise<Doc<"users">> {
  const user = await getUser(ctx)
  if (!user) throw new ConvexError("Not authenticated")
  return user
}

/** Like requireUser, but creates the profile on first use. Mutations only. */
export async function upsertUser(ctx: MutationCtx): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) throw new ConvexError("Not authenticated")
  const existing = await ctx.db
    .query("users")
    .withIndex("by_token", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier)
    )
    .unique()
  if (existing) return existing
  const id = await ctx.db.insert("users", {
    tokenIdentifier: identity.tokenIdentifier,
    name: identity.name,
    role: "user",
    trustedLender: false,
  })
  return (await ctx.db.get(id))!
}

export function requireAdmin(user: Doc<"users">): void {
  if (user.role !== "admin") throw new ConvexError("Admin access required")
}
