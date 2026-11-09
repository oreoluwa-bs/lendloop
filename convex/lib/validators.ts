import { v } from "convex/values"

export const roleValidator = v.union(v.literal("admin"), v.literal("user"))

export const categoryValidator = v.union(
  v.literal("power-tools"),
  v.literal("garden"),
  v.literal("kitchen"),
  v.literal("camping"),
  v.literal("other")
)

export const conditionValidator = v.union(
  v.literal("like-new"),
  v.literal("good"),
  v.literal("fair"),
  v.literal("poor")
)

export const listingStatusValidator = v.union(
  v.literal("available"),
  v.literal("on-loan"),
  v.literal("removed")
)

export const loanStatusValidator = v.union(
  v.literal("requested"),
  v.literal("approved"),
  v.literal("declined"),
  v.literal("returned")
)
