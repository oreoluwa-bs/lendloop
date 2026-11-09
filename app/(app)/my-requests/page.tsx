import { auth } from "@clerk/nextjs/server"

import { LoanList } from "@/features/loans/components/loan-list"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ loan?: string }>
}) {
  await auth.protect()
  const { loan } = await searchParams
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-balance">
        My requests
      </h1>
      <p className="mt-1 text-pretty text-muted-foreground">
        Tools you have asked to borrow.
      </p>
      <LoanList side="borrowed" highlight={loan} />
    </>
  )
}
