import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"
import {
  categoryValidator,
  conditionValidator,
  listingStatusValidator,
  loanStatusValidator,
  roleValidator,
} from "./lib/validators"

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    role: roleValidator,
    trustedLender: v.boolean(),
  }).index("by_token", ["tokenIdentifier"]),

  listings: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    category: categoryValidator,
    condition: conditionValidator,
    description: v.string(),
    status: listingStatusValidator,
  })
    .index("by_owner", ["ownerId"])
    .index("by_status", ["status"]),

  loans: defineTable({
    listingId: v.id("listings"),
    lenderId: v.id("users"),
    borrowerId: v.id("users"),
    startDate: v.string(),
    endDate: v.string(),
    status: loanStatusValidator,
  })
    .index("by_lender", ["lenderId"])
    .index("by_borrower", ["borrowerId"])
    .index("by_listing", ["listingId"]),
})
