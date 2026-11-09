import type { Infer } from "convex/values"
import { internal } from "../_generated/api"
import type { Id } from "../_generated/dataModel"
import type { MutationCtx } from "../_generated/server"
import {
  loanEventTypeValidator,
  notificationTypeValidator,
} from "./validators"

export type NotificationType = Infer<typeof notificationTypeValidator>
export type LoanEventType = Infer<typeof loanEventTypeValidator>

function buildMessage(
  type: NotificationType,
  counterpartyName: string,
  listingName: string,
  loan: { startDate: string; endDate: string }
): { title: string; body: string } {
  switch (type) {
    case "loan-requested":
      return {
        title: "New borrow request",
        body: `${counterpartyName} asked to borrow ${listingName} (${loan.startDate} → ${loan.endDate}).`,
      }
    case "loan-approved":
      return {
        title: "Request approved",
        body: `${counterpartyName} approved your request for ${listingName}.`,
      }
    case "loan-declined":
      return {
        title: "Request declined",
        body: `${counterpartyName} declined your request for ${listingName}.`,
      }
    case "loan-returned":
      return {
        title: "Tool returned",
        body: `${counterpartyName} marked ${listingName} as returned.`,
      }
    case "overdue-reminder":
      return {
        title: "Overdue reminder",
        body: `${listingName} was due back on ${loan.endDate}.`,
      }
  }
}

/**
 * Insert an in-app notification for the recipient and, for loan status
 * events, schedule the outbound webhook to n8n. Call from mutations only.
 */
export async function notify(
  ctx: MutationCtx,
  args: {
    recipientId: Id<"users">
    type: NotificationType
    loanId: Id<"loans">
  }
): Promise<void> {
  const loan = await ctx.db.get(args.loanId)
  if (!loan) return
  const listing = await ctx.db.get(loan.listingId)
  const recipient = await ctx.db.get(args.recipientId)
  const otherId =
    loan.lenderId === args.recipientId ? loan.borrowerId : loan.lenderId
  const counterparty = await ctx.db.get(otherId)
  const listingName = listing?.name ?? "your tool"
  const counterpartyName = counterparty?.name ?? "Your neighbour"
  const { title, body } = buildMessage(
    args.type,
    counterpartyName,
    listingName,
    loan
  )

  const notificationId = await ctx.db.insert("notifications", {
    userId: args.recipientId,
    type: args.type,
    loanId: args.loanId,
    title,
    body,
  })

  // Overdue reminders are delivered by the n8n reminder workflow itself;
  // sending them back through the webhook would double-notify.
  if (args.type !== "overdue-reminder") {
    await ctx.scheduler.runAfter(0, internal.webhooks.dispatch, {
      payload: {
        event: args.type,
        eventId: notificationId,
        loanId: args.loanId,
        recipient: {
          name: recipient?.name ?? null,
          email: recipient?.email ?? null,
        },
        listing: { name: listing?.name ?? null },
        counterparty: { name: counterparty?.name ?? null },
        startDate: loan.startDate,
        endDate: loan.endDate,
        occurredAt: new Date().toISOString(),
      },
    })
  }
}

/** Record one row of automation activity, shown on the loan in the app. */
export async function recordLoanEvent(
  ctx: MutationCtx,
  args: { loanId?: Id<"loans">; type: LoanEventType; detail?: string }
): Promise<void> {
  await ctx.db.insert("loanEvents", {
    type: args.type,
    ...(args.loanId ? { loanId: args.loanId } : {}),
    ...(args.detail ? { detail: args.detail } : {}),
  })
}
