import { v } from "convex/values"
import { internal } from "./_generated/api"
import { env, internalAction, internalMutation } from "./_generated/server"
import { recordLoanEvent } from "./lib/notifications"
import { webhookPayloadValidator } from "./lib/validators"

const MAX_ATTEMPTS = 3

/**
 * Stripe-style signature: HMAC-SHA256 over `${timestamp}.${body}` so the
 * timestamp cannot be tampered with either. Verify on the n8n side with the
 * same shared secret.
 */
export async function signWebhook(
  secret: string,
  timestamp: string,
  body: string
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${body}`)
  )
  const hex = [...new Uint8Array(mac)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
  return `v1=${hex}`
}

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
    const secret = env.N8N_WEBHOOK_SECRET
    // fail closed: without a destination or a signing secret, don't deliver
    if (!url || !secret) {
      console.log(
        "[webhooks] N8N_WEBHOOK_URL/N8N_WEBHOOK_SECRET not set, skipping delivery of",
        args.payload.event,
        args.payload.eventId
      )
      return
    }
    const attempt = args.attempt ?? 1
    const body = JSON.stringify(args.payload)
    const timestamp = Math.floor(Date.now() / 1000).toString()
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Lendloop-Timestamp": timestamp,
          "X-Lendloop-Signature": await signWebhook(secret, timestamp, body),
        },
        body,
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
