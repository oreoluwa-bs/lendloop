"use client"

import { useAuth } from "@clerk/nextjs"
import { ConvexReactClient } from "convex/react"
import { ConvexProviderWithClerk } from "convex/react-clerk"

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!, {
  logger: {
    logVerbose: () => {},
    log: console.log,
    warn: console.warn,
    // expected app errors (ConvexError) are caught and shown in the UI;
    // don't let them trip the Next dev overlay. Real crashes still log loudly.
    error: (...args) => {
      if (String(args[0]).includes("Uncaught ConvexError"))
        console.debug(...args)
      else console.error(...args)
    },
  },
})

export function ConvexProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  )
}
