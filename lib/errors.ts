export function errorMessage(err: unknown): string {
  if (!(err instanceof Error)) return "Something went wrong"
  return (
    err.message.replace(/^Uncaught Error: /, "").split("\n")[0] ||
    "Something went wrong"
  )
}
