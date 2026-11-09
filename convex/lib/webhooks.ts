// One HMAC scheme for both directions of the n8n integration. Stripe-style:
// sign `${timestamp}.${body}` so the timestamp is authenticated too, and only
// accept signatures from a short freshness window so a captured request can't
// be replayed later.
const SIGNATURE_PREFIX = "v1="
const MAX_AGE_SECONDS = 300

const encoder = new TextEncoder()

function importKey(secret: string, usage: ("sign" | "verify")[]) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    usage
  )
}

function toHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

/** `v1=<hex hmac>` over `${timestamp}.${body}`. */
export async function signWebhook(
  secret: string,
  timestamp: string,
  body: string
): Promise<string> {
  const key = await importKey(secret, ["sign"])
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${timestamp}.${body}`)
  )
  return `${SIGNATURE_PREFIX}${toHex(mac)}`
}

/**
 * Constant-time verification of a `v1=<hex>` signature plus freshness check.
 * Returns false for anything malformed, so callers can treat it as fail-closed.
 */
export async function verifyWebhook(
  secret: string,
  timestamp: string,
  body: string,
  signature: string
): Promise<boolean> {
  const ts = Number(timestamp)
  if (
    !Number.isFinite(ts) ||
    Math.abs(Date.now() / 1000 - ts) > MAX_AGE_SECONDS
  )
    return false
  if (!signature.startsWith(SIGNATURE_PREFIX)) return false
  const hex = signature.slice(SIGNATURE_PREFIX.length)
  if (!/^[0-9a-f]{64}$/i.test(hex)) return false
  const key = await importKey(secret, ["verify"])
  const bytes = new Uint8Array(hex.match(/../g)!.map((b) => parseInt(b, 16)))
  // subtle.verify compares in constant time
  return crypto.subtle.verify(
    "HMAC",
    key,
    bytes,
    encoder.encode(`${timestamp}.${body}`)
  )
}
