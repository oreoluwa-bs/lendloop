import { auth } from "@clerk/nextjs/server"

import { LoanList } from "@/features/loans/components/loan-list"

export default async function Page() {
  await auth.protect()
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-balance">
        Incoming requests
      </h1>
      <p className="mt-1 text-pretty text-muted-foreground">
        Borrow requests for your tools.
      </p>
      <LoanList side="lent" />
    </>
  )
}
