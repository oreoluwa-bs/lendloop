import { createHmac } from "node:crypto"
import { expect, test } from "vitest"
import { verifyWebhook } from "./lib/webhooks"
import { signWebhook } from "./webhooks"

// The n8n "Verify signature" node runs exactly this algorithm; if they drift,
// every delivery gets rejected.
test("webhook signature matches the n8n-side verification", async () => {
  const body = JSON.stringify({ event: "loan-requested", eventId: "abc" })
  const timestamp = "1700000000"
  const expected =
    "v1=" +
    createHmac("sha256", "dev-secret")
      .update(`${timestamp}.${body}`)
      .digest("hex")
  expect(await signWebhook("dev-secret", timestamp, body)).toBe(expected)
  expect(await signWebhook("other", timestamp, body)).not.toBe(expected)
})

test("inbound signatures verify, and reject tampering or replay", async () => {
  const body = JSON.stringify({ sentAt: "2030-01-01", loanIds: [] })
  const now = Math.floor(Date.now() / 1000).toString()
  const sig = await signWebhook("dev-secret", now, body)

  expect(await verifyWebhook("dev-secret", now, body, sig)).toBe(true)
  // wrong secret, tampered body, malformed signature
  expect(await verifyWebhook("other", now, body, sig)).toBe(false)
  expect(await verifyWebhook("dev-secret", now, `${body} `, sig)).toBe(false)
  expect(await verifyWebhook("dev-secret", now, body, "v1=deadbeef")).toBe(
    false
  )
  // valid signature, but older than the replay window
  const stale = (Number(now) - 600).toString()
  const staleSig = await signWebhook("dev-secret", stale, body)
  expect(await verifyWebhook("dev-secret", stale, body, staleSig)).toBe(false)
})
