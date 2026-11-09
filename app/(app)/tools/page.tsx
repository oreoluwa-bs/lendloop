import { auth } from "@clerk/nextjs/server"

import { AllTools } from "@/features/listings/components/all-tools"

export default async function Page() {
  await auth.protect()
  return (
    <>
      <p className="font-mono text-xs text-muted-foreground">// tools</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-balance">
        All tools
      </h1>
      <p className="mt-1 text-pretty text-muted-foreground">
        Everything in the library, filterable by category.
      </p>
      <AllTools />
    </>
  )
}
