import { createHmac } from "node:crypto"
import { expect, test } from "vitest"
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
