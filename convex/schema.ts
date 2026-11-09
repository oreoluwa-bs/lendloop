import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"
import {
  categoryValidator,
  conditionValidator,
  listingStatusValidator,
  loanEventTypeValidator,
  loanStatusValidator,
  notificationTypeValidator,
  roleValidator,
} from "./lib/validators"

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    role: roleValidator,
    trustedLender: v.boolean(),
  })
    .index("by_token", ["tokenIdentifier"])
    .searchIndex("search_name", { searchField: "name" }),

  listings: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    category: categoryValidator,
    condition: conditionValidator,
    description: v.string(),
    status: listingStatusValidator,
  })
    .index("by_owner", ["ownerId"])
    .index("by_status", ["status"])
    .searchIndex("search_name", {
      searchField: "name",
      filterFields: ["category"],
    }),

  loans: defineTable({
    listingId: v.id("listings"),
    lenderId: v.id("users"),
    borrowerId: v.id("users"),
    startDate: v.string(),
    endDate: v.string(),
    status: loanStatusValidator,
    // "YYYY-MM-DD" of the last overdue reminder, for idempotent write-backs
    lastReminderAt: v.optional(v.string()),
  })
    .index("by_lender", ["lenderId"])
    .index("by_borrower", ["borrowerId"])
    .index("by_listing", ["listingId"])
    .index("by_status", ["status"]),

  notifications: defineTable({
    userId: v.id("users"),
    type: notificationTypeValidator,
    loanId: v.id("loans"),
    title: v.string(),
    body: v.string(),
    readAt: v.optional(v.number()),
  }).index("by_user", ["userId"]),

  // Audit trail of automation runs (reminders, deliveries, failures).
  // loanId is absent for failures that could not be tied to a loan.
  loanEvents: defineTable({
    loanId: v.optional(v.id("loans")),
    type: loanEventTypeValidator,
    detail: v.optional(v.string()),
  }).index("by_loan", ["loanId"]),
})
