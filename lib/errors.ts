import { ConvexError } from "convex/values"

export function errorMessage(err: unknown): string {
  // ConvexError data reaches the client even in production; plain Error
  // messages are redacted to "Server Error" there.
  if (err instanceof ConvexError && typeof err.data === "string") return err.data
  if (!(err instanceof Error)) return "Something went wrong"
  return (
    err.message.replace(/^Uncaught Error: /, "").split("\n")[0] ||
    "Something went wrong"
  )
}
