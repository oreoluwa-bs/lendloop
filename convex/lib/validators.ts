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

export const notificationTypeValidator = v.union(
  v.literal("loan-requested"),
  v.literal("loan-approved"),
  v.literal("loan-declined"),
  v.literal("loan-returned"),
  v.literal("overdue-reminder")
)

export const loanEventTypeValidator = v.union(
  v.literal("reminder-sent"),
  v.literal("webhook-failed"),
  v.literal("workflow-failed")
)

/** Minimal payload sent to n8n: only the fields a notification needs. */
export const webhookPayloadValidator = v.object({
  event: notificationTypeValidator,
  eventId: v.string(),
  loanId: v.id("loans"),
  recipient: v.object({
    name: v.union(v.string(), v.null()),
    email: v.union(v.string(), v.null()),
  }),
  listing: v.object({ name: v.union(v.string(), v.null()) }),
  counterparty: v.object({ name: v.union(v.string(), v.null()) }),
  startDate: v.union(v.string(), v.null()),
  endDate: v.union(v.string(), v.null()),
  occurredAt: v.string(),
})
