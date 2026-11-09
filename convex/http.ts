import { httpRouter } from "convex/server"
import { internal } from "./_generated/api"
import type { Id } from "./_generated/dataModel"
import { env, httpAction } from "./_generated/server"
import { verifyWebhook } from "./lib/webhooks"

const http = httpRouter()

// Both checks stay locked unless N8N_API_SECRET is configured: the bearer
// token authenticates the caller, the signature authenticates the exact body
// and (via the timestamp) blocks replays.
function isAuthorized(req: Request): boolean {
  const secret = env.N8N_API_SECRET
  return !!secret && req.headers.get("Authorization") === `Bearer ${secret}`
}

async function isSigned(req: Request, body: string): Promise<boolean> {
  const secret = env.N8N_API_SECRET
  const timestamp = req.headers.get("X-Lendloop-Timestamp")
  const signature = req.headers.get("X-Lendloop-Signature")
  if (!secret || !timestamp || !signature) return false
  return verifyWebhook(secret, timestamp, body, signature)
}

/**
 * Verify the signature over the exact bytes received, then parse. Returns a
 * 401/400 Response on failure so routes can bail out with one check.
 */
async function signedJson(req: Request): Promise<{ body: unknown } | Response> {
  const raw = await req.text()
  if (!(await isSigned(req, raw))) {
    return new Response("Unauthorized", { status: 401 })
  }
  try {
    return { body: JSON.parse(raw) }
  } catch {
    return new Response("Invalid JSON", { status: 400 })
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string")
}

http.route({
  path: "/overdue-loans",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    if (!isAuthorized(req)) return new Response("Unauthorized", { status: 401 })
    const loans = await ctx.runQuery(internal.loans.listOverdue, {})
    return json(loans)
  }),
})

http.route({
  path: "/reminders/sent",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    if (!isAuthorized(req)) return new Response("Unauthorized", { status: 401 })
    const parsed = await signedJson(req)
    if (parsed instanceof Response) return parsed
    const body = parsed.body
    if (
      typeof body !== "object" ||
      body === null ||
      typeof (body as Record<string, unknown>).sentAt !== "string" ||
      !isStringArray((body as Record<string, unknown>).loanIds)
    ) {
      return new Response("Expected { sentAt, loanIds }", { status: 400 })
    }
    const { sentAt, loanIds } = body as { sentAt: string; loanIds: string[] }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(sentAt)) {
      return new Response("sentAt must be YYYY-MM-DD", { status: 400 })
    }
    try {
      const result = await ctx.runMutation(internal.loans.markReminded, {
        sentAt,
        loanIds: loanIds as Id<"loans">[],
      })
      return json(result)
    } catch {
      return new Response("Invalid loanIds", { status: 400 })
    }
  }),
})

http.route({
  path: "/loan-events",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    if (!isAuthorized(req)) return new Response("Unauthorized", { status: 401 })
    const parsed = await signedJson(req)
    if (parsed instanceof Response) return parsed
    const body = parsed.body
    const record = (typeof body === "object" ? body : null) as Record<
      string,
      unknown
    > | null
    if (!record || record.type !== "workflow-failed") {
      return new Response('Expected { type: "workflow-failed", ... }', {
        status: 400,
      })
    }
    const loanId = typeof record.loanId === "string" ? record.loanId : undefined
    const detail = typeof record.detail === "string" ? record.detail : undefined
    try {
      await ctx.runMutation(internal.loans.recordEvent, {
        loanId: loanId as Id<"loans"> | undefined,
        type: "workflow-failed",
        detail,
      })
    } catch {
      return new Response("Invalid loanId", { status: 400 })
    }
    return json({ ok: true })
  }),
})

export default http
