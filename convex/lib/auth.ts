import type { Doc } from "../_generated/dataModel"
import type { MutationCtx, QueryCtx } from "../_generated/server"

export async function getUser(ctx: QueryCtx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return null
  return await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique()
}

export async function requireUser(ctx: QueryCtx): Promise<Doc<"users">> {
  const user = await getUser(ctx)
  if (!user) throw new Error("Not authenticated")
  return user
}

/** Like requireUser, but creates the profile on first use. Mutations only. */
export async function upsertUser(ctx: MutationCtx): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) throw new Error("Not authenticated")
  const existing = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique()
  if (existing) return existing
  // ponytail: first user bootstraps as admin (tiny race on simultaneous first users);
  // replace with a seeded admin list before real users arrive
  const first = await ctx.db.query("users").first()
  const id = await ctx.db.insert("users", {
    tokenIdentifier: identity.tokenIdentifier,
    name: identity.name,
    role: first ? "user" : "admin",
    trustedLender: false,
  })
  return (await ctx.db.get(id))!
}

export function requireAdmin(user: Doc<"users">): void {
  if (user.role !== "admin") throw new Error("Admin access required")
}
