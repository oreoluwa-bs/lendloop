import { v } from "convex/values"
import { internal } from "./_generated/api"
import { env, internalAction, internalMutation } from "./_generated/server"
import { recordLoanEvent } from "./lib/notifications"
import { webhookPayloadValidator } from "./lib/validators"

const MAX_ATTEMPTS = 3

/**
 * Deliver one event to n8n. Retries with backoff; on final failure records a
 * `webhook-failed` activity row on the loan so the failure is visible in-app.
 */
export const dispatch = internalAction({
  args: {
    payload: webhookPayloadValidator,
    attempt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const url = env.N8N_WEBHOOK_URL
    if (!url) {
      console.log(
        "[webhooks] N8N_WEBHOOK_URL not set, skipping delivery of",
        args.payload.event,
        args.payload.eventId
      )
      return
    }
    const attempt = args.attempt ?? 1
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Lendloop-Secret": env.N8N_WEBHOOK_SECRET ?? "",
        },
        body: JSON.stringify(args.payload),
      })
      if (!res.ok) throw new Error(`n8n responded ${res.status}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (attempt < MAX_ATTEMPTS) {
        await ctx.scheduler.runAfter(attempt * 30_000, internal.webhooks.dispatch, {
          payload: args.payload,
          attempt: attempt + 1,
        })
        return
      }
      console.error(
        "[webhooks] delivery failed after",
        MAX_ATTEMPTS,
        "attempts:",
        message
      )
      await ctx.runMutation(internal.webhooks.recordFailure, {
        loanId: args.payload.loanId,
        detail: message,
      })
    }
  },
})

export const recordFailure = internalMutation({
  args: { loanId: v.id("loans"), detail: v.string() },
  handler: async (ctx, args) => {
    await recordLoanEvent(ctx, {
      loanId: args.loanId,
      type: "webhook-failed",
      detail: args.detail,
    })
  },
})
